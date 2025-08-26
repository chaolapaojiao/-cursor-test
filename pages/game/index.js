const BLOCK_SIZE = 30; // px per cell (match canvas style)
const COLS = 10;
const ROWS = 20;

const SHAPES = {
  I: [
    [1, 1, 1, 1]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1]
  ]
};

const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000'
};

function rotate(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = [];
  for (let c = 0; c < cols; c++) {
    const row = [];
    for (let r = rows - 1; r >= 0; r--) {
      row.push(matrix[r][c]);
    }
    rotated.push(row);
  }
  return rotated;
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const t = types[Math.floor(Math.random() * types.length)];
  return { type: t, shape: SHAPES[t].map(r => r.slice()), x: 3, y: 0 };
}

Page({
  data: {
    score: 0,
    paused: false
  },

  onLoad() {
    this.initCanvas();
    this.resetGame();
  },

  onStart() {
    if (this.timer) return;
    this.loop();
  },

  onPause() {
    this.setData({ paused: !this.data.paused });
  },

  onRestart() {
    this.resetGame();
  },

  async initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas').node();
    query.exec(res => {
      const canvas = res[0].node;
      // Ensure canvas size matches style size
      canvas.width = COLS * BLOCK_SIZE;
      canvas.height = ROWS * BLOCK_SIZE;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.draw();
    });
  },

  resetGame() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.active = randomPiece();
    this.nextDropMs = 600;
    this.accumulator = 0;
    this.setData({ score: 0, paused: false });
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.loop();
  },

  loop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.data.paused) return;
      this.tick();
      this.draw();
    }, 60);
  },

  tick() {
    if (!this.active) return;
    if (!this.move(0, 1)) {
      this.lockPiece();
      this.clearLines();
      this.active = randomPiece();
      if (!this.valid(this.active.shape, this.active.x, this.active.y)) {
        wx.showToast({ title: 'Game Over', icon: 'none' });
        this.resetGame();
      }
    }
  },

  valid(shape, ox, oy) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const nx = ox + x;
        const ny = oy + y;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && this.board[ny][nx]) return false;
      }
    }
    return true;
  },

  move(dx, dy) {
    const { shape, x, y } = this.active;
    const nx = x + dx;
    const ny = y + dy;
    if (this.valid(shape, nx, ny)) {
      this.active.x = nx;
      this.active.y = ny;
      return true;
    }
    return false;
  },

  rotateActive() {
    const rotated = rotate(this.active.shape);
    if (this.valid(rotated, this.active.x, this.active.y)) {
      this.active.shape = rotated;
    }
  },

  hardDrop() {
    while (this.move(0, 1));
  },

  lockPiece() {
    const { shape, x, y, type } = this.active;
    for (let ry = 0; ry < shape.length; ry++) {
      for (let rx = 0; rx < shape[ry].length; rx++) {
        if (!shape[ry][rx]) continue;
        const nx = x + rx;
        const ny = y + ry;
        if (ny >= 0) this.board[ny][nx] = COLORS[type];
      }
    }
  },

  clearLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(COLS).fill(null));
        cleared++;
        y++;
      }
    }
    if (cleared) {
      const gained = [0, 100, 300, 500, 800][cleared] || 0;
      this.setData({ score: this.data.score + gained });
      if (this.nextDropMs > 120) this.nextDropMs -= 20 * cleared;
    }
  },

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const color = this.board[y][x];
        if (color) {
          this.drawCell(x, y, color);
        }
      }
    }

    // Draw active piece
    if (this.active) {
      const { shape, x, y, type } = this.active;
      for (let ry = 0; ry < shape.length; ry++) {
        for (let rx = 0; rx < shape[ry].length; rx++) {
          if (!shape[ry][rx]) continue;
          this.drawCell(x + rx, y + ry, COLORS[type]);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = '#222';
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE + 0.5, 0);
      ctx.lineTo(x * BLOCK_SIZE + 0.5, ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE + 0.5);
      ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE + 0.5);
      ctx.stroke();
    }
  },

  drawCell(x, y, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
  },

  // Controls via gestures
  onReady() {
    // Swipe left/right/down, tap to rotate, longpress to hard drop
  },

  onTouchStart(e) {
    this.touchStart = e.changedTouches[0];
  },

  onTouchEnd(e) {
    const start = this.touchStart;
    const end = e.changedTouches[0];
    if (!start || !end) return;
    const dx = end.pageX - start.pageX;
    const dy = end.pageY - start.pageY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const threshold = 20;
    if (adx < threshold && ady < threshold) {
      this.rotateActive();
      return;
    }
    if (adx > ady) {
      if (dx > 0) this.move(1, 0);
      else this.move(-1, 0);
    } else {
      if (dy > 0) this.move(0, 1);
      else this.hardDrop();
    }
    this.draw();
  }
});