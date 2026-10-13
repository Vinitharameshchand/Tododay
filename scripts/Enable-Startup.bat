@echo off
title Setup DeskNotes Startup
cd /d "%~dp0"
echo ========================================================
echo   Enabling DeskNotes and 'Type 13' Service on Startup
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $StartupFolder = [Environment]::GetFolderPath('Startup'); $AppDir = (Get-Location).Path; $MisplacedBat = Join-Path $StartupFolder 'Enable-Startup.bat'; if (Test-Path $MisplacedBat) { Remove-Item $MisplacedBat -Force }; $ServiceLnk = Join-Path $StartupFolder 'DeskNotes-Service.lnk'; $S = $WshShell.CreateShortcut($ServiceLnk); $S.TargetPath = Join-Path $AppDir 'Start-PopupService-Silently.vbs'; $S.WorkingDirectory = $AppDir; $S.Description = 'DeskNotes Type 13 Popup Service'; $S.Save(); Copy-Item (Join-Path $AppDir 'Start-PopupService-Silently.vbs') (Join-Path $StartupFolder 'DeskNotes-PopupService.vbs') -Force; $DesktopPath = [Environment]::GetFolderPath('Desktop'); $DeskLnk = Join-Path $DesktopPath 'DeskNotes.lnk'; $D = $WshShell.CreateShortcut($DeskLnk); $D.TargetPath = Join-Path $AppDir 'Launch-Widget.bat'; $D.WorkingDirectory = $AppDir; $D.Description = 'DeskNotes Bento Desktop Widget'; $D.Hotkey = 'Ctrl+Alt+N'; $D.Save(); Write-Host '  Startup and Desktop shortcuts registered successfully!' -ForegroundColor Green"
echo.
echo ========================================================
echo  DONE! DeskNotes will now start automatically on boot.
echo ========================================================
timeout /t 3 >nul
exit /b 0
