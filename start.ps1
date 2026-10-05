$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$localNodeDirectory = Join-Path $PSScriptRoot '.tools\node-v24.12.0-win-x64'
if (Test-Path -LiteralPath (Join-Path $localNodeDirectory 'node.exe')) {
    $env:PATH = $localNodeDirectory + ';' + $env:PATH
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Install Node.js 24 LTS, then run this script again.'
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
    throw 'Run npm ci before starting the website.'
}
npm.cmd run dev
