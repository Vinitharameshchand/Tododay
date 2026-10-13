/**
 * ==============================================================================
 * Tododay (DeskNotes) • Balsamiq Wireframe Bento Desktop & Mobile Companion
 * ==============================================================================
 * Pure Vanilla JavaScript • Zero External Dependencies • Offline-First PWA
 *
 * TABLE OF CONTENTS:
 *  1. CONFIGURATION & CONSTANTS
 *  2. STATE STORE (Centralized data management with LocalStorage)
 *  3. DOM ELEMENT CACHE
 *  4. UTILITY HELPERS (Debounce, sanitization, toast alerts)
 *  5. AUDIO SYNTHESIZER (Pure Web Audio API harmonic completion chimes)
 *  6. CLOCK & GREETING ENGINE (Live time, dynamic greeting, date display)
 *  7. TASK MANAGEMENT (CRUD operations, filtering, sorting, delegation)
 *  8. SCRATCHPAD (Markdown quick notes, autosave, formatting actions)
 *  9. SETTINGS & THEMES (Wireframe styles, glass opacity, sound toggle)
 * 10. GOOGLE-STYLE DEVICE PAIRING & REAL-TIME SYNC ENGINE
 * 11. BACKUP & RESTORE (1-Click JSON export & file import)
 * 12. EVENT DELEGATION & LIFECYCLE INITIALIZATION
 * ==============================================================================
 */

(function () {
  'use strict';

  // Unique identifier for this browser session to filter self-broadcasts
  const CLIENT_ID = 'dev_' + Math.random().toString(36).substring(2, 9);

  // ============================================================================
  // 1. CONFIGURATION & CONSTANTS
  // ============================================================================
  const CONFIG = {
    // Storage & Sync Keys
    STORAGE_KEY: 'desknotes_app_state_v1',
    BROADCAST_CHANNEL: 'desknotes_live_channel',
    RELAY_SERVER_URL: 'https://ntfy.sh',

    // UI Defaults
    DEFAULT_THEME: 'balsamiq',
    DEFAULT_OPACITY: 85,
    AVAILABLE_THEMES: ['balsamiq', 'blueprint', 'chalkboard', 'stickynote'],

    // Timings (in milliseconds)
    DEBOUNCE_SCRATCHPAD_MS: 350,
    TOAST_DURATION_MS: 2400,
    SYNC_POLL_INTERVAL_MS: 8000,
    CLOCK_TICK_MS: 1000,

    // SVG Progress Ring Geometry (r = 30 -> 2 * PI * 30 = 188.495)
    RING_CIRCUMFERENCE: 188.49,

    // Initial Starter Data
    INITIAL_TASKS: [
      {
        id: 'task-init-1',
        text: 'Welcome to Tododay! 🍱',
        completed: false,
        priority: 'high',
        pinned: true,
        createdAt: Date.now() - 2000
      },
      {
        id: 'task-init-2',
        text: 'Check tasks to hear the harmonic completion chime 🔔',
        completed: false,
        priority: 'normal',
        pinned: false,
        createdAt: Date.now() - 1000
      },
      {
        id: 'task-init-3',
        text: 'Pair desktop and phone with a 6-digit PIN & Google-style number check ⚡',
        completed: false,
        priority: 'idea',
        pinned: false,
        createdAt: Date.now()
      }
    ],

    INITIAL_SCRATCHPAD:
      '# Daily Scratchpad 📝\n\n' +
      '- Quick thoughts, meetings, links, or code snippets\n' +
      '- Auto-saves to your local browser storage on every keystroke\n' +
      '- 1-click Export to backup anytime'
  };

  // ============================================================================
  // 2. STATE STORE
  // ============================================================================
  const Store = {
    state: {
      tasks: [],
      scratchpad: '',
      updatedAt: Date.now(),
      settings: {
        theme: CONFIG.DEFAULT_THEME,
        opacity: CONFIG.DEFAULT_OPACITY,
        soundEnabled: true,
        syncRoomKey: '',
        filter: 'all',
        searchQuery: '',
        isCollapsed: false
      }
    },

    load() {
      try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.state = {
            ...this.state,
            ...parsed,
            settings: { ...this.state.settings, ...(parsed.settings || {}) }
          };
        } else {
          this.state.tasks = [...CONFIG.INITIAL_TASKS];
          this.state.scratchpad = CONFIG.INITIAL_SCRATCHPAD;
        }
      } catch (err) {
        console.warn('LocalStorage read error, initializing with defaults:', err);
        this.state.tasks = [...CONFIG.INITIAL_TASKS];
        this.state.scratchpad = CONFIG.INITIAL_SCRATCHPAD;
      }
    },

    save(broadcast = true) {
      try {
        this.state.updatedAt = Date.now();
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));

        if (broadcast) {
          Sync.broadcastState();
        }
      } catch (err) {
        console.error('LocalStorage write failed:', err);
      }
    }
  };

  // ============================================================================
  // 3. DOM ELEMENT CACHE
  // ============================================================================
  const dom = {
    // Layout & Dock
    bentoContainer: document.getElementById('bentoContainer'),
    miniDock: document.getElementById('miniDock'),
    miniDockSummary: document.getElementById('miniDockSummary'),
    expandWidgetBtn: document.getElementById('expandWidgetBtn'),
    minimizeBtn: document.getElementById('minimizeBtn'),

    // Tile 1: Header & Clock
    greetingText: document.getElementById('greetingText'),
    currentDateText: document.getElementById('currentDateText'),
    liveClockText: document.getElementById('liveClockText'),
    liveSecondsText: document.getElementById('liveSecondsText'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIconOn: document.getElementById('soundIconOn'),
    soundIconOff: document.getElementById('soundIconOff'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),

    // Tile 2: Focus & Progress Metric
    progressRingFill: document.getElementById('progressRingFill'),
    progressPercentageText: document.getElementById('progressPercentageText'),
    progressStatsText: document.getElementById('progressStatsText'),
    activeCountText: document.getElementById('activeCountText'),
    syncStatusBadge: document.getElementById('syncStatusBadge'),
    syncStatusText: document.getElementById('syncStatusText'),

    // Tile 3: Tasks & Checklist
    taskCountBadge: document.getElementById('taskCountBadge'),
    taskForm: document.getElementById('taskForm'),
    taskInput: document.getElementById('taskInput'),
    priorityPickerBtn: document.getElementById('priorityPickerBtn'),
    priorityMenu: document.getElementById('priorityMenu'),
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),
    taskSearchInput: document.getElementById('taskSearchInput'),
    filterBtns: document.querySelectorAll('.filter-btn'),

    // Tile 4: Scratchpad
    scratchpadText: document.getElementById('scratchpadText'),
    scratchpadStats: document.getElementById('scratchpadStats'),
    scratchpadSaveStatus: document.getElementById('scratchpadSaveStatus'),
    copyNoteBtn: document.getElementById('copyNoteBtn'),
    formatBtns: document.querySelectorAll('.format-btn'),

    // Tile 5: Tools & Settings Modal
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    importJsonBtn: document.getElementById('importJsonBtn'),
    importFileInput: document.getElementById('importFileInput'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),

    // Google-Style Device Pairing & Sync
    pairStatusBadge: document.getElementById('pairStatusBadge'),
    disconnectSyncBtn: document.getElementById('disconnectSyncBtn'),
    tabShareCodeBtn: document.getElementById('tabShareCodeBtn'),
    tabEnterCodeBtn: document.getElementById('tabEnterCodeBtn'),
    shareCodePanel: document.getElementById('shareCodePanel'),
    enterCodePanel: document.getElementById('enterCodePanel'),
    shareCodeDisplay: document.getElementById('shareCodeDisplay'),
    copyShareCodeBtn: document.getElementById('copyShareCodeBtn'),
    refreshShareCodeBtn: document.getElementById('refreshShareCodeBtn'),
    shareVerifyNumber: document.getElementById('shareVerifyNumber'),
    hostListeningStatus: document.getElementById('hostListeningStatus'),
    hostStatusMsg: document.getElementById('hostStatusMsg'),
    joinCodeInput: document.getElementById('joinCodeInput'),
    submitJoinCodeBtn: document.getElementById('submitJoinCodeBtn'),
    verifyNumberStep: document.getElementById('verifyNumberStep'),
    verifyNumberOptions: document.getElementById('verifyNumberOptions'),
    verifyFeedbackMsg: document.getElementById('verifyFeedbackMsg'),
    toggleQrAccordionBtn: document.getElementById('toggleQrAccordionBtn'),
    qrCodeContainer: document.getElementById('qrCodeContainer'),
    qrCanvasWrapper: document.getElementById('qrCanvasWrapper'),
    qrUrlText: document.getElementById('qrUrlText'),

    // Theme & Options
    themeCards: document.querySelectorAll('.theme-card'),
    opacitySlider: document.getElementById('opacitySlider'),
    opacityValLabel: document.getElementById('opacityValLabel'),
    modalSoundCheckbox: document.getElementById('modalSoundCheckbox'),

    // Toast
    toast: document.getElementById('toast')
  };

  // ============================================================================
  // 4. UTILITY HELPERS
  // ============================================================================
  function debounce(func, waitMs) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), waitMs);
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimer = null;
  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.add('hidden');
    }, CONFIG.TOAST_DURATION_MS);
  }

  // ============================================================================
  // 5. AUDIO SYNTHESIZER (Harmonic Completion Chimes)
  // ============================================================================
  const AudioEngine = {
    ctx: null,

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    playChime() {
      if (!Store.state.settings.soundEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Tone 1: D5 (587.33 Hz) gliding upward to A5 (880.00 Hz)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Tone 2: D6 Shimmer Overtone (1174.66 Hz)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1174.66, now + 0.05);

        gain2.gain.setValueAtTime(0.08, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.0005, now + 0.4);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.4);
      } catch (err) {}
    }
  };

  // ============================================================================
  // 6. CLOCK & GREETING ENGINE
  // ============================================================================
  const Clock = {
    start() {
      this.update();
      setInterval(() => this.update(), CONFIG.CLOCK_TICK_MS);
    },

    update() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const displayHours = String(hours % 12 || 12).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';

      if (dom.liveClockText) dom.liveClockText.textContent = `${displayHours}:${minutes}`;
      if (dom.liveSecondsText) dom.liveSecondsText.textContent = `${seconds} ${ampm}`;

      if (dom.greetingText) {
        if (hours < 12) dom.greetingText.textContent = 'Good Morning';
        else if (hours < 17) dom.greetingText.textContent = 'Good Afternoon';
        else dom.greetingText.textContent = 'Good Evening';
      }

      if (dom.currentDateText) {
        dom.currentDateText.textContent = now.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  };

  // ============================================================================
  // 7. TASK MANAGEMENT (CRUD, Filters, Progress Metrics)
  // ============================================================================
  const Tasks = {
    selectedPriority: 'normal',

    add(text, priority = 'normal') {
      const clean = text.trim();
      if (!clean) return;

      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: clean,
        completed: false,
        priority: priority || 'normal',
        pinned: false,
        createdAt: Date.now()
      };

      Store.state.tasks.unshift(newTask);
      Store.save();
      this.render();

      if (dom.taskInput) dom.taskInput.value = '';
      showToast('Task added');
    },

    toggleComplete(id) {
      const task = Store.state.tasks.find((t) => t.id === id);
      if (!task) return;

      task.completed = !task.completed;
      if (task.completed) {
        AudioEngine.playChime();
        if ('vibrate' in navigator) navigator.vibrate(40);
      }

      Store.save();
      this.render();
    },

    togglePin(id) {
      const task = Store.state.tasks.find((t) => t.id === id);
      if (!task) return;

      task.pinned = !task.pinned;
      Store.save();
      this.render();
      showToast(task.pinned ? 'Pinned to top 📌' : 'Unpinned');
    },

    delete(id) {
      const el = document.querySelector(`[data-task-id="${id}"]`);
      if (el) {
        el.style.transform = 'translateX(60px)';
        el.style.opacity = '0';
        setTimeout(() => {
          Store.state.tasks = Store.state.tasks.filter((t) => t.id !== id);
          Store.save();
          this.render();
          showToast('Task deleted');
        }, 150);
      } else {
        Store.state.tasks = Store.state.tasks.filter((t) => t.id !== id);
        Store.save();
        this.render();
      }
    },

    clearCompleted() {
      const countBefore = Store.state.tasks.length;
      Store.state.tasks = Store.state.tasks.filter((t) => !t.completed);
      if (Store.state.tasks.length !== countBefore) {
        Store.save();
        this.render();
        showToast('Cleared completed tasks');
      }
    },

    getFilteredTasks() {
      const query = (Store.state.settings.searchQuery || '').toLowerCase().trim();
      const filter = Store.state.settings.filter || 'all';

      let list = [...Store.state.tasks].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.createdAt - a.createdAt;
      });

      if (filter === 'active') list = list.filter((t) => !t.completed);
      else if (filter === 'completed') list = list.filter((t) => t.completed);

      if (query) list = list.filter((t) => t.text.toLowerCase().includes(query));

      return list;
    },

    render() {
      const filtered = this.getFilteredTasks();
      dom.taskList.innerHTML = '';

      if (filtered.length === 0) {
        dom.emptyState.classList.remove('hidden');
      } else {
        dom.emptyState.classList.add('hidden');
        const fragment = document.createDocumentFragment();

        filtered.forEach((task) => {
          const li = document.createElement('li');
          li.className = `task-item ${task.completed ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}`;
          li.setAttribute('data-task-id', task.id);

          li.innerHTML = `
            <label class="checkbox-wrap" aria-label="Toggle Complete">
              <input type="checkbox" class="task-checkbox" data-action="toggle" ${task.completed ? 'checked' : ''}>
              <svg class="checkbox-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </label>

            <div class="task-content">
              <span class="task-priority-indicator priority-${task.priority || 'normal'}" title="Priority: ${task.priority}"></span>
              <span class="task-text" data-action="toggle" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</span>
            </div>

            <div class="task-actions">
              <button type="button" class="task-action-btn pin-btn ${task.pinned ? 'active' : ''}" data-action="pin" title="${task.pinned ? 'Unpin' : 'Pin to Top'}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${task.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V6a3 3 0 0 0-6 0v4.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24V17z"></path>
                </svg>
              </button>
              <button type="button" class="task-action-btn delete-btn" data-action="delete" title="Delete Task">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          `;

          this.bindTouchSwipe(li, task.id);
          fragment.appendChild(li);
        });

        dom.taskList.appendChild(fragment);
      }

      this.updateProgressMetrics();
    },

    updateProgressMetrics() {
      const total = Store.state.tasks.length;
      const completed = Store.state.tasks.filter((t) => t.completed).length;
      const active = total - completed;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      const offset = CONFIG.RING_CIRCUMFERENCE - (percent / 100) * CONFIG.RING_CIRCUMFERENCE;
      if (dom.progressRingFill) dom.progressRingFill.style.strokeDashoffset = offset;

      if (dom.progressPercentageText) dom.progressPercentageText.textContent = `${percent}%`;
      if (dom.progressStatsText) dom.progressStatsText.textContent = `${completed} / ${total} Done`;
      if (dom.activeCountText) dom.activeCountText.textContent = `${active} task${active === 1 ? '' : 's'} waiting`;
      if (dom.taskCountBadge) dom.taskCountBadge.textContent = active;

      if (dom.miniDockSummary) {
        dom.miniDockSummary.textContent = `${active} task${active === 1 ? '' : 's'} remaining`;
      }
    },

    bindTouchSwipe(element, taskId) {
      let startX = 0;
      let currentX = 0;
      let isSwiping = false;

      element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
        isSwiping = true;
        element.style.transition = 'none';
      }, { passive: true });

      element.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;

        if (Math.abs(diff) < 120) {
          element.style.transform = `translateX(${diff}px)`;
          if (diff > 40) element.style.background = 'rgba(16, 185, 129, 0.15)';
          else if (diff < -40) element.style.background = 'rgba(239, 68, 68, 0.15)';
        }
      }, { passive: true });

      element.addEventListener('touchend', () => {
        if (!isSwiping) return;
        isSwiping = false;
        element.style.transition = 'all 0.2s ease-out';
        const diff = currentX - startX;

        if (diff > 65) {
          element.style.transform = 'translateX(0)';
          element.style.background = '';
          Tasks.toggleComplete(taskId);
        } else if (diff < -65) {
          element.style.transform = 'translateX(-100%)';
          element.style.opacity = '0';
          setTimeout(() => Tasks.delete(taskId), 150);
        } else {
          element.style.transform = 'translateX(0)';
          element.style.background = '';
        }
      });
    }
  };

  // ============================================================================
  // 8. SCRATCHPAD (Markdown Quick Notes & Text Utilities)
  // ============================================================================
  const Scratchpad = {
    render() {
      if (dom.scratchpadText) {
        dom.scratchpadText.value = Store.state.scratchpad || '';
        this.updateStats();
      }
    },

    saveDebounced: debounce(function () {
      Store.state.scratchpad = dom.scratchpadText.value;
      Store.save();
      if (dom.scratchpadSaveStatus) {
        dom.scratchpadSaveStatus.textContent = 'Saved to storage';
        dom.scratchpadSaveStatus.style.color = 'var(--success-color, #10b981)';
      }
    }, CONFIG.DEBOUNCE_SCRATCHPAD_MS),

    handleInput() {
      if (dom.scratchpadSaveStatus) {
        dom.scratchpadSaveStatus.textContent = 'Saving...';
        dom.scratchpadSaveStatus.style.color = 'var(--text-muted, #888)';
      }
      this.updateStats();
      this.saveDebounced();
    },

    updateStats() {
      if (!dom.scratchpadStats || !dom.scratchpadText) return;
      const text = dom.scratchpadText.value || '';
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      dom.scratchpadStats.textContent = `${words} word${words === 1 ? '' : 's'} • ${chars} chars`;
    },

    applyFormat(action) {
      const textarea = dom.scratchpadText;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const selected = val.substring(start, end);

      let replacement = '';
      if (action === 'bold') replacement = `**${selected || 'bold text'}**`;
      else if (action === 'list') replacement = selected ? selected.split('\n').map((l) => `- ${l}`).join('\n') : '- ';
      else if (action === 'check') replacement = selected ? selected.split('\n').map((l) => `[ ] ${l}`).join('\n') : '[ ] ';
      else if (action === 'time') {
        const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        replacement = `[${stamp}] `;
      }

      textarea.setRangeText(replacement, start, end, 'end');
      this.handleInput();
      textarea.focus();
    },

    copy() {
      const text = dom.scratchpadText ? dom.scratchpadText.value : '';
      if (!text) {
        showToast('Scratchpad is empty');
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard! 📋');
      });
    }
  };

  // ============================================================================
  // 9. SETTINGS & THEMES
  // ============================================================================
  const Settings = {
    apply() {
      const s = Store.state.settings;

      if (!CONFIG.AVAILABLE_THEMES.includes(s.theme)) {
        s.theme = CONFIG.DEFAULT_THEME;
      }
      document.body.setAttribute('data-theme', s.theme);

      document.querySelectorAll('.bento-tile').forEach((tile) => {
        tile.style.backgroundColor = '';
      });

      const opacityPct = s.opacity != null ? s.opacity : CONFIG.DEFAULT_OPACITY;
      if (dom.opacitySlider) dom.opacitySlider.value = opacityPct;
      if (dom.opacityValLabel) dom.opacityValLabel.textContent = `${opacityPct}%`;

      this.updateSoundUI();

      dom.themeCards.forEach((card) => {
        card.classList.toggle('active', card.dataset.setTheme === s.theme);
      });

      if (s.isCollapsed) this.collapseWidget();
      else this.expandWidget();

      // Restore active sync room
      if (s.syncRoomKey) {
        Sync.subscribeToRelay(s.syncRoomKey, true);
        Sync.updateBadgeStatus(true, s.syncRoomKey);
      } else {
        Sync.updateBadgeStatus(false);
      }
    },

    updateSoundUI() {
      const on = Store.state.settings.soundEnabled;
      if (dom.soundIconOn) dom.soundIconOn.classList.toggle('hidden', !on);
      if (dom.soundIconOff) dom.soundIconOff.classList.toggle('hidden', on);
      if (dom.modalSoundCheckbox) dom.modalSoundCheckbox.checked = on;
    },

    collapseWidget() {
      Store.state.settings.isCollapsed = true;
      dom.bentoContainer.classList.add('hidden');
      dom.miniDock.classList.remove('hidden');
      Tasks.updateProgressMetrics();
      Store.save(false);
    },

    expandWidget() {
      Store.state.settings.isCollapsed = false;
      dom.miniDock.classList.add('hidden');
      dom.bentoContainer.classList.remove('hidden');
      Store.save(false);
    }
  };

  // ============================================================================
  // 10. GOOGLE-STYLE DEVICE PAIRING & REAL-TIME SYNC ENGINE
  // ============================================================================
  const Sync = {
    channel: null,
    eventSource: null,
    pollTimer: null,
    activeRoomPin: '',
    currentHostCode: '',
    currentHostVerifyNum: 0,

    init() {
      // 1. Setup multi-window BroadcastChannel (for instant same-PC tabs)
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(CONFIG.BROADCAST_CHANNEL);
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_UPDATE' && event.data.state) {
            if (event.data.senderId === CLIENT_ID) return;
            this.applyRemoteState(event.data.state, event.data.updatedAt);
          }
        };
      }

      // 2. Generate a default host code for this device if not paired yet
      this.generateNewHostCode();
    },

    /**
     * Compute a deterministic 2-digit verification number (10-99) from any code string
     */
    computeVerificationNumber(codeStr) {
      const clean = String(codeStr).replace(/\D/g, '');
      if (!clean) return 42;
      let hash = 0;
      for (let i = 0; i < clean.length; i++) {
        hash = (hash * 37 + clean.charCodeAt(i) * 19) % 90;
      }
      return hash + 10;
    },

    /**
     * Generate two random distractor 2-digit numbers that don't match the correct one
     */
    generateDistractors(correctNum) {
      const distractors = new Set();
      while (distractors.size < 2) {
        const rand = Math.floor(Math.random() * 90) + 10;
        if (rand !== correctNum) distractors.add(rand);
      }
      return Array.from(distractors);
    },

    /**
     * Generate new 6-digit PIN on the host device
     */
    generateNewHostCode() {
      const num1 = Math.floor(Math.random() * 900) + 100;
      const num2 = Math.floor(Math.random() * 900) + 100;
      const code = `${num1}${num2}`;
      this.currentHostCode = code;
      this.currentHostVerifyNum = this.computeVerificationNumber(code);

      if (dom.shareCodeDisplay) {
        dom.shareCodeDisplay.textContent = `${num1} ${num2}`;
      }
      if (dom.shareVerifyNumber) {
        dom.shareVerifyNumber.textContent = this.currentHostVerifyNum;
      }
      if (dom.hostStatusMsg) {
        dom.hostStatusMsg.textContent = 'Ready & listening for phone to connect...';
      }

      this.generateQr(code);

      // Listen on this code's relay channel so if a phone connects and enters the PIN, the host gets notified!
      if (!Store.state.settings.syncRoomKey) {
        this.subscribeToRelay(code, false);
      }
    },

    /**
     * Subscribe to real-time relay (ntfy.sh SSE)
     */
    subscribeToRelay(roomPin, isPersisted = true) {
      const cleanPin = String(roomPin).replace(/\D/g, '');
      if (!cleanPin) return;

      this.activeRoomPin = cleanPin;

      if (this.eventSource) {
        try { this.eventSource.close(); } catch (e) {}
      }

      try {
        const topic = `tododay-sync-${cleanPin}`;
        this.eventSource = new EventSource(`${CONFIG.RELAY_SERVER_URL}/${topic}/sse`);

        this.eventSource.onopen = () => {
          if (isPersisted) {
            this.updateBadgeStatus(true, cleanPin);
          }
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.message) {
              const msg = JSON.parse(data.message);
              this.handleRelayMessage(msg, cleanPin);
            }
          } catch (err) {}
        };

        this.eventSource.onerror = () => {
          // Automatic reconnect handled natively by EventSource
        };
      } catch (err) {
        console.warn('SSE subscription error:', err);
      }

      // Also set up polling fallback every 8 seconds in case browser pauses SSE on mobile
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => this.pollRelayFallback(cleanPin), CONFIG.SYNC_POLL_INTERVAL_MS);
    },

    /**
     * Handle incoming remote message
     */
    handleRelayMessage(msg, currentRoom) {
      if (!msg || msg.senderId === CLIENT_ID) return;

      if (msg.type === 'PAIR_SUCCESS') {
        AudioEngine.playChime();
        if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);
        Store.state.settings.syncRoomKey = currentRoom;
        Store.save(false);
        this.updateBadgeStatus(true, currentRoom);
        if (dom.hostStatusMsg) {
          dom.hostStatusMsg.innerHTML = '<b>✅ Phone Connected & Synced!</b>';
        }
        showToast('🎉 Device Connected & Paired!');
        // Broadcast current state to newly paired device
        this.broadcastState();
        return;
      }

      if (msg.type === 'SYNC_UPDATE' && msg.state) {
        this.applyRemoteState(msg.state, msg.updatedAt);
      }
    },

    /**
     * Broadcast local state to other devices
     */
    async broadcastState() {
      const pin = Store.state.settings.syncRoomKey || this.activeRoomPin;
      if (!pin) return;

      const payload = {
        type: 'SYNC_UPDATE',
        senderId: CLIENT_ID,
        updatedAt: Date.now(),
        state: {
          tasks: Store.state.tasks,
          scratchpad: Store.state.scratchpad
        }
      };

      // 1. Local BroadcastChannel
      if (this.channel) {
        this.channel.postMessage({ type: 'SYNC_UPDATE', ...payload });
      }

      // 2. Public Real-Time Relay
      try {
        const topic = `tododay-sync-${pin}`;
        await fetch(`${CONFIG.RELAY_SERVER_URL}/${topic}`, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {}
    },

    /**
     * Merge remote state into local store
     */
    applyRemoteState(remoteState, remoteUpdatedAt = Date.now()) {
      if (!remoteState) return;
      if (remoteUpdatedAt && remoteUpdatedAt <= (Store.state.updatedAt || 0)) return;

      Store.state.tasks = remoteState.tasks || [];
      Store.state.scratchpad = remoteState.scratchpad || '';
      Store.state.updatedAt = remoteUpdatedAt;

      Tasks.render();
      Scratchpad.render();
      showToast('Synced with paired device ✨');
    },

    /**
     * Polling fallback
     */
    async pollRelayFallback(roomPin) {
      if (!Store.state.settings.syncRoomKey) return;
      try {
        const topic = `tododay-sync-${roomPin}`;
        const res = await fetch(`${CONFIG.RELAY_SERVER_URL}/${topic}/json?poll=1&since=30s`);
        if (res.ok) {
          const lines = (await res.text()).trim().split('\n');
          for (const line of lines) {
            if (!line) continue;
            const data = JSON.parse(line);
            if (data && data.message) {
              const msg = JSON.parse(data.message);
              this.handleRelayMessage(msg, roomPin);
            }
          }
        }
      } catch (e) {}
    },

    /**
     * Join / Pair device flow with Google-Style Number Challenge
     */
    startJoinVerification(enteredCode) {
      const cleanCode = enteredCode.replace(/\D/g, '');
      if (cleanCode.length < 4) {
        showToast('Please enter a 6-digit code');
        return;
      }

      const correctNum = this.computeVerificationNumber(cleanCode);
      const distractors = this.generateDistractors(correctNum);
      const options = [correctNum, ...distractors].sort(() => Math.random() - 0.5);

      dom.verifyNumberOptions.innerHTML = '';
      dom.verifyFeedbackMsg.textContent = '';
      dom.verifyFeedbackMsg.className = 'verify-feedback-msg';

      options.forEach((num) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'verify-num-btn';
        btn.textContent = num;
        btn.setAttribute('data-num', num);
        btn.addEventListener('click', () => {
          this.submitVerificationChoice(num, correctNum, cleanCode, btn);
        });
        dom.verifyNumberOptions.appendChild(btn);
      });

      dom.verifyNumberStep.classList.remove('hidden');
    },

    /**
     * User clicks one of the 3 verification challenge numbers
     */
    async submitVerificationChoice(selectedNum, correctNum, roomCode, clickedBtn) {
      if (selectedNum === correctNum) {
        // MATCH CONFIRMED
        clickedBtn.classList.add('success');
        dom.verifyFeedbackMsg.textContent = '✅ Verified! Pairing with other device...';
        dom.verifyFeedbackMsg.style.color = 'var(--success-color, #10b981)';

        AudioEngine.playChime();
        if ('vibrate' in navigator) navigator.vibrate([50, 50, 100]);

        Store.state.settings.syncRoomKey = roomCode;
        Store.save(false);

        this.subscribeToRelay(roomCode, true);

        // Notify host
        try {
          const topic = `tododay-sync-${roomCode}`;
          await fetch(`${CONFIG.RELAY_SERVER_URL}/${topic}`, {
            method: 'POST',
            body: JSON.stringify({
              type: 'PAIR_SUCCESS',
              senderId: CLIENT_ID,
              timestamp: Date.now()
            }),
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {}

        setTimeout(() => {
          dom.verifyNumberStep.classList.add('hidden');
          dom.joinCodeInput.value = '';
          this.updateBadgeStatus(true, roomCode);
          showToast('🎉 Successfully paired with device!');
        }, 800);

      } else {
        // MISMATCH
        clickedBtn.classList.add('error');
        dom.verifyFeedbackMsg.textContent = '❌ Wrong number. Check your other screen.';
        dom.verifyFeedbackMsg.style.color = 'var(--priority-high, #ef4444)';
        if ('vibrate' in navigator) navigator.vibrate(120);

        setTimeout(() => {
          clickedBtn.classList.remove('error');
        }, 1000);
      }
    },

    disconnect() {
      Store.state.settings.syncRoomKey = '';
      Store.save(false);

      if (this.eventSource) {
        try { this.eventSource.close(); } catch (e) {}
      }
      if (this.pollTimer) clearInterval(this.pollTimer);

      this.updateBadgeStatus(false);
      this.generateNewHostCode();
      showToast('Device unpaired');
    },

    updateBadgeStatus(isPaired, roomKey = '') {
      const pin = roomKey || Store.state.settings.syncRoomKey;
      if (isPaired && pin) {
        const formatted = pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin;
        if (dom.pairStatusBadge) {
          dom.pairStatusBadge.textContent = `Paired (#${formatted})`;
          dom.pairStatusBadge.className = 'badge-pill green';
        }
        if (dom.syncStatusText) {
          dom.syncStatusText.textContent = `Synced (#${formatted})`;
        }
        if (dom.syncStatusBadge) {
          dom.syncStatusBadge.title = `Synced live with Room #${formatted}`;
        }
        if (dom.disconnectSyncBtn) {
          dom.disconnectSyncBtn.classList.remove('hidden');
        }
        if (dom.hostStatusMsg) {
          dom.hostStatusMsg.innerHTML = `<b>🟢 Paired & Syncing live (#${formatted})</b>`;
        }
      } else {
        if (dom.pairStatusBadge) {
          dom.pairStatusBadge.textContent = 'Not Paired';
          dom.pairStatusBadge.className = 'badge-pill';
        }
        if (dom.syncStatusText) {
          dom.syncStatusText.textContent = 'Local Storage';
        }
        if (dom.syncStatusBadge) {
          dom.syncStatusBadge.title = 'Storage & Sync Status';
        }
        if (dom.disconnectSyncBtn) {
          dom.disconnectSyncBtn.classList.add('hidden');
        }
      }
    },

    generateQr(code) {
      if (!dom.qrCanvasWrapper) return;
      const syncUrl = `${window.location.origin}${window.location.pathname}?pair=${encodeURIComponent(code)}`;
      if (dom.qrUrlText) dom.qrUrlText.textContent = syncUrl;

      dom.qrCanvasWrapper.innerHTML = '';
      const img = document.createElement('img');
      img.width = 150;
      img.height = 150;
      img.alt = 'Pairing QR Code';
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(syncUrl)}&margin=4`;
      dom.qrCanvasWrapper.appendChild(img);
    },

    checkUrlPairParam() {
      const params = new URLSearchParams(window.location.search);
      const pairParam = params.get('pair') || params.get('room');
      if (pairParam) {
        if (dom.settingsModal) dom.settingsModal.classList.remove('hidden');
        if (dom.tabEnterCodeBtn) dom.tabEnterCodeBtn.click();
        if (dom.joinCodeInput) dom.joinCodeInput.value = pairParam;
        this.startJoinVerification(pairParam);
      }
    }
  };

  // ============================================================================
  // 11. BACKUP & RESTORE (JSON Import/Export)
  // ============================================================================
  const Backup = {
    export() {
      try {
        const payload = JSON.stringify(Store.state, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tododay_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Saved backup to Downloads folder! 💾');
      } catch (e) {
        showToast('Export failed');
      }
    },

    import(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported && (imported.tasks || imported.scratchpad)) {
            Store.state.tasks = imported.tasks || [];
            Store.state.scratchpad = imported.scratchpad || '';
            if (imported.settings) {
              Store.state.settings = { ...Store.state.settings, ...imported.settings };
            }
            Store.save();
            Settings.apply();
            Tasks.render();
            Scratchpad.render();
            if (dom.settingsModal) dom.settingsModal.classList.add('hidden');
            showToast('Data imported successfully! ✨');
          } else {
            showToast('Invalid backup file');
          }
        } catch (err) {
          showToast('Error reading backup JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  // ============================================================================
  // 12. EVENT DELEGATION & LIFECYCLE INITIALIZATION
  // ============================================================================
  function bindEvents() {
    // Task Input Form Submission
    dom.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Tasks.add(dom.taskInput.value, Tasks.selectedPriority);
    });

    // Priority Dropdown Picker
    dom.priorityPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.priorityMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      dom.priorityMenu.classList.add('hidden');
    });

    dom.priorityMenu.querySelectorAll('.priority-opt').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Tasks.selectedPriority = btn.dataset.priority;
        dom.priorityPickerBtn.setAttribute('data-priority', Tasks.selectedPriority);
        dom.priorityPickerBtn.innerHTML = `<span class="priority-dot priority-${Tasks.selectedPriority}"></span>`;
        dom.priorityMenu.classList.add('hidden');
        dom.taskInput.focus();
      });
    });

    // Event Delegation on Task List
    dom.taskList.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const itemEl = actionEl.closest('[data-task-id]');
      if (!itemEl) return;
      const taskId = itemEl.getAttribute('data-task-id');

      const action = actionEl.getAttribute('data-action');
      if (action === 'toggle') {
        Tasks.toggleComplete(taskId);
      } else if (action === 'pin') {
        e.stopPropagation();
        Tasks.togglePin(taskId);
      } else if (action === 'delete') {
        e.stopPropagation();
        Tasks.delete(taskId);
      }
    });

    dom.taskList.addEventListener('change', (e) => {
      if (e.target.classList.contains('task-checkbox')) {
        const itemEl = e.target.closest('[data-task-id]');
        if (itemEl) Tasks.toggleComplete(itemEl.getAttribute('data-task-id'));
      }
    });

    // Filter Pills
    dom.filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        Store.state.settings.filter = btn.dataset.filter;
        Tasks.render();
      });
    });

    // Search Input
    dom.taskSearchInput.addEventListener('input', (e) => {
      Store.state.settings.searchQuery = e.target.value;
      Tasks.render();
    });

    // Clear Completed Tasks
    dom.clearCompletedBtn.addEventListener('click', () => Tasks.clearCompleted());

    // Scratchpad Live Editing
    dom.scratchpadText.addEventListener('input', () => Scratchpad.handleInput());
    dom.copyNoteBtn.addEventListener('click', () => Scratchpad.copy());
    dom.formatBtns.forEach((btn) => {
      btn.addEventListener('click', () => Scratchpad.applyFormat(btn.dataset.action));
    });

    // Header Controls: Sound & Settings
    dom.soundToggleBtn.addEventListener('click', () => {
      Store.state.settings.soundEnabled = !Store.state.settings.soundEnabled;
      Settings.updateSoundUI();
      Store.save(false);
      showToast(Store.state.settings.soundEnabled ? 'Chime enabled 🔔' : 'Chime muted 🔕');
      if (Store.state.settings.soundEnabled) AudioEngine.playChime();
    });

    dom.modalSoundCheckbox.addEventListener('change', (e) => {
      Store.state.settings.soundEnabled = e.target.checked;
      Settings.updateSoundUI();
      Store.save(false);
    });

    dom.openSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.remove('hidden'));
    dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));
    dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === dom.settingsModal) dom.settingsModal.classList.add('hidden');
    });

    // Widget Minimization & Expansion
    dom.minimizeBtn.addEventListener('click', () => Settings.collapseWidget());
    dom.miniDock.addEventListener('click', () => Settings.expandWidget());
    dom.expandWidgetBtn.addEventListener('click', () => Settings.expandWidget());

    // Theme Selection
    dom.themeCards.forEach((card) => {
      card.addEventListener('click', () => {
        Store.state.settings.theme = card.dataset.setTheme;
        Settings.apply();
        Store.save(false);
      });
    });

    // Glass Opacity Slider
    dom.opacitySlider.addEventListener('input', (e) => {
      Store.state.settings.opacity = parseInt(e.target.value, 10);
      Settings.apply();
      Store.save(false);
    });

    // Pairing Mode Tabs (Show Code vs Enter Code)
    dom.tabShareCodeBtn.addEventListener('click', () => {
      dom.tabShareCodeBtn.classList.add('active');
      dom.tabEnterCodeBtn.classList.remove('active');
      dom.shareCodePanel.classList.remove('hidden');
      dom.enterCodePanel.classList.add('hidden');
    });

    dom.tabEnterCodeBtn.addEventListener('click', () => {
      dom.tabEnterCodeBtn.classList.add('active');
      dom.tabShareCodeBtn.classList.remove('active');
      dom.enterCodePanel.classList.remove('hidden');
      dom.shareCodePanel.classList.add('hidden');
      dom.joinCodeInput.focus();
    });

    // Copy & Refresh Share Code
    dom.copyShareCodeBtn.addEventListener('click', () => {
      if (Sync.currentHostCode) {
        navigator.clipboard.writeText(Sync.currentHostCode).then(() => {
          showToast('Pairing code copied! 📋');
        });
      }
    });

    dom.refreshShareCodeBtn.addEventListener('click', () => {
      Sync.generateNewHostCode();
      showToast('Generated new code ⚡');
    });

    // Join Code Input Formatting
    dom.joinCodeInput.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
      if (raw.length > 3) {
        e.target.value = `${raw.slice(0, 3)} ${raw.slice(3)}`;
      } else {
        e.target.value = raw;
      }
      if (raw.length === 6) {
        Sync.startJoinVerification(raw);
      }
    });

    dom.submitJoinCodeBtn.addEventListener('click', () => {
      Sync.startJoinVerification(dom.joinCodeInput.value);
    });

    // Disconnect / Unpair
    dom.disconnectSyncBtn.addEventListener('click', () => {
      Sync.disconnect();
    });

    // Toggle QR Fallback
    dom.toggleQrAccordionBtn.addEventListener('click', () => {
      dom.qrCodeContainer.classList.toggle('hidden');
    });

    // Status Badge in Tile 2 opens Pairing Modal
    dom.syncStatusBadge.addEventListener('click', () => {
      dom.settingsModal.classList.remove('hidden');
    });

    // Backup & Restore
    dom.exportJsonBtn.addEventListener('click', () => Backup.export());
    dom.importJsonBtn.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) Backup.import(e.target.files[0]);
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        if (document.activeElement === dom.scratchpadText) {
          dom.taskInput.focus();
        } else {
          dom.scratchpadText.focus();
        }
      }

      if (e.key === 'Escape') {
        if (!dom.settingsModal.classList.contains('hidden')) {
          dom.settingsModal.classList.add('hidden');
        } else if (dom.taskSearchInput.value) {
          dom.taskSearchInput.value = '';
          Store.state.settings.searchQuery = '';
          Tasks.render();
        }
      }
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function init() {
    Store.load();
    Sync.init();
    Settings.apply();
    Clock.start();
    Tasks.render();
    Scratchpad.render();
    bindEvents();
    Sync.checkUrlPairParam();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
