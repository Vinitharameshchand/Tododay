# ==============================================================================
# DeskNotes Instant Pop-Up Service (v4 - Process-Safe Win32 Foreground Engine)
# ==============================================================================

$AppDir = $PSScriptRoot
if (-not $AppDir -and $MyInvocation.MyCommand.Path) {
    $AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $AppDir) {
    $AppDir = (Get-Location).Path
}
if (-not (Test-Path (Join-Path $AppDir "index.html"))) {
    $ParentDir = Split-Path -Parent $AppDir
    if (Test-Path (Join-Path $ParentDir "index.html")) {
        $AppDir = $ParentDir
    }
}
if (-not (Test-Path (Join-Path $AppDir "index.html"))) {
    $AppDir = "c:\Users\homej\OneDrive\Desktop\notes-diy"
}
$HtmlPath = Join-Path $AppDir "index.html"
$FileUri = "file:///" + $HtmlPath.Replace("\", "/")

$Source = @"
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

public class DeskNotesHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;

    private static LowLevelKeyboardProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;
    
    private static int _lastVk = 0;
    private static long _lastTick = 0;

    public static string AppUrl = "$FileUri";

    public static void Start() {
        _hookID = SetHook(_proc);
        Application.Run();
    }

    public static void Stop() {
        if (_hookID != IntPtr.Zero) {
            UnhookWindowsHookEx(_hookID);
            _hookID = IntPtr.Zero;
        }
        Application.Exit();
    }

    private static IntPtr SetHook(LowLevelKeyboardProc proc) {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule) {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
            int vkCode = Marshal.ReadInt32(lParam);
            long now = Environment.TickCount;

            // Check modifier keys: Shift (0x10), Ctrl (0x11), Alt (0x12)
            bool shiftDown = (GetKeyState(0x10) & 0x8000) != 0;
            bool ctrlDown  = (GetKeyState(0x11) & 0x8000) != 0;
            bool altDown   = (GetKeyState(0x12) & 0x8000) != 0;

            if (ctrlDown || altDown) {
                // Ignore hotkey combinations in other apps
                _lastVk = 0;
            } else if (!shiftDown && (vkCode == 0x31 || vkCode == 0x61)) {
                // Key '1' pressed without Shift (not '!')
                _lastVk = 1;
                _lastTick = now;
            } else if (!shiftDown && (vkCode == 0x33 || vkCode == 0x63)) {
                // Key '3' pressed without Shift (not '#')
                if (_lastVk == 1 && (now - _lastTick) < 1300) {
                    _lastVk = 0;
                    TriggerPopup(false); // Triggered by '13', DO NOT minimize if DeskNotes is already active
                } else {
                    _lastVk = 0;
                }
            } else {
                // Any other regular key resets the sequence
                if (vkCode != 0x10 && vkCode != 0x11 && vkCode != 0x12 && 
                    vkCode != 0xA0 && vkCode != 0xA1 && vkCode != 0xA2 && vkCode != 0xA3) {
                    _lastVk = 0;
                }
            }

            // Also support F12 (VK_F12 = 0x7B) and Shift+F12
            if (vkCode == 0x7B) {
                if (shiftDown) {
                    TogglePinOnTop(); // Shift+F12 pins or unpins window on top!
                } else {
                    TriggerPopup(true); // F12 toggles minimize / restore
                }
            }
        }
        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static void TriggerPopup(bool allowToggle) {
        try {
            // 1. Get active screen based on cursor position
            Point cursorPos = Cursor.Position;
            Screen activeScreen = Screen.FromPoint(cursorPos);
            Rectangle workArea = activeScreen.WorkingArea;

            int targetW = Math.Min(920, workArea.Width - 40);
            int targetH = Math.Min(720, workArea.Height - 40);
            int targetX = workArea.X + (workArea.Width - targetW) / 2;
            int targetY = workArea.Y + (workArea.Height - targetH) / 2;

            // 2. Locate DeskNotes window strictly within msedge or chrome processes
            IntPtr targetHwnd = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                if (IsWindow(hWnd)) {
                    uint pid = 0;
                    GetWindowThreadProcessId(hWnd, out pid);
                    if (pid != 0) {
                        try {
                            string procName = Process.GetProcessById((int)pid).ProcessName;
                            if (procName.Equals("msedge", StringComparison.OrdinalIgnoreCase) ||
                                procName.Equals("chrome", StringComparison.OrdinalIgnoreCase)) {
                                StringBuilder sb = new StringBuilder(256);
                                GetWindowText(hWnd, sb, 256);
                                string title = sb.ToString();
                                if (!string.IsNullOrEmpty(title) && title.IndexOf("DeskNotes", StringComparison.OrdinalIgnoreCase) >= 0) {
                                    targetHwnd = hWnd;
                                    return false; // Found the exact widget window
                                }
                            }
                        } catch {}
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (targetHwnd != IntPtr.Zero) {
                IntPtr fgWnd = GetForegroundWindow();
                if (fgWnd == targetHwnd) {
                    // DeskNotes is ALREADY the active foreground window
                    if (allowToggle) {
                        // Explicit F12 toggle -> minimize it
                        ShowWindowAsync(targetHwnd, 6); // SW_MINIMIZE = 6
                    } else {
                        // User typed '13' while inside DeskNotes -> do not close or minimize!
                        return;
                    }
                } else {
                    // Restore and move to active monitor where the mouse cursor is
                    ShowWindowAsync(targetHwnd, 9); // SW_RESTORE = 9
                    
                    // Bring to front
                    SetWindowPos(targetHwnd, new IntPtr(-1), targetX, targetY, targetW, targetH, 0x0040); // HWND_TOPMOST, SWP_SHOWWINDOW
                    SetWindowPos(targetHwnd, new IntPtr(-2), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);     // HWND_NOTOPMOST, SWP_NOMOVE | SWP_NOSIZE

                    // Bypass Windows foreground lock timeout via simulated Alt key
                    keybd_event(0x12, 0, 0, UIntPtr.Zero);
                    SetForegroundWindow(targetHwnd);
                    BringWindowToTop(targetHwnd);
                    keybd_event(0x12, 0, 2, UIntPtr.Zero);
                }
            } else {
                // Window not open -> Launch fresh instance on active screen
                string edge = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edge)) {
                    edge = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                }
                if (!File.Exists(edge)) {
                    edge = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + @"\Microsoft\Edge\Application\msedge.exe";
                }
                if (!File.Exists(edge)) {
                    edge = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                }
                if (!File.Exists(edge)) {
                    edge = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
                }

                string args = string.Format("--app=\"{0}\" --window-size={1},{2} --window-position={3},{4}", AppUrl, targetW, targetH, targetX, targetY);
                Process.Start(edge, args);
            }
        } catch {
            // Fail silently
        }
    }

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern short GetKeyState(int nVirtKey);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    public static void TogglePinOnTop() {
        try {
            IntPtr targetHwnd = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                if (IsWindow(hWnd)) {
                    uint pid = 0;
                    GetWindowThreadProcessId(hWnd, out pid);
                    if (pid != 0) {
                        try {
                            string proc = Process.GetProcessById((int)pid).ProcessName;
                            if (proc.Equals("msedge", StringComparison.OrdinalIgnoreCase) || proc.Equals("chrome", StringComparison.OrdinalIgnoreCase)) {
                                StringBuilder sb = new StringBuilder(256);
                                GetWindowText(hWnd, sb, 256);
                                if (sb.ToString().IndexOf("DeskNotes", StringComparison.OrdinalIgnoreCase) >= 0) {
                                    targetHwnd = hWnd;
                                    return false;
                                }
                            }
                        } catch {}
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (targetHwnd != IntPtr.Zero) {
                int exStyle = GetWindowLong(targetHwnd, -20);
                bool isTopMost = (exStyle & 0x0008) != 0;
                if (isTopMost) {
                    SetWindowPos(targetHwnd, new IntPtr(-2), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
                } else {
                    SetWindowPos(targetHwnd, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
                }
            }
        } catch {}
    }

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

Add-Type -TypeDefinition $Source -ReferencedAssemblies System.Windows.Forms, System.Drawing

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     DeskNotes 'Type 13' Pop-Up Engine Running (v4)       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Type '13' (or press F12) anywhere on your keyboard to"
Write-Host "pop up DeskNotes on whichever screen your mouse is on!"
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host "=========================================================="

[DeskNotesHook]::Start()
