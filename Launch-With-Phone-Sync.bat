@echo off
title DeskNotes Mobile & Desktop Launcher
cd /d "%~dp0"
echo Starting DeskNotes with Phone LAN Sharing...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Local-Server.ps1"
pause
