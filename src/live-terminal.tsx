import React, { useEffect, useState } from 'react';
import { Box, Text, render, useApp, useInput, usePaste, useWindowSize } from 'ink';
import { publicDiagnostic } from './privacy.ts';
import { LiveTerminalSession, terminalText } from './live-terminal-session.ts';

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
function Screen({ session, cancelled }: { session: LiveTerminalSession; cancelled: () => void }) {
  const { exit } = useApp(), { columns, rows } = useWindowSize();
  const [view, setView] = useState<Awaited<ReturnType<LiveTerminalSession['snapshot']>>>();
  const [draft, setDraft] = useState(''), [error, setError] = useState(''), [closing, setClosing] = useState(false);
  useEffect(() => {
    let live = true, reading = false;
    const refresh = async () => { if (reading) return; reading = true;
      try { const next = await session.snapshot(); if (live) setView(next); }
      catch (error) { if (live) setError(publicDiagnostic(error)); }
      finally { reading = false; }
    };
    void refresh(); const timer = setInterval(() => void refresh(), 100);
    return () => { live = false; clearInterval(timer); };
  }, [session]);
  const close = async (abort: boolean) => {
    if (closing) return; setClosing(true);
    if (abort) { cancelled(); await session.cancel(); }
    exit();
  };
  useInput((input, key) => {
    if (closing) return;
    if (key.escape || (key.ctrl && input === 'c')) { void close(true); }
    else if (key.return) {
      const command = draft; setDraft(''); setError('');
      if (command.trim() === 'quit') { void close(!!view?.busy); return; }
      void session.command(command).catch(error => setError(publicDiagnostic(error)));
    } else if (key.backspace || key.delete) setDraft(value => Array.from(graphemes.segment(value)).slice(0, -1).map(p => p.segment).join(''));
    else if (!key.ctrl && !key.meta) setDraft(value => (value + terminalText(input)).slice(0, 65536));
  });
  usePaste(text => { if (!closing) setDraft(value => (value + terminalText(text)).slice(0, 65536)); });
  const safe = terminalText;
  const summary = [
    `BOARDROOM | Live decision | Window: ${columns}x${rows}`,
    `Question: ${view?.question ?? 'Loading'} | Selected: ${view?.selected ?? ''}`,
    `Passages: ${view?.passages.map((p, i) => `${i + 1}:${p.evidenceId} lines ${p.firstLine}-${p.lastLine}`).join('; ') ?? ''}`,
    ...(view?.routes.map(r => `Model ${r.id}: ${r.providerId}/${r.modelId}`) ?? ['Models: loading']),
    `Framing: ${view?.frame ?? '-'} ${view?.framingSummary ?? ''}`,
    `Analyses: ${view?.analyses ?? '-'} | Proposal: ${view?.proposal ?? 'none'}`,
    `Views: ${view?.views ?? '-'} | Human: ${view?.human ?? 'pending'}`,
    view?.viewsDetail ?? '',
    view?.calls ? `USD ceiling ${view.calls.execution.ceilingMicros / 1e6} | known ${view.calls.knownCostMicros / 1e6} | held/unknown ${view.calls.committedMicros / 1e6} | reserve ${view.calls.heldReserveMicros / 1e6}`
      : `Budget ${view?.ceiling?.amount ?? '-'} ${view?.ceiling?.currency ?? ''}; revision and conclusion reserves are computed from the team's call bounds at start.`,
    view?.calls ? `Execution: ${view.calls.execution.status} | Active ${Math.round(view.calls.activeMs)}ms / ${view.calls.execution.durationTargetMs}ms` : 'Active duration excludes human waiting.',
    `Phase: ${view?.busy || 'human input'} | ${view?.notice ?? ''}`,
  ];
  const help = rows < 22 ? ['inspect | stop | conclude | export | quit; Esc/Ctrl+C saves'] : [
    'question TEXT | select 1,2 | start | approve N | correct N FILE',
    'analyse | debate | views N | decide N ACTION REASON | decision-file FILE',
    'inspect | evidence | history | stop | conclude | export | quit; Esc/Ctrl+C saves',
  ];
  const draftLines = safe(draft).split('\n').slice(-3);
  const slots = Math.max(0, rows - summary.length - help.length - draftLines.length - (error ? 1 : 0) - 1);
  const details = slots > 0 ? safe(view?.streams || view?.detail || '').split('\n').slice(-slots) : [];
  return <Box flexDirection="column">
    {summary.map((line, i) => <Text key={i} wrap="truncate-end">{safe(line).replace(/\n/g, ' ↵ ')}</Text>)}
    {details.map((line, i) => <Text key={`detail${i}`} wrap="truncate-end">{line}</Text>)}
    {help.map((line, i) => <Text key={`help${i}`} wrap="truncate-end">{line}</Text>)}
    {error ? <Text wrap="truncate-end">{safe(error)}</Text> : null}
    <Text wrap="truncate-end">Draft: {draftLines.join('\n')}</Text>
  </Box>;
}
export async function runLiveTerminal(session: LiveTerminalSession) {
  let aborted = false;
  const view = render(<Screen session={session} cancelled={() => { aborted = true; }} />, { patchConsole: false, exitOnCtrlC: false, interactive: true });
  await view.waitUntilExit();
  const saved = await session.snapshot();
  console.log(`Meeting: ${saved.meetingId ?? 'not started'}${saved.exported ? `\nExports: ${saved.exported}` : ''}`);
  if (aborted) process.exitCode = 130;
}
