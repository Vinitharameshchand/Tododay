# ==============================================================================
# DeskNotes - Pin to Desktop & Windows Default Shortcut Creator
# ==============================================================================

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$AppDir = $PSScriptRoot
if (-not $AppDir) { $AppDir = (Get-Location).Path }

# 1. Create Desktop Shortcut to Launch the Widget
$ShortcutPath = Join-Path $DesktopPath "DeskNotes.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $AppDir "Launch-Widget.bat"
$Shortcut.WorkingDirectory = $AppDir
$Shortcut.Description = "DeskNotes - Bento Desktop Widget"
$Shortcut.Hotkey = "Ctrl+Alt+N"  # Global native Windows hotkey alternative

# Check if Edge icon exists for nice icon
$EdgeIcon = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $EdgeIcon)) {
    $EdgeIcon = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (Test-Path $EdgeIcon) {
    $Shortcut.IconLocation = "$EdgeIcon,0"
}

# Also create a local shortcut in the project folder
$LocalShortcutPath = Join-Path $AppDir "DeskNotes.lnk"
$LocalShortcut = $WshShell.CreateShortcut($LocalShortcutPath)
$LocalShortcut.TargetPath = Join-Path $AppDir "Launch-Widget.bat"
$LocalShortcut.WorkingDirectory = $AppDir
$LocalShortcut.Description = "DeskNotes - Bento Desktop Widget"
$LocalShortcut.Hotkey = "Ctrl+Alt+N"
if (Test-Path $EdgeIcon) { $LocalShortcut.IconLocation = "$EdgeIcon,0" }
$LocalShortcut.Save()

try {
    $Shortcut.Save()
    Write-Host "[OK] Pinned 'DeskNotes' shortcut directly to your Desktop at:" -ForegroundColor Green
    Write-Host "     $ShortcutPath" -ForegroundColor White
} catch {
    Write-Host "[INFO] Created 'DeskNotes.lnk' in your project folder." -ForegroundColor Yellow
}
Write-Host "     [Native Windows Shortcut Hotkey: Ctrl+Alt+N]" -ForegroundColor Gray

# 2. Register in Windows Startup folder so '13' pop-up runs automatically
$StartupFolder = [Environment]::GetFolderPath("Startup")

# Remove misplaced batch files in Startup if present
$MisplacedBat = Join-Path $StartupFolder "Enable-Startup.bat"
if (Test-Path $MisplacedBat) {
    try { Remove-Item $MisplacedBat -Force -ErrorAction SilentlyContinue } catch {}
}

$StartupShortcutPath = Join-Path $StartupFolder "DeskNotes-Service.lnk"
$StartupShortcut = $WshShell.CreateShortcut($StartupShortcutPath)
$StartupShortcut.TargetPath = Join-Path $AppDir "Start-PopupService-Silently.vbs"
$StartupShortcut.WorkingDirectory = $AppDir
$StartupShortcut.Description = "DeskNotes Background 'Type 13' Pop-Up Service"
try {
    $StartupShortcut.Save()
    Write-Host "[OK] Added 'Type 13' Pop-up Service to Windows Startup:" -ForegroundColor Green
    Write-Host "     $StartupShortcutPath" -ForegroundColor White
} catch {
    Write-Host "[INFO] Run 'Pin-To-Desktop.bat' with a double-click to enable auto-start on boot." -ForegroundColor Gray
}

Write-Host "`nAll set! Double-click 'Start-PopupService.bat' to start the '13' listener now." -ForegroundColor Cyan
