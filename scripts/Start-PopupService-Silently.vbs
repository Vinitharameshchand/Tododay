' Silent VBScript launcher to start DeskNotes-PopupService.ps1 with NO command prompt window
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strCurDir = fso.GetParentFolderName(WScript.ScriptFullName)
strPs1 = strCurDir & "\DeskNotes-PopupService.ps1"

' Fallback if executed from Windows Startup folder
If Not fso.FileExists(strPs1) Then
    userProfile = WshShell.ExpandEnvironmentStrings("%USERPROFILE%")
    If fso.FileExists(userProfile & "\OneDrive\Desktop\notes-diy\DeskNotes-PopupService.ps1") Then
        strPs1 = userProfile & "\OneDrive\Desktop\notes-diy\DeskNotes-PopupService.ps1"
    ElseIf fso.FileExists(userProfile & "\Desktop\notes-diy\DeskNotes-PopupService.ps1") Then
        strPs1 = userProfile & "\Desktop\notes-diy\DeskNotes-PopupService.ps1"
    End If
End If

strCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPs1 & """"
WshShell.Run strCommand, 0, False
