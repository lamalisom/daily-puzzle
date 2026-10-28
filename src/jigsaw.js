/**
 * jigsaw.js - Lightweight Canvas Jigsaw Engine
 * Features:
 * - Procedural date-seeded dynamic artwork generator (no external heavy assets needed)
 * - Authentic interlocking bezier jigsaw tabs and blanks
 * - Multi-touch & pointer drag-and-drop with magnetic grid snapping
 * - Ghost image preview toggle, Hint assistant, and victory detection
 */

export class JigsawEngine {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.rows = options.rows || 3;
    this.cols = options.cols || 3;
    this.dateSeed = options.dateSeed || new Date().toISOString().slice(0, 10);
    this.onPieceSnapped = options.onPieceSnapped || (() => {});
    this.onWin = options.onWin || (() => {});
    this.onMove = options.onMove || (() => {});

    this.boardWidth = 360;
    this.boardHeight = 360;
    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;

    this.pieces = [];
    this.activePiece = null;
    this.dragOffset = { x: 0, y: 0 };
    this.showGhost = false;

    this.imageCanvas = document.createElement('canvas');
    this.imageCanvas.width = 600;
    this.imageCanvas.height = 600;

    this.initDOM();
    this.generateArtwork();
    this.buildPuzzle();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = '';
    this.container.className = 'relative flex flex-col items-center select-none w-full max-w-md mx-auto';

    // Game Board Area
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'relative w-[340px] h-[340px] sm:w-[360px] sm:h-[360px] bg-slate-900/90 rounded-2xl border-2 border-dashed border-indigo-500/40 shadow-inner overflow-hidden';
    this.boardEl.style.touchAction = 'none';

    // Ghost background image
    this.ghostEl = document.createElement('canvas');
    this.ghostEl.width = 360;
    this.ghostEl.height = 360;
    this.ghostEl.className = 'absolute inset-0 w-full h-full opacity-20 pointer-events-none transition-opacity duration-300';
    this.ghostEl.style.display = 'none';
    this.boardEl.appendChild(this.ghostEl);

    // Board Base Canvas (for snapped pieces)
    this.boardCanvas = document.createElement('canvas');
    this.boardCanvas.width = 360;
    this.boardCanvas.height = 360;
    this.boardCanvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
    this.boardCtx = this.boardCanvas.getContext('2d');
    this.boardEl.appendChild(this.boardCanvas);

    // Dynamic Interaction Layer
    this.interactiveCanvas = document.createElement('canvas');
    this.interactiveCanvas.width = 360;
    this.interactiveCanvas.height = 360;
    this.interactiveCanvas.className = 'absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing';
    this.interactiveCtx = this.interactiveCanvas.getContext('2d');
    this.boardEl.appendChild(this.interactiveCanvas);

    this.container.appendChild(this.boardEl);

    // Piece Tray Area below board
    this.trayEl = document.createElement('div');
    this.trayEl.className = 'w-full mt-3 p-2 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap gap-2 justify-center items-center min-h-[90px] max-h-[140px] overflow-y-auto';
    this.trayEl.id = 'jigsaw-tray';
    this.container.appendChild(this.trayEl);
  }

  /**
   * Deterministic PRNG seeded by Date string for consistent daily puzzles
   */
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

  /**
   * Generates procedurally crafted vivid artwork for today
   */
  generateArtwork() {
    const ctx = this.imageCanvas.getContext('2d');
    const rng = this.getSeededRandom(this.dateSeed);
    const themes = [
      { name: 'Sunset Mountain', top: '#1e1b4b', mid: '#f43f5e', bottom: '#fbbf24', sun: '#fef08a' },
      { name: 'Emerald Forest', top: '#064e3b', mid: '#059669', bottom: '#34d399', sun: '#a7f3d0' },
      { name: 'Cosmic Nebula', top: '#0f172a', mid: '#7c3aed', bottom: '#ec4899', sun: '#67e8f9' },
      { name: 'Golden Coast', top: '#0284c7', mid: '#38bdf8', bottom: '#f59e0b', sun: '#fffbeb' },
      { name: 'Tokyo Neon Night', top: '#09090b', mid: '#db2777', bottom: '#3b82f6', sun: '#f472b6' }
    ];

    const themeIndex = Math.floor(rng() * themes.length);
    const theme = themes[themeIndex];

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, theme.top);
    sky.addColorStop(0.55, theme.mid);
    sky.addColorStop(1, theme.bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 600, 600);

    // Sun / Moon / Celestial Body
    ctx.fillStyle = theme.sun;
    ctx.beginPath();
    ctx.arc(300, 220, 85, 0, Math.PI * 2);
    ctx.fill();

    // Soft celestial glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(300, 220, 130, 0, Math.PI * 2);
    ctx.fill();

    // Mountain silhouettes
    const drawMountainRange = (color, baseY, peakMin, peakMax, steps) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 600);
      ctx.lineTo(0, baseY);
      const stepW = 600 / steps;
      for (let i = 0; i <= steps; i++) {
        const x = i * stepW;
        const y = baseY - (peakMin + rng() * (peakMax - peakMin));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(600, 600);
      ctx.closePath();
      ctx.fill();
    };

    drawMountainRange('rgba(15, 23, 42, 0.45)', 420, 80, 160, 5);
    drawMountainRange('rgba(15, 23, 42, 0.75)', 490, 70, 140, 6);
    drawMountainRange('#020617', 560, 50, 100, 7);

    // Forest / Pine Trees detail along foreground
    ctx.fillStyle = '#020617';
    for (let x = 10; x < 600; x += 18 + rng() * 12) {
      const treeH = 35 + rng() * 45;
      const treeY = 570 - rng() * 30;
      ctx.beginPath();
      ctx.moveTo(x, treeY);
      ctx.lineTo(x - 9, treeY + treeH);
      ctx.lineTo(x + 9, treeY + treeH);
      ctx.closePath();
      ctx.fill();
    }

    // Stars / Sparkles
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 35; s++) {
      const sx = rng() * 600;
      const sy = rng() * 260;
      const sr = 1 + rng() * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update ghost preview
    const ghostCtx = this.ghostEl.getContext('2d');
    ghostCtx.drawImage(this.imageCanvas, 0, 0, 360, 360);
  }

  setDifficulty(gridSize) {
    this.rows = gridSize;
    this.cols = gridSize;
    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;
    this.buildPuzzle();
  }

  buildPuzzle() {
    this.pieces = [];
    const rng = this.getSeededRandom(this.dateSeed + `_g${this.rows}`);

    // Generate edge tabs/blanks matrix
    // horizontalEdges[row][col] is the edge between piece(row, col) and piece(row, col+1)
    const horizontalEdges = [];
    for (let r = 0; r < this.rows; r++) {
      horizontalEdges[r] = [];
      for (let c = 0; c < this.cols - 1; c++) {
        horizontalEdges[r][c] = rng() > 0.5 ? 1 : -1;
      }
    }

    // verticalEdges[row][col] is the edge between piece(row, col) and piece(row+1, col)
    const verticalEdges = [];
    for (let r = 0; r < this.rows - 1; r++) {
      verticalEdges[r] = [];
      for (let c = 0; c < this.cols; c++) {
        verticalEdges[r][c] = rng() > 0.5 ? 1 : -1;
      }
    }

    let id = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const topEdge = r === 0 ? 0 : -verticalEdges[r - 1][c];
        const rightEdge = c === this.cols - 1 ? 0 : horizontalEdges[r][c];
        const bottomEdge = r === this.rows - 1 ? 0 : verticalEdges[r][c];
        const leftEdge = c === 0 ? 0 : -horizontalEdges[r][c - 1];

        const targetX = c * this.pieceWidth;
        const targetY = r * this.pieceHeight;

        this.pieces.push({
          id: id++,
          row: r,
          col: c,
          targetX,
          targetY,
          currentX: null,
          currentY: null,
          edges: { top: topEdge, right: rightEdge, bottom: bottomEdge, left: leftEdge },
          snapped: false,
          inTray: true
        });
      }
    }

    // Shuffle tray order
    this.shufflePieces(rng);
    this.renderBoard();
    this.renderTray();
    this.renderInteractive();
  }

  shufflePieces(rng) {
    for (let i = this.pieces.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
    }
  }

  /**
   * Draws a jigsaw piece interlocking path
   */
  drawPiecePath(ctx, x, y, w, h, edges) {
    const tabRadius = Math.min(w, h) * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Top Edge
    if (edges.top === 0) {
      ctx.lineTo(x + w, y);
    } else {
      const sign = edges.top;
      ctx.lineTo(x + w * 0.38, y);
      ctx.bezierCurveTo(
        x + w * 0.38, y - tabRadius * sign,
        x + w * 0.62, y - tabRadius * sign,
        x + w * 0.62, y
      );
      ctx.lineTo(x + w, y);
    }

    // Right Edge
    if (edges.right === 0) {
      ctx.lineTo(x + w, y + h);
    } else {
      const sign = edges.right;
      ctx.lineTo(x + w, y + h * 0.38);
      ctx.bezierCurveTo(
        x + w + tabRadius * sign, y + h * 0.38,
        x + w + tabRadius * sign, y + h * 0.62,
        x + w, y + h * 0.62
      );
      ctx.lineTo(x + w, y + h);
    }

    // Bottom Edge
    if (edges.bottom === 0) {
      ctx.lineTo(x, y + h);
    } else {
      const sign = edges.bottom;
      ctx.lineTo(x + w * 0.62, y + h);
      ctx.bezierCurveTo(
        x + w * 0.62, y + h + tabRadius * sign,
        x + w * 0.38, y + h + tabRadius * sign,
        x + w * 0.38, y + h
      );
      ctx.lineTo(x, y + h);
    }

    // Left Edge
    if (edges.left === 0) {
      ctx.lineTo(x, y);
    } else {
      const sign = edges.left;
      ctx.lineTo(x, y + h * 0.62);
      ctx.bezierCurveTo(
        x - tabRadius * sign, y + h * 0.62,
        x - tabRadius * sign, y + h * 0.38,
        x, y + h * 0.38
      );
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /**
   * Render piece onto a standalone mini-canvas (used for tray buttons)
   */
  createPiecePreviewCanvas(piece, previewSize = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = previewSize;
    canvas.height = previewSize;
    const ctx = canvas.getContext('2d');

    const padding = previewSize * 0.18;
    const drawW = previewSize - padding * 2;
    const drawH = previewSize - padding * 2;

    ctx.save();
    this.drawPiecePath(ctx, padding, padding, drawW, drawH, piece.edges);
    ctx.clip();

    // Source coordinates on source image
    const srcX = (piece.col / this.cols) * this.imageCanvas.width;
    const srcY = (piece.row / this.rows) * this.imageCanvas.height;
    const srcW = this.imageCanvas.width / this.cols;
    const srcH = this.imageCanvas.height / this.rows;

    ctx.drawImage(this.imageCanvas, srcX, srcY, srcW, srcH, padding, padding, drawW, drawH);
    ctx.restore();

    // Stroke border
    ctx.save();
    this.drawPiecePath(ctx, padding, padding, drawW, drawH, piece.edges);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();
    ctx.restore();

    return canvas;
  }

  renderBoard() {
    this.boardCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
    // Draw all snapped pieces
    for (const piece of this.pieces) {
      if (piece.snapped) {
        this.boardCtx.save();
        this.drawPiecePath(this.boardCtx, piece.targetX, piece.targetY, this.pieceWidth, this.pieceHeight, piece.edges);
        this.boardCtx.clip();

        const srcX = (piece.col / this.cols) * this.imageCanvas.width;
        const srcY = (piece.row / this.rows) * this.imageCanvas.height;
        const srcW = this.imageCanvas.width / this.cols;
        const srcH = this.imageCanvas.height / this.rows;

        this.boardCtx.drawImage(this.imageCanvas, srcX, srcY, srcW, srcH, piece.targetX, piece.targetY, this.pieceWidth, this.pieceHeight);
        this.boardCtx.restore();

        // Subtle piece border
        this.boardCtx.save();
        this.drawPiecePath(this.boardCtx, piece.targetX, piece.targetY, this.pieceWidth, this.pieceHeight, piece.edges);
        this.boardCtx.lineWidth = 1;
        this.boardCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.boardCtx.stroke();
        this.boardCtx.restore();
      }
    }
  }

  renderInteractive() {
    this.interactiveCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);
    // Render piece currently being dragged
    if (this.activePiece && !this.activePiece.snapped) {
      const piece = this.activePiece;
      const x = piece.currentX;
      const y = piece.currentY;

      this.interactiveCtx.save();
      // Drop shadow for tactile 3D effect
      this.interactiveCtx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      this.interactiveCtx.shadowBlur = 16;
      this.interactiveCtx.shadowOffsetX = 4;
      this.interactiveCtx.shadowOffsetY = 8;

      this.drawPiecePath(this.interactiveCtx, x, y, this.pieceWidth, this.pieceHeight, piece.edges);
      this.interactiveCtx.fillStyle = '#000';
      this.interactiveCtx.fill();
      this.interactiveCtx.restore();

      this.interactiveCtx.save();
      this.drawPiecePath(this.interactiveCtx, x, y, this.pieceWidth, this.pieceHeight, piece.edges);
      this.interactiveCtx.clip();

      const srcX = (piece.col / this.cols) * this.imageCanvas.width;
      const srcY = (piece.row / this.rows) * this.imageCanvas.height;
      const srcW = this.imageCanvas.width / this.cols;
      const srcH = this.imageCanvas.height / this.rows;

      this.interactiveCtx.drawImage(this.imageCanvas, srcX, srcY, srcW, srcH, x, y, this.pieceWidth, this.pieceHeight);
      this.interactiveCtx.restore();

      // Border glow
      this.interactiveCtx.save();
      this.drawPiecePath(this.interactiveCtx, x, y, this.pieceWidth, this.pieceHeight, piece.edges);
      this.interactiveCtx.lineWidth = 2.5;
      this.interactiveCtx.strokeStyle = '#38bdf8';
      this.interactiveCtx.stroke();
      this.interactiveCtx.restore();
    }
  }

  renderTray() {
    this.trayEl.innerHTML = '';
    const unsnapped = this.pieces.filter(p => !p.snapped && p.inTray);

    if (unsnapped.length === 0) {
      this.trayEl.innerHTML = `<span class="text-xs text-emerald-400 font-medium py-3">All pieces placed! 🎉</span>`;
      return;
    }

    unsnapped.forEach(piece => {
      const itemBtn = document.createElement('button');
      itemBtn.className = 'p-1 bg-slate-900 border border-slate-700/80 hover:border-indigo-500 rounded-lg transition-transform active:scale-95 shadow-sm';
      itemBtn.title = 'Drag or tap to place';

      const previewCanvas = this.createPiecePreviewCanvas(piece, 56);
      itemBtn.appendChild(previewCanvas);

      // Start dragging from tray onto board
      itemBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.selectPieceForDrag(piece, e);
      });

      this.trayEl.appendChild(itemBtn);
    });
  }

  selectPieceForDrag(piece, e) {
    const rect = this.interactiveCanvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    piece.inTray = false;
    this.activePiece = piece;
    this.dragOffset = {
      x: this.pieceWidth / 2,
      y: this.pieceHeight / 2
    };

    // Calculate position in canvas coordinate space (360x360)
    const scaleX = this.boardWidth / rect.width;
    const scaleY = this.boardHeight / rect.height;

    piece.currentX = (clientX - rect.left) * scaleX - this.dragOffset.x;
    piece.currentY = (clientY - rect.top) * scaleY - this.dragOffset.y;

    this.renderTray();
    this.renderInteractive();
  }

  bindEvents() {
    const canvas = this.interactiveCanvas;

    const onPointerMove = (e) => {
      if (!this.activePiece) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.boardWidth / rect.width;
      const scaleY = this.boardHeight / rect.height;

      this.activePiece.currentX = (e.clientX - rect.left) * scaleX - this.dragOffset.x;
      this.activePiece.currentY = (e.clientY - rect.top) * scaleY - this.dragOffset.y;
      this.renderInteractive();
    };

    const onPointerUp = () => {
      if (!this.activePiece) return;
      this.onMove();
      const piece = this.activePiece;
      const snapDistance = 38; // Threshold in board pixels

      const dist = Math.hypot(
        piece.currentX - piece.targetX,
        piece.currentY - piece.targetY
      );

      if (dist < snapDistance) {
        // Snap successfully!
        piece.snapped = true;
        piece.inTray = false;
        piece.currentX = piece.targetX;
        piece.currentY = piece.targetY;
        this.activePiece = null;
        this.renderBoard();
        this.renderInteractive();
        this.renderTray();
        this.onPieceSnapped(piece);
        this.checkWinCondition();
      } else {
        // If dropped outside board or not near target, return to tray
        piece.inTray = true;
        this.activePiece = null;
        this.renderInteractive();
        this.renderTray();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  togglePreview() {
    this.showGhost = !this.showGhost;
    this.ghostEl.style.display = this.showGhost ? 'block' : 'none';
    return this.showGhost;
  }

  /**
   * Hint: Automatically takes one unsnapped piece and places it correctly
   */
  applyHint() {
    const unsnapped = this.pieces.filter(p => !p.snapped);
    if (unsnapped.length === 0) return false;

    // Pick a random unsnapped piece
    const piece = unsnapped[Math.floor(Math.random() * unsnapped.length)];
    piece.snapped = true;
    piece.inTray = false;
    piece.currentX = piece.targetX;
    piece.currentY = piece.targetY;

    if (this.activePiece && this.activePiece.id === piece.id) {
      this.activePiece = null;
    }

    this.renderBoard();
    this.renderInteractive();
    this.renderTray();
    this.onPieceSnapped(piece);
    this.checkWinCondition();
    return true;
  }

  checkWinCondition() {
    const allSnapped = this.pieces.every(p => p.snapped);
    if (allSnapped) {
      setTimeout(() => {
        this.onWin({
          moves: 0,
          date: this.dateSeed,
          piecesCount: this.pieces.length
        });
      }, 300);
    }
  }

  getRemainingCount() {
    return this.pieces.filter(p => !p.snapped).length;
  }

  reset() {
    for (const piece of this.pieces) {
      piece.snapped = false;
      piece.inTray = true;
    }
    this.activePiece = null;
    this.renderBoard();
    this.renderInteractive();
    this.renderTray();
  }
}
