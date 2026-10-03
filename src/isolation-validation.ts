import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

type Observation = { protectedWrite: string; outsideCopyWrite: string; workWrite: string; loopbackNetwork: string };

/** A separate fixed experiment: accepts no user command, file target, host or MCP endpoint. */
export async function exportIsolationReport(outputDirectory: string): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'Boardroom isolation '));
  const work = join(root, 'copy');
  const original = join(root, 'protected-original.txt');
  const outside = join(root, 'outside-copy.txt');
  const server = createServer(socket => socket.destroy());
  try {
    mkdirSync(work);
    writeFileSync(original, 'Fictional protected original.');
    writeFileSync(outside, 'Fictional file outside the copy.');
    chmodSync(original, 0o444);
    await new Promise<void>((done, reject) => {
      server.once('error', reject); server.listen(0, '127.0.0.1', done);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Loopback probe listener unavailable.');
    const script = join(work, 'probe.cjs');
    writeFileSync(script, `const fs=require('node:fs'),net=require('node:net');
const [original,outside,work,port]=process.argv.slice(2);
const write=p=>{try{fs.writeFileSync(p,'Fixed temporary probe.');return 'allowed'}catch{return 'blocked'}};
const result={protectedWrite:write(original),outsideCopyWrite:write(outside),workWrite:write(work)};
const socket=net.connect({host:'127.0.0.1',port:Number(port)});
let finished=false;const finish=value=>{if(finished)return;finished=true;socket.destroy();clearTimeout(timer);console.log(JSON.stringify({...result,loopbackNetwork:value}))};
socket.on('connect',()=>finish('allowed'));socket.on('error',()=>finish('blocked'));
const timer=setTimeout(()=>finish('blocked'),1000);`);
    const args = [script, original, outside, join(work, 'output.txt'), String(address.port)];
    const run = (executable: string, arguments_: string[]) => spawnSync(executable, arguments_, {
      cwd: work, encoding: 'utf8', timeout: 10000,
    });
    const baselineResult = run(process.execPath, args);
    if (baselineResult.status !== 0) throw new Error('The unrestricted isolation baseline could not run.');
    const baseline = JSON.parse(baselineResult.stdout) as Observation;
    let sandboxCandidate: { name: string; status: string; reason: string; observation?: Observation };
    if (process.platform === 'win32') {
      sandboxCandidate = { name: 'AppContainer', status: 'blocked',
        reason: 'No qualified AppContainer launcher and scoped capability/ACL policy are bundled. Read-only attributes alone are not isolation.' };
    } else {
      const name = process.platform === 'linux' ? 'bubblewrap' : 'sandbox-exec';
      const quote = (path: string) => JSON.stringify(path);
      const candidate = process.platform === 'linux'
        ? run('bwrap', ['--unshare-all', '--ro-bind', '/', '/', '--dev', '/dev', '--proc', '/proc',
          '--bind', work, work, '--chdir', work, '--', process.execPath, ...args])
        : run('/usr/bin/sandbox-exec', ['-p', `(version 1)(allow default)(deny file-write*)(allow file-write* (subpath ${quote(work)}))(deny network*)`, process.execPath, ...args]);
      if (candidate.status !== 0) {
        sandboxCandidate = { name, status: 'blocked',
          reason: `Candidate could not execute on this host (${candidate.error && 'code' in candidate.error ? candidate.error.code : `exit ${candidate.status}`}). Installation, OS policy and namespace prerequisites require qualification in Plan 06.` };
      } else {
        const observation = JSON.parse(candidate.stdout) as Observation;
        const protectedTargets = observation.protectedWrite === 'blocked' && observation.outsideCopyWrite === 'blocked'
          && observation.loopbackNetwork === 'blocked' && observation.workWrite === 'allowed';
        sandboxCandidate = { name, status: protectedTargets ? 'candidate-tested' : 'failed', observation,
          reason: 'Fixed temporary write and loopback checks only. Read restrictions, descendants, escape attacks and MCP adapters are not qualified; product tools remain unavailable.' };
      }
    }
    const report = {
      schemaVersion: 1, mode: 'technical-isolation-validation', platform: process.platform, architecture: process.arch,
      baseline: { ...baseline, copyIsBoundary: false }, sandboxCandidate,
      product: { commands: 'unavailable', localMcp: 'unavailable', remoteMcp: 'unavailable' },
      localMcpLimit: 'Local MCP requires a qualified process sandbox plus scoped protocol permissions; neither adapter is enabled.',
      remoteMcpLimit: 'A local sandbox cannot protect files or actions on a remote MCP server. Remote server enforcement and explicit scoped consent must be qualified separately.',
      safety: 'Only newly created fictional temporary targets and a loopback listener are used. No external network request or user-selected command is executed.',
    };
    const output = resolve(outputDirectory);
    mkdirSync(output, { recursive: true });
    const path = join(output, `boardroom-isolation-${randomUUID()}.json`);
    writeFileSync(path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return path;
  } finally {
    server.close();
    if (existsSync(original)) chmodSync(original, 0o600);
    rmSync(root, { recursive: true, force: true });
  }
}
