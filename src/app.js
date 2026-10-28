/**
 * app.js - Main Application Coordinator & Routing
 * Orchestrates Jigsaw, Sudoku, Memory Training, Energy System,
 * Web Audio synthesis, Ad Placement API, streak tracking, and i18n.
 */

import { StorageManager } from './storage.js';
import { I18nManager } from './i18n.js';
import { AdManager } from './ads.js';
import { JigsawEngine } from './jigsaw.js';
import { SudokuEngine } from './sudoku.js';
import { MemoryEngine } from './memory.js';

class App {
  constructor() {
    this.currentMode = 'jigsaw'; // 'jigsaw' | 'sudoku' | 'memory'
    this.timerInterval = null;
    this.energyInterval = null;
    this.secondsElapsed = 0;
    this.isMuted = false;

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
    this.memoryEngine = null;

    this.initDOM();
    this.updateEnergyUI();
    this.startEnergyTicker();
    this.initGameMode(this.currentMode);
    this.updateStreakBadge();
    this.startTimer();
  }

  /**
   * Procedural Web Audio API Synthesizer (0KB external audio files)
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
    } else if (type === 'snap' || type === 'card_flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'match' || type === 'chime') {
      // Pleasant match chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.16, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.22);
      });
    } else if (type === 'error' || type === 'mismatch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'victory') {
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

  /**
   * Energy System Ticker & UI
   */
  updateEnergyUI() {
    const data = this.storage.getEnergyData();
    const countEl = document.getElementById('energy-count');
    const badgeEl = document.getElementById('energy-badge');

    if (countEl) {
      countEl.textContent = `${data.energy}/${data.maxEnergy}`;
    }

    if (badgeEl) {
      if (data.energy <= 0) {
        badgeEl.className = 'flex items-center gap-1 bg-rose-500/20 border border-rose-500/50 px-2.5 py-1 rounded-full text-xs font-bold text-rose-400 shadow-sm cursor-pointer animate-pulse';
      } else {
        badgeEl.className = 'flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300 shadow-sm cursor-pointer hover:bg-amber-500/20 transition-all';
      }
    }

    const timerEl = document.getElementById('energy-recharge-timer');
    if (timerEl) {
      if (data.energy >= data.maxEnergy) {
        timerEl.textContent = this.i18n.t('energyFull') || '滿';
      } else {
        const sec = Math.ceil(data.nextRechargeMs / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }
    }
  }

  startEnergyTicker() {
    if (this.energyInterval) clearInterval(this.energyInterval);
    this.energyInterval = setInterval(() => {
      this.updateEnergyUI();
    }, 1000);
  }

  checkOrPromptEnergy() {
    const data = this.storage.getEnergyData();
    if (data.energy <= 0) {
      this.showEnergyModal();
      return false;
    }
    return true;
  }

  showEnergyModal() {
    const modal = document.getElementById('modal-energy');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  initDOM() {
    this.i18n.updateDOM();

    // Mode Switcher Tabs
    document.getElementById('tab-jigsaw')?.addEventListener('click', () => this.switchMode('jigsaw'));
    document.getElementById('tab-sudoku')?.addEventListener('click', () => this.switchMode('sudoku'));
    document.getElementById('tab-memory')?.addEventListener('click', () => this.switchMode('memory'));

    // Energy Badge click -> open Energy modal
    document.getElementById('energy-badge')?.addEventListener('click', () => {
      this.playSound('tap');
      this.showEnergyModal();
    });

    document.getElementById('btn-close-energy')?.addEventListener('click', () => {
      document.getElementById('modal-energy')?.classList.add('hidden');
    });

    // Watch Ad for Energy
    document.getElementById('btn-watch-ad-energy')?.addEventListener('click', () => {
      this.playSound('tap');
      this.ads.showRewardedHint({
        onRewardGranted: () => {
          this.playSound('match');
          this.storage.addEnergy(3);
          this.updateEnergyUI();
          document.getElementById('modal-energy')?.classList.add('hidden');
          this.showToast(this.i18n.t('energyGranted'));
        },
        onDismissed: () => {
          console.log('Energy Ad dismissed early');
        }
      });
    });

    // Language Dropdown
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.value = this.i18n.getLanguage();
      langSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        this.i18n.setLanguage(lang);
        this.storage.saveSettings({ lang });
        this.renderSudokuGrid();
        this.updateJigsawStatus();
        this.updateMemoryStatus();
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

    // Rules / Settings Modal
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

    // Memory Controls
    document.getElementById('memory-difficulty')?.addEventListener('change', (e) => {
      this.playSound('tap');
      if (this.memoryEngine) {
        this.memoryEngine.initGame(e.target.value);
        this.updateMemoryStatus();
      }
    });

    document.getElementById('btn-memory-reset')?.addEventListener('click', () => {
      this.playSound('tap');
      if (this.memoryEngine) {
        this.memoryEngine.initGame(this.memoryEngine.difficulty);
        this.updateMemoryStatus();
      }
    });

    // Sudoku Numeric Keypad (1 - 9)
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

    // Check Energy
    if (!this.checkOrPromptEnergy()) {
      return;
    }

    this.playSound('tap');
    this.currentMode = mode;

    const tabJigsaw = document.getElementById('tab-jigsaw');
    const tabSudoku = document.getElementById('tab-sudoku');
    const tabMemory = document.getElementById('tab-memory');
    const jigsawView = document.getElementById('view-jigsaw');
    const sudokuView = document.getElementById('view-sudoku');
    const memoryView = document.getElementById('view-memory');

    const defaultTabClass = 'flex-1 py-2 text-center text-xs sm:text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-1';
    const activeTabClass = 'flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 text-white shadow-md transition-all flex items-center justify-center gap-1';

    tabJigsaw.className = mode === 'jigsaw' ? activeTabClass : defaultTabClass;
    tabSudoku.className = mode === 'sudoku' ? activeTabClass : defaultTabClass;
    tabMemory.className = mode === 'memory' ? activeTabClass : defaultTabClass;

    jigsawView.classList.toggle('hidden', mode !== 'jigsaw');
    sudokuView.classList.toggle('hidden', mode !== 'sudoku');
    memoryView.classList.toggle('hidden', mode !== 'memory');

    this.initGameMode(mode);
    this.startTimer();
  }

  initGameMode(mode) {
    // Consume 1 Energy point for starting a challenge
    this.storage.consumeEnergy(1);
    this.updateEnergyUI();

    if (mode === 'jigsaw') {
      const container = document.getElementById('jigsaw-container');
      const diffSelect = document.getElementById('jigsaw-difficulty');
      const gridSize = diffSelect ? parseInt(diffSelect.value, 10) : 4;

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
    } else if (mode === 'memory') {
      const container = document.getElementById('memory-container');
      const diffSelect = document.getElementById('memory-difficulty');
      const difficulty = diffSelect ? diffSelect.value : 'medium';

      this.memoryEngine = new MemoryEngine(container, {
        difficulty,
        dateSeed: this.storage.getTodayDateString(),
        onCardFlip: () => this.playSound('card_flip'),
        onMatch: () => {
          this.playSound('match');
          this.updateMemoryStatus();
        },
        onMismatch: () => this.playSound('mismatch'),
        onWin: (data) => this.handleVictory('memory', data),
        onMove: () => this.updateMemoryStatus()
      });
      this.updateMemoryStatus();
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

  updateMemoryStatus() {
    if (!this.memoryEngine) return;
    const remaining = this.memoryEngine.getRemainingPairsCount();
    const statusEl = document.getElementById('memory-pairs-left');
    if (statusEl) {
      statusEl.textContent = this.i18n.t('pairsLeft', { count: remaining });
    }
    const movesEl = document.getElementById('memory-moves');
    if (movesEl) {
      movesEl.textContent = this.memoryEngine.moves;
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
    this.ads.showRewardedHint({
      onRewardGranted: () => {
        this.playSound('match');
        if (this.currentMode === 'jigsaw' && this.jigsawEngine) {
          this.jigsawEngine.applyHint();
          this.updateJigsawStatus();
        } else if (this.currentMode === 'sudoku' && this.sudokuEngine) {
          this.sudokuEngine.applyHint();
          this.renderSudokuGrid();
        } else if (this.currentMode === 'memory' && this.memoryEngine) {
          this.memoryEngine.applyHint();
          this.updateMemoryStatus();
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

    const updatedStreak = this.storage.recordDailyCompletion(mode);
    this.storage.recordGameFinished(mode, this.secondsElapsed);
    this.updateStreakBadge();

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

    // Trigger Interstitial Ad after 1.8s
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
    const modeName = this.currentMode === 'jigsaw' ? '🧩 每日拼圖' : (this.currentMode === 'sudoku' ? '🔢 每日數獨' : '🧠 記憶翻牌');

    const shareText = `${modeName} 挑戰成功！\n⏱️ 耗時: ${minutes}:${seconds}\n🔥 連勝紀錄: ${streak} 天\n立即免費遊玩: ${window.location.href}`;

    if (navigator.share) {
      navigator.share({ title: '每日益智大挑戰', text: shareText }).catch(() => {});
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
        p.vy += 0.25;
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

window.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});
