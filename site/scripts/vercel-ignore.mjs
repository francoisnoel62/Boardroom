#!/usr/bin/env node
// Vercel "Ignored Build Step" (vercel.json#ignoreCommand): exit 0 skips the deployment, exit 1 builds.
// The site is rebuilt only when a commit touches the site or a repository file it reads at build time;
// a unit test checks that every file the site imports from outside site/ is covered here.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteInputs = [
  /^site\//,
  /^vercel\.json$/,
  /^assets\/demo\//,
  /^docs\/media\//,
  /^docs\/validation\/recorded-export\//,
  /^src\/(cli\.ts|domain\.ts|terminal-validation\.tsx)$/,
  /^tests\/[^/]+\.test\.ts$/, // the test count shown on the site
  /^\.github\/workflows\/ci\.yml$/, // the qualified platforms
  /^scripts\/install\.(sh|ps1)$/, // served byte for byte
];

export const touchesSite = files => files.some(file => siteInputs.some(input => input.test(file)));

function changedFiles(base) {
  const diff = spawnSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' });
  return diff.status === 0 ? diff.stdout.split('\n').filter(Boolean) : undefined;
}

function main() {
  // Compare with the last deployed commit when Vercel knows it, else with the parent commit.
  const bases = [process.env.VERCEL_GIT_PREVIOUS_SHA, 'HEAD^'].filter(Boolean);
  for (const base of bases) {
    const files = changedFiles(base);
    if (!files) continue;
    if (touchesSite(files)) {
      console.log(`Site inputs changed since ${base}: building.`);
      process.exit(1);
    }
    console.log(`No site input changed since ${base}: skipping this deployment.`);
    process.exit(0);
  }
  console.log('Changed files could not be determined: building.');
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
