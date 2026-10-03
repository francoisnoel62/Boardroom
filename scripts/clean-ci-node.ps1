param([Parameter(Mandatory=$true)][string]$ProofPath)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or -not $env:RUNNER_TOOL_CACHE) {
  throw 'Node removal is allowed only in an ephemeral GitHub-hosted qualification VM.'
}
$programNode = [IO.Path]::GetFullPath((Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'nodejs'))
$cacheRoot = [IO.Path]::GetFullPath($env:RUNNER_TOOL_CACHE)
$cachedNode = [IO.Path]::GetFullPath((Join-Path $cacheRoot 'node'))
if (-not $cachedNode.StartsWith($cacheRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $programNode -ne 'C:\Program Files\nodejs') { throw 'Unexpected Node removal targets.' }
$targets = @($programNode, $cachedNode)
$found = @(Get-Command node.exe -All -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
foreach ($executable in $found) {
  if (-not ($targets | Where-Object { $executable.StartsWith($_.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) })) {
    throw "Unrecognized application Node location: $executable"
  }
}
foreach ($target in $targets) {
  # These exact absolute targets were checked against the system Node and runner cache roots above.
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
}
if (Get-Command node.exe -ErrorAction SilentlyContinue) { throw 'An application Node is still installed on PATH.' }
foreach ($target in $targets) { if (Test-Path -LiteralPath $target) { throw "Node remains at $target" } }
@{ schemaVersion = 1; strategy = 'fresh-windows-vm-system-and-cache-node-removed'; systemNodeVisible = $false;
   absentPaths = $targets; removedExecutables = $found;
   controlPlane = 'GitHub runner internal action runtimes remain off application PATH; the application uses its bundled Node.'
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ProofPath -Encoding utf8
