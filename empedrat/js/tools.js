import { packColor, unpackColor } from './document.js';
import { shouldDraw, ditherGradientPx, projectOntoSegment } from './dither.js';

// Bresenham line — yields {x, y} pixel coords
export function* bresenham(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    yield { x: x0, y: y0 };
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx)  { err += dx; y0 += sy; }
  }
}

function paintPixel(buf, x, y, w, h, color, presetIdx) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  if (shouldDraw(x, y, presetIdx)) {
    buf[y * w + x] = color | 0xff000000;
  }
}

export function pencilStroke(layer, x0, y0, x1, y1, docW, docH, color, presetIdx, brushSize = 1) {
  const buf = layer.buffer;
  const half = Math.floor(brushSize / 2);
  const end  = brushSize - half;
  for (const p of bresenham(x0, y0, x1, y1)) {
    for (let dy = -half; dy < end; dy++) {
      for (let dx = -half; dx < end; dx++) {
        paintPixel(buf, p.x + dx, p.y + dy, docW, docH, color, presetIdx);
      }
    }
  }
}

export function eraserStroke(layer, x0, y0, x1, y1, docW, docH, size = 1) {
  const buf = layer.buffer;
  const half = Math.floor(size / 2);
  const end  = size - half;
  for (const p of bresenham(x0, y0, x1, y1)) {
    for (let dy = -half; dy < end; dy++) {
      for (let dx = -half; dx < end; dx++) {
        const nx = p.x + dx, ny = p.y + dy;
        if (nx >= 0 && ny >= 0 && nx < docW && ny < docH) {
          buf[ny * docW + nx] = 0;
        }
      }
    }
  }
}

export function floodFill(layer, startX, startY, fillColor, docW, docH, tolerance = 0) {
  const buf = layer.buffer;
  const idx = startY * docW + startX;
  const targetColor = buf[idx];
  if (targetColor === fillColor) return;

  function colorMatch(c) {
    if (tolerance === 0) return c === targetColor;
    const a = unpackColor(c), b = unpackColor(targetColor);
    return Math.abs(a.r - b.r) <= tolerance &&
           Math.abs(a.g - b.g) <= tolerance &&
           Math.abs(a.b - b.b) <= tolerance &&
           Math.abs(a.a - b.a) <= tolerance;
  }

  const stack = [[startX, startY]];
  const visited = new Uint8Array(docW * docH);
  visited[idx] = 1;

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    buf[y * docW + x] = fillColor;
    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      if (nx < 0 || ny < 0 || nx >= docW || ny >= docH) continue;
      const ni = ny * docW + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      if (colorMatch(buf[ni])) stack.push([nx, ny]);
    }
  }
}

export function applyDitherGradient(layer, docW, docH, c0, c1, ax, ay, bx, by, presetIdx) {
  const buf = layer.buffer;
  for (let y = 0; y < docH; y++) {
    for (let x = 0; x < docW; x++) {
      const t = projectOntoSegment(x, y, ax, ay, bx, by);
      buf[y * docW + x] = ditherGradientPx(x, y, t, c0, c1, presetIdx) | 0xff000000;
    }
  }
}

export function sampleColor(compositeCanvas, x, y) {
  const ctx = compositeCanvas.getContext('2d');
  const d = ctx.getImageData(x, y, 1, 1).data;
  return packColor(d[0], d[1], d[2], d[3]);
}
