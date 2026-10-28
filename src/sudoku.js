/**
 * sudoku.js - Sudoku Generator & Validator Algorithm
 * Features:
 * - Deterministic date-seeded daily puzzle generator
 * - Backtracking board generator & validator
 * - Notes (pencil mark) mode
 * - Conflict detection & cell highlighting
 * - Undo history stack & Hint system
 */

export class SudokuEngine {
  constructor(options = {}) {
    this.dateSeed = options.dateSeed || new Date().toISOString().slice(0, 10);
    this.difficulty = options.difficulty || 'medium'; // 'easy' | 'medium' | 'hard' | 'expert'
    this.onWin = options.onWin || (() => {});
    this.onMistake = options.onMistake || (() => {});
    this.onMove = options.onMove || (() => {});

    this.grid = Array(9).fill(null).map(() => Array(9).fill(0));
    this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
    this.initialClues = Array(9).fill(null).map(() => Array(9).fill(false));
    this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

    this.selectedCell = null; // { r, c }
    this.isNotesMode = false;
    this.history = [];
    this.mistakesCount = 0;
    this.maxMistakes = 3;

    this.initGame();
  }

  getSeededRandom(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
      hash |= 0;
    }
    return function() {
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
    };
  }

  initGame(difficulty = this.difficulty) {
    this.difficulty = difficulty;
    this.mistakesCount = 0;
    this.history = [];
    this.selectedCell = null;

    const rng = this.getSeededRandom(this.dateSeed + `_sudoku_${difficulty}`);
    this.generateValidBoard(rng);
    this.createPuzzle(difficulty, rng);
  }

  /**
   * Generates a complete valid 9x9 board using backtracking
   */
  generateValidBoard(rng) {
    this.solution = Array(9).fill(null).map(() => Array(9).fill(0));

    const isValid = (board, row, col, num) => {
      for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
      }
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[startRow + r][startCol + c] === num) return false;
        }
      }
      return true;
    };

    const solve = (board) => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            // Shuffle digits 1-9 using seeded PRNG
            const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            for (let i = digits.length - 1; i > 0; i--) {
              const j = Math.floor(rng() * (i + 1));
              [digits[i], digits[j]] = [digits[j], digits[i]];
            }

            for (const num of digits) {
              if (isValid(board, r, c, num)) {
                board[r][c] = num;
                if (solve(board)) return true;
                board[r][c] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    solve(this.solution);
  }

  /**
   * Carves clues out of solution according to difficulty
   */
  createPuzzle(difficulty, rng) {
    // Number of clues remaining: Easy ~40, Medium ~32, Hard ~28, Expert ~24
    let cluesTarget;
    switch (difficulty) {
      case 'easy': cluesTarget = 40; break;
      case 'medium': cluesTarget = 32; break;
      case 'hard': cluesTarget = 28; break;
      case 'expert': cluesTarget = 24; break;
      default: cluesTarget = 32;
    }

    const totalToRemove = 81 - cluesTarget;
    this.grid = this.solution.map(row => [...row]);
    this.initialClues = Array(9).fill(null).map(() => Array(9).fill(true));
    this.notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));

    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push({ r, c });
      }
    }

    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    let removed = 0;
    for (const pos of positions) {
      if (removed >= totalToRemove) break;
      this.grid[pos.r][pos.c] = 0;
      this.initialClues[pos.r][pos.c] = false;
      removed++;
    }
  }

  selectCell(r, c) {
    this.selectedCell = { r, c };
  }

  toggleNotesMode() {
    this.isNotesMode = !this.isNotesMode;
    return this.isNotesMode;
  }

  inputNumber(num) {
    if (!this.selectedCell) return;
    const { r, c } = this.selectedCell;
    if (this.initialClues[r][c]) return; // Clues cannot be altered

    this.onMove();

    if (this.isNotesMode) {
      // Toggle note
      const currentNotes = new Set(this.notes[r][c]);
      if (currentNotes.has(num)) {
        currentNotes.delete(num);
      } else {
        currentNotes.add(num);
      }

      this.history.push({
        type: 'note',
        r, c,
        prevNotes: new Set(this.notes[r][c]),
        newNotes: currentNotes,
        prevVal: this.grid[r][c]
      });

      this.notes[r][c] = currentNotes;
      return;
    }

    // Standard number input
    const prevVal = this.grid[r][c];
    if (prevVal === num) return; // No change

    this.history.push({
      type: 'value',
      r, c,
      prevVal,
      newVal: num,
      prevNotes: new Set(this.notes[r][c])
    });

    this.grid[r][c] = num;
    this.notes[r][c].clear();

    // Check if mistake
    if (num !== 0 && num !== this.solution[r][c]) {
      this.mistakesCount += 1;
      this.onMistake(this.mistakesCount, this.maxMistakes);
    }

    this.checkWinCondition();
  }

  eraseCurrent() {
    if (!this.selectedCell) return;
    const { r, c } = this.selectedCell;
    if (this.initialClues[r][c]) return;

    if (this.grid[r][c] !== 0 || this.notes[r][c].size > 0) {
      this.history.push({
        type: 'erase',
        r, c,
        prevVal: this.grid[r][c],
        prevNotes: new Set(this.notes[r][c])
      });
      this.grid[r][c] = 0;
      this.notes[r][c].clear();
    }
  }

  undo() {
    if (this.history.length === 0) return false;
    const lastAction = this.history.pop();
    const { r, c } = lastAction;

    if (lastAction.type === 'value') {
      this.grid[r][c] = lastAction.prevVal;
      this.notes[r][c] = lastAction.prevNotes;
    } else if (lastAction.type === 'note') {
      this.notes[r][c] = lastAction.prevNotes;
    } else if (lastAction.type === 'erase') {
      this.grid[r][c] = lastAction.prevVal;
      this.notes[r][c] = lastAction.prevNotes;
    }
    this.selectedCell = { r, c };
    return true;
  }

  /**
   * Hint: auto-fills the selected cell or first empty cell with correct digit
   */
  applyHint() {
    let target = null;

    if (this.selectedCell && this.grid[this.selectedCell.r][this.selectedCell.c] === 0) {
      target = this.selectedCell;
    } else {
      // Find empty cell
      const empties = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (this.grid[r][c] === 0) {
            empties.push({ r, c });
          }
        }
      }
      if (empties.length === 0) return false;
      target = empties[Math.floor(Math.random() * empties.length)];
    }

    const { r, c } = target;
    const correctVal = this.solution[r][c];

    this.grid[r][c] = correctVal;
    this.notes[r][c].clear();
    this.selectedCell = { r, c };

    this.checkWinCondition();
    return true;
  }

  checkWinCondition() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.grid[r][c] !== this.solution[r][c]) {
          return false;
        }
      }
    }
    this.onWin({
      mistakes: this.mistakesCount,
      difficulty: this.difficulty
    });
    return true;
  }

  isCellConflicted(r, c) {
    const val = this.grid[r][c];
    if (val === 0) return false;

    // Check row & col
    for (let i = 0; i < 9; i++) {
      if (i !== c && this.grid[r][i] === val) return true;
      if (i !== r && this.grid[i][c] === val) return true;
    }

    // Check 3x3 box
    const startR = Math.floor(r / 3) * 3;
    const startC = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const nr = startR + dr;
        const nc = startC + dc;
        if ((nr !== r || nc !== c) && this.grid[nr][nc] === val) return true;
      }
    }
    return false;
  }
}
