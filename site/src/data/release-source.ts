// Reads GitHub Releases once per build. BOARDROOM_RELEASES_FIXTURE points at a JSON file
// instead, for tests; GITHUB_TOKEN, when present, raises the API rate limit in CI.
import { readFileSync } from 'node:fs';
import { publishedReleases, releaseState, type ReleaseState, type ReleaseSummary } from './release.ts';

const endpoint = 'https://api.github.com/repos/francoisnoel62/Boardroom/releases?per_page=10';

async function load(): Promise<unknown> {
  const fixture = process.env.BOARDROOM_RELEASES_FIXTURE;
  try {
    if (fixture) return JSON.parse(readFileSync(fixture, 'utf8'));
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(10_000) });
    return await response.json();
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'GitHub Releases could not be read.' };
  }
}

let cached: Promise<unknown> | undefined;
const answer = () => (cached ??= load());

export const releaseInfo = async (): Promise<ReleaseState> => releaseState(await answer());
export const releaseHistory = async (): Promise<ReleaseSummary[]> => publishedReleases(await answer());
