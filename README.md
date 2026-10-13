# 📝 Tododay (DeskNotes) • Balsamiq Wireframe Bento Widget

A hand-drawn, tactile **Balsamiq Mockup & Wireframe** styled desktop and mobile companion built around an Apple-inspired **Bento Grid layout**. Features sketched ink borders, graph-paper canvas, highlighter marker accents, and rapid wireframe aesthetics.

---

## 📁 Project Structure

```text
Tododay/
├── css/
│   └── style.css           # Bento grid & wireframe aesthetic stylesheets
├── js/
│   └── app.js              # Core logic, reactive store, audio, & sync engine
├── scripts/                # Windows automation & desktop widget helpers
│   ├── DeskNotes-PopupService.ps1      # Win32 global "13" & F12 listener
│   ├── Enable-Startup.bat              # Auto-start configuration script
│   ├── Launch-Widget.bat               # Borderless Edge/Chrome app launcher
│   ├── Launch-With-Phone-Sync.bat      # Local Wi-Fi mobile LAN launcher
│   ├── Pin-To-Desktop.bat / .ps1       # Desktop shortcut & hotkey creator
│   ├── Start-Local-Server.ps1          # Zero-dependency PowerShell HTTP server
│   ├── Start-PopupService-Silently.vbs # Hidden background runner
│   ├── Start-PopupService.bat          # Start pop-up listener
│   ├── Stop-PopupService.bat           # Kill background listener
│   └── Toggle-Pin-Window-OnTop.bat     # Win32 Always-On-Top window toggler
├── .gitignore              # Ignores local shortcuts, OS metadata, & caches
├── index.html              # Main web entry point (PWA & Desktop)
├── Launch-Widget.bat       # 1-Click root launcher
├── manifest.json           # Web App Manifest (standalone mobile PWA)
├── README.md               # Documentation & setup guide
└── sw.js                   # Service Worker (offline-first caching)
```

---

## 📌 Pinning & Global "Type 13" Pop-Up

### 1. Pin to Desktop & Windows Default
Double-click:
```text
scripts\Pin-To-Desktop.bat
```
- Creates a **DeskNotes.lnk** shortcut directly on your **Windows Desktop**.
- Sets a native Windows hotkey: <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>N</kbd>.
- You can right-click the Desktop shortcut $\rightarrow$ select **"Pin to Taskbar"** to keep it docked at the bottom of Windows.
- Automatically places a shortcut in your Windows **Startup folder** so your hotkey listener starts when you turn on your PC.

### 2. The "Type 13" Instant Screen-Aware Pop-Up
Double-click:
```text
scripts\Start-PopupService.bat
```
- Starts a silent background service (uses < 15MB RAM, 0% CPU).
- **How it works**:
  - Whenever you type **`1`** then **`3`** anywhere on your keyboard (or press <kbd>F12</kbd>):
    1. It detects **which monitor/screen your mouse cursor is currently on**.
    2. Moves and pops up DeskNotes directly onto that active screen!
    3. When typing notes inside DeskNotes, typing numbers like "13" safely keeps the window open.
    4. Pressing <kbd>F12</kbd> acts as an instant global toggle.
- **To stop the service anytime**:
  Double-click `scripts\Stop-PopupService.bat`.

### 3. Pin Window On Top ("Always on Top")
Keep DeskNotes pinned floating above all other windows (e.g. while writing in Word, coding, or watching videos):
- **Option A (Hotkey)**: Press <kbd>Shift</kbd> + <kbd>F12</kbd> anywhere on your keyboard.
- **Option B (1-Click Script)**: Double-click `scripts\Toggle-Pin-Window-OnTop.bat` to pin or unpin.
- **Option C (Taskbar)**: When DeskNotes is open, right-click its taskbar icon $\rightarrow$ select **"Pin to taskbar"**.

---

## 💾 Where Your Data is Stored

1. **Storage Technology**:
   - Modern browser **HTML5 LocalStorage** via key: `desknotes_app_state_v1`.
2. **Exact Physical Location on Windows**:
   - When launched through Microsoft Edge:
     ```text
     %LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb
     ```
   - When launched through Google Chrome:
     ```text
     %LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb
     ```
3. **On Your Phone**:
   - Sandboxed inside your phone's browser local storage (Safari or Chrome).
4. **Physical File Backups (1-Click)**:
   - Click **"Export Backup"** in Tile 5 to download a `.json` backup file directly to your `Downloads` folder. Restore anytime with **"Import"**.

---

## 🍱 Bento Grid Architecture

1. **Header & Live Clock Tile (Span 7)**:
   - Live clock (hours, minutes, seconds), dynamic greeting (`Good Morning` / `Good Afternoon` / `Good Evening`), live calendar date, sound toggle, settings, and collapse button.
2. **Daily Focus & Progress Metric Tile (Span 5)**:
   - Circular SVG progress ring, completion percentage, active task count, and offline storage indicator badge.
3. **Core Tasks & Checklist Tile (Hero Span 7)**:
   - Task input with priority indicators (🔴 Urgent, 🟡 Normal, 🟢 Low, 🟣 Idea), filter pills (`All`, `Active`, `Done`), search filter, pin to top (📌), and harmonic completion chimes.
4. **Scratchpad Tile (Span 5)**:
   - Instant auto-saving markdown notepad for links, scratch thoughts, or code snippets, with word/char counters and 1-click clipboard copy.
5. **Storage & Tools Tile (Span 12)**:
   - Visual local storage indicator, 1-click **Export Backup** to JSON and **Import** restore.

---

## 🚀 Mobile Phone Companion (Same Wi-Fi)
Double-click:
```text
scripts\Launch-With-Phone-Sync.bat
```
> Prints your local Wi-Fi IP (e.g. `http://192.168.1.XX:8080`). Open that URL on your phone and tap **Add to Home Screen** to get a fullscreen mobile PWA!