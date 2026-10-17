<#
.SYNOPSIS
  Serves the House Manual app over HTTP with no external dependencies.

.DESCRIPTION
  This machine has no Node, Python, or Git installed, so this script uses the
  .NET HttpListener that ships with Windows PowerShell. Serving over http://
  rather than opening index.html directly matters: localStorage is scoped per
  origin, and file:// origins are unreliable for it.

.EXAMPLE
  .\serve.ps1
  .\serve.ps1 -Port 8080 -Root baseline
#>
[CmdletBinding()]
param(
    [int]$Port = 8347,
    [string]$Root = 'dist',
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$rootPath = Join-Path $PSScriptRoot $Root
if (-not (Test-Path $rootPath)) { throw "Root directory not found: $rootPath" }
$rootFull = (Resolve-Path $rootPath).Path

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.png'  = 'image/png'
    '.woff2' = 'font/woff2'
}

# Try the requested port, then a few fallbacks, so a stray dev server elsewhere
# on the machine doesn't stop this one from starting.
$listener = $null
foreach ($candidate in @($Port, 8412, 8590, 9123)) {
    $attempt = New-Object System.Net.HttpListener
    $attempt.Prefixes.Add("http://localhost:$candidate/")
    try {
        $attempt.Start()
        $listener = $attempt
        if ($candidate -ne $Port) {
            Write-Host "  Port $Port was busy; using $candidate instead." -ForegroundColor Yellow
        }
        $Port = $candidate
        break
    } catch {
        $attempt.Close()
    }
}

if (-not $listener) {
    throw "Could not bind to port $Port or any fallback (8412, 8590, 9123). Pass an explicit free port with -Port."
}

Write-Host ""
Write-Host "  House Manual  ->  http://localhost:$Port/" -ForegroundColor Cyan
Write-Host "  Serving       :  $rootFull"
Write-Host "  Stop          :  Ctrl+C"
Write-Host ""

if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $relative = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
            $relative = $relative -replace '/', '\'

            $candidate = Join-Path $rootFull $relative
            $resolved = $null
            try { $resolved = (Resolve-Path -LiteralPath $candidate -ErrorAction Stop).Path } catch { }

            # Refuse anything that escapes the served root.
            if ($resolved -and -not $resolved.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
                $resolved = $null
            }

            if ($resolved -and (Test-Path -LiteralPath $resolved -PathType Leaf)) {
                $bytes = [System.IO.File]::ReadAllBytes($resolved)
                $extension = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()
                $response.ContentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
                $response.StatusCode = 200
                # No caching, so edits show up on a plain reload.
                $response.Headers.Add('Cache-Control', 'no-store, must-revalidate')
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                Write-Host ("  200  /{0}" -f ($relative -replace '\\', '/')) -ForegroundColor DarkGray
            } else {
                $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $response.StatusCode = 404
                $response.ContentType = 'text/plain; charset=utf-8'
                $response.ContentLength64 = $body.Length
                $response.OutputStream.Write($body, 0, $body.Length)
                Write-Host ("  404  /{0}" -f ($relative -replace '\\', '/')) -ForegroundColor Yellow
            }
        } catch {
            $response.StatusCode = 500
            Write-Host "  500  $($_.Exception.Message)" -ForegroundColor Red
        } finally {
            $response.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "`n  Server stopped." -ForegroundColor Cyan
}
