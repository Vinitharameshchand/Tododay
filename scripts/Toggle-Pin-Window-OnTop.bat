@echo off
title ToggleDeskNotesPin
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Toggle-Pin-Window-OnTop.ps1"
echo.
ping 127.0.0.1 -n 3 >nul
exit /b 0
