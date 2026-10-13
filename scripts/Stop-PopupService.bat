@echo off
title StopDeskNotesService
echo Stopping DeskNotes Background Pop-Up Service...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*DeskNotes-PopupService.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Service stopped.
ping 127.0.0.1 -n 2 >nul
exit /b 0
