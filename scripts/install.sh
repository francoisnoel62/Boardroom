#!/bin/sh
# Installs BOARDROOM for the current user on macOS (Apple silicon) or Linux x64.
#
#   curl -fsSL <url-of-this-script> | sh
#
# It downloads a release package and its SHA256SUMS, refuses any checksum mismatch,
# extracts the package under BOARDROOM_INSTALL_DIR (default ~/.boardroom) and writes a
# small `boardroom` command into BOARDROOM_BIN_DIR (default ~/.local/bin).
# It needs no administrator rights and never touches your BOARDROOM data directory.
#
# Optional settings:
#   BOARDROOM_VERSION        release to install, e.g. 0.1.0 (default: the newest release)
#   BOARDROOM_INSTALL_DIR    where packages are kept
#   BOARDROOM_BIN_DIR        where the `boardroom` command is written
#   BOARDROOM_DOWNLOAD_BASE  where packages are downloaded from (default: GitHub Releases)
set -eu

repository="francoisnoel62/Boardroom"
fail() { printf 'BOARDROOM installer: %s\n' "$1" >&2; exit 1; }

case "${BOARDROOM_PLATFORM:-$(uname -s)}" in
  Linux | linux) platform=linux ;;
  Darwin | macos) platform=macos ;;
  *) platform=$(printf '%s' "${BOARDROOM_PLATFORM:-$(uname -s)}" | tr '[:upper:]' '[:lower:]') ;;
esac
case "${BOARDROOM_ARCH:-$(uname -m)}" in
  x86_64 | amd64 | x64) arch=x64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) arch="${BOARDROOM_ARCH:-$(uname -m)}" ;;
esac
case "$platform-$arch" in
  linux-x64 | macos-arm64) ;;
  *) fail "$platform-$arch is not a qualified platform. Qualified: Linux x64, macOS arm64 (and Windows x64 with install.ps1). You can build from source instead." ;;
esac

download() { # url destination
  if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else fail "curl or wget is required."
  fi
}

version="${BOARDROOM_VERSION:-}"
if [ -z "$version" ]; then
  [ -z "${BOARDROOM_DOWNLOAD_BASE:-}" ] || fail "BOARDROOM_VERSION is required with BOARDROOM_DOWNLOAD_BASE."
  # The newest release, including developer previews (GitHub's "latest" excludes prereleases).
  tmp_api=$(mktemp)
  download "https://api.github.com/repos/$repository/releases?per_page=1" "$tmp_api" || fail "could not read the releases of $repository."
  version=$(sed -n 's/.*"tag_name": *"v\{0,1\}\([^"]*\)".*/\1/p' "$tmp_api" | head -n 1)
  rm -f "$tmp_api"
  [ -n "$version" ] || fail "no published release was found. Build from source: https://github.com/$repository#readme"
fi
base="${BOARDROOM_DOWNLOAD_BASE:-https://github.com/$repository/releases/download/v$version}"
asset="boardroom-$version-$platform-$arch.tar.gz"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM

printf 'Downloading BOARDROOM %s for %s-%s\n' "$version" "$platform" "$arch"
download "$base/SHA256SUMS" "$work/SHA256SUMS" || fail "could not download SHA256SUMS from $base."
expected=$(awk -v name="$asset" '$2 == name || $2 == "*" name { print $1 }' "$work/SHA256SUMS" | head -n 1)
[ -n "$expected" ] || fail "No package for $platform-$arch in release $version."
download "$base/$asset" "$work/$asset" || fail "could not download $asset."

if command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum "$work/$asset" | awk '{ print $1 }')
elif command -v shasum >/dev/null 2>&1; then actual=$(shasum -a 256 "$work/$asset" | awk '{ print $1 }')
else fail "sha256sum or shasum is required to verify the download."
fi
[ "$actual" = "$expected" ] || fail "checksum mismatch for $asset (expected $expected, got $actual). Nothing was installed."
printf 'Checksum verified: %s\n' "$actual"

install_dir="${BOARDROOM_INSTALL_DIR:-$HOME/.boardroom}"
bin_dir="${BOARDROOM_BIN_DIR:-$HOME/.local/bin}"
target="$install_dir/versions/$version"

mkdir -p "$work/extract"
tar -xzf "$work/$asset" -C "$work/extract" --strip-components=1 || fail "could not extract $asset."
[ -x "$work/extract/boardroom" ] || fail "$asset does not contain a boardroom launcher."
mkdir -p "$install_dir/versions"
rm -rf "$target"
mv "$work/extract" "$target"

# A relay script, not a symlink: the package launcher locates its runtime from its own path.
mkdir -p "$bin_dir"
quoted=$(printf '%s' "$target" | sed 's/[\\"$`]/\\&/g')
cat > "$bin_dir/boardroom" <<EOF
#!/bin/sh
exec "$quoted/boardroom" "\$@"
EOF
chmod 755 "$bin_dir/boardroom"

printf 'Installed BOARDROOM %s in %s\n' "$version" "$target"
case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *) printf 'Add %s to your PATH to run boardroom from any directory.\n' "$bin_dir" ;;
esac
printf 'Next: boardroom demo\n'
