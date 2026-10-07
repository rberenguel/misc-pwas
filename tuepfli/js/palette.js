import { packColor, unpackColor, colorToHex, hexToColor } from './document.js';

export const DEFAULT_PALETTE = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
  '#0088ff', '#ff0088', '#88ff00', '#00ff88', '#884400',
  '#224488', '#aaaaaa', '#555555', '#ffcccc', '#ccffcc',
  '#ccccff', '#ffeecc', '#eeccff', '#ccffee', '#ff6666',
  '#66ff66', '#6666ff', '#ffcc66', '#cc66ff', '#66ccff',
  '#111111', '#eeeeee',
].map(h => hexToColor(h));

export function initPalette(doc) {
  doc.palette = DEFAULT_PALETTE.slice();
}

// Parse a Lospec-style PNG palette: sample unique pixel colors
export async function loadLospecPng(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const seen = new Set();
      const colors = [];
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i+3];
        if (a < 128) continue;
        const key = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
        if (!seen.has(key)) {
          seen.add(key);
          colors.push(packColor(data[i], data[i+1], data[i+2], 255));
        }
      }
      URL.revokeObjectURL(url);
      resolve(colors);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function exportPaletteJSON(palette) {
  const colors = Array.from(palette).filter(c => c !== 0).map(colorToHex);
  const blob = new Blob([JSON.stringify(colors, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'palette.json');
}

export function exportPalettePNG(palette) {
  const colors = Array.from(palette).filter(c => c !== 0);
  const c = document.createElement('canvas');
  c.width = colors.length; c.height = 1;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(colors.length, 1);
  const out = new Uint32Array(id.data.buffer);
  colors.forEach((col, i) => out[i] = col);
  ctx.putImageData(id, 0, 0);
  c.toBlob(blob => triggerDownload(blob, 'palette.png'));
}

export async function importPaletteJSON(file) {
  const text = await file.text();
  const hexes = JSON.parse(text);
  return hexes.map(h => hexToColor(h));
}

function triggerDownload(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
