@echo off
title DeskNotesService
cd /d "%~dp0"
echo ========================================================
echo        Starting DeskNotes 'Type 13' Pop-Up Service
echo ========================================================
echo Running invisibly in the background...
wscript.exe "%~dp0Start-PopupService-Silently.vbs"
echo.
echo [DONE] The service is now active in the background.
echo Now, whenever you type '13' on your keyboard (or press F12),
echo DeskNotes will instantly pop up right on your active screen!
echo ========================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0
