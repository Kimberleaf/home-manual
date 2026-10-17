<#
.SYNOPSIS
  What the desktop shortcut runs: opens the House Manual, starting the server
  only if it is not already up.

.DESCRIPTION
  Double-clicking twice should not leave two servers running. If the port is
  already serving the app, this just opens a browser at it. Otherwise it hands
  off to serve.ps1, which holds this window for as long as the server runs.

  Closing this window stops the server.
#>
[CmdletBinding()]
param([int]$Port = 8347)

$ErrorActionPreference = 'Stop'
$here = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$url = "http://localhost:$Port/"

function Test-AlreadyServing {
    try {
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Timeout = 1200
        $request.Method = 'GET'
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close(); $response.Close()
        # Make sure it is this app and not some other project on the same port.
        return $body -match '<title>House Manual Review</title>'
    } catch {
        return $false
    }
}

if (Test-AlreadyServing) {
    Write-Host ""
    Write-Host "  House Manual is already running at $url" -ForegroundColor Cyan
    Write-Host "  Opening it in your browser."
    Write-Host ""
    Start-Process $url
    Start-Sleep -Seconds 2
    exit 0
}

& (Join-Path $here 'serve.ps1') -Port $Port
