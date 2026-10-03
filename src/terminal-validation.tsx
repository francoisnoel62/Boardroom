import React, { useEffect, useState } from 'react';
import { Box, Text, render, useApp, useInput, usePaste, useWindowSize } from 'ink';

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
// Preserve text, newlines and tabs; terminal control bytes must not become output commands.
const normalizeInput = (text: string) => text.replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');

function TerminalValidation({ onCancel }: { onCancel: (accepted: string, draft: string) => void }) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [ticks, setTicks] = useState(0);
  const [draft, setDraft] = useState('');
  const [accepted, setAccepted] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setTicks(value => value + 1), 200);
    return () => clearInterval(timer);
  }, []);
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) { onCancel(accepted, draft); exit(); }
    else if (key.return) { setAccepted(draft); setDraft(''); }
    else if (key.backspace) {
      setDraft(value => Array.from(graphemes.segment(value)).slice(0, -1).map(part => part.segment).join(''));
    }
    else if (!key.ctrl && !key.meta) { setDraft(value => value + normalizeInput(input)); }
  });
  usePaste(text => setDraft(value => value + normalizeInput(text)));
  return <Box flexDirection="column">
    <Text>BOARDROOM | Technical validation — fictional stream</Text>
    <Text>No model calls. Scratch input is not saved.</Text>
    <Text>Window: {columns}x{rows}</Text>
    <Text>Stream tick: {ticks}</Text>
    <Text>{ticks % 2 ? 'Capacity: two engineers.' : 'Scope: one integration.'}</Text>
    <Text>Enter submits scratch input. Escape or Ctrl+C cancels.</Text>
    <Text>Accepted: {JSON.stringify(accepted)}</Text>
    <Text>Draft: {draft}</Text>
  </Box>;
}

/** Separate feasibility probe; does not open a project or advance recorded playback. */
export async function runTerminalValidation(): Promise<void> {
  let lastAccepted = '';
  let remainingDraft = '';
  const view = render(<TerminalValidation onCancel={(accepted, draft) => {
    lastAccepted = accepted; remainingDraft = draft;
  }} />, { patchConsole: false, exitOnCtrlC: false });
  await view.waitUntilExit();
  console.log(`Stream cancelled.\nLast accepted input: ${JSON.stringify(lastAccepted)}\nUnsubmitted draft: ${JSON.stringify(remainingDraft)}`);
  process.exitCode = 130;
}
