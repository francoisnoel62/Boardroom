#!/bin/bash
set -euo pipefail
if [[ "${GITHUB_ACTIONS-}" != true || "${RUNNER_ENVIRONMENT-}" != github-hosted || "$(uname -s)" != Darwin ]]; then
  echo 'Node removal is allowed only in an ephemeral GitHub-hosted macOS qualification VM.' >&2
  exit 1
fi
proof_path=$1
cache_node="${RUNNER_TOOL_CACHE:?}/node"
case "$cache_node" in /Users/runner/hostedtoolcache/node|/opt/hostedtoolcache/node) ;; *) echo 'Unexpected Node cache target' >&2; exit 1 ;; esac
brew_prefix=$(brew --prefix)
case "$brew_prefix" in /opt/homebrew|/usr/local) ;; *) echo 'Unexpected Homebrew prefix' >&2; exit 1 ;; esac
formulae=$(brew list --formula | awk '/^node(@[0-9]+)?$/')
for formula in $formulae; do brew uninstall --force --ignore-dependencies "$formula"; done
sudo rm -rf -- "$cache_node"
if command -v node >/dev/null 2>&1; then echo 'An application Node remains installed on PATH.' >&2; exit 1; fi
python3 - "$proof_path" "$cache_node" "$brew_prefix/bin/node" <<'PY'
import json, os, sys
paths = sys.argv[2:]
assert all(not os.path.exists(path) for path in paths), paths
with open(sys.argv[1], 'w') as proof:
    json.dump({'schemaVersion': 1, 'strategy': 'fresh-macos-vm-homebrew-and-cache-node-removed',
               'systemNodeVisible': False, 'absentPaths': paths,
               'controlPlane': 'GitHub runner internal action runtimes remain off application PATH; the application uses its bundled Node.'}, proof, indent=2)
PY
