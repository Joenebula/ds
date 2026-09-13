#!/usr/bin/env node
// Which nodes inside a component Figma DRAWS BUT DOES NOT SHOW — into
// tokens/_raw/component-hidden.tsv.
//
//   node scripts/extract-component-hidden.mjs [transcript.jsonl]
//
// A Figma node carries `visible`, and a node with `visible === false` is in the file, has a
// name, a size, a fill and a place in the child order — and paints nothing. The tree walk
// records all of that and has no column for the one property that says whether any of it is
// on screen, so `build-templates.mjs` rendered every one of them.
//
// FOUND BY ARITHMETIC BEFORE FIGMA WAS ASKED. `Checkbox/Radio list` measures 194x81 and
// holds two slots; padding plus BOTH slots is 22 + 5 + 54 + 5 + 54 = 140 and plus ONE is
// 22 + 5 + 54 = 81 — exactly the measured root. `check-template-overflow` reported
// `pf-checkbox-radio-list` overflowing by 59px, which is 140 - 81 to the pixel. A component
// whose own contents do not fit its own measured box is either mis-measured or holding
// something Figma is not showing.
//
// Swept with `use_figma` across ALL TEN component pages — `Analytics and charts` is the
// deliberate skip this repo makes everywhere, the charts being parked. The sweep must be
// whole rather than partial: this file records DEPARTURES, so a node absent from it is
// taken as visible, and an unswept page would go on rendering hidden nodes with nothing
// saying so. **112 nodes across 44 components are hidden in at least one variant.**
//
// `hidden` is how many of the measured variants hide the node and `of` how many were
// measured. `hidden < of` means the VARIANT decides, which one template cannot express —
// the same shape as the shared-fill rule and as `component-opacity.tsv`'s `nvals`: a value
// every variant agrees on is a fact, one they disagree about is the variant's business.
// Those are recorded and refused rather than averaged, because dropping a node some
// variants show would delete real content from the template.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'HID1\tcomponent\tpath\ttype\tname\thidden\tof';
const OUT = 'tokens/_raw/component-hidden.tsv';
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
const rows = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    rows.set(c[0] + '|' + c[1], line);
  }
}
if (!rows.size) { console.error('no HID1 block found in ' + file); process.exit(1); }

const out = [...rows.entries()].sort((a, b) =>
  a[0].localeCompare(b[0], undefined, { numeric: true })).map(([, l]) => l);
writeFileSync(OUT, HEADER.replace(/^HID1\t/, '') + '\n' + out.join('\n') + '\n');

// WHAT WILL ACTUALLY BE USED — and every row that will not is counted, for the reason
// `component-child-pos.tsv` gives: a refusal that leaves no trace is the silent discard this
// pipeline keeps finding. The counts are asserted to sum to the file so a sixth cannot be
// added quietly.
const tree = new Map();
const t = readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n');
const th = t[0].split('\t');
for (const line of t.slice(1)) {
  const c = line.split('\t');
  tree.set(c[0] + '|' + c[1], c[th.indexOf('type')]);
}
let usable = 0, varies = 0, root = 0, noRow = 0, typeClash = 0;
for (const line of out) {
  const [comp, path, type, , hidden, of] = line.split('\t');
  // The ROOT first, for the reason the opacity extractor names: with the other tests first
  // a category can become unreachable and then states a fact nobody measured. A hidden
  // component root is not a template's business — the whole component is off.
  if (!path) { root++; continue; }
  if (+hidden !== +of) { varies++; continue; }
  const seen = tree.get(comp + '|' + path);
  if (seen === undefined) { noRow++; continue; }
  if (seen !== type) { typeClash++; continue; }
  usable++;
}
console.log(`component-hidden.tsv — ${out.length} node(s) across `
  + `${new Set(out.map(l => l.split('\t')[0])).size} components are hidden in at least one variant`);
console.log(`  ${usable} are hidden in EVERY measured variant and match a tree row — these are `
  + 'the ones a template can leave out');
console.log(`  ${varies} depend on the VARIANT, so the template keeps them: dropping a node some `
  + 'variants show would delete real content');
console.log(`  ${root} are the component ROOT, which is the whole component being off, not a child`);
console.log(`  ${noRow} name a node the tree does not carry (inside an instance, or past its depth)`);
console.log(`  ${typeClash} match a tree row whose node TYPE disagrees — not used, and worth a look`);
const acc = usable + varies + root + noRow + typeClash;
if (acc !== out.length) {
  console.error(`FAIL the five outcomes sum to ${acc}, not the ${out.length} rows in the file`);
  process.exit(1);
}
