# BOARDROOM website and documentation

The public site and documentation, built as a static [Astro](https://astro.build) site with [Starlight](https://starlight.astro.build) for the docs. It implements phases 1 to 4 of the [website plan](../boardroom-plans/SITE-VITRINE-ET-DOCUMENTATION.md): foundations, design system, the home page with its replayable capture and FAQ, the engineering page, and documentation v1 (getting started, concepts, guides, generated reference, project pages and `llms.txt`), and the download chain: tested installers, a draft release workflow and release-aware `/download` and `/welcome` pages.

Nothing here is deployed yet. The domain, hosting and analytics are pending decisions (D3–D5 in the plan). No download is offered until a release is published (D1–D2): `/download` reads GitHub Releases at build time and says so plainly while there is none.

## Run it

Requires Node 22.12 or later; CI uses Node 24.12.0, like the application.

```sh
cd site
npm ci
npm run dev        # http://localhost:4321
npm test           # unit → build → built-site checks → end-to-end
npm run lighthouse # performance, accessibility, best-practice and SEO budgets
```

To reuse an installed Chromium instead of downloading Playwright's, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (Playwright) and `CHROME_PATH` (Lighthouse). Set `ASTRO_TELEMETRY_DISABLED=1` to keep Astro's own usage reporting off, as CI does.

## Single sources of truth

The site never retypes product facts. It reads them from the repository at build time:

| Shown on the site | Read from |
| :--- | :--- |
| The story, citations, proposals and final views | `assets/demo/meeting.json`, `assets/demo/context.md` |
| The terminal capture and its title | `docs/media/terminal-screen.txt`, `docs/media/recorded-example.cast` |
| The decision record and its source hash | `docs/validation/recorded-export/` |
| Roadmap statuses | `src/data/roadmap.ts`, checked against each plan's `Statut` line |
| Every capability statement | `src/data/claims.ts`, each with its evidence path or owning plan |
| Test count and qualified platforms | `tests/*.test.ts` and the matrix of `.github/workflows/ci.yml` |
| Engineering decisions and limits | `src/data/engineering.ts`, each citing a document or test that must exist |
| CLI reference | The help text, accepted commands and exit codes in `src/cli.ts` and `src/terminal-validation.tsx` |
| JSON output reference | The application's Zod schemas in `src/domain.ts`, converted with `z.toJSONSchema` |
| Release status, packages and checksums | GitHub Releases at build time (`BOARDROOM_RELEASES_FIXTURE` for tests); drafts are never shown |
| `/install.sh`, `/install.ps1` | `scripts/install.sh` and `scripts/install.ps1`, served byte for byte |

Changing a fixture or an export changes the site; an unsupported fixture version, a citation outside its source or a final view without a verdict fails the build instead of being guessed.

## Quality gates

| Check | Command | What it guarantees |
| :--- | :--- | :--- |
| Types and content schema | `npm run check` | Pages, components and every doc page's required `status` |
| Data contracts | `npm run test:unit` | Fixture projection, claims registry, roadmap honesty |
| Built site | `npm run test:build` | Internal links/anchors, `lang`/title/description, no superlatives, no third-party requests, no “open source” without the pending-license claim |
| End-to-end | `npm run test:e2e` | Story, evidence, verdicts, statuses, theme, search, no horizontal scroll — desktop and mobile |
| Accessibility | part of `test:e2e` | No serious/critical axe violation (WCAG 2.2 AA) on every page, both themes; reduced motion honoured |
| Installers | `node --test tests/install.test.ts` (application suite) and the `installed` CI job | Checksum refusal, missing package, unqualified platform, and a real candidate installed from a local release then `doctor --json`, on all three platforms |
| Release fixture | part of `test:build` | A published release shows packages, checksums, pinned installers and attestation verification; the header, footer and FAQ follow the release state |
| Documented commands | `node site/scripts/doc-commands.mjs --repo . --candidate release/candidate` (in the application CI) | Every command in a `doc-test` block runs against the checkout and the packaged candidate on Windows, Linux and macOS |
| Lighthouse | `npm run lighthouse` | `/`, `/engineering/`, `/docs/`, `/docs/quickstart/`, median of 3 mobile runs: every category ≥ 95, LCP ≤ 1.8 s, CLS ≤ 0.05, TBT ≤ 150 ms |

Observed locally on 2026-10-03 after phase 4 (Node 22.22, Chromium 141): 38 unit tests, 8 built-site checks (including a fixture release build) and 124 end-to-end tests pass, and the five Lighthouse pages meet their budgets. The application's 52 tests include the four installer tests. GitHub's runners measure slower than this container, so CI is the reference for the budgets.

## Red → green record

| Slice | Observed red result | Green behavior |
| :--- | :--- | :--- |
| Story from the fixture | `src/data/story.ts` was absent | Five steps in saved order, exact cited lines, both proposals, final views, pending human decision |
| Fixture guards | Same missing module | Unknown schema version, out-of-range citation and missing verdict are refused |
| Source integrity | Same missing module | The retained memo's SHA-256 equals the bundled source bytes |
| Claims registry | `src/data/claims.ts` was absent | Available claims cite existing evidence; planned claims name an existing plan |
| Vision claims | No claim had the `vision` status | The configurable room is a stated direction, not attributed to a plan |
| Roadmap honesty | `src/data/roadmap.ts` was absent | Statuses match plan files; reservations stay visible; unreadable status refused |
| Next milestone | `publicStatus` was not exported | The first unaccepted plan reads “Next”, later ones “Planned” |
| Built site | No build output existed | Links, metadata, editorial and third-party checks pass on `dist/` |
| Pages | No page or preview server existed | 54 end-to-end and accessibility tests pass on desktop and mobile |
| Derived figures | `src/data/engineering.ts` was absent | 48 application tests and three platforms read from the repository; unknown runners refused |
| Engineering evidence | `decisions` was not exported | Every decision and limit cites an existing document or test |
| License honesty | `/docs/` called the project open source | Any “open source” mention requires the visible “Planned · Plan 09” license claim |
| Replay | No replay control existed | The capture replays one intervention at a time, can be skipped, and stays fully readable without JavaScript |
| Keyboard-reachable code | With a wider monospace font, four Quickstart code blocks scrolled horizontally without being focusable (axe `scrollable-region-focusable`, first seen on a CI run) | Long commands wrap; the regression test forces a wide font at 900 px |
| CLI reference | `src/data/cli.ts` was absent | Commands, options and exit codes read from the CLI source; accepted and documented commands must match |
| Accepted but unhandled command | The help announced `status` as showing capabilities | The reference flags that `status` prints the help text in this build |
| JSON reference | No schema rendering existed | Nested and enumerated fields of `decision --json` and `history --json` from the Zod schemas |
| Installers | `node --test tests/install.test.ts` (application suite) and the `installed` CI job | Checksum refusal, missing package, unqualified platform, and a real candidate installed from a local release then `doctor --json`, on all three platforms |
| Release fixture | part of `test:build` | A published release shows packages, checksums, pinned installers and attestation verification; the header, footer and FAQ follow the release state |
| Documented commands | `scripts/doc-commands.mjs` was absent | `doc-test` blocks are extracted and run; 18 checkout commands passed locally, candidate commands run in CI |
| Scrollable tables | The JSON reference tables scrolled without keyboard focus | Field paths wrap; reference tables are focusable |
| Installers | `scripts/install.sh` and `install.ps1` were absent | Verified install with a relay command, refusal on checksum mismatch, missing package or unqualified platform; a quoted install path also works |
| Release data | `src/data/release.ts` was absent | Asset naming contract, drafts ignored, no-release and unknown states, visitor platform detection |
| Release-aware pages | `/download/` and `/welcome/` were absent | Honest no-release page; with a release, OS-recommended packages and pinned installers; the footer stopped claiming “no release” once one exists |
| FAQ and engineering page | Neither existed | Cost, license and data answers; `/engineering/` with figures, decisions, evidence links and stated limits |

Corrections found by those checks rather than by review: the first CI run failed the docs' LCP budget on GitHub's runners although it passed locally (fixed by the font decision below), a misplaced `@import` silently dropped two fonts (and briefly flattered an LCP measurement), global utility classes overrode component colours (fixed by layering `site.css`), an Engineering link hidden on phones (the recruiter path) became always visible, and four test selectors were wrong about the search box role, the scope of the “no download” rule, repeated claims and repeated evidence links.

## Decisions taken in this phase

- **Plain CSS with tokens instead of Tailwind.** Starlight ships its own cascade layers; a few bespoke components are clearer and lighter as scoped Astro styles over `src/styles/tokens.css`. Reversible if the component count grows.
- **Fonts.** Instrument Serif (titles) and Inter (marketing text) are self-hosted, OFL-licensed, latin subsets only, and preloaded on marketing pages. Inter uses `font-display: optional`, so text never waits for or reflows after a late font. The documentation body and all code use the reader's system fonts: in CI's simulated mobile run, the docs' LCP sat at 1.81 s and 1.96 s with Inter and JetBrains Mono, above the 1.8 s budget, and dropping those downloads removed the slow case locally. The serif italic was dropped too: a fourth font file for three short questions.
- **Theme** follows the visitor's system preference, and the toggle shares Starlight's `starlight-theme` key so the site and docs stay in step.
- **Every doc page declares `status`** (`available`, `preview`, `planned`, `vision`), rendered under its title.

## Known gaps

- `install.ps1` was exercised here with PowerShell 7 on Linux; Windows PowerShell 5.1 runs it in the application CI on Windows.
- The release workflow runs only when a tag is pushed and has not run yet. The major version of `actions/attest-build-provenance` (v3) could not be checked from this environment; confirm it before the first tag.

## Known warnings

- `MODULE_LEVEL_DIRECTIVE "use astro:head-inject"` comes from Astro's MDX output under Rolldown, not from this code.
- Sitemap and canonical URLs are skipped until `SITE_URL` is set (domain decision pending).
- `npm audit` reports `http-cache-semantics` (cross-user disclosure in a shared HTTP cache) through Astro. A static build run by one user does not use a shared cache; revisit when Astro updates the dependency.
