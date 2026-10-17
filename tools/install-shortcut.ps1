<#
.SYNOPSIS
  Creates the "House Manual" shortcut on the desktop.

.DESCRIPTION
  Points at start-house-manual.ps1 via powershell.exe, so a double-click starts
  the server and opens the app. Re-run this any time to recreate or repair the
  shortcut. Use -StartMenu to add one to the Start Menu as well, and -Remove to
  take them away again.

.EXAMPLE
  .\tools\install-shortcut.ps1
  .\tools\install-shortcut.ps1 -StartMenu
  .\tools\install-shortcut.ps1 -Remove
#>
[CmdletBinding()]
param(
    [string]$Name = 'House Manual',
    [int]$Port = 8347,
    [switch]$StartMenu,
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$here = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$project = (Resolve-Path (Join-Path $here '..')).Path
$launcher = Join-Path $project 'start-house-manual.ps1'
$icon = Join-Path $project 'assets\house-manual.ico'

foreach ($required in $launcher, $icon) {
    if (-not (Test-Path $required)) { throw "Missing $required" }
}

# Honours a redirected (OneDrive) desktop.
$targets = @([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), "$Name.lnk"))
if ($StartMenu) {
    $programs = [Environment]::GetFolderPath('Programs')
    $targets += [System.IO.Path]::Combine($programs, "$Name.lnk")
}

if ($Remove) {
    foreach ($t in $targets) {
        if (Test-Path $t) { Remove-Item $t -Force; Write-Host "  Removed $t" }
        else { Write-Host "  Not present: $t" }
    }
    return
}

$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shell = New-Object -ComObject WScript.Shell

foreach ($target in $targets) {
    $parent = Split-Path -Parent $target
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }

    $link = $shell.CreateShortcut($target)
    $link.TargetPath = $powershell
    $link.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -Port $Port"
    $link.WorkingDirectory = $project
    $link.IconLocation = "$icon,0"
    $link.Description = 'Start the House Manual and open it in your browser'
    $link.WindowStyle = 1
    $link.Save()
    Write-Host "  Created $target" -ForegroundColor Green
}

[Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
Write-Host ""
Write-Host "  Double-click `"$Name`" to start the app at http://localhost:$Port/" -ForegroundColor Cyan
Write-Host "  Close the window it opens to stop the server."
