@echo off
rem Double-click entry point for the House Manual, and the target of the
rem desktop shortcut. Keeps this console open for as long as the server runs;
rem close the window to stop it.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-house-manual.ps1" %*
