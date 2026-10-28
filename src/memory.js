/**
 * memory.js - Daily Memory Training Game Engine (記憶翻牌訓練)
 * Features:
 * - Date-seeded deterministic daily card placement
 * - 3 difficulty tiers (Easy: 12 cards / 6 pairs, Medium: 16 cards / 8 pairs, Hard: 20 cards / 10 pairs)
 * - 3D card flipping animations
 * - Combo tracking & Hint peek assistant
 * - Pure lightweight DOM/CSS implementation with zero external asset dependencies
 */

export class MemoryEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.dateSeed = options.dateSeed || new Date().toISOString().slice(0, 10);
    this.difficulty = options.difficulty || 'medium'; // 'easy' | 'medium' | 'hard'
    this.onCardFlip = options.onCardFlip || (() => {});
    this.onMatch = options.onMatch || (() => {});
    this.onMismatch = options.onMismatch || (() => {});
    this.onWin = options.onWin || (() => {});
    this.onMove = options.onMove || (() => {});

    // High retention emoji icons with vivid colors
    this.allSymbols = [
      { icon: '🧠', name: 'brain', bg: 'from-pink-500 to-rose-600' },
      { icon: '💎', name: 'gem', bg: 'from-cyan-400 to-blue-600' },
      { icon: '🚀', name: 'rocket', bg: 'from-amber-400 to-orange-600' },
      { icon: '👑', name: 'crown', bg: 'from-yellow-400 to-amber-600' },
      { icon: '🔥', name: 'flame', bg: 'from-red-500 to-amber-600' },
      { icon: '🌟', name: 'star', bg: 'from-yellow-300 to-amber-500' },
      { icon: '🍀', name: 'clover', bg: 'from-emerald-400 to-teal-600' },
      { icon: '🔮', name: 'crystal', bg: 'from-purple-500 to-indigo-600' },
      { icon: '⚡', name: 'lightning', bg: 'from-amber-300 to-yellow-500' },
      { icon: '🪐', name: 'planet', bg: 'from-indigo-400 to-purple-700' },
      { icon: '🎯', name: 'target', bg: 'from-rose-500 to-red-600' },
      { icon: '🦄', name: 'unicorn', bg: 'from-fuchsia-400 to-pink-600' }
    ];

    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 0;
    this.moves = 0;
    this.isLocked = false;

    this.initGame(this.difficulty);
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
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.moves = 0;
    this.isLocked = false;

    // Difficulty grid size configuration
    let pairCount = 8; // Default medium 16 cards (4x4)
    let gridCols = 4;

    if (difficulty === 'easy') {
      pairCount = 6;  // 12 cards (3x4)
      gridCols = 3;
    } else if (difficulty === 'hard') {
      pairCount = 10; // 20 cards (4x5)
      gridCols = 4;
    }

    this.totalPairs = pairCount;
    const rng = this.getSeededRandom(this.dateSeed + `_mem_${difficulty}`);

    // Pick pairs of symbols
    const chosenSymbols = [...this.allSymbols];
    for (let i = chosenSymbols.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [chosenSymbols[i], chosenSymbols[j]] = [chosenSymbols[j], chosenSymbols[i]];
    }

    const selected = chosenSymbols.slice(0, pairCount);
    const deck = [];

    selected.forEach((sym, idx) => {
      deck.push({ id: `c_${idx}_1`, symId: idx, icon: sym.icon, bg: sym.bg, flipped: false, matched: false });
      deck.push({ id: `c_${idx}_2`, symId: idx, icon: sym.icon, bg: sym.bg, flipped: false, matched: false });
    });

    // Shuffle deck deterministically
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.cards = deck;
    this.renderDOM(gridCols);
  }

  renderDOM(gridCols) {
    this.container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = `grid grid-cols-${gridCols} gap-2 sm:gap-2.5 w-full max-w-[360px] mx-auto select-none`;
    grid.id = 'memory-cards-grid';

    this.cards.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'memory-card aspect-[3/4] relative cursor-pointer perspective-1000';
      cardEl.dataset.index = index;

      cardEl.innerHTML = `
        <div class="card-inner w-full h-full relative transition-transform duration-500 transform-style-3d ${card.flipped ? 'rotate-y-180' : ''}">
          <!-- Card Back (Hidden pattern) -->
          <div class="card-face card-back absolute inset-0 w-full h-full rounded-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 border border-indigo-500/40 flex items-center justify-center shadow-lg backface-hidden hover:border-indigo-400 transition-colors">
            <span class="text-xl sm:text-2xl opacity-40">🧠</span>
          </div>
          <!-- Card Front (Revealed Icon) -->
          <div class="card-face card-front absolute inset-0 w-full h-full rounded-xl bg-gradient-to-tr ${card.bg} border-2 border-white/60 flex items-center justify-center shadow-2xl rotate-y-180 backface-hidden">
            <span class="text-2xl sm:text-3xl filter drop-shadow">${card.icon}</span>
          </div>
        </div>
      `;

      cardEl.addEventListener('click', () => this.handleCardClick(index));
      grid.appendChild(cardEl);
    });

    this.container.appendChild(grid);
  }

  handleCardClick(index) {
    if (this.isLocked) return;
    const card = this.cards[index];
    if (card.flipped || card.matched) return;

    // Flip card
    card.flipped = true;
    this.onCardFlip();
    this.updateCardDOM(index);
    this.flippedCards.push({ card, index });

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.onMove(this.moves);
      this.checkMatch();
    }
  }

  checkMatch() {
    this.isLocked = true;
    const [c1, c2] = this.flippedCards;

    if (c1.card.symId === c2.card.symId) {
      // Matched!
      c1.card.matched = true;
      c2.card.matched = true;
      this.matchedPairs++;
      this.onMatch(this.matchedPairs, this.totalPairs);

      // Add match animation
      setTimeout(() => {
        this.markCardsAsMatched(c1.index, c2.index);
        this.flippedCards = [];
        this.isLocked = false;

        if (this.matchedPairs === this.totalPairs) {
          setTimeout(() => {
            this.onWin({
              moves: this.moves,
              totalPairs: this.totalPairs,
              difficulty: this.difficulty
            });
          }, 300);
        }
      }, 400);
    } else {
      // Mismatch
      this.onMismatch();
      setTimeout(() => {
        c1.card.flipped = false;
        c2.card.flipped = false;
        this.updateCardDOM(c1.index);
        this.updateCardDOM(c2.index);
        this.flippedCards = [];
        this.isLocked = false;
      }, 850);
    }
  }

  updateCardDOM(index) {
    const cardEl = this.container.querySelector(`[data-index="${index}"]`);
    if (!cardEl) return;
    const inner = cardEl.querySelector('.card-inner');
    if (this.cards[index].flipped) {
      inner.classList.add('rotate-y-180');
    } else {
      inner.classList.remove('rotate-y-180');
    }
  }

  markCardsAsMatched(idx1, idx2) {
    [idx1, idx2].forEach(idx => {
      const cardEl = this.container.querySelector(`[data-index="${idx}"]`);
      if (cardEl) {
        cardEl.classList.add('scale-95', 'opacity-75');
        const front = cardEl.querySelector('.card-front');
        if (front) {
          front.classList.add('ring-4', 'ring-emerald-400');
        }
      }
    });
  }

  /**
   * Hint: Briefly reveals one matching pair that has not been found yet
   */
  applyHint() {
    if (this.isLocked) return false;

    // Find first unmatched pair
    const unmatched = this.cards.filter(c => !c.matched);
    if (unmatched.length === 0) return false;

    const targetSymId = unmatched[0].symId;
    const pairIndices = [];
    this.cards.forEach((c, idx) => {
      if (c.symId === targetSymId) {
        pairIndices.push(idx);
      }
    });

    if (pairIndices.length !== 2) return false;

    this.isLocked = true;
    pairIndices.forEach(idx => {
      this.cards[idx].flipped = true;
      this.updateCardDOM(idx);
    });

    setTimeout(() => {
      pairIndices.forEach(idx => {
        if (!this.cards[idx].matched) {
          this.cards[idx].flipped = false;
          this.updateCardDOM(idx);
        }
      });
      this.isLocked = false;
    }, 1200);

    return true;
  }

  getRemainingPairsCount() {
    return this.totalPairs - this.matchedPairs;
  }
}
