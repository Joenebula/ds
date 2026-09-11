#!/usr/bin/env node
// Which SIDES of a component Figma actually strokes, and how thickly.
//
//   node scripts/extract-component-stroke-sides.mjs [transcript.jsonl]
//
// The generator paints a border from the colour extract, and the colour extract records
// one thing about a stroke: its token. So every component with a bound stroke got
// `border: 1px solid <token>` — a box, on all four sides, one pixel thick. Figma says
// otherwise in three different ways, and all three were invisible to the pipeline:
//
//   PER-SIDE WEIGHTS. `Nav tabs` is a file-folder tab. Unselected it strokes the BOTTOM
//   only; selected it strokes top, left and right and leaves the bottom OPEN so the tab
//   joins the panel below it. Rendered as a box, every tab in the strip became an outlined
//   rectangle and the selected one stopped reading as selected at all. `Table cell (AG)`,
//   `Filter tab single`, `Sticky footer`, `Side panel header` and `Config parent menu` are
//   the same shape of mistake: a rule on one edge, drawn as a cage.
//
//   WEIGHTS THAT ARE NOT 1. `Clock in` strokes 1.5, `AI button`, `AI banner`, `AI card
//   modal`, `Draggable card` and `AG field` stroke 2. A third of a pixel here and a whole
//   one there is exactly the "measured by eye" drift this repo exists to stop — and the
//   1px was not even measured by eye, it was a default nobody chose.
//
//   STROKES SWITCHED OFF. `Table cell (AG)`, `Table header (AG)`, `Table header icons` and
//   `Status` all keep a stroke paint in Figma with its visibility turned OFF. The colour
//   extract reads the paint and binds its token; the design draws no border at all. A
//   table rendered as a grid of boxes where People First has horizontal rules.
//
// WHY THIS IS ITS OWN FILE rather than a column on component-geometry.tsv. The geometry
// extract's rows are harvested from GEOM blocks across the whole transcript, and adding a
// column would invalidate every one of them — the TREE3 -> TREE4 rule, which exists so a
// half-populated row cannot put a guess where a measurement belongs. Every component not
// named here strokes 1px on all four sides and is visible, which is what the generator
// already emits; this file is the departures from that, and only the departures.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'SIDES2\tcomponent\tvariant\ttop\tright\tbottom\tleft\tvisible';
const OUT = 'tokens/_raw/component-stroke-sides.tsv';
const dir = '/root/.claude/projects/-home-user-ds';
const file = process.argv[2] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => join(dir, f)).sort().pop();

const blocks = [];
const walk = v => {
  if (typeof v === 'string') { if (v.startsWith(HEADER + '\n')) blocks.push(v); }
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}

const WIDTH = HEADER.split('\t').length - 1;
// component|variant -> row, so a later sweep of the same page replaces an earlier one
// rather than duplicating it.
const rows = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    rows.set(c[0] + '|' + c[1], line);
  }
}

const out = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, l]) => l);
writeFileSync(OUT, HEADER.replace(/^SIDES2\t/, '') + '\n' + out.join('\n') + '\n');

// EACH ROW IN EXACTLY ONE BUCKET. The first version of this tally asked each question
// independently, so the eight rows that are BOTH switched off and uneven were counted
// twice — and the three numbers still added up to the total, by coincidence, which is the
// most convincing way for a wrong count to look right. A stroke that is switched off draws
// nothing whatever its weights say, so that is the bucket it belongs in.
const components = new Set(out.map(l => l.split('\t')[0]));
const cells = out.map(l => l.split('\t'));
const off = cells.filter(c => c[6] === 'no');
const shown = cells.filter(c => c[6] !== 'no');
const uneven = shown.filter(c => new Set(c.slice(2, 6)).size > 1);
const thick = shown.filter(c => new Set(c.slice(2, 6)).size === 1);
console.log(`component-stroke-sides.tsv — ${out.length} variant(s) across ${components.size} components `
  + `whose border is not the 1px box the generator assumes`);
console.log(`  ${off.length} keep a stroke paint Figma has switched OFF, so they draw no border at all`);
console.log(`  ${uneven.length} stroke some sides and not others`);
console.log(`  ${thick.length} stroke all four sides at a width that is not 1px`);
