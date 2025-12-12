/**
 * Ice Slide (Ricochet) Game Logic
 */
class RicochetGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.vWalls = new Set(); // Vertical walls (right of x,y)
    this.hWalls = new Set(); // Horizontal walls (bottom of x,y)
    this.start = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };

    // Play State
    this.player = { x: 0, y: 0 };
    this.moveCount = 0;
    this.history = [];
    this.solved = false;

    this.generate();
  }

  // Helper to generate a unique key for wall storage
  k(x, y) {
    return x + "," + y;
  }

  generate() {
    this.vWalls.clear();
    this.hWalls.clear();
    this.addRandomWalls(0.35); // Default density

    // Random Start/End
    this.start = {
      x: Math.floor(Math.random() * this.cols),
      y: Math.floor(Math.random() * this.rows),
    };
    do {
      this.target = {
        x: Math.floor(Math.random() * this.cols),
        y: Math.floor(Math.random() * this.rows),
      };
    } while (this.target.x === this.start.x && this.target.y === this.start.y);

    this.player = { ...this.start };
    this.moveCount = 0;
    this.history = [];
    this.solved = false;

    // Verify it's solvable? The original code tried to find a solvable one.
    // We should probably do the same in the constructor or a dedicated method if we want quality puzzles.
    // For now, let's trust the Caller (App) to call solve() and if it doesn't return a path, regenerate.
  }

  addRandomWalls(density = 0.25) {
    // Add random internal walls
    const count = Math.floor(this.cols * this.rows * density);
    for (let i = 0; i < count; i++) {
      let x = Math.floor(Math.random() * this.cols);
      let y = Math.floor(Math.random() * this.rows);
      // Randomly choose vertical (right of cell) or horizontal (bottom of cell)
      if (Math.random() > 0.5) {
        if (x < this.cols - 1) this.vWalls.add(this.k(x, y));
      } else {
        if (y < this.rows - 1) this.hWalls.add(this.k(x, y));
      }
    }
  }

  // Slide logic: returns {x, y} final position
  slide(x, y, dx, dy) {
    let cx = x,
      cy = y;
    while (true) {
      // Check boundaries
      if (dx === 1 && cx >= this.cols - 1) break;
      if (dx === -1 && cx <= 0) break;
      if (dy === 1 && cy >= this.rows - 1) break;
      if (dy === -1 && cy <= 0) break;

      // Check walls
      // Moving Right: Check vWall at current cell
      if (dx === 1 && this.vWalls.has(this.k(cx, cy))) break;
      // Moving Left: Check vWall at cell to the left
      if (dx === -1 && this.vWalls.has(this.k(cx - 1, cy))) break;
      // Moving Down: Check hWall at current cell
      if (dy === 1 && this.hWalls.has(this.k(cx, cy))) break;
      // Moving Up: Check hWall at cell above
      if (dy === -1 && this.hWalls.has(this.k(cx, cy - 1))) break;

      cx += dx;
      cy += dy;
    }
    return { x: cx, y: cy };
  }

  solve(limit = 12) {
    let q = [{ x: this.start.x, y: this.start.y, path: [] }];
    let visited = new Set();
    visited.add(this.k(this.start.x, this.start.y));

    while (q.length > 0) {
      let curr = q.shift();

      if (curr.x === this.target.x && curr.y === this.target.y) {
        return curr.path;
      }

      if (curr.path.length >= limit) continue;

      const moves = [
        { dx: 0, dy: -1 }, // Up
        { dx: 1, dy: 0 }, // Right
        { dx: 0, dy: 1 }, // Down
        { dx: -1, dy: 0 }, // Left
      ];

      for (let m of moves) {
        let dest = this.slide(curr.x, curr.y, m.dx, m.dy);
        let key = this.k(dest.x, dest.y);

        if (!visited.has(key)) {
          if (dest.x !== curr.x || dest.y !== curr.y) {
            visited.add(key);
            let newPath = [
              ...curr.path,
              { from: { x: curr.x, y: curr.y }, to: dest },
            ];
            q.push({ x: dest.x, y: dest.y, path: newPath });
          }
        }
      }
    }
    return null;
  }

  // Play Interaction
  movePlayer(dx, dy) {
    if (this.solved) return;

    const dest = this.slide(this.player.x, this.player.y, dx, dy);

    if (dest.x !== this.player.x || dest.y !== this.player.y) {
      this.history.push({ ...this.player });
      this.player = dest;
      this.moveCount++;

      if (this.player.x === this.target.x && this.player.y === this.target.y) {
        this.solved = true;
      }
    }
  }

  handleClick(x, y, cellSize, offsetX, offsetY) {
    if (this.solved) return;

    // Convert screen coords to grid coords
    let gx = (x - offsetX) / cellSize;
    let gy = (y - offsetY) / cellSize;

    // Check if inside grid area
    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return;

    let dx = 0,
      dy = 0;

    // Determine direction relative to player
    // We use the center of the player's cell as reference
    let px = this.player.x + 0.5;
    let py = this.player.y + 0.5;

    let diffX = gx - px;
    let diffY = gy - py;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      dx = Math.sign(diffX);
    } else {
      dy = Math.sign(diffY);
    }

    this.movePlayer(dx, dy);
  }

  draw(ctx, width, height, solutionPath = null) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    const padding = 20;
    const footerSpace = 40; // Space for text at bottom
    const availW = width - padding * 2;
    const availH = height - padding * 2 - footerSpace;

    const cellSize = Math.floor(
      Math.min(availW / this.cols, availH / this.rows),
    );
    const gridW = cellSize * this.cols;
    const gridH = cellSize * this.rows;

    // Centering
    const offsetX = (width - gridW) / 2;
    const offsetY = (height - footerSpace - gridH) / 2;

    this.lastRenderParams = { cellSize, offsetX, offsetY };

    // Grid Lines (Thin)
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= this.cols; gx++) {
      ctx.moveTo(offsetX + gx * cellSize, offsetY);
      ctx.lineTo(offsetX + gx * cellSize, offsetY + this.rows * cellSize);
    }
    for (let gy = 0; gy <= this.rows; gy++) {
      ctx.moveTo(offsetX, offsetY + gy * cellSize);
      ctx.lineTo(offsetX + this.cols * cellSize, offsetY + gy * cellSize);
    }
    ctx.stroke();

    // Border (Thick)
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, gridW, gridH);

    // Walls (Thick)
    ctx.beginPath();
    this.vWalls.forEach((k) => {
      let [x, y] = k.split(",").map(Number);
      let px = offsetX + (x + 1) * cellSize;
      let py = offsetY + y * cellSize;
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + cellSize);
    });
    this.hWalls.forEach((k) => {
      let [x, y] = k.split(",").map(Number);
      let px = offsetX + x * cellSize;
      let py = offsetY + (y + 1) * cellSize;
      ctx.moveTo(px, py);
      ctx.lineTo(px + cellSize, py);
    });
    ctx.stroke();

    // Target (Hollow Square with X)
    let tx = offsetX + this.target.x * cellSize + cellSize * 0.1;
    let ty = offsetY + this.target.y * cellSize + cellSize * 0.1;
    let ts = cellSize * 0.8;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, ts, ts);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + ts, ty + ts);
    ctx.moveTo(tx + ts, ty);
    ctx.lineTo(tx, ty + ts);
    ctx.stroke();

    // Start Position (Filled Circle)
    let sx = offsetX + this.start.x * cellSize + cellSize / 2;
    let sy = offsetY + this.start.y * cellSize + cellSize / 2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(sx, sy, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Solution Path
    if (solutionPath) {
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      solutionPath.forEach((move, idx) => {
        let mx = offsetX + move.from.x * cellSize + cellSize / 2;
        let my = offsetY + move.from.y * cellSize + cellSize / 2;
        let mtoX = offsetX + move.to.x * cellSize + cellSize / 2;
        let mtoY = offsetY + move.to.y * cellSize + cellSize / 2;

        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mtoX, mtoY);
        ctx.stroke();

        // Arrowhead
        let angle = Math.atan2(mtoY - my, mtoX - mx);
        ctx.beginPath();
        ctx.moveTo(mtoX, mtoY);
        ctx.lineTo(
          mtoX - 10 * Math.cos(angle - Math.PI / 6),
          mtoY - 10 * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          mtoX - 10 * Math.cos(angle + Math.PI / 6),
          mtoY - 10 * Math.sin(angle + Math.PI / 6),
        );
        ctx.fillStyle = "#666";
        ctx.fill();

        // Move number
        ctx.fillStyle = "#000";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(idx + 1, (mx + mtoX) / 2 + 5, (my + mtoY) / 2 - 5);
      });
    }

    // Min Moves Text
    if (!solutionPath && this.minMoves) {
      ctx.fillStyle = "#000";
      ctx.font = "16px sans-serif"; // Removed bold
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`Target: ${this.minMoves} moves`, width / 2, height - 10);
    }
  }
}
