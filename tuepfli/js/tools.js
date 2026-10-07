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

function paintPixel(buf, x, y, w, h, color, presetIdx, alphaLocked = false) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  if (alphaLocked && (buf[y * w + x] >>> 24) === 0) return;
  if (shouldDraw(x, y, presetIdx)) {
    buf[y * w + x] = color;
  }
}

export function pencilStroke(layer, x0, y0, x1, y1, docW, docH, color, presetIdx, brushSize = 1) {
  const buf = layer.buffer;
  const half = Math.floor(brushSize / 2);
  const end  = brushSize - half;
  for (const p of bresenham(x0, y0, x1, y1)) {
    for (let dy = -half; dy < end; dy++) {
      for (let dx = -half; dx < end; dx++) {
        paintPixel(buf, p.x + dx, p.y + dy, docW, docH, color, presetIdx, layer.alphaLocked);
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
  if (layer.alphaLocked && (targetColor >>> 24) === 0) return;

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

// src-over composite: gradient color on top of existing pixel.
// Transparent dst pixels are preserved (gradient never paints on empty canvas areas).
// src-over: gradient color composited on top of existing pixel.
// Destination alpha is irrelevant — gradient paints everywhere.
function blendGradientPixel(src, dst) {
  const sa = (src >>> 24) & 0xff;
  if (sa === 255) return src;   // opaque src: replace
  if (sa === 0)   return dst;   // transparent src: no change
  const da = (dst >>> 24) & 0xff;
  const inv = (255 - sa) / 255;
  const oa = Math.round(sa + da * inv);
  if (oa === 0) return 0;
  const sr = src & 0xff,  sg = (src >>> 8) & 0xff,  sb = (src >>> 16) & 0xff;
  const dr = dst & 0xff,  dg = (dst >>> 8) & 0xff,  db = (dst >>> 16) & 0xff;
  const or = Math.round((sr * sa + dr * da * inv) / oa);
  const og = Math.round((sg * sa + dg * da * inv) / oa);
  const ob = Math.round((sb * sa + db * da * inv) / oa);
  return ((oa & 0xff) << 24) | ((ob & 0xff) << 16) | ((og & 0xff) << 8) | (or & 0xff);
}

export function applyDitherGradient(layer, docW, docH, stops, ax, ay, bx, by, presetIdx) {
  const buf = layer.buffer;
  for (let y = 0; y < docH; y++) {
    for (let x = 0; x < docW; x++) {
      const idx = y * docW + x;
      if (layer.alphaLocked && (buf[idx] >>> 24) === 0) continue;
      const t = projectOntoSegment(x, y, ax, ay, bx, by);
      buf[idx] = blendGradientPixel(ditherGradientPx(x, y, t, stops, presetIdx), buf[idx]);
    }
  }
}

export function applyDitherRadialGradient(layer, docW, docH, stops, cx, cy, radius, clipToCircle, presetIdx) {
  const buf = layer.buffer;
  for (let y = 0; y < docH; y++) {
    for (let x = 0; x < docW; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (clipToCircle && dist > radius) continue;
      const idx = y * docW + x;
      if (layer.alphaLocked && (buf[idx] >>> 24) === 0) continue;
      const t = radius <= 0 ? 0 : Math.min(1, dist / radius);
      buf[idx] = blendGradientPixel(ditherGradientPx(x, y, t, stops, presetIdx), buf[idx]);
    }
  }
}

export function drawRect(layer, x0, y0, x1, y1, docW, docH, color, presetIdx, brushSize, filled) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  if (filled) {
    const buf = layer.buffer;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++)
        paintPixel(buf, x, y, docW, docH, color, presetIdx, layer.alphaLocked);
  } else {
    pencilStroke(layer, minX, minY, maxX, minY, docW, docH, color, presetIdx, brushSize);
    pencilStroke(layer, minX, maxY, maxX, maxY, docW, docH, color, presetIdx, brushSize);
    pencilStroke(layer, minX, minY, minX, maxY, docW, docH, color, presetIdx, brushSize);
    pencilStroke(layer, maxX, minY, maxX, maxY, docW, docH, color, presetIdx, brushSize);
  }
}

export function drawEllipse(layer, x0, y0, x1, y1, docW, docH, color, presetIdx, brushSize, filled) {
  const buf = layer.buffer;
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const half = Math.floor(brushSize / 2), bEnd = brushSize - half;

  function plotBrush(px, py) {
    for (let dy = -half; dy < bEnd; dy++)
      for (let dx = -half; dx < bEnd; dx++)
        paintPixel(buf, px + dx, py + dy, docW, docH, color, presetIdx, layer.alphaLocked);
  }

  if (filled) {
    // Collect per-row x extents from Zingl's outline, then scanline-fill.
    // This avoids Math.round inconsistencies at the poles for even-sized ellipses.
    const rowMin = new Map(), rowMax = new Map();
    function trackPx(px, py) {
      const cur = rowMin.get(py);
      if (cur === undefined) { rowMin.set(py, px); rowMax.set(py, px); }
      else { if (px < cur) rowMin.set(py, px); if (px > rowMax.get(py)) rowMax.set(py, px); }
    }
    let lx0 = minX, ly0 = minY, lx1 = maxX, ly1 = maxY;
    let fa = maxX - minX, fb = maxY - minY, fb1 = fb & 1;
    let fdx = 4*(1-fa)*fb*fb, fdy = 4*(fb1+1)*fa*fa, ferr = fdx+fdy+fb1*fa*fa;
    ly0 += (fb+1)>>1; ly1 = ly0-fb1;
    fa = 8*fa*fa; fb1 = 8*fb*fb;
    do {
      trackPx(lx1,ly0); trackPx(lx0,ly0); trackPx(lx0,ly1); trackPx(lx1,ly1);
      const e2 = 2*ferr;
      if (e2 <= fdy) { ly0++; ly1--; ferr += fdy += fa; }
      if (e2 >= fdx || 2*ferr > fdy) { lx0++; lx1--; ferr += fdx += fb1; }
    } while (lx0 <= lx1);
    while (ly0-ly1 < maxY-minY) {
      trackPx(lx0-1,ly0); trackPx(lx1+1,ly0++);
      trackPx(lx0-1,ly1); trackPx(lx1+1,ly1--);
    }
    for (const [y, xL] of rowMin) {
      const xR = rowMax.get(y);
      for (let x = xL; x <= xR; x++)
        paintPixel(buf, x, y, docW, docH, color, presetIdx, layer.alphaLocked);
    }
  } else {
    // Zingl midpoint ellipse — integer arithmetic, single-pass, no rounding artifacts
    let lx0 = minX, ly0 = minY, lx1 = maxX, ly1 = maxY;
    let a = maxX - minX, b = maxY - minY, b1 = b & 1;
    let dx = 4 * (1 - a) * b * b, dy = 4 * (b1 + 1) * a * a;
    let err = dx + dy + b1 * a * a;
    ly0 += (b + 1) >> 1; ly1 = ly0 - b1;
    a = 8 * a * a; b1 = 8 * b * b;
    do {
      plotBrush(lx1, ly0); plotBrush(lx0, ly0);
      plotBrush(lx0, ly1); plotBrush(lx1, ly1);
      const e2 = 2 * err;
      if (e2 <= dy) { ly0++; ly1--; err += dy += a; }
      if (e2 >= dx || 2 * err > dy) { lx0++; lx1--; err += dx += b1; }
    } while (lx0 <= lx1);
    while (ly0 - ly1 < maxY - minY) {
      plotBrush(lx0 - 1, ly0); plotBrush(lx1 + 1, ly0++);
      plotBrush(lx0 - 1, ly1); plotBrush(lx1 + 1, ly1--);
    }
  }
}

export function sampleColor(compositeCanvas, x, y) {
  const ctx = compositeCanvas.getContext('2d');
  const d = ctx.getImageData(x, y, 1, 1).data;
  return packColor(d[0], d[1], d[2], d[3]);
}
