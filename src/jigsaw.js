/**
 * jigsaw.js - Lightweight Canvas Jigsaw Engine
 * Features:
 * - Completely fixes the auto-revealing bug (no dashed target outlines!)
 * - Custom photo upload support (users can upload their own images/photos)
 * - Built-in high-quality scenery & theme presets
 * - Mobile & iPad optimized: PointerEvent & TouchEvent compatibility
 * - Drag-and-Drop + Tap-to-Select & Tap-to-Place
 * - Interlocking bezier tabs and blanks, ghost preview, and hint assistant
 */

export class JigsawEngine {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.rows = options.rows || 4;
    this.cols = options.cols || 4;
    this.dateSeed = options.dateSeed || new Date().toISOString().slice(0, 10);
    this.currentTheme = options.theme || 'daily';
    this.customImageDataUrl = null;
    this.onPieceSnapped = options.onPieceSnapped || (() => {});
    this.onWin = options.onWin || (() => {});
    this.onMove = options.onMove || (() => {});

    this.boardWidth = 360;
    this.boardHeight = 360;
    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;

    this.pieces = [];
    this.activePiece = null;
    this.selectedTrayPiece = null;
    this.activeDragBtn = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.showGhost = false;

    this.imageCanvas = document.createElement('canvas');
    this.imageCanvas.width = 600;
    this.imageCanvas.height = 600;

    this.initDOM();
    this.generateArtwork(this.currentTheme);
    this.buildPuzzle();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = '';
    this.container.className = 'relative flex flex-col items-center select-none w-full max-w-md mx-auto';

    // Game Board Container
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'relative w-[340px] h-[340px] sm:w-[360px] sm:h-[360px] bg-slate-900/90 rounded-2xl border-2 border-indigo-500/40 shadow-inner overflow-hidden cursor-pointer';
    this.boardEl.style.touchAction = 'none';

    // Ghost background image
    this.ghostEl = document.createElement('canvas');
    this.ghostEl.width = 360;
    this.ghostEl.height = 360;
    this.ghostEl.className = 'absolute inset-0 w-full h-full opacity-25 pointer-events-none transition-opacity duration-300';
    this.ghostEl.style.display = 'none';
    this.boardEl.appendChild(this.ghostEl);

    // Board Base Canvas (for locked/snapped pieces)
    this.boardCanvas = document.createElement('canvas');
    this.boardCanvas.width = 360;
    this.boardCanvas.height = 360;
    this.boardCanvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
    this.boardCtx = this.boardCanvas.getContext('2d');
    this.boardEl.appendChild(this.boardCanvas);

    // Dynamic Interaction Layer (dragged piece)
    this.interactiveCanvas = document.createElement('canvas');
    this.interactiveCanvas.width = 360;
    this.interactiveCanvas.height = 360;
    this.interactiveCanvas.className = 'absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing';
    this.interactiveCanvas.style.touchAction = 'none';
    this.interactiveCtx = this.interactiveCanvas.getContext('2d');
    this.boardEl.appendChild(this.interactiveCanvas);

    this.container.appendChild(this.boardEl);

    // Piece Tray Area below board
    this.trayEl = document.createElement('div');
    this.trayEl.className = 'w-full mt-3 p-2 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap gap-2 justify-center items-center min-h-[90px] max-h-[140px] overflow-y-auto';
    this.trayEl.id = 'jigsaw-tray';
    this.container.appendChild(this.trayEl);
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

  /**
   * Generates procedural scenery artwork or renders custom uploaded photo
   */
  generateArtwork(theme = 'daily') {
    const ctx = this.imageCanvas.getContext('2d');
    ctx.clearRect(0, 0, 600, 600);

    // If user uploaded a custom photo
    if (this.customImageDataUrl) {
      const img = new Image();
      img.onload = () => {
        // Center crop to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 600, 600);
        this.updateGhostPreview();
        this.renderBoard();
        this.renderTray();
      };
      img.src = this.customImageDataUrl;
      return;
    }

    const rng = this.getSeededRandom(this.dateSeed + (theme !== 'daily' ? `_${theme}` : ''));
    const themes = [
      { name: 'Sunset Mountain', top: '#1e1b4b', mid: '#f43f5e', bottom: '#fbbf24', sun: '#fef08a' },
      { name: 'Emerald Forest', top: '#064e3b', mid: '#059669', bottom: '#34d399', sun: '#a7f3d0' },
      { name: 'Cosmic Nebula', top: '#0f172a', mid: '#7c3aed', bottom: '#ec4899', sun: '#67e8f9' },
      { name: 'Golden Coast', top: '#0284c7', mid: '#38bdf8', bottom: '#f59e0b', sun: '#fffbeb' },
      { name: 'Tokyo Neon Night', top: '#09090b', mid: '#db2777', bottom: '#3b82f6', sun: '#f472b6' }
    ];

    let tIndex = Math.floor(rng() * themes.length);
    if (theme === 'mountains') tIndex = 0;
    else if (theme === 'forest') tIndex = 1;
    else if (theme === 'galaxy') tIndex = 2;
    else if (theme === 'coast') tIndex = 3;

    const chosenTheme = themes[tIndex];

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, chosenTheme.top);
    sky.addColorStop(0.55, chosenTheme.mid);
    sky.addColorStop(1, chosenTheme.bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 600, 600);

    // Celestial Body
    ctx.fillStyle = chosenTheme.sun;
    ctx.beginPath();
    ctx.arc(300, 220, 85, 0, Math.PI * 2);
    ctx.fill();

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

    // Pine trees
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

    // Sparkles
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 35; s++) {
      const sx = rng() * 600;
      const sy = rng() * 260;
      const sr = 1 + rng() * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    this.updateGhostPreview();
  }

  updateGhostPreview() {
    const ghostCtx = this.ghostEl.getContext('2d');
    ghostCtx.clearRect(0, 0, 360, 360);
    ghostCtx.drawImage(this.imageCanvas, 0, 0, 360, 360);
  }

  /**
   * Load a custom image (from camera roll or computer upload)
   */
  loadCustomImage(dataUrl) {
    this.customImageDataUrl = dataUrl;
    this.generateArtwork('custom');
    this.buildPuzzle();
  }

  setTheme(themeName) {
    this.customImageDataUrl = null;
    this.currentTheme = themeName;
    this.generateArtwork(themeName);
    this.buildPuzzle();
  }

  setDifficulty(gridSize) {
    this.rows = gridSize;
    this.cols = gridSize;
    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;
    this.selectedTrayPiece = null;
    this.activePiece = null;
    this.buildPuzzle();
  }

  buildPuzzle() {
    this.pieces = [];
    const rng = this.getSeededRandom(this.dateSeed + `_g${this.rows}`);

    const horizontalEdges = [];
    for (let r = 0; r < this.rows; r++) {
      horizontalEdges[r] = [];
      for (let c = 0; c < this.cols - 1; c++) {
        horizontalEdges[r][c] = rng() > 0.5 ? 1 : -1;
      }
    }

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

  drawPiecePath(ctx, x, y, w, h, edges) {
    const tabRadius = Math.min(w, h) * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);

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

    const srcX = (piece.col / this.cols) * this.imageCanvas.width;
    const srcY = (piece.row / this.rows) * this.imageCanvas.height;
    const srcW = this.imageCanvas.width / this.cols;
    const srcH = this.imageCanvas.height / this.rows;

    ctx.drawImage(this.imageCanvas, srcX, srcY, srcW, srcH, padding, padding, drawW, drawH);
    ctx.restore();

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

        this.boardCtx.save();
        this.drawPiecePath(this.boardCtx, piece.targetX, piece.targetY, this.pieceWidth, this.pieceHeight, piece.edges);
        this.boardCtx.lineWidth = 1;
        this.boardCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.boardCtx.stroke();
        this.boardCtx.restore();
      }
    }
  }

  /**
   * Renders only the piece currently being dragged by user
   * (NO target slot outline is shown, keeping true puzzle challenge!)
   */
  renderInteractive() {
    this.interactiveCtx.clearRect(0, 0, this.boardWidth, this.boardHeight);

    // Only render if a piece is actively dragged with coordinates
    if (this.activePiece && this.activePiece.currentX !== null && !this.activePiece.snapped) {
      const piece = this.activePiece;
      const x = piece.currentX;
      const y = piece.currentY;

      // Tactile 3D drop shadow
      this.interactiveCtx.save();
      this.interactiveCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      this.interactiveCtx.shadowBlur = 18;
      this.interactiveCtx.shadowOffsetX = 4;
      this.interactiveCtx.shadowOffsetY = 8;

      this.drawPiecePath(this.interactiveCtx, x, y, this.pieceWidth, this.pieceHeight, piece.edges);
      this.interactiveCtx.fillStyle = '#000';
      this.interactiveCtx.fill();
      this.interactiveCtx.restore();

      // Draw piece texture
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
      this.trayEl.innerHTML = `<span class="text-xs text-emerald-400 font-medium py-3">所有拼圖已就位！ 🎉</span>`;
      return;
    }

    unsnapped.forEach(piece => {
      const isSelected = this.selectedTrayPiece && this.selectedTrayPiece.id === piece.id;
      const itemBtn = document.createElement('button');
      itemBtn.className = `p-1 bg-slate-900 border rounded-lg transition-transform active:scale-95 shadow-sm ${isSelected ? 'border-amber-400 ring-2 ring-amber-400/80 scale-105 shadow-amber-500/30' : 'border-slate-700/80 hover:border-indigo-500'}`;
      itemBtn.style.touchAction = 'none';
      itemBtn.dataset.pieceId = piece.id;
      itemBtn.title = '拖曳或點選以放置';

      const previewCanvas = this.createPiecePreviewCanvas(piece, 56);
      itemBtn.appendChild(previewCanvas);

      const onStart = (e) => {
        if (e.cancelable) e.preventDefault();
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        this.dragStartPos = { x: clientX, y: clientY };
        this.activeDragBtn = itemBtn;
        this.startDrag(piece, clientX, clientY);

        if (e.pointerId && itemBtn.setPointerCapture) {
          try { itemBtn.setPointerCapture(e.pointerId); } catch (_) {}
        }
      };

      itemBtn.addEventListener('pointerdown', onStart);
      this.trayEl.appendChild(itemBtn);
    });
  }

  startDrag(piece, clientX, clientY) {
    const rect = this.interactiveCanvas.getBoundingClientRect();
    const scaleX = this.boardWidth / rect.width;
    const scaleY = this.boardHeight / rect.height;

    this.activePiece = piece;
    this.dragOffset = {
      x: this.pieceWidth / 2,
      y: this.pieceHeight / 2
    };

    piece.currentX = (clientX - rect.left) * scaleX - this.dragOffset.x;
    piece.currentY = (clientY - rect.top) * scaleY - this.dragOffset.y;

    if (this.activeDragBtn) {
      this.activeDragBtn.style.opacity = '0.35';
    }

    this.renderInteractive();
  }

  bindEvents() {
    const canvas = this.interactiveCanvas;

    const getPointerCoords = (e) => {
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (clientX === undefined && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      return { clientX: clientX || 0, clientY: clientY || 0 };
    };

    const onPointerMove = (e) => {
      if (!this.activePiece) return;
      if (e.cancelable) e.preventDefault();

      const { clientX, clientY } = getPointerCoords(e);
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.boardWidth / rect.width;
      const scaleY = this.boardHeight / rect.height;

      this.activePiece.currentX = (clientX - rect.left) * scaleX - this.dragOffset.x;
      this.activePiece.currentY = (clientY - rect.top) * scaleY - this.dragOffset.y;
      this.renderInteractive();
    };

    const onPointerUp = (e) => {
      if (!this.activePiece) return;
      const piece = this.activePiece;
      const { clientX, clientY } = getPointerCoords(e);

      const movedDist = Math.hypot(clientX - this.dragStartPos.x, clientY - this.dragStartPos.y);

      if (movedDist < 12) {
        // Tapped in tray: toggle selection (NO auto-reveal on board!)
        if (this.selectedTrayPiece && this.selectedTrayPiece.id === piece.id) {
          this.selectedTrayPiece = null;
        } else {
          this.selectedTrayPiece = piece;
        }
        if (this.activeDragBtn) this.activeDragBtn.style.opacity = '1';
        piece.currentX = null;
        piece.currentY = null;
        this.activePiece = null;
        this.activeDragBtn = null;
        this.renderTray();
        this.renderInteractive();
        return;
      }

      // Dragged and released
      this.onMove();
      const snapDistance = 45; // Reasonable magnetic snap distance
      const dist = Math.hypot(
        piece.currentX - piece.targetX,
        piece.currentY - piece.targetY
      );

      if (dist < snapDistance) {
        // Correct position! Snap into place
        piece.snapped = true;
        piece.inTray = false;
        piece.currentX = piece.targetX;
        piece.currentY = piece.targetY;
        this.activePiece = null;
        this.selectedTrayPiece = null;
        this.activeDragBtn = null;
        this.renderBoard();
        this.renderInteractive();
        this.renderTray();
        this.onPieceSnapped(piece);
        this.checkWinCondition();
      } else {
        // Not near correct slot: return to tray
        if (this.activeDragBtn) this.activeDragBtn.style.opacity = '1';
        piece.currentX = null;
        piece.currentY = null;
        this.activePiece = null;
        this.activeDragBtn = null;
        this.renderInteractive();
      }
    };

    // Board tap to place selected tray piece
    this.boardEl.addEventListener('click', (e) => {
      if (!this.selectedTrayPiece) return;
      const piece = this.selectedTrayPiece;
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.boardWidth / rect.width;
      const scaleY = this.boardHeight / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // User must tap near where this piece actually belongs!
      const dist = Math.hypot(
        clickX - (piece.targetX + this.pieceWidth / 2),
        clickY - (piece.targetY + this.pieceHeight / 2)
      );

      if (dist < 60) {
        // Correct slot clicked!
        piece.snapped = true;
        piece.inTray = false;
        piece.currentX = piece.targetX;
        piece.currentY = piece.targetY;
        this.selectedTrayPiece = null;
        this.renderBoard();
        this.renderInteractive();
        this.renderTray();
        this.onPieceSnapped(piece);
        this.checkWinCondition();
      } else {
        // Wrong slot clicked: deselect with gentle feedback
        this.selectedTrayPiece = null;
        this.renderTray();
      }
    });

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  }

  togglePreview() {
    this.showGhost = !this.showGhost;
    this.ghostEl.style.display = this.showGhost ? 'block' : 'none';
    return this.showGhost;
  }

  applyHint() {
    const unsnapped = this.pieces.filter(p => !p.snapped);
    if (unsnapped.length === 0) return false;

    const piece = unsnapped[Math.floor(Math.random() * unsnapped.length)];
    piece.snapped = true;
    piece.inTray = false;
    piece.currentX = piece.targetX;
    piece.currentY = piece.targetY;

    if (this.activePiece && this.activePiece.id === piece.id) {
      this.activePiece = null;
    }
    if (this.selectedTrayPiece && this.selectedTrayPiece.id === piece.id) {
      this.selectedTrayPiece = null;
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
      piece.currentX = null;
      piece.currentY = null;
    }
    this.activePiece = null;
    this.selectedTrayPiece = null;
    this.renderBoard();
    this.renderInteractive();
    this.renderTray();
  }
}
