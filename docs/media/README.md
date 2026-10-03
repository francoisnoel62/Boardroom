# README media

## Editorial illustration

`boardroom-hero.svg` is an original vector illustration of the product vision: a team of AI models and roles chosen by the human CEO. The seats shown are examples, not a fixed roster or team-size limit. It is artwork, not an application screenshot. Its colors are self-contained for light and dark backgrounds; the README repeats the essential message as text.

## Terminal capture provenance

`recorded-terminal.jpg` is a browser screenshot of the rendered VT screen obtained from a real Windows OS pseudoterminal. The process was the candidate's own Node running its compiled `demo` CLI with a fresh data directory, at 120 columns × 44 rows. The screenshot adds a descriptive frame; it does not invent or rewrite terminal lines. It is not a photograph of a native terminal window.

`recorded-example.cast` contains the actual timestamped VT output in asciinema v2 format. Only terminal-title OSC metadata is removed because Windows may include the local runtime path there. `terminal-screen.txt` is the corresponding headless VT screen and provides an accessible text alternative. No model calls, account credentials or user project files are involved; the discussion and source are the distributed fictional fixtures.

The installed qualification suite regenerates its own recordings and screen text on Windows x64, Linux x64 and macOS arm64; those copies are retained with the installation evidence artifacts. The README image was captured locally from `boardroom-win32-x64-plan01-dev.1`, whose product code matches the technical-evidence increment. Later qualification-only changes add readiness timing, without changing the captured recorded discussion.

The earlier `recorded-example.svg` remains a static rendering of captured CLI text for historical comparison. The README's expandable example and the [implementation guide](../getting-started.md) use the actual PTY screen capture. The guide links to its raw recording.
