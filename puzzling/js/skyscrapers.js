/**
 * Skyscrapers Game Logic
 */

class SkyscraperGrid {
  constructor(size) {
    this.size = size;
    this.solution = []; // The actual heights (Solution)
    this.userGrid = []; // User entered numbers
    this.clues = { top: [], right: [], bottom: [], left: [] };
    // Valid for "Play" mode interactions
    this.selectedCell = { x: -1, y: -1 };

    this.generate();
  }

  generate() {
    // 1. Generate a Latin Square
    let base = Array.from({ length: this.size }, (_, i) => i + 1);
    let matrix = [];

    // Cyclic shifts
    for (let r = 0; r < this.size; r++) {
      let row = [];
      for (let c = 0; c < this.size; c++) {
        row.push(base[(c + r) % this.size]);
      }
      matrix.push(row);
    }

    // Shuffle
    for (let i = this.size - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matrix[i], matrix[j]] = [matrix[j], matrix[i]];
    }
    matrix = this.transpose(matrix);
    for (let i = this.size - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matrix[i], matrix[j]] = [matrix[j], matrix[i]];
    }
    this.solution = this.transpose(matrix);

    // 2. Calculate Clues
    this.clues.left = this.solution.map((row) => this.countVisible(row));
    this.clues.right = this.solution.map((row) =>
      this.countVisible([...row].reverse()),
    );

    let cols = this.transpose(this.solution);
    this.clues.top = cols.map((col) => this.countVisible(col));
    this.clues.bottom = cols.map((col) =>
      this.countVisible([...col].reverse()),
    );

    // 3. Init User Grid
    this.userGrid = Array(this.size)
      .fill(0)
      .map(() => Array(this.size).fill(0));
  }

  transpose(m) {
    return m[0].map((_, c) => m.map((r) => r[c]));
  }

  countVisible(line) {
    let max = 0;
    let count = 0;
    for (let h of line) {
      if (h > max) {
        max = h;
        count++;
      }
    }
    return count;
  }

  // Interaction
  handleClick(x, y, cellSize, offsetX, offsetY) {
    // Check if click is inside grid
    if (x < offsetX || y < offsetY) return;

    let cx = Math.floor((x - offsetX) / cellSize);
    let cy = Math.floor((y - offsetY) / cellSize);

    if (cx >= 0 && cx < this.size && cy >= 0 && cy < this.size) {
      this.selectedCell = { x: cx, y: cy };
      // Cycle number
      this.userGrid[cy][cx] = (this.userGrid[cy][cx] + 1) % (this.size + 1);
    } else {
      this.selectedCell = { x: -1, y: -1 };
    }
  }

  draw(ctx, width, height, showSolution = false, isBookMode = false) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    const padding = 40;
    const boardSize = Math.min(width, height) - padding * 2;
    const cellSize = boardSize / (this.size + 2); // +2 for clues

    const startX = (width - boardSize) / 2;
    const startY = (height - boardSize) / 2;

    // Grid starts 1 cell in
    const gridX = startX + cellSize;
    const gridY = startY + cellSize;

    this.lastRenderParams = { cellSize, gridX, gridY }; // Store for click handler

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${cellSize * 0.5}px monospace`;

    // Draw Clues
    ctx.fillStyle = "#000";
    for (let k = 0; k < this.size; k++) {
      // Top
      ctx.fillText(
        this.clues.top[k],
        gridX + k * cellSize + cellSize / 2,
        gridY - cellSize / 2,
      );
      // Bottom
      ctx.fillText(
        this.clues.bottom[k],
        gridX + k * cellSize + cellSize / 2,
        gridY + this.size * cellSize + cellSize / 2,
      );
      // Left
      ctx.fillText(
        this.clues.left[k],
        gridX - cellSize / 2,
        gridY + k * cellSize + cellSize / 2,
      );
      // Right
      ctx.fillText(
        this.clues.right[k],
        gridX + this.size * cellSize + cellSize / 2,
        gridY + k * cellSize + cellSize / 2,
      );
    }

    // Draw Grid
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX, gridY, cellSize * this.size, cellSize * this.size);

    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < this.size; k++) {
      ctx.moveTo(gridX, gridY + k * cellSize);
      ctx.lineTo(gridX + this.size * cellSize, gridY + k * cellSize);
      ctx.moveTo(gridX + k * cellSize, gridY);
      ctx.lineTo(gridX + k * cellSize, gridY + this.size * cellSize);
    }
    ctx.stroke();

    // Draw Content
    const fontUser = `bold ${cellSize * 0.6}px sans-serif`;
    const fontSol = `${cellSize * 0.6}px monospace`;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        let x = gridX + c * cellSize + cellSize / 2;
        let y = gridY + r * cellSize + cellSize / 2;

        if (showSolution) {
          // Solution Mode
          ctx.fillStyle = "#666";
          ctx.font = fontSol;
          ctx.fillText(this.solution[r][c], x, y);
        } else {
          // Play Mode
          let val = this.userGrid[r][c];
          if (val > 0) {
            ctx.fillStyle = "#000";
            ctx.font = fontUser;
            ctx.fillText(val, x, y);
          }

          // Highlight selected
          if (
            !isBookMode &&
            this.selectedCell.x === c &&
            this.selectedCell.y === r
          ) {
            ctx.strokeStyle = "#007AFF"; // Blue selection
            ctx.lineWidth = 3;
            ctx.strokeRect(
              gridX + c * cellSize + 2,
              gridY + r * cellSize + 2,
              cellSize - 4,
              cellSize - 4,
            );
          }
        }
      }
    }
  }
}
