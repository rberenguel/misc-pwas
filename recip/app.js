'use strict';
import { normalizeLabel, splitPrepLabel, parseRecipe, buildLayoutCells } from './lib.js';

// ── Samples ───────────────────────────────────────────────────────────────────

const SAMPLE = `# Brownie (20×20 cm pan)

> Butter and flour a 20×20 cm pan
> Preheat oven to 170°C

4. fold in
3. mix
2. mix
1. melt
115 g unsalted butter
1. 200 g sugar
1. 2.5 mL vanilla extract
1. 60 mL fresh brewed espresso or very strong coffee
2. lightly beat: 2 large eggs
3. 80 g all-purpose flour
3. 80 g Hershey's cocoa powder
3. 1.3 g baking soda
3. 1.5 g table salt

---
bake 170°C for 30 to 40 min
`;

const BANANA = `# Sunflower Seed Crackers

4. thorough mix
3. add
1/2 tbsp honey
2. add
75 ml olive oil
100 ml water
1. mix dry
150 g white flour
2.5 pinches of salt
sunflower seeds to taste

---
lay on parchment
press flat 3–3.5 mm
mark thumb-sized cuts
bake 160°C until golden
`;

// ── DOM table ─────────────────────────────────────────────────────────────────

function buildTable(recipe) {
  const { bodyCells, title, prepSteps, totalRows, totalCols } = buildLayoutCells(recipe);

  const table = document.createElement('table');
  table.className = 'recipe-table';

  if (title) {
    const tr = document.createElement('tr');
    tr.className = 'title-row';
    const td = document.createElement('td');
    td.colSpan = totalCols;
    td.textContent = title;
    tr.appendChild(td);
    table.appendChild(tr);
  }

  for (const prep of prepSteps) {
    const tr = document.createElement('tr');
    tr.className = 'prep-row';
    const td = document.createElement('td');
    td.colSpan = totalCols;
    td.textContent = prep;
    tr.appendChild(td);
    table.appendChild(tr);
  }

  if (totalRows === 0) return table;

  const rows = Array.from({ length: totalRows }, () => {
    const tr = document.createElement('tr');
    table.appendChild(tr);
    return tr;
  });

  const finishCells = bodyCells.filter(c => c.type === 'finish');
  const mainCells   = bodyCells.filter(c => c.type !== 'finish');

  for (const c of mainCells) {
    const td = document.createElement('td');
    td.rowSpan = c.rowspan;
    td.colSpan = c.colspan;

    if (c.type === 'ingredient') {
      td.className = 'cell-ingredient';
      if (c.prepLabel) {
        const sp = document.createElement('span');
        sp.className = 'prep-label';
        sp.textContent = c.prepLabel + ':';
        td.appendChild(sp);
      }
      td.appendChild(document.createTextNode(c.text));
    } else {
      td.className = 'cell-action';
      const sp = document.createElement('span');
      sp.textContent = c.text;
      td.appendChild(sp);
    }
    rows[c.row].appendChild(td);
  }

  for (const c of finishCells) {
    const td = document.createElement('td');
    td.rowSpan = c.rowspan;
    td.className = 'cell-finish';
    const sp = document.createElement('span');
    sp.textContent = c.text;
    td.appendChild(sp);
    rows[0].appendChild(td);
  }

  return table;
}

// ── Canvas export ─────────────────────────────────────────────────────────────

function exportToCanvas(recipe) {
  const SCALE     = 2;
  const FS        = 14;
  const FONT      = `${FS}px Inter, sans-serif`;
  const BOLD      = `bold ${FS}px Inter, sans-serif`;
  const ITALIC    = `italic ${FS}px Inter, sans-serif`;
  const TITLE_FS  = 16;
  const TITLE_FONT = `bold ${TITLE_FS}px Inter, sans-serif`;
  const PAD       = 8;
  const LINE_H    = Math.round(FS * 1.5);
  const ACTION_W  = 30;
  const PREP_H    = 32;
  const TITLE_H   = 36;
  const BW        = 1.5;
  const BORDER    = '#000000';   // black on white for cheap printing
  const BG        = '#ffffff';
  const FG        = '#000000';
  const MAX_INGR  = 280;
  const MARGIN    = 2;

  const { bodyCells, title, prepSteps, totalRows, totalCols, treeH } = buildLayoutCells(recipe);

  // ── Probe context for text measurement ──────────────────────────────────────
  const probe = document.createElement('canvas').getContext('2d');

  function measureW(text, font) {
    probe.font = font;
    return probe.measureText(text).width;
  }

  function wrapText(text, maxWidth) {
    probe.font = FONT;
    if (measureW(text, FONT) <= maxWidth) return [text];
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && measureW(test, FONT) > maxWidth) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [text];
  }

  // ── Column widths ────────────────────────────────────────────────────────────
  let ingrW = 100;
  for (const c of bodyCells) {
    if (c.type !== 'ingredient') continue;
    const full = c.prepLabel ? c.prepLabel + ': ' + c.text : c.text;
    ingrW = Math.max(ingrW, Math.min(MAX_INGR, measureW(full, FONT) + PAD * 2));
  }
  // Action/finish columns: width = number of \n-separated lines × line height
  const colW = Array.from({ length: totalCols }, (_, i) => i === 0 ? ingrW : ACTION_W);
  for (const c of bodyCells) {
    if (c.type !== 'action' && c.type !== 'finish') continue;
    colW[c.col] = Math.max(colW[c.col], c.text.split('\n').length * ACTION_W);
  }

  // ── Row heights ──────────────────────────────────────────────────────────────
  const rowH = new Array(totalRows).fill(PREP_H);
  const wrapped = new Map(); // cell → string[]

  // Ingredient cells: wrap text, bump row heights to fit
  for (const c of bodyCells) {
    if (c.type !== 'ingredient') continue;
    const avail = colW.slice(c.col, c.col + c.colspan).reduce((s, w) => s + w, 0) - PAD * 2;
    const full  = c.prepLabel ? c.prepLabel + ': ' + c.text : c.text;
    const lines = wrapText(full, avail);
    wrapped.set(c, lines);
    const needed = lines.length * LINE_H + PAD * 2;
    const curH   = rowH.slice(c.row, c.row + c.rowspan).reduce((s, h) => s + h, 0);
    if (needed > curH) {
      const extra = Math.ceil((needed - curH) / c.rowspan);
      for (let r = c.row; r < c.row + c.rowspan; r++) rowH[r] += extra;
    }
  }

  // Action/finish cells: rotated text width = required cell height
  for (const c of bodyCells) {
    if (c.type !== 'action' && c.type !== 'finish') continue;
    const needed = measureW(c.text, BOLD) + PAD * 2;
    const curH   = rowH.slice(c.row, c.row + c.rowspan).reduce((s, h) => s + h, 0);
    if (needed > curH) {
      const extra = Math.ceil((needed - curH) / c.rowspan);
      for (let r = c.row; r < c.row + c.rowspan; r++) rowH[r] += extra;
    }
  }

  // Uniform row height: every row gets the same height as the tallest one.
  const uniformH = Math.max(...rowH);
  rowH.fill(uniformH);

  // ── Canvas setup ─────────────────────────────────────────────────────────────
  const tableW  = colW.reduce((s, w) => s + w, 0);
  const titleH  = title ? TITLE_H : 0;
  const tableH  = titleH + prepSteps.length * PREP_H + rowH.reduce((s, h) => s + h, 0);

  const canvas = document.createElement('canvas');
  canvas.width  = (tableW + MARGIN * 2) * SCALE;
  canvas.height = (tableH + MARGIN * 2) * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cumulative column x positions
  const cx = [MARGIN];
  for (const w of colW) cx.push(cx[cx.length - 1] + w);

  // Body rows start after title + prep rows
  const ry = [MARGIN + titleH + prepSteps.length * PREP_H];
  for (const h of rowH) ry.push(ry[ry.length - 1] + h);

  // ── Draw helpers ─────────────────────────────────────────────────────────────
  function drawRect(x, y, w, h) {
    ctx.fillStyle = BG;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = BW;
    ctx.beginPath();
    ctx.moveTo(x,          y + BW / 2); ctx.lineTo(x + w, y + BW / 2); // top
    ctx.moveTo(x + BW / 2, y);          ctx.lineTo(x + BW / 2, y + h); // left
    ctx.stroke();
  }

  // ── Title row ─────────────────────────────────────────────────────────────────
  const fullW = cx[totalCols] - cx[0];
  if (title) {
    const x = cx[0], y = MARGIN;
    drawRect(x, y, fullW, TITLE_H);
    ctx.save();
    ctx.font = TITLE_FONT;
    ctx.fillStyle = FG;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + fullW / 2, y + TITLE_H / 2);
    ctx.restore();
  }

  // ── Prep rows ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < prepSteps.length; i++) {
    const x = cx[0], y = MARGIN + titleH + i * PREP_H;
    drawRect(x, y, fullW, PREP_H);
    ctx.save();
    ctx.font = ITALIC;
    ctx.fillStyle = FG;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(prepSteps[i], x + fullW / 2, y + PREP_H / 2);
    ctx.restore();
  }

  // ── Body cells ────────────────────────────────────────────────────────────────
  for (const c of bodyCells) {
    const x = cx[c.col];
    const y = ry[c.row];
    const w = cx[c.col + c.colspan] - cx[c.col];
    const h = ry[c.row + c.rowspan] - ry[c.row];

    drawRect(x, y, w, h);

    if (c.type === 'ingredient') {
      const lines      = wrapped.get(c) || [c.text];
      const blockH     = lines.length * LINE_H;
      let   ty         = y + (h - blockH) / 2 + LINE_H / 2;
      ctx.save();
      ctx.fillStyle    = FG;
      ctx.textBaseline = 'middle';
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        // First line: draw prep label in italic if present
        if (li === 0 && c.prepLabel) {
          const prefix  = c.prepLabel + ': ';
          const after   = line.startsWith(prefix) ? line.slice(prefix.length) : line;
          ctx.font      = ITALIC;
          ctx.textAlign = 'left';
          const lw      = measureW(c.prepLabel + ':', ITALIC);
          ctx.fillText(c.prepLabel + ':', x + PAD, ty);
          ctx.font      = FONT;
          ctx.fillText(after, x + PAD + lw + 3, ty);
        } else {
          ctx.font      = FONT;
          ctx.textAlign = 'left';
          ctx.fillText(line, x + PAD, ty);
        }
        ty += LINE_H;
      }
      ctx.restore();
    } else {
      // Action / finish: each \n-separated line is a separate vertical text column.
      // After rotate(π/2): rotated-X = down on screen, rotated-Y = left on screen.
      // So line 0 (leftmost) gets the highest rotated-Y, each subsequent line steps down.
      const lines   = c.text.split('\n');
      const n       = lines.length;
      const colStep = ACTION_W;                     // horizontal gap between text columns
      const span    = (n - 1) * colStep;
      ctx.save();
      ctx.font         = BOLD;
      ctx.fillStyle    = FG;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(Math.PI / 2);
      for (let li = 0; li < n; li++) {
        // positive rotated-Y → left on screen; step right for each successive line
        ctx.fillText(lines[li], 0, -span / 2 + li * colStep);
      }
      ctx.restore();
    }
  }

  // Close the table with right and bottom edges (each drawn exactly once).
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = BW;
  ctx.beginPath();
  ctx.moveTo(cx[totalCols] - BW / 2, MARGIN);
  ctx.lineTo(cx[totalCols] - BW / 2, ry[totalRows]);
  ctx.moveTo(cx[0], ry[totalRows] - BW / 2);
  ctx.lineTo(cx[totalCols], ry[totalRows] - BW / 2);
  ctx.stroke();

  return canvas;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const md     = document.getElementById('md-input').value;
  const output = document.getElementById('recipe-output');
  output.innerHTML = '';

  try {
    const recipe = parseRecipe(md);

    if (!recipe.roots.length && !recipe.finishSteps.length) {
      output.innerHTML = '<p class="error-msg">No recipe structure found.</p>';
      return;
    }

    output.appendChild(buildTable(recipe));
  } catch (e) {
    output.innerHTML = `<p class="error-msg">Parse error: ${e.message}</p>`;
    console.error(e);
  }
}

// ── Export PNG ────────────────────────────────────────────────────────────────

function exportPNG() {
  const md = document.getElementById('md-input').value;
  document.fonts.ready.then(() => {
    try {
      const recipe   = parseRecipe(md);
      const canvas   = exportToCanvas(recipe);
      const slug     = (recipe.title || 'recipe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
      const filename = slug + '.png';
      canvas.toBlob(blob => {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          navigator.share({ files: [file] })
            .catch(e => { if (e.name !== 'AbortError') console.error(e); });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = filename;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) {
      alert('Export error: ' + e.message);
      console.error(e);
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('md-input');
  textarea.value = SAMPLE;

  document.getElementById('render-btn').addEventListener('click', render);
  document.getElementById('export-btn').addEventListener('click', exportPNG);
  document.getElementById('sample-brownie').addEventListener('click', () => { textarea.value = SAMPLE; render(); });
  document.getElementById('sample-banana').addEventListener('click', () => { textarea.value = BANANA; render(); });

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) render();
  });

  render();
});
