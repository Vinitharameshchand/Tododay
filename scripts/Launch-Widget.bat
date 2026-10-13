@echo off
title LaunchDeskNotesWidget
setlocal

:: Get absolute path to index.html (parent directory when inside scripts/)
if exist "%~dp0..\index.html" (
    for %%I in ("%~dp0..\index.html") do set "HTML_PATH=%%~fI"
) else (
    set "HTML_PATH=%~dp0index.html"
)

:: Convert backslashes to forward slashes for the file:/// URI
set "FILE_URI=file:///%HTML_PATH:\=/%"

echo ========================================================
echo       Launching DeskNotes Bento Desktop Widget
echo ========================================================
echo Opening in standalone, borderless Bento mode...
echo.

:: Check for Microsoft Edge 32-bit & 64-bit
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%FILE_URI%" --window-size=920,720 --window-position=1100,60
    exit /b 0
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="%FILE_URI%" --window-size=920,720 --window-position=1100,60
    exit /b 0
)

if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" --app="%FILE_URI%" --window-size=920,720 --window-position=1100,60
    exit /b 0
)

:: Check for Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%FILE_URI%" --window-size=920,720 --window-position=1100,60
    exit /b 0
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="%FILE_URI%" --window-size=920,720 --window-position=1100,60
    exit /b 0
)

if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app="%FILE_URI%" --window-size=920,720 --window-position=1100,60
    exit /b 0
)

:: Fallback default browser
start "" "%FILE_URI%"
exit /b 0
