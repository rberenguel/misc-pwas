const { expect } = chai;
import { normalizeLabel, splitPrepLabel, parseRecipe, buildLayoutCells } from '../lib.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BROWNIE = `# Brownie (20×20 cm pan)

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

// ── normalizeLabel ─────────────────────────────────────────────────────────────

describe('normalizeLabel', () => {
  it('converts literal \\n to newline', () => {
    expect(normalizeLabel('bake\\n30 min')).to.equal('bake\n30 min');
  });
  it('converts <br/> to newline', () => {
    expect(normalizeLabel('bake<br/>30 min')).to.equal('bake\n30 min');
  });
  it('trims surrounding whitespace', () => {
    expect(normalizeLabel('  fold in  ')).to.equal('fold in');
  });
});

// ── splitPrepLabel ─────────────────────────────────────────────────────────────

describe('splitPrepLabel', () => {
  it('splits "verb: ingredient"', () => {
    const { prep, ingredient } = splitPrepLabel('lightly beat: 2 large eggs');
    expect(prep).to.equal('lightly beat');
    expect(ingredient).to.equal('2 large eggs');
  });
  it('returns null prep when no colon prefix', () => {
    const { prep, ingredient } = splitPrepLabel('115 g butter');
    expect(prep).to.be.null;
    expect(ingredient).to.equal('115 g butter');
  });
  it('ignores colon prefix longer than 20 chars', () => {
    const { prep } = splitPrepLabel('this is way too long a verb: something');
    expect(prep).to.be.null;
  });
});

// ── parseRecipe ────────────────────────────────────────────────────────────────

describe('parseRecipe', () => {
  it('parses title', () => {
    expect(parseRecipe('# My Recipe\n').title).to.equal('My Recipe');
  });

  it('parses multiple prep steps', () => {
    expect(parseRecipe('> Preheat\n> Grease\n').prepSteps)
      .to.deep.equal(['Preheat', 'Grease']);
  });

  it('parses finish steps after ---', () => {
    const r = parseRecipe('1. action\ningredient\n---\nbake\ncool\n');
    expect(r.finishSteps.map(s => s.label)).to.deep.equal(['bake', 'cool']);
  });

  it('ignores blank lines after ---', () => {
    const r = parseRecipe('---\nbake\n\ncool\n');
    expect(r.finishSteps).to.have.length(2);
  });

  it('attaches plain ingredient to nearest action', () => {
    const r = parseRecipe('1. mix\nbutter\nsugar\n');
    expect(r.roots[0].children).to.have.length(2);
    expect(r.roots[0].children[0].label).to.equal('butter');
    expect(r.roots[0].children[1].label).to.equal('sugar');
  });

  it('higher number is parent of lower number', () => {
    const r = parseRecipe('3. fold\n2. mix\n1. melt\nbutter\n');
    const fold = r.roots[0];
    expect(fold.label).to.equal('fold');
    const mix = fold.children[0];
    expect(mix.label).to.equal('mix');
    const melt = mix.children[0];
    expect(melt.label).to.equal('melt');
    expect(melt.children[0].label).to.equal('butter');
  });

  it('same-level items are siblings under their shared parent', () => {
    const r = parseRecipe('2. mix\n1. melt\nbutter\n1. sugar\n');
    const mix = r.roots[0];
    expect(mix.children).to.have.length(2);
    expect(mix.children[0].label).to.equal('melt');
    expect(mix.children[1].label).to.equal('sugar');
  });

  it('parses prep label on ingredient', () => {
    const r = parseRecipe('1. mix\nlightly beat: 2 eggs\n');
    const child = r.roots[0].children[0];
    expect(child.prepLabel).to.equal('lightly beat');
    expect(child.label).to.equal('2 eggs');
  });

  it('numbers need not be consecutive', () => {
    const r = parseRecipe('10. fold\n5. mix\n1. melt\nbutter\n');
    const fold = r.roots[0];
    expect(fold.children[0].label).to.equal('mix');
    expect(fold.children[0].children[0].label).to.equal('melt');
  });
});

// ── buildLayoutCells — brownie ─────────────────────────────────────────────────
//
// These assertions pin the exact rowspan/colspan for the brownie recipe,
// which previously had a bug where inner-mix spanned only 1 row (butter)
// because sugar/vanilla/espresso were assigned the wrong depth number.

describe('buildLayoutCells — brownie', () => {
  let cells, totalRows;

  before(() => {
    const layout = buildLayoutCells(parseRecipe(BROWNIE));
    cells = layout.bodyCells;
    totalRows = layout.totalRows;
  });

  const action = label => cells.find(c => c.type === 'action' && c.text === label);
  const actionAt = (label, col) => cells.find(c => c.type === 'action' && c.text === label && c.col === col);
  const ingredient = text => cells.find(c => c.type === 'ingredient' && c.text === text);
  const ingredientWith = substr => cells.find(c => c.type === 'ingredient' && c.text.includes(substr));

  it('has 9 body rows', () => {
    expect(totalRows).to.equal(9);
  });

  it('melt spans 1 row (butter only)', () => {
    expect(action('melt').rowspan).to.equal(1);
  });

  it('inner mix (col 2) spans 4 rows — butter + sugar + vanilla + espresso', () => {
    expect(actionAt('mix', 2).rowspan).to.equal(4);
  });

  it('outer mix (col 3) spans 5 rows — inner mix block + eggs', () => {
    expect(actionAt('mix', 3).rowspan).to.equal(5);
  });

  it('fold in spans all 9 rows', () => {
    expect(action('fold in').rowspan).to.equal(9);
  });

  it('sugar colspan 2: spans ingredient + melt cols', () => {
    expect(ingredient('200 g sugar').colspan).to.equal(2);
  });

  it('vanilla colspan 2', () => {
    expect(ingredient('2.5 mL vanilla extract').colspan).to.equal(2);
  });

  it('espresso colspan 2', () => {
    expect(ingredientWith('espresso').colspan).to.equal(2);
  });

  it('eggs colspan 3: spans ingredient + melt + inner-mix cols', () => {
    expect(ingredientWith('eggs').colspan).to.equal(3);
  });

  it('flour colspan 4: spans all cols except fold-in', () => {
    expect(ingredientWith('flour').colspan).to.equal(4);
  });

  it('finish step spans all 9 rows', () => {
    const bake = cells.find(c => c.type === 'finish');
    expect(bake.rowspan).to.equal(9);
  });
});

// ── buildLayoutCells — simple cases ───────────────────────────────────────────

describe('buildLayoutCells — simple cases', () => {
  it('single action with single ingredient: 1 row, 2 cols', () => {
    const { totalRows, totalCols } = buildLayoutCells(parseRecipe('1. mix\nbutter\n'));
    expect(totalRows).to.equal(1);
    expect(totalCols).to.equal(2);
  });

  it('two sibling ingredients under one action both get rowspan 1', () => {
    const { bodyCells } = buildLayoutCells(parseRecipe('1. mix\nbutter\nsugar\n'));
    const ingredients = bodyCells.filter(c => c.type === 'ingredient');
    expect(ingredients).to.have.length(2);
    expect(ingredients[0].rowspan).to.equal(1);
    expect(ingredients[1].rowspan).to.equal(1);
  });

  it('finish steps each become a separate column', () => {
    const { totalCols } = buildLayoutCells(parseRecipe('1. mix\nbutter\n---\nbake\ncool\n'));
    expect(totalCols).to.equal(4); // 1 ingredient + 1 action + 2 finish
  });
});
