# Installs BOARDROOM for the current user on Windows x64.
#
#   irm <url-of-this-script> | iex
#
# It downloads a release package and its SHA256SUMS, refuses any checksum mismatch,
# extracts the package under BOARDROOM_INSTALL_DIR (default %LOCALAPPDATA%\Programs\Boardroom)
# and writes a boardroom.cmd command into BOARDROOM_BIN_DIR (default <install dir>\bin),
# which is added to your user PATH unless BOARDROOM_NO_MODIFY_PATH=1.
# It needs no administrator rights and never touches your BOARDROOM data directory.
#
# Optional settings: BOARDROOM_VERSION, BOARDROOM_INSTALL_DIR, BOARDROOM_BIN_DIR,
# BOARDROOM_DOWNLOAD_BASE (default: GitHub Releases), BOARDROOM_NO_MODIFY_PATH.
#
# Compatible with Windows PowerShell 5.1. Errors are thrown rather than calling `exit`,
# so a failure never closes the session that ran `irm | iex`.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$repository = 'francoisnoel62/Boardroom'

function Get-Setting([string]$Name, [string]$Default) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrEmpty($value)) { return $Default }
  return $value
}

function Save-Download([string]$Url, [string]$Destination) {
  $uri = [Uri]$Url
  if ($uri.IsFile) { Copy-Item -LiteralPath $uri.LocalPath -Destination $Destination }
  else { Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination }
}

# .NET directly: Get-FileHash is missing when Windows PowerShell inherits PowerShell 7's module path.
function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $bytes = $sha.ComputeHash($stream) } finally { $sha.Dispose() }
  }
  finally { $stream.Dispose() }
  return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

try {
  $platform = (Get-Setting 'BOARDROOM_PLATFORM' 'windows').ToLowerInvariant()
  $detectedArch = $env:PROCESSOR_ARCHITECTURE
  if ($env:PROCESSOR_ARCHITEW6432) { $detectedArch = $env:PROCESSOR_ARCHITEW6432 }
  $arch = (Get-Setting 'BOARDROOM_ARCH' $detectedArch).ToLowerInvariant()
  if ($arch -eq 'amd64') { $arch = 'x64' }
  if ("$platform-$arch" -ne 'windows-x64') {
    throw "BOARDROOM installer: $platform-$arch is not a qualified platform. Qualified: Windows x64 (and Linux x64, macOS arm64 with install.sh). You can build from source instead."
  }

  $base = Get-Setting 'BOARDROOM_DOWNLOAD_BASE' ''
  $version = Get-Setting 'BOARDROOM_VERSION' ''
  if ([string]::IsNullOrEmpty($version)) {
    if ($base) { throw 'BOARDROOM installer: BOARDROOM_VERSION is required with BOARDROOM_DOWNLOAD_BASE.' }
    # The newest release, including developer previews (GitHub's "latest" excludes prereleases).
    $releases = @(Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$repository/releases?per_page=1")
    if ($releases.Count -eq 0) { throw "BOARDROOM installer: no published release was found. Build from source: https://github.com/$repository#readme" }
    $version = ([string]$releases[0].tag_name) -replace '^v', ''
  }
  if (-not $base) { $base = "https://github.com/$repository/releases/download/v$version" }
  $asset = "boardroom-$version-$platform-$arch.tar.gz"

  $work = Join-Path ([IO.Path]::GetTempPath()) ("boardroom-install-" + [Guid]::NewGuid())
  New-Item -ItemType Directory -Path $work | Out-Null
  try {
    Write-Output "Downloading BOARDROOM $version for $platform-$arch"
    $sums = Join-Path $work 'SHA256SUMS'
    Save-Download "$base/SHA256SUMS" $sums
    $expected = $null
    foreach ($line in Get-Content -LiteralPath $sums) {
      $fields = $line -split '\s+', 2
      if ($fields.Count -eq 2 -and $fields[1].TrimStart('*') -eq $asset) { $expected = $fields[0].ToLowerInvariant(); break }
    }
    if (-not $expected) { throw "BOARDROOM installer: No package for $platform-$arch in release $version." }

    $archive = Join-Path $work $asset
    Save-Download "$base/$asset" $archive
    $actual = Get-Sha256 $archive
    if ($actual -ne $expected) {
      throw "BOARDROOM installer: checksum mismatch for $asset (expected $expected, got $actual). Nothing was installed."
    }
    Write-Output "Checksum verified: $actual"

    $extract = Join-Path $work 'extract'
    New-Item -ItemType Directory -Path $extract | Out-Null
    # Windows' own bsdtar (Windows 10 1803+): another tar.exe on PATH may not understand drive letters.
    $tar = 'tar.exe'
    if ($env:SystemRoot -and (Test-Path -LiteralPath (Join-Path $env:SystemRoot 'System32\tar.exe'))) {
      $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    }
    & $tar -xzf $archive -C $extract --strip-components=1
    if ($LASTEXITCODE -ne 0) { throw "BOARDROOM installer: could not extract $asset." }
    if (-not (Test-Path -LiteralPath (Join-Path $extract 'boardroom.cmd'))) { throw "BOARDROOM installer: $asset does not contain boardroom.cmd." }

    $programs = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Programs' } else { Join-Path $HOME '.boardroom' }
    $installDir = Get-Setting 'BOARDROOM_INSTALL_DIR' (Join-Path $programs 'Boardroom')
    $binDir = Get-Setting 'BOARDROOM_BIN_DIR' (Join-Path $installDir 'bin')
    $versions = Join-Path $installDir 'versions'
    $target = Join-Path $versions $version
    New-Item -ItemType Directory -Force -Path $versions | Out-Null
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    Move-Item -LiteralPath $extract -Destination $target

    # cmd.exe decodes batch files with the console's active code page, which varies, so the relay
    # avoids depending on it: a path relative to the relay when it lives in the install directory,
    # an ASCII absolute path otherwise, and as a last resort a UTF-8 relay that switches the code page.
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
    $relayPath = Join-Path $binDir 'boardroom.cmd'
    $defaultBin = Join-Path $installDir 'bin'
    if ([IO.Path]::GetFullPath($binDir).TrimEnd('\') -eq [IO.Path]::GetFullPath($defaultBin).TrimEnd('\')) {
      $relay = "@echo off`r`n`"%~dp0..\versions\$version\boardroom.cmd`" %*`r`n"
    }
    elseif ($target -match '^[\x20-\x7E]+$') {
      $relay = "@echo off`r`n`"$target\boardroom.cmd`" %*`r`n"
    }
    else {
      $relay = "@echo off`r`nsetlocal`r`n" +
        "for /f `"tokens=2 delims=:.`" %%c in ('chcp') do set `"BOARDROOM_CP=%%c`"`r`n" +
        "chcp 65001 >nul`r`n" +
        "call `"$target\boardroom.cmd`" %*`r`n" +
        "set `"BOARDROOM_EXIT=%errorlevel%`"`r`n" +
        "chcp %BOARDROOM_CP% >nul`r`n" +
        "exit /b %BOARDROOM_EXIT%`r`n"
    }
    [IO.File]::WriteAllText($relayPath, $relay, (New-Object Text.UTF8Encoding $false))

    if ((Get-Setting 'BOARDROOM_NO_MODIFY_PATH' '') -ne '1') {
      $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
      $entries = @($userPath -split ';' | Where-Object { $_ })
      if ($entries -notcontains $binDir) {
        [Environment]::SetEnvironmentVariable('Path', (($entries + $binDir) -join ';'), 'User')
        $env:Path = "$env:Path;$binDir"
        Write-Output "Added $binDir to your user PATH. New terminals will find boardroom."
      }
    }
    Write-Output "Installed BOARDROOM $version in $target"
    Write-Output 'Next: boardroom demo'
  }
  finally {
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  }
}
catch {
  # One unwrapped line for people and scripts, then the original error.
  [Console]::Error.WriteLine($_.Exception.Message)
  throw
}
