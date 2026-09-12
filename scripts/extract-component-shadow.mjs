#!/usr/bin/env node
// The shadow a component casts — into tokens/_raw/component-shadow.tsv.
//
//   node scripts/extract-component-shadow.mjs [transcript.jsonl]
//
// `dist/components.css` contained the string "box-shadow" exactly ZERO times. Figma puts a
// drop shadow on 50 component variants, among them `Card`, `Side panel`, `Side filter`,
// `Toast message`, `Tool tip`, `Action menu`, `Table card (AG)`, `Header navigation` and
// `Side navigation` — every floating surface in the system. A panel that should lift off
// the page rendered flat against it, and nothing in the suite could see it, because every
// check reads the things the extract records and the extract had never looked at effects.
//
// Same shape as the border fault: the colour extract knows a component's fill, stroke and
// text token, and a shadow is none of those. Third property in a row found this way.
//
// WHAT IS RECORDED IS THE MEASUREMENT, NOT THE CSS. A row carries Figma's own numbers —
// type, offset, blur, spread, colour — and `build-components-css.mjs` decides what, if
// anything, can be emitted from it. That matters here because the design system has only
// TWO shadow tokens and not every shadow in the file matches one; the generator emits a
// token where the measurement matches it exactly and reports the rest rather than writing
// a raw rgba, which would be both a raw colour and a value frozen across both modes.
//
// All twelve product pages were swept. Four have no effects at all (Controls, Analytics and
// charts, People, Tags and ratings), so absence from this file means "measured, has none"
// rather than "not looked at".
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEADER = 'FX1\tcomponent\tvariant\tn\ttype\tx\ty\tblur\tspread\tcolour';
const OUT = 'tokens/_raw/component-shadow.tsv';
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

// A row is keyed by component|variant|n, so a component with two stacked effects keeps
// both and a re-sweep of the same page replaces rather than duplicates.
const WIDTH = HEADER.split('\t').length - 1;
const rows = new Map();
for (const b of blocks) {
  for (const line of b.split('\n').slice(1)) {
    if (!line.trim()) break;
    const c = line.split('\t');
    if (c.length !== WIDTH) continue;
    rows.set(`${c[0]}|${c[1]}|${c[2]}`, line);
  }
}

const out = [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, l]) => l);
writeFileSync(OUT, HEADER.replace(/^FX1\t/, '') + '\n' + out.join('\n') + '\n');

const cells = out.map(l => l.split('\t'));
const components = new Set(cells.map(c => c[0]));
const variants = new Set(cells.map(c => c[0] + '|' + c[1]));
const kinds = {};
for (const c of cells) kinds[c[3]] = (kinds[c[3]] || 0) + 1;
console.log(`component-shadow.tsv — ${out.length} effect(s) on ${variants.size} variant(s) `
  + `across ${components.size} components`);
console.log('  ' + Object.entries(kinds).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`).join(', '));
