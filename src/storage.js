/**
 * storage.js - LocalStorage manager for High-Yield H5 Web Game
 * Handles streak tracking, game state persistence, audio/settings, and user stats.
 */

const STORAGE_KEYS = {
  SETTINGS: 'h5_daily_settings',
  STREAK: 'h5_daily_streak',
  JIGSAW_STATE: 'h5_daily_jigsaw_state',
  SUDOKU_STATE: 'h5_daily_sudoku_state',
  STATS: 'h5_daily_stats'
};

export const StorageManager = {
  /**
   * Get formatted local date string 'YYYY-MM-DD'
   */
  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Get date string for yesterday 'YYYY-MM-DD'
   */
  getYesterdayDateString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Settings (Language, Sound FX, Haptics)
   */
  getSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const defaults = {
        sound: true,
        lang: navigator.language ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 
                                   navigator.language.toLowerCase().startsWith('ja') ? 'ja' :
                                   navigator.language.toLowerCase().startsWith('de') ? 'de' :
                                   navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en') : 'en',
        vibrate: true,
        highlightErrors: true
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      console.warn('StorageManager.getSettings error:', e);
      return { sound: true, lang: 'en', vibrate: true, highlightErrors: true };
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
   * Daily Streak & History Tracking
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
        history: {} // date: { jigsaw: boolean, sudoku: boolean }
      };

      if (!saved) return defaults;
      const data = { ...defaults, ...JSON.parse(saved) };

      // Verify if streak was broken (missed yesterday and today not finished)
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
        streakData.history[today] = { jigsaw: false, sudoku: false };
      }

      streakData.history[today][gameType] = true;

      // Check if at least one daily game mode was finished today for streak
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
   * Active Game State Auto-Save & Recovery
   */
  saveGameState(gameType, state) {
    try {
      const key = gameType === 'jigsaw' ? STORAGE_KEYS.JIGSAW_STATE : STORAGE_KEYS.SUDOKU_STATE;
      localStorage.setItem(key, JSON.stringify({
        savedAt: Date.now(),
        date: this.getTodayDateString(),
        state
      }));
    } catch (e) {
      console.warn(`StorageManager.saveGameState(${gameType}) error:`, e);
    }
  },

  loadGameState(gameType) {
    try {
      const key = gameType === 'jigsaw' ? STORAGE_KEYS.JIGSAW_STATE : STORAGE_KEYS.SUDOKU_STATE;
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Auto-expire game state if from a previous day
      if (parsed.date !== this.getTodayDateString()) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.state;
    } catch (e) {
      console.warn(`StorageManager.loadGameState(${gameType}) error:`, e);
      return null;
    }
  },

  clearGameState(gameType) {
    try {
      const key = gameType === 'jigsaw' ? STORAGE_KEYS.JIGSAW_STATE : STORAGE_KEYS.SUDOKU_STATE;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`StorageManager.clearGameState(${gameType}) error:`, e);
    }
  },

  /**
   * Overall Player Statistics
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
        sudokuBestTime: null
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      return { jigsawPlayed: 0, jigsawWon: 0, jigsawBestTime: null, sudokuPlayed: 0, sudokuWon: 0, sudokuBestTime: null };
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
      }
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      return stats;
    } catch (e) {
      console.warn('StorageManager.recordGameFinished error:', e);
      return null;
    }
  }
};
