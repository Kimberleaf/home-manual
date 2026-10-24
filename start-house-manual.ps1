<#
.SYNOPSIS
  What the desktop shortcut runs: starts the House Manual home server and
  opens the app.

.DESCRIPTION
  Runs server/server.js with Node.js. The server serves the app to every
  device on the home network and keeps the one shared copy of the data in
  data/. If it is already running, this just opens a browser at it.

  Closing this window stops the app for everyone.

.EXAMPLE
  .\start-house-manual.ps1
  .\start-house-manual.ps1 -NoOpen      # start without opening a browser
#>
[CmdletBinding()]
param(
    [int]$Port = 8347,
    [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$here = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$server = Join-Path $here 'server\server.js'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host ""
    Write-Host "  Node.js isn't installed (or isn't on PATH). Install it from https://nodejs.org," -ForegroundColor Yellow
    Write-Host "  or run .\serve.ps1 for the browser-only version (no shared data)."
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}

$arguments = @($server, '--port', $Port)
if ($NoOpen) { $arguments += '--no-open' }
& $node.Source @arguments
