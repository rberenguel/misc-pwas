/**
 * Maze Logic
 * Combined from maze.html and mazebook.html
 */
class Maze {
  constructor(w, h, cellSize) {
    this.w = w;
    this.h = h;
    this.cellSize = cellSize;
    this.cols = Math.floor(w / cellSize);
    this.rows = Math.floor(h / cellSize);
    this.grid = [];
    this.solutionPath = [];
    this.generate();
  }

  generate() {
    // Init grid
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid.push({
          x,
          y,
          walls: [true, true, true, true], // Top, Right, Bottom, Left
          visited: false,
        });
      }
    }

    // Recursive Backtracker
    let stack = [];
    let current = this.grid[0];
    current.visited = true;

    const index = (x, y) => {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return -1;
      return x + y * this.cols;
    };

    do {
      let neighbors = [];
      // Top, Right, Bottom, Left
      const dirs = [
        { dx: 0, dy: -1, wall: 0, opp: 2 },
        { dx: 1, dy: 0, wall: 1, opp: 3 },
        { dx: 0, dy: 1, wall: 2, opp: 0 },
        { dx: -1, dy: 0, wall: 3, opp: 1 },
      ];

      dirs.forEach((d) => {
        let ni = index(current.x + d.dx, current.y + d.dy);
        if (ni !== -1 && !this.grid[ni].visited) {
          neighbors.push({ idx: ni, ...d });
        }
      });

      if (neighbors.length > 0) {
        let nextInfo = neighbors[Math.floor(Math.random() * neighbors.length)];
        let next = this.grid[nextInfo.idx];

        current.walls[nextInfo.wall] = false;
        next.walls[nextInfo.opp] = false;
        next.visited = true;

        stack.push(current);
        current = next;
      } else if (stack.length > 0) {
        current = stack.pop();
      }
    } while (stack.length > 0);
  }

  solve() {
    let q = [{ c: this.grid[0], p: null }];
    let visited = new Set([this.grid[0]]);
    let end = this.grid[this.grid.length - 1];
    let map = new Map();

    // BFS for shortest path (though in a perfect maze, there's only one path)
    while (q.length > 0) {
      let { c, p } = q.shift();
      map.set(c, p);
      if (c === end) break;

      const dirs = [
        { dx: 0, dy: -1, wall: 0 },
        { dx: 1, dy: 0, wall: 1 },
        { dx: 0, dy: 1, wall: 2 },
        { dx: -1, dy: 0, wall: 3 },
      ];

      const index = (x, y) => x + y * this.cols;

      dirs.forEach((d) => {
        if (!c.walls[d.wall]) {
          let nx = c.x + d.dx;
          let ny = c.y + d.dy;
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            let ni = index(nx, ny);
            let n = this.grid[ni];
            if (n && !visited.has(n)) {
              visited.add(n);
              q.push({ c: n, p: c });
            }
          }
        }
      });
    }

    this.solutionPath = [];
    let curr = end;
    while (curr) {
      this.solutionPath.push(curr);
      curr = map.get(curr);
    }
    return this.solutionPath;
  }

  draw(ctx, showSolution = false) {
    // Clear background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, this.w, this.h);

    // Draw Walls
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3; // Increased thickness as requested
    ctx.lineCap = "round"; // Smoother lines
    ctx.beginPath();

    let path = null;
    if (showSolution) {
      path = this.solutionPath.length > 0 ? this.solutionPath : this.solve();
    }

    // Center vertically if needed (visual adjustment)
    // With canvas resizing, we usually fit the grid exactly, but let's add a small offset if grid doesn't fill canvas perfectly due to rounding
    // For now, drawing exactly on grid coordinates.

    this.grid.forEach((c) => {
      let x = c.x * this.cellSize;
      let y = c.y * this.cellSize;

      // Optimization: Only draw Right and Bottom walls generally, plus borders
      // But storing all 4 makes generation easier. Let's draw what exists.

      if (c.walls[0]) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + this.cellSize, y);
      }
      if (c.walls[1]) {
        ctx.moveTo(x + this.cellSize, y);
        ctx.lineTo(x + this.cellSize, y + this.cellSize);
      }
      if (c.walls[2]) {
        ctx.moveTo(x + this.cellSize, y + this.cellSize);
        ctx.lineTo(x, y + this.cellSize);
      }
      if (c.walls[3]) {
        ctx.moveTo(x, y + this.cellSize);
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Start (Green square or just Black)
    ctx.fillStyle = "#000";
    ctx.fillRect(
      this.cellSize * 0.2,
      this.cellSize * 0.2,
      this.cellSize * 0.6,
      this.cellSize * 0.6,
    );

    // End (Hollow square)
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (this.cols - 1) * this.cellSize + this.cellSize * 0.2,
      (this.rows - 1) * this.cellSize + this.cellSize * 0.2,
      this.cellSize * 0.6,
      this.cellSize * 0.6,
    );

    // Draw Solution
    if (showSolution && path) {
      ctx.strokeStyle = "red";
      // For e-ink, maybe dark grey is better? User said "black and white puzzles", but typically solution in red is for screen.
      // In book mode, we might want black/grey.
      // Let's stick to Red for screen, and the Caller can override context strokeStyle if generating BW book.
      // OR checks ctx.strokeStyle.

      ctx.lineWidth = this.cellSize / 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      path.forEach((c, i) => {
        let x = c.x * this.cellSize + this.cellSize / 2;
        let y = c.y * this.cellSize + this.cellSize / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }
}
