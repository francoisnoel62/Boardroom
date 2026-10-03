// Release data for /download, read from GitHub Releases at build time.
// Package names follow the contract shared with scripts/install.* and the release workflow:
//   boardroom-<version>-<linux|macos|windows>-<x64|arm64>.tar.gz, plus SHA256SUMS.

export type Platform = 'linux' | 'macos' | 'windows';

export interface ReleasePackage {
  platform: Platform;
  arch: 'x64' | 'arm64';
  name: string;
  url: string;
  sizeLabel: string;
}

export interface Release {
  version: string;
  tag: string;
  title: string;
  prerelease: boolean;
  publishedAt: string;
  url: string;
  checksumsUrl: string;
  packages: ReleasePackage[];
}

export type ReleaseState =
  | { state: 'none' }
  | { state: 'unknown'; reason: string }
  | { state: 'published'; release: Release };

interface ApiAsset { name: string; size: number; browser_download_url: string }
interface ApiRelease {
  tag_name: string; name?: string | null; draft: boolean; prerelease: boolean;
  published_at: string | null; html_url: string; assets: ApiAsset[];
}

export function parseAssetName(name: string) {
  const match = /^boardroom-(.+)-(linux|macos|windows)-(x64|arm64)\.tar\.gz$/.exec(name);
  return match ? { version: match[1]!, platform: match[2] as Platform, arch: match[3] as 'x64' | 'arm64' } : undefined;
}

const order: Platform[] = ['linux', 'macos', 'windows'];

export function releaseState(api: unknown): ReleaseState {
  if (!Array.isArray(api)) {
    const message = (api as { message?: unknown } | null)?.message;
    return { state: 'unknown', reason: typeof message === 'string' ? message : 'Unexpected answer from GitHub Releases.' };
  }
  const latest = (api as ApiRelease[]).find(release => !release.draft);
  if (!latest) return { state: 'none' };
  const checksums = latest.assets.find(asset => asset.name === 'SHA256SUMS');
  if (!checksums) return { state: 'unknown', reason: `Release ${latest.tag_name} has no SHA256SUMS file.` };
  const packages = latest.assets.flatMap(asset => {
    const parsed = parseAssetName(asset.name);
    return parsed ? [{ platform: parsed.platform, arch: parsed.arch, name: asset.name, url: asset.browser_download_url, sizeLabel: `${Math.round(asset.size / 1_000_000)} MB` }] : [];
  }).sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));
  return {
    state: 'published',
    release: {
      version: latest.tag_name.replace(/^v/, ''),
      tag: latest.tag_name,
      title: latest.name ?? latest.tag_name,
      prerelease: latest.prerelease,
      publishedAt: latest.published_at ?? '',
      url: latest.html_url,
      checksumsUrl: checksums.browser_download_url,
      packages,
    },
  };
}

export interface ReleaseSummary { tag: string; title: string; prerelease: boolean; publishedAt: string; url: string }

/** Every published release, newest first as GitHub returns them; drafts are never listed. */
export function publishedReleases(api: unknown): ReleaseSummary[] {
  if (!Array.isArray(api)) return [];
  return (api as ApiRelease[]).filter(release => !release.draft).map(release => ({
    tag: release.tag_name,
    title: release.name ?? release.tag_name,
    prerelease: release.prerelease,
    publishedAt: release.published_at ?? '',
    url: release.html_url,
  }));
}

/** Desktop platform of the visitor, or undefined when no package applies (phones, tablets). */
export function detectPlatform(userAgent: string, clientHintPlatform: string | undefined): Platform | undefined {
  const hint = clientHintPlatform?.toLowerCase();
  if (hint === 'windows') return 'windows';
  if (hint === 'macos') return 'macos';
  if (hint === 'linux') return 'linux';
  if (hint === 'android' || hint === 'ios') return undefined;
  if (/iPhone|iPad|Android/i.test(userAgent)) return undefined;
  if (/Windows/i.test(userAgent)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macos';
  if (/Linux|X11/i.test(userAgent)) return 'linux';
  return undefined;
}
