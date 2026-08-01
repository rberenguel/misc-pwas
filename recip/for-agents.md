# Recipe Flowchart Language — Agent Reference

> **Inspiration**: The flowchart table layout is based on the recipe diagrams
> pioneered by [cookingforengineers.com](https://www.cookingforengineers.com/),
> where ingredients flow left→right through action steps into finishing steps.

This document describes the Markdown dialect used by the Recipe Flowchart app.
When a user asks you to write a recipe in this format, produce a Markdown file
following the rules below. The app parses it and renders a flowchart-style grid
table where ingredients flow left→right through action steps.

---

## Structure overview

```
# Recipe Title

> Prep step 1
> Prep step 2

## root action
### child action
#### deeper action
plain ingredient line
#### another ingredient at this depth
### ingredient at shallower depth

1. Finishing step A
2. Finishing step B
```

---

## Elements

### `# Title` — Recipe title
One `#` heading. Appears as the top-most row of the rendered table, spanning
the full width. Required for a clean export.

```
# Banana Nut Bread (about 10 servings)
```

---

### `> Prep step` — Global preparation notes
Blockquote lines. Each line becomes a full-width row above the ingredient grid.
Use for oven temperature, pan preparation, etc.

```
> Butter and flour a loaf pan
> Preheat oven to 350°F (170°C)
```

Multiple `>` lines produce multiple rows.

---

### `## … ######` — Action nodes (the flowchart steps)
Headings at depth 2–6 define the action columns of the table.
- **Depth 2 (`##`)** = the root action (rightmost column in the grid).
- **Depth 3 (`###`)** = child of depth 2.
- **Depth 4 (`####`)** = child of depth 3. And so on.

A heading at depth N is automatically a child of the most recent heading at
depth N−1. You never need to indent — the `#` count encodes the tree.

```
## fold
### mash until smooth
#### melt
```

This produces three nested action columns: `melt` → `mash until smooth` → `fold`.

**Line breaks inside an action label** use `\n` or `<br/>`.
Each break adds a new vertical text column inside the cell (making it wider,
not taller):

```
1. bake 350°F (170°C)\n30 to 40 min
```

---

### Plain paragraph lines — Ingredients (leaf nodes)
Any plain text line (not a heading, not a blockquote, not a list item) is an
**ingredient**. It belongs to the most recent heading above it.

```
### mash until smooth
mash: 2 large (250 g) ripe bananas
melt: 6 Tbs. (90 mL) butter
1 tsp. (5 mL) vanilla extract
```

**Inline prep label** — optional prefix `verb: ingredient`:
```
melt: 4 oz (115 g) unsalted butter
lightly beat: 2 large eggs
```
The verb (up to ~20 characters, letters and spaces only) is rendered in italics.
Omit it for plain ingredients.

Multiple ingredient lines under the same heading are siblings — they each occupy
one row in the rendered table, and the heading's action cell spans all of them.

---

### `1. 2. 3. …` — Finishing steps
An ordered list at the top level. Each item becomes a narrow column on the
**right** edge of the table, spanning all body rows. Use for sequential
post-mixing steps (bake, cool, etc.).

```
1. bake 350°F (170°C) 55 min.
2. cool 10 min. in pan
3. cool on wire rack
```

Use `\n` or `<br/>` to break a long finishing step into multiple lines (produces
a slightly wider cell rather than a taller table):

```
1. bake 350°F (170°C)\n30 to 40 min
```

---

## How the grid is built

The app calculates:

- **Rowspan** of an action = number of leaf ingredients in its subtree.
- **Colspan** of a leaf = how many action columns it must skip to reach its
  parent (leaves that are direct children of a deep root span multiple columns).
- **Column order**: ingredients on the left, action columns increasing rightward
  by depth, finishing steps on the far right.

The rendered table therefore reads left → right: ingredients → sub-actions →
root action → finishing steps.

---

## Complete example

```markdown
# Brownie (8x8-in pan)

> Butter and flour an 8x8-in pan
> Preheat oven to 350°F (170°C)

## fold in
### mix
#### mix
##### melt
4 oz (115 g) unsalted butter
#### 1 cup (200 g) sugar
#### 1/4 tsp. (2.5 mL) vanilla extract
#### 1 shot (4 Tbs; 60 mL) fresh brewed espresso or very strong coffee
### lightly beat: 2 large (100 g) eggs
## 1/2 cup (80 g) all-purpose flour
## 1/3 cup (80 g) Hershey's cocoa powder
## 1/4 tsp. (1.3 g) baking soda
## 1/4 tsp. (1.5 g) table salt

1. bake 350°F (170°C)\n30 to 40 min
```

This renders as:

```
┌─────────────────────────────────────────────────────┐
│              Brownie (8x8-in pan)                   │
├─────────────────────────────────────────────────────┤
│          Butter and flour an 8x8-in pan             │
├─────────────────────────────────────────────────────┤
│         Preheat oven to 350°F (170°C)               │
├──────────────────────────┬──────┬──────┬──────┬─────┤
│ 4 oz (115 g) … butter   │ melt │      │      │     │
├──────────────────────────┤      │ mix  │      │bake │
│ 1 cup (200 g) sugar      │      │      │      │     │
├──────────────────────────┤      │      │ mix  │     │
│ 1/4 tsp. vanilla         │      │      │      │     │
├──────────────────────────┤      │      │      │fold │
│ 1 shot espresso          │      │      │      │in   │
├─────────────────────────────────┤      │      │     │
│ lightly beat: 2 large eggs      │      │      │     │
├─────────────────────────────────────────┤      │     │
│ 1/2 cup flour                           │      │     │
├─────────────────────────────────────────┤      │     │
│ 1/3 cup cocoa                           │      │     │
├─────────────────────────────────────────┤      │     │
│ 1/4 tsp. baking soda                    │      │     │
├─────────────────────────────────────────┤      │     │
│ 1/4 tsp. salt                           │      │     │
└─────────────────────────────────────────┴──────┴─────┘
```

---

## Tips for agents

- Use realistic quantities with both volume and weight when known.
- Nest actions only as deep as the actual cooking process requires.
- Finishing steps (ordered list) should be sequential and irreversible
  (bake → cool → serve). Don't put mixing steps there.
- Keep action node labels short (1–3 words); they are displayed rotated in a
  narrow column.
- If a step has only one ingredient, it still works fine as a single-row action.
- The `\n` line-break trick is useful for finish steps like temperature + time
  that would otherwise make the table very tall.
