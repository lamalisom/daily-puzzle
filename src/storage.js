/**
 * storage.js - LocalStorage manager for High-Yield H5 Web Game
 * Handles streak tracking, game state persistence, audio/settings, energy system, and user stats.
 */

const STORAGE_KEYS = {
  SETTINGS: 'h5_daily_settings',
  STREAK: 'h5_daily_streak',
  ENERGY: 'h5_daily_energy',
  JIGSAW_STATE: 'h5_daily_jigsaw_state',
  SUDOKU_STATE: 'h5_daily_sudoku_state',
  MEMORY_STATE: 'h5_daily_memory_state',
  STATS: 'h5_daily_stats'
};

const MAX_ENERGY = 5;
const RECHARGE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes per energy point

export const StorageManager = {
  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getYesterdayDateString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Energy / Stamina Management
   */
  getEnergyData() {
    try {
      const now = Date.now();
      const saved = localStorage.getItem(STORAGE_KEYS.ENERGY);
      if (!saved) {
        const initial = { energy: MAX_ENERGY, lastUpdate: now };
        localStorage.setItem(STORAGE_KEYS.ENERGY, JSON.stringify(initial));
        return { ...initial, nextRechargeMs: 0, maxEnergy: MAX_ENERGY };
      }

      const data = JSON.parse(saved);
      let { energy, lastUpdate } = data;

      // Calculate offline auto-recharge
      if (energy < MAX_ENERGY) {
        const elapsed = now - lastUpdate;
        const pointsToAdd = Math.floor(elapsed / RECHARGE_INTERVAL_MS);
        if (pointsToAdd > 0) {
          energy = Math.min(MAX_ENERGY, energy + pointsToAdd);
          lastUpdate = energy === MAX_ENERGY ? now : lastUpdate + pointsToAdd * RECHARGE_INTERVAL_MS;
          localStorage.setItem(STORAGE_KEYS.ENERGY, JSON.stringify({ energy, lastUpdate }));
        }
      }

      const nextRechargeMs = energy < MAX_ENERGY ? Math.max(0, RECHARGE_INTERVAL_MS - (now - lastUpdate)) : 0;
      return { energy, lastUpdate, nextRechargeMs, maxEnergy: MAX_ENERGY };
    } catch (e) {
      console.warn('StorageManager.getEnergyData error:', e);
      return { energy: MAX_ENERGY, lastUpdate: Date.now(), nextRechargeMs: 0, maxEnergy: MAX_ENERGY };
    }
  },

  consumeEnergy(amount = 1) {
    const data = this.getEnergyData();
    if (data.energy < amount) {
      return false; // Not enough energy
    }

    const newEnergy = data.energy - amount;
    const lastUpdate = data.energy === MAX_ENERGY ? Date.now() : data.lastUpdate;
    localStorage.setItem(STORAGE_KEYS.ENERGY, JSON.stringify({ energy: newEnergy, lastUpdate }));
    return true;
  },

  addEnergy(amount = 3) {
    const data = this.getEnergyData();
    const newEnergy = Math.min(MAX_ENERGY, data.energy + amount);
    const lastUpdate = newEnergy >= MAX_ENERGY ? Date.now() : data.lastUpdate;
    localStorage.setItem(STORAGE_KEYS.ENERGY, JSON.stringify({ energy: newEnergy, lastUpdate }));
    return this.getEnergyData();
  },

  /**
   * User Settings
   */
  getSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const defaults = {
        sound: true,
        lang: navigator.language ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 
                                   navigator.language.toLowerCase().startsWith('ja') ? 'ja' :
                                   navigator.language.toLowerCase().startsWith('de') ? 'de' :
                                   navigator.language.toLowerCase().startsWith('es') ? 'es' : 'zh-TW') : 'zh-TW',
        vibrate: true,
        highlightErrors: true
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      console.warn('StorageManager.getSettings error:', e);
      return { sound: true, lang: 'zh-TW', vibrate: true, highlightErrors: true };
    }
  },

  saveSettings(settings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('StorageManager.saveSettings error:', e);
      return settings;
    }
  },

  /**
   * Daily Streak & Completion History
   */
  getStreak() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STREAK);
      const today = this.getTodayDateString();
      const yesterday = this.getYesterdayDateString();

      const defaults = {
        currentStreak: 0,
        maxStreak: 0,
        lastCompletedDate: null,
        history: {}
      };

      if (!saved) return defaults;
      const data = { ...defaults, ...JSON.parse(saved) };

      if (data.lastCompletedDate && data.lastCompletedDate !== today && data.lastCompletedDate !== yesterday) {
        data.currentStreak = 0;
      }

      return data;
    } catch (e) {
      console.warn('StorageManager.getStreak error:', e);
      return { currentStreak: 0, maxStreak: 0, lastCompletedDate: null, history: {} };
    }
  },

  recordDailyCompletion(gameType) {
    try {
      const streakData = this.getStreak();
      const today = this.getTodayDateString();
      const yesterday = this.getYesterdayDateString();

      if (!streakData.history[today]) {
        streakData.history[today] = { jigsaw: false, sudoku: false, memory: false };
      }

      streakData.history[today][gameType] = true;

      if (streakData.lastCompletedDate !== today) {
        if (streakData.lastCompletedDate === yesterday) {
          streakData.currentStreak += 1;
        } else {
          streakData.currentStreak = 1;
        }
        streakData.lastCompletedDate = today;

        if (streakData.currentStreak > streakData.maxStreak) {
          streakData.maxStreak = streakData.currentStreak;
        }
      }

      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData));
      return streakData;
    } catch (e) {
      console.warn('StorageManager.recordDailyCompletion error:', e);
      return null;
    }
  },

  /**
   * Stats
   */
  getStats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      const defaults = {
        jigsawPlayed: 0,
        jigsawWon: 0,
        jigsawBestTime: null,
        sudokuPlayed: 0,
        sudokuWon: 0,
        sudokuBestTime: null,
        memoryPlayed: 0,
        memoryWon: 0,
        memoryBestTime: null
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      return { jigsawPlayed: 0, jigsawWon: 0, jigsawBestTime: null, sudokuPlayed: 0, sudokuWon: 0, sudokuBestTime: null, memoryPlayed: 0, memoryWon: 0, memoryBestTime: null };
    }
  },

  recordGameFinished(gameType, timeSeconds) {
    try {
      const stats = this.getStats();
      if (gameType === 'jigsaw') {
        stats.jigsawPlayed += 1;
        stats.jigsawWon += 1;
        if (!stats.jigsawBestTime || timeSeconds < stats.jigsawBestTime) {
          stats.jigsawBestTime = timeSeconds;
        }
      } else if (gameType === 'sudoku') {
        stats.sudokuPlayed += 1;
        stats.sudokuWon += 1;
        if (!stats.sudokuBestTime || timeSeconds < stats.sudokuBestTime) {
          stats.sudokuBestTime = timeSeconds;
        }
      } else if (gameType === 'memory') {
        stats.memoryPlayed += 1;
        stats.memoryWon += 1;
        if (!stats.memoryBestTime || timeSeconds < stats.memoryBestTime) {
          stats.memoryBestTime = timeSeconds;
        }
      }
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      return stats;
    } catch (e) {
      console.warn('StorageManager.recordGameFinished error:', e);
      return null;
    }
  }
};
