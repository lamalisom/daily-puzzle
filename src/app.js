/**
 * app.js - Main Application Coordinator & Routing
 * Orchestrates Jigsaw and Sudoku modes, audio synthesis, Ad Placement API,
 * streak tracking, timers, and multilingual UI.
 */

import { StorageManager } from './storage.js';
import { I18nManager } from './i18n.js';
import { AdManager } from './ads.js';
import { JigsawEngine } from './jigsaw.js';
import { SudokuEngine } from './sudoku.js';

class App {
  constructor() {
    this.currentMode = 'jigsaw'; // 'jigsaw' | 'sudoku'
    this.timerInterval = null;
    this.secondsElapsed = 0;
    this.isMuted = false;

    // Initialize Subsystems
    this.storage = StorageManager;
    this.settings = this.storage.getSettings();
    this.isMuted = !this.settings.sound;

    this.i18n = new I18nManager(this.settings.lang);
    this.initAudio();

    this.ads = new AdManager({
      publisherId: 'ca-pub-daily-h5-demo',
      onMuteAudio: () => this.muteAudioForAd(true),
      onUnmuteAudio: () => this.muteAudioForAd(false)
    });

    this.jigsawEngine = null;
    this.sudokuEngine = null;

    this.initDOM();
    this.initGameMode(this.currentMode);
    this.updateStreakBadge();
    this.startTimer();
  }

  /**
   * Procedural Audio Synthesizer (Web Audio API - 0KB bundle impact)
   */
  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      this.audioCtx = null;
    }
  }

  ensureAudioResumed() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSound(type) {
    if (this.isMuted || !this.audioCtx) return;
    this.ensureAudioResumed();

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (type === 'tap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'snap') {
      // Woodblock-like high snap sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'chime') {
      // Hint chime
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'victory') {
      // Victorious major arpeggio
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.2, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.4);
      });
    }
  }

  muteAudioForAd(isMuted) {
    if (this.audioCtx) {
      if (isMuted && this.audioCtx.state === 'running') {
        this.audioCtx.suspend();
      } else if (!isMuted && !this.isMuted && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }
  }

  initDOM() {
    this.i18n.updateDOM();

    // Mode Switcher Tabs
    document.getElementById('tab-jigsaw')?.addEventListener('click', () => this.switchMode('jigsaw'));
    document.getElementById('tab-sudoku')?.addEventListener('click', () => this.switchMode('sudoku'));

    // Language Dropdown
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.value = this.i18n.getLanguage();
      langSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        this.i18n.setLanguage(lang);
        this.storage.saveSettings({ lang });
        this.renderSudokuGrid(); // Refresh UI labels
      });
    }

    // Sound Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      this.updateSoundButtonUI(soundBtn);
      soundBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        this.storage.saveSettings({ sound: !this.isMuted });
        this.updateSoundButtonUI(soundBtn);
        if (!this.isMuted) this.playSound('tap');
      });
    }

    // Rules / Settings Modal Toggle
    document.getElementById('btn-rules')?.addEventListener('click', () => {
      this.playSound('tap');
      document.getElementById('modal-rules')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-rules')?.addEventListener('click', () => {
      document.getElementById('modal-rules')?.classList.add('hidden');
    });

    // Rewarded Hint Button
    document.getElementById('btn-hint')?.addEventListener('click', () => {
      this.handleHintRequested();
    });

    // Victory Modal Action Buttons
    document.getElementById('btn-victory-share')?.addEventListener('click', () => {
      this.handleShareResult();
    });

    document.getElementById('btn-victory-next')?.addEventListener('click', () => {
      document.getElementById('modal-victory')?.classList.add('hidden');
      this.ads.showInterstitial({
        name: 'game_next_round',
        onComplete: () => {
          this.initGameMode(this.currentMode);
        }
      });
    });

    // Jigsaw Controls
    document.getElementById('btn-jigsaw-preview')?.addEventListener('click', () => {
      this.playSound('tap');
      if (this.jigsawEngine) {
        this.jigsawEngine.togglePreview();
      }
    });

    document.getElementById('btn-jigsaw-reset')?.addEventListener('click', () => {
      this.playSound('tap');
      if (this.jigsawEngine) {
        this.jigsawEngine.reset();
        this.updateJigsawStatus();
      }
    });

    document.getElementById('jigsaw-difficulty')?.addEventListener('change', (e) => {
      this.playSound('tap');
      const size = parseInt(e.target.value, 10);
      if (this.jigsawEngine) {
        this.jigsawEngine.setDifficulty(size);
        this.updateJigsawStatus();
      }
    });

    // Sudoku Controls
    document.getElementById('sudoku-difficulty')?.addEventListener('change', (e) => {
      this.playSound('tap');
      if (this.sudokuEngine) {
        this.sudokuEngine.initGame(e.target.value);
        this.renderSudokuGrid();
      }
    });

    document.getElementById('btn-sudoku-notes')?.addEventListener('click', () => {
      this.playSound('tap');
      if (this.sudokuEngine) {
        const isNotes = this.sudokuEngine.toggleNotesMode();
        const btn = document.getElementById('btn-sudoku-notes');
        btn.classList.toggle('bg-amber-600', isNotes);
        btn.classList.toggle('text-white', isNotes);
      }
    });

    document.getElementById('btn-sudoku-undo')?.addEventListener('click', () => {
      this.playSound('tap');
      if (this.sudokuEngine && this.sudokuEngine.undo()) {
        this.renderSudokuGrid();
      }
    });

    document.getElementById('btn-sudoku-erase')?.addEventListener('click', () => {
      this.playSound('tap');
      if (this.sudokuEngine) {
        this.sudokuEngine.eraseCurrent();
        this.renderSudokuGrid();
      }
    });

    // Sudoku Numeric Keypad (1-9)
    const keypadContainer = document.getElementById('sudoku-keypad');
    if (keypadContainer) {
      keypadContainer.innerHTML = '';
      for (let num = 1; num <= 9; num++) {
        const btn = document.createElement('button');
        btn.className = 'w-10 h-12 sm:w-11 sm:h-13 bg-slate-800 hover:bg-slate-700 active:scale-95 text-indigo-200 hover:text-white font-bold text-lg rounded-xl shadow-md border border-slate-700 transition-transform flex items-center justify-center';
        btn.textContent = num;
        btn.addEventListener('click', () => {
          if (this.sudokuEngine) {
            this.playSound('tap');
            this.sudokuEngine.inputNumber(num);
            this.renderSudokuGrid();
          }
        });
        keypadContainer.appendChild(btn);
      }
    }
  }

  updateSoundButtonUI(btn) {
    btn.innerHTML = this.isMuted ? '🔇' : '🔊';
    btn.title = this.isMuted ? this.i18n.t('soundOff') : this.i18n.t('soundOn');
  }

  updateStreakBadge() {
    const streakData = this.storage.getStreak();
    const streakBadge = document.getElementById('streak-count');
    if (streakBadge) {
      streakBadge.textContent = streakData.currentStreak;
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.secondsElapsed = 0;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.secondsElapsed++;
      this.updateTimerDisplay();
    }, 1000);
  }

  updateTimerDisplay() {
    const minutes = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
    const seconds = String(this.secondsElapsed % 60).padStart(2, '0');
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
      timerEl.textContent = `${minutes}:${seconds}`;
    }
  }

  switchMode(mode) {
    if (this.currentMode === mode) return;
    this.playSound('tap');
    this.currentMode = mode;

    // Update Tab Styles
    const tabJigsaw = document.getElementById('tab-jigsaw');
    const tabSudoku = document.getElementById('tab-sudoku');
    const jigsawView = document.getElementById('view-jigsaw');
    const sudokuView = document.getElementById('view-sudoku');

    if (mode === 'jigsaw') {
      tabJigsaw.className = 'flex-1 py-2 text-center text-sm font-semibold rounded-xl bg-indigo-600 text-white shadow-md transition-all';
      tabSudoku.className = 'flex-1 py-2 text-center text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all';
      jigsawView.classList.remove('hidden');
      sudokuView.classList.add('hidden');
    } else {
      tabSudoku.className = 'flex-1 py-2 text-center text-sm font-semibold rounded-xl bg-indigo-600 text-white shadow-md transition-all';
      tabJigsaw.className = 'flex-1 py-2 text-center text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all';
      sudokuView.classList.remove('hidden');
      jigsawView.classList.add('hidden');
    }

    this.initGameMode(mode);
    this.startTimer();
  }

  initGameMode(mode) {
    if (mode === 'jigsaw') {
      const container = document.getElementById('jigsaw-container');
      const diffSelect = document.getElementById('jigsaw-difficulty');
      const gridSize = diffSelect ? parseInt(diffSelect.value, 10) : 3;

      this.jigsawEngine = new JigsawEngine(container, {
        rows: gridSize,
        cols: gridSize,
        dateSeed: this.storage.getTodayDateString(),
        onPieceSnapped: () => {
          this.playSound('snap');
          this.updateJigsawStatus();
        },
        onWin: (data) => this.handleVictory('jigsaw', data),
        onMove: () => {}
      });
      this.updateJigsawStatus();
    } else if (mode === 'sudoku') {
      const diffSelect = document.getElementById('sudoku-difficulty');
      const difficulty = diffSelect ? diffSelect.value : 'medium';

      this.sudokuEngine = new SudokuEngine({
        difficulty,
        dateSeed: this.storage.getTodayDateString(),
        onWin: (data) => this.handleVictory('sudoku', data),
        onMistake: (mistakes) => {
          this.playSound('error');
          const mistakeEl = document.getElementById('sudoku-mistakes');
          if (mistakeEl) {
            mistakeEl.textContent = `${mistakes}/3`;
          }
        },
        onMove: () => {}
      });
      this.renderSudokuGrid();
    }
  }

  updateJigsawStatus() {
    if (!this.jigsawEngine) return;
    const remaining = this.jigsawEngine.getRemainingCount();
    const statusEl = document.getElementById('jigsaw-pieces-left');
    if (statusEl) {
      statusEl.textContent = this.i18n.t('piecesLeft', { count: remaining });
    }
  }

  renderSudokuGrid() {
    if (!this.sudokuEngine) return;
    const container = document.getElementById('sudoku-board');
    if (!container) return;

    container.innerHTML = '';
    const sel = this.sudokuEngine.selectedCell;
    const selVal = sel ? this.sudokuEngine.grid[sel.r][sel.c] : null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';

        // Add 3x3 horizontal dividers
        if (r === 2 || r === 5) {
          cell.classList.add('sudoku-row-divider');
        }

        const val = this.sudokuEngine.grid[r][c];
        const isClue = this.sudokuEngine.initialClues[r][c];
        const isSelected = sel && sel.r === r && sel.c === c;
        const isPeer = sel && (sel.r === r || sel.c === c || (Math.floor(sel.r / 3) === Math.floor(r / 3) && Math.floor(sel.c / 3) === Math.floor(c / 3)));
        const isSameNum = selVal && selVal !== 0 && val === selVal;
        const isConflicted = this.sudokuEngine.isCellConflicted(r, c);

        if (isClue) cell.classList.add('clue');
        else if (val !== 0) cell.classList.add('user-value');

        if (isSelected) cell.classList.add('selected');
        else if (isSameNum) cell.classList.add('highlight-number');
        else if (isPeer) cell.classList.add('highlight-peer');

        if (isConflicted) cell.classList.add('error');

        // Content: either digit or mini notes
        if (val !== 0) {
          cell.textContent = val;
        } else {
          const notesSet = this.sudokuEngine.notes[r][c];
          if (notesSet && notesSet.size > 0) {
            const notesGrid = document.createElement('div');
            notesGrid.className = 'notes-grid';
            for (let i = 1; i <= 9; i++) {
              const noteItem = document.createElement('div');
              noteItem.className = 'note-item';
              noteItem.textContent = notesSet.has(i) ? i : '';
              notesGrid.appendChild(noteItem);
            }
            cell.appendChild(notesGrid);
          }
        }

        cell.addEventListener('click', () => {
          this.playSound('tap');
          this.sudokuEngine.selectCell(r, c);
          this.renderSudokuGrid();
        });

        container.appendChild(cell);
      }
    }
  }

  handleHintRequested() {
    this.playSound('tap');
    // Invoke Google H5 Rewarded Ad Placement
    this.ads.showRewardedHint({
      onRewardGranted: () => {
        this.playSound('chime');
        if (this.currentMode === 'jigsaw' && this.jigsawEngine) {
          this.jigsawEngine.applyHint();
          this.updateJigsawStatus();
        } else if (this.currentMode === 'sudoku' && this.sudokuEngine) {
          this.sudokuEngine.applyHint();
          this.renderSudokuGrid();
        }
        this.showToast(this.i18n.t('adRewardGranted'));
      },
      onDismissed: () => {
        console.log('Rewarded Ad dismissed without completion.');
      }
    });
  }

  handleVictory(mode) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.playSound('victory');
    this.launchConfetti();

    // Record streak & stats
    const updatedStreak = this.storage.recordDailyCompletion(mode);
    this.storage.recordGameFinished(mode, this.secondsElapsed);
    this.updateStreakBadge();

    // Show Victory Modal
    const modal = document.getElementById('modal-victory');
    const timeSummary = document.getElementById('victory-time');
    const streakSummary = document.getElementById('victory-streak');

    const minutes = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
    const seconds = String(this.secondsElapsed % 60).padStart(2, '0');

    if (timeSummary) timeSummary.textContent = `${minutes}:${seconds}`;
    if (streakSummary && updatedStreak) {
      streakSummary.textContent = this.i18n.t('streakUpdated', { count: updatedStreak.currentStreak });
    }

    if (modal) modal.classList.remove('hidden');

    // Trigger completion interstitial ad after small celebratory pause
    setTimeout(() => {
      this.ads.showInterstitial({
        name: `victory_${mode}`,
        onComplete: () => {}
      });
    }, 1800);
  }

  handleShareResult() {
    const minutes = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
    const seconds = String(this.secondsElapsed % 60).padStart(2, '0');
    const streak = this.storage.getStreak().currentStreak;
    const modeName = this.currentMode === 'jigsaw' ? '🧩 Daily Jigsaw' : '🔢 Daily Sudoku';

    const shareText = `${modeName} Completed!\n⏱️ Time: ${minutes}:${seconds}\n🔥 Streak: ${streak} Days\nPlay free on H5 Web: ${window.location.href}`;

    if (navigator.share) {
      navigator.share({ title: 'Daily Puzzles H5', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast(this.i18n.t('copiedToClipboard'));
      });
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 text-white text-xs font-semibold py-2 px-4 rounded-full shadow-2xl backdrop-blur-sm animate-pop';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.className = 'fixed inset-0 pointer-events-none z-50';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.rSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (frame < 120) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    requestAnimationFrame(animate);
  }
}

// Bootstrap once DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});
