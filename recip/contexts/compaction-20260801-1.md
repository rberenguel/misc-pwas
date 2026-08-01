# Session Compaction Summary

## Attribution
The flowchart table layout is inspired by the recipe diagrams on [cookingforengineers.com](https://www.cookingforengineers.com/), which pioneered this grid-based visual representation of recipes where ingredients flow left→right through action steps into finishing steps.

## User Intent
- Build a client-side PWA that renders a custom Markdown recipe dialect into a flowchart-style grid table
- Export the rendered recipe as a clean black-on-white PNG for printing
- Keep the authoring experience mobile-friendly (no deep indentation)
- Make the app visually dark-themed matching the dunno project palette

## Contextual Work Summary

### Markdown "Recipe Language" Design
- Switched from nested `-` lists to heading-depth syntax (`##` = root action, `###` = child, etc.)
- Plain paragraph lines under a heading = ingredient (leaf)
- Blockquotes = global prep steps (full-width rows at top)
- Ordered list items = finishing steps (rightmost columns)
- Inline prep label syntax: `verb: ingredient` (e.g. `melt: 4 oz butter`)
- `\n` or `<br/>` in any label splits into multiple vertical text columns (wider, not taller)

### Parser
- `parseRecipe()` uses marked.js lexer, walks tokens with a heading-depth stack
- `normalizeLabel()` converts literal `\n` and `<br/>` to real newlines
- `splitPrepLabel()` handles the `verb: ingredient` colon syntax

### Layout Engine (`buildLayoutCells`)
- Shared function used by both DOM and canvas renderers
- Returns flat `bodyCells` array with `{row, col, rowspan, colspan, text, prepLabel, type}`
- `calcHeight(node)` = distance to deepest leaf = column index in table
- `calcRowspan(node)` = leaf count = number of rows the cell spans
- Leaf colspan = `parentHeight` (stretches across skipped action columns)
- Slot-grid pattern: cells collected per row, sorted by col, then inserted — prevents DOM ordering bugs

### DOM Table Renderer (`buildTable`)
- Title row first (full-width), then prep rows, then body rows
- Action/finish cells use `writing-mode: vertical-rl` + `white-space: pre-line` for correct browser layout
- `\n` in labels creates extra vertical text columns automatically

### Canvas Export (`exportToCanvas`)
- Fully custom: no html2canvas dependency
- Probe canvas measures text widths; row heights bumped to fit wrapped ingredient text and rotated action labels
- Action/finish columns: width = `n_lines × ACTION_W`; multi-line labels drawn at Y offsets in rotated frame
- `ctx.rotate(Math.PI/2)` for top-to-bottom vertical text; multi-line offset: `-span/2 + i*colStep`
- Black on white (`#000000` / `#ffffff`) for cheap printing
- `document.fonts.ready` ensures Inter is loaded before drawing

### Visual Design
- App UI: dunno dark palette (`#0f1020` body, `#1e2040` panels, `#3a3a6a` borders, `#ccccee` text)
- Recipe table in preview: same dark palette (light on dark) matching the editor
- Font: Inter (copied from `../scream/fonts/`), declared via `@font-face`
- Export PNG: black on white, Inter font, bold (not italic) title

### Agent Documentation
- `for-agents.md` written: complete reference of the recipe language for LLM agents

## Files Touched

### Core App
- **app.js**: Full implementation — parser, `buildLayoutCells`, `buildTable`, `exportToCanvas`, `exportPNG`, init
- **styles.css**: Dark dunno palette for UI + dark recipe table; Inter font; `writing-mode: vertical-rl` for action cells
- **index.html**: Split-pane layout, sample switcher buttons, SW registration

### Assets (copied from sibling projects)
- **marked.min.js**: Copied from `../dunno/libs/`
- **html2canvas.min.js**: Copied from `../yacme/libs/` (kept but no longer used for export)
- **fonts/Inter-Regular.otf**: Copied from `../scream/fonts/`

### PWA
- **sw.js**: Basic service worker caching all local assets
- **manifest.json**: PWA manifest

### Documentation
- **for-agents.md**: Recipe language reference for AI agents
- **contexts/compaction-20260801-1.md**: This file
