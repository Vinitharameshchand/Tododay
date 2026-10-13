@echo off
title SetupDeskNotes
cd /d "%~dp0"

echo ========================================================
echo               DeskNotes 1-Click Setup
echo ========================================================
echo.
echo 1. Pinning shortcut to your Desktop and Startup...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Pin-To-Desktop.ps1"

echo.
echo 2. Starting background 'Type 13' pop-up service...
wscript.exe "%~dp0Start-PopupService-Silently.vbs"

echo.
echo 3. Opening DeskNotes Widget on your screen...
call "%~dp0Launch-Widget.bat"

echo.
echo ========================================================
echo  SUCCESS! DeskNotes is installed and running.
echo.
echo  * Type '13' (or press F12) anywhere on your keyboard
echo    to instantly pop up DeskNotes on your active screen!
echo  * Pinned Desktop Shortcut Hotkey: Ctrl+Alt+N
echo ========================================================
echo.
ping 127.0.0.1 -n 4 >nul
exit /b 0
