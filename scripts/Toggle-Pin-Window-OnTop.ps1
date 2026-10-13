# ==============================================================================
# DeskNotes - Toggle Always-On-Top Window Pin
# ==============================================================================

Add-Type @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class WindowPinner {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    public static string Toggle() {
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

        if (targetHwnd == IntPtr.Zero) {
            return "NOT_FOUND";
        }

        int exStyle = GetWindowLong(targetHwnd, -20); // GWL_EXSTYLE = -20
        bool isTopMost = (exStyle & 0x0008) != 0;     // WS_EX_TOPMOST = 0x0008

        if (isTopMost) {
            SetWindowPos(targetHwnd, new IntPtr(-2), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040); // HWND_NOTOPMOST
            return "UNPINNED";
        } else {
            SetWindowPos(targetHwnd, new IntPtr(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040); // HWND_TOPMOST
            return "PINNED";
        }
    }
}
"@

$result = [WindowPinner]::Toggle()
if ($result -eq "PINNED") {
    Write-Host "[PINNED] DeskNotes is now floating ON TOP of all other windows!" -ForegroundColor Green
    Write-Host "         It will stay visible even when you click other apps." -ForegroundColor White
} elseif ($result -eq "UNPINNED") {
    Write-Host "[UNPINNED] DeskNotes will now act like a normal window." -ForegroundColor Yellow
} else {
    Write-Host "[INFO] DeskNotes is not currently open. Double-click 'Launch-Widget.bat' first!" -ForegroundColor Cyan
}
