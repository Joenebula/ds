#!/usr/bin/env node
// Harvests the INSIDE of a component — its child tree — into tokens/_raw/component-tree.tsv.
//
//   node scripts/extract-component-tree.mjs [transcript.jsonl]
//
// Every other extract here captures a component's OUTER BOX. That is why a simple
// component works as a class and a composite one does not: `.pf-card` and
// `.pf-metric-card` carry a size, a fill and a radius, and nothing inside them. A page
// that needs a card gets an empty rounded rectangle, so whoever needs one writes their
// own — and a hand-written component is where the flat pink band and the wrong font
// weights came from.
//
// A composite component turns out to be three things and nothing more exotic:
//
//   FRAME / GROUP      a box with auto-layout. Becomes a div with layout CSS.
//   TEXT               becomes a span carrying a type class and a colour token.
//   INSTANCE           another component we already have. Becomes ITS class, and the
//                      walk stops there: what is inside it is that component's business.
//                      Recorded by its MAIN COMPONENT's name, not the instance's own: an
//                      instance can be renamed in Figma, and one is — the instance called
//                      "Key actions" inside `Mobile key actions` is an instance of
//                      `[S] Mobile top cards`. Looking a component up by a label somebody
//                      can retype is the same class of mistake as trusting a component
//                      name over a node id.
//
// Plus the occasional LINE, RECTANGLE, ELLIPSE (a rule, an image placeholder, an icon
// backing circle) and SLOT — Figma's own "content goes here" marker, which `Card` uses
// and which is the clearest possible statement that a component is a container.
//
// Rows arrive as TREE blocks headed by the column line below. `path` is the position in
// the tree: "" is the component itself, "0" its first child, "3.0.1" a grandchild.
//
// WHY `kids` EXISTS, AND WHY THE HEADER SAYS TREE4.
// The walk has to stop somewhere or a return is truncated, and for most of this project
// it stopped at depth 2. A container at that depth came back with no children — which is
// exactly what a container Figma genuinely leaves empty looks like. 44 components had one,
// `Table (AG)`'s `Fixed columns` and `Calendar picker`'s week rows among them, and their
// templates rendered a correct outer box around an empty one. That is the same partial
// answer reading as a confident one that the ROW cap already cost this project once.
//
// A row now carries the node's own child count, so "no children captured" and "no
// children" are different facts and `build-templates.mjs` can say which it is. The depth
// went to 4 at the same time. Both changes alter the block header, which deliberately
// invalidates every older block: a TREE3 row has no `kids` column, and half-populating it
// would put a guess where a measurement belongs.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'TREE4\tcomponent\tpath\ttype\tname\tmain\tvariant\tkids\tsize\tlayout\tpadding\tgap\tradius\tfill\tstroke\ttextStyle\tfont\ttext';
const OUT = 'tokens/_raw/component-tree.tsv';
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

// The same rules the other extracts apply: documentation pages are not the design system,
// a block ends at the first blank line, and a row must be exactly one field narrower than
// the header (which carries a leading TREE tag the rows do not).
const DOC_ONLY = new Set(['Thumbnail', 'Thumbnail/Brand logo', 'Document label spec',
  'Document order spec', 'Prototype cover page', 'Prototype context screen',
  "Dos and don'ts", 'Storybook link', 'AI link', 'design system header', 'Work item',
  'Description', 'Logos', 'Avatar', 'Team member', 'Wiki menu', 'Logo', 'Skeleton state']);
const WIDTH = HEADER.split('\t').length - 1;

// component -> path -> row. A later walk of the same component REPLACES it wholesale
// rather than merging, because a tree is only meaningful as a whole: merging an old walk
// with a new one would leave orphan children whose parent no longer exists.
const trees = new Map();
let skipHeaderBadge = false;
for (const b of blocks) {
  const fresh = new Map();
  skipHeaderBadge = false;
  // TWO COMPONENTS, ONE NAME — the Forms page has two called `Field`: the 300x42 input
  // and a 95x42 label/value pair. Keyed by name their rows land on each other's paths and
  // the result is a tree from neither. `component-geometry.tsv` already calls the second
  // one `Field (second component)`; this follows that, so the two agree and each gets its
  // own template. `seen` counts ROOT rows, which is the only place a new component starts.
  const seen = new Map();
  const rename = new Map();
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    if (DOC_ONLY.has(c[0])) continue;
    // NAME COLLISION, AGAIN. Two different component sets are called `Header`: the
    // 1830x86 app header, whose variants are Theme x Mobile, and a 20x20 badge whose
    // variant axis is `System`. uncaptured-reasons.tsv already records the second as
    // `Counter` — "a variant child of the Header component set, never a component in its
    // own right". Keyed by name alone the badge's tree overwrote the header's, and the
    // header's template became a two-node badge. The root row's `name` holds the variant,
    // so the axis is the discriminator, exactly as it is in the other extracts.
    if (c[0] === 'Header' && !c[1]) skipHeaderBadge = /^System=/.test(c[3]);
    if (c[0] === 'Header' && skipHeaderBadge) continue;
    if (!c[1]) {
      const n = (seen.get(c[0]) || 0) + 1;
      seen.set(c[0], n);
      rename.set(c[0], n > 1 ? `${c[0]} (second component)` : c[0]);
    }
    const key = rename.get(c[0]) || c[0];
    if (!fresh.has(key)) fresh.set(key, new Map());
    fresh.get(key).set(c[1], line.replace(/^[^\t]*/, key));
  }
  for (const [component, rows] of fresh) trees.set(component, rows);
}

const out = [];
for (const [, rows] of [...trees.entries()].sort())
  for (const [, line] of [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })))
    out.push(line);

writeFileSync(OUT, HEADER.replace(/^TREE4\t/, '') + '\n' + out.join('\n') + '\n');

const composite = [...trees.entries()].filter(([, r]) => r.size > 1);
console.log(`component-tree.tsv — ${trees.size} components, ${out.length} nodes`);
console.log(`  ${composite.length} are composite (more than the outer box)`);
const kinds = {};
for (const [, rows] of trees) for (const [p, line] of rows) { if (!p) continue;
  const t = line.split('\t')[2]; kinds[t] = (kinds[t] || 0) + 1; }
console.log('  children by kind: ' + Object.entries(kinds).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`).join(', '));

// How much of the file is still behind a cap.
//
// An INSTANCE with children is NOT a truncation: the walk stops at an instance on purpose,
// because what is inside it is that component's own business and it has its own template.
// Counting those was the first version of this tally and it reported 461 cut nodes when
// the real figure is a tenth of that — a measure that flatters or alarms by counting the
// wrong thing is the failure this project keeps finding in its own checks.
//
// What IS a truncation is a CONTAINER — a frame, group or slot — that holds children none
// of which were captured. Two things cause it, and they are different: a subtree of pure
// artwork, which the walk collapses on purpose because no VECTOR ever becomes markup, and
// the depth limit, which is a genuine gap.
const DEPTH = 4;
const CONT = new Set(['FRAME', 'GROUP', 'SLOT']);
let atCap = 0, artwork = 0, partial = 0; const capped = new Set();
for (const [component, rows] of trees) {
  const paths = [...rows.keys()];
  for (const [p, line] of rows) {
    const c = line.split('\t');
    const kids = Number(c[6]);
    if (!CONT.has(c[2]) || kids === 0) continue;
    const shown = paths.filter(q => q !== p
      && q.startsWith(p ? p + '.' : '')
      && q.split('.').length === (p ? p.split('.').length + 1 : 1)).length;
    // A run kept short on purpose is not a gap — the walk saw all thirteen table rows and
    // recorded two, because the third teaches nothing the second did not. Counted apart
    // from the cap so that neither number flatters the other.
    if (shown > 0) { if (shown < kids) partial++; continue; }
    if (p.split('.').length >= DEPTH) { atCap++; capped.add(component); } else artwork++;
  }
}
console.log(`  ${atCap} container(s) across ${capped.size} component(s) sit at the depth cap `
  + `with children the walk could not reach`);
console.log(`  ${artwork} hold nothing but artwork, and ${partial} keep a sample of a repeating `
  + `run — both collapsed on purpose`);
