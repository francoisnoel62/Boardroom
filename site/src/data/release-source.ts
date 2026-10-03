// Reads GitHub Releases once per build. BOARDROOM_RELEASES_FIXTURE points at a JSON file
// instead, for tests; GITHUB_TOKEN, when present, raises the API rate limit in CI.
import { readFileSync } from 'node:fs';
import { releaseState, type ReleaseState } from './release.ts';

const endpoint = 'https://api.github.com/repos/francoisnoel62/Boardroom/releases?per_page=10';

async function load(): Promise<ReleaseState> {
  const fixture = process.env.BOARDROOM_RELEASES_FIXTURE;
  try {
    if (fixture) return releaseState(JSON.parse(readFileSync(fixture, 'utf8')));
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(10_000) });
    return releaseState(await response.json());
  } catch (error) {
    return { state: 'unknown', reason: error instanceof Error ? error.message : 'GitHub Releases could not be read.' };
  }
}

let cached: Promise<ReleaseState> | undefined;
export const releaseInfo = () => (cached ??= load());
