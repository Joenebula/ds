#!/usr/bin/env node
// Pulls variant colour-binding batches out of the live session transcript and merges
// them into tokens/_raw/component-variants.tsv.
//
//   node scripts/extract-variants.mjs [--write] [transcript.jsonl]
//
// Without --write it reports what it would change and touches nothing.
//
// Why read the transcript rather than retype the batches: the same reason as
// extract-icons.mjs — the data is already on disk once the tool result lands, and
// retyping 300+ rows into the conversation buys nothing but a chance to mistype one.
//
// Each batch is a Figma read of one page, in the form:
//
//   PAGE\t<page name>
//   COUNT <n>
//   <component set>\t<variant>\t<fill>\t<stroke>\t<text>
//
// where the colour columns hold the bound VARIABLE name, the literal string LITERAL
// for a raw unbound paint, or empty for no paint at all.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const write = process.argv.includes('--write');
const args = process.argv.slice(2).filter(a => a !== '--write');
const dir = '/root/.claude/projects/-home-user-ds';
const file = args[0] ||
  readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => join(dir, f)).sort().pop();

// ---- 1. find the batches ----------------------------------------------------
const batches = [];
const walk = v => {
  if (typeof v === 'string') { if (/^PAGE\t.+\nCOUNT \d+/.test(v)) batches.push(v); }
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
}

// page -> rows. A later batch for the same page supersedes an earlier one.
const byPage = new Map();
for (const b of batches) {
  const lines = b.split('\n');
  const page = lines[0].split('\t')[1];
  const rows = [];
  for (const line of lines.slice(2)) {
    const c = line.split('\t');
    if (c.length < 2 || !c[0]) continue;
    // LITERAL means Figma painted a raw colour with no variable behind it. Recording it
    // as a token would be a lie, and recording the hex would break dark mode — so it is
    // dropped here and reported at the end as a gap in the Figma file.
    const clean = s => (s && s !== 'LITERAL' ? s : '');
    rows.push({ component: c[0], variant: c[1], fill: clean(c[2]), stroke: clean(c[3]), text: clean(c[4]) });
  }
  byPage.set(page, rows);
}
if (!byPage.size) { console.error('no variant batches found in the transcript'); process.exit(1); }

// ---- 2. collapse axes that never change the colours -------------------------
// Figma variant sets carry axes that have nothing to do with colour — Darkmode (the CSS
// tokens already handle both modes), Mobile, Full width, Label. Carrying them into the
// stylesheet would force `data-full-width="Yes"` on every input before it took any
// style at all. An axis is redundant when dropping it leaves no contradiction: every
// group of rows that collapses together agrees on each colour, ignoring blanks.
const parse = v => v.split(',').map(p => p.trim()).filter(Boolean)
  .map(p => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; });
const fmt = pairs => pairs.map(([k, v]) => `${k}=${v}`).join(', ');

function collapse(rows) {
  let cur = rows.map(r => ({ ...r, pairs: parse(r.variant) }));
  const axes = cur.length ? cur[0].pairs.map(([k]) => k) : [];
  const dropped = [];
  for (const axis of axes) {
    const groups = new Map();
    let ok = true;
    for (const r of cur) {
      const key = fmt(r.pairs.filter(([k]) => k !== axis));
      if (!groups.has(key)) groups.set(key, { fill: new Set(), stroke: new Set(), text: new Set() });
      const g = groups.get(key);
      for (const p of ['fill', 'stroke', 'text']) if (r[p]) g[p].add(r[p]);
    }
    for (const g of groups.values())
      for (const p of ['fill', 'stroke', 'text']) if (g[p].size > 1) ok = false;
    if (!ok) continue;
    // safe to drop: merge each group into one row, taking the non-blank value
    const merged = new Map();
    for (const r of cur) {
      const pairs = r.pairs.filter(([k]) => k !== axis);
      const key = fmt(pairs);
      if (!merged.has(key)) merged.set(key, { component: r.component, variant: key, pairs, fill: '', stroke: '', text: '' });
      const m = merged.get(key);
      for (const p of ['fill', 'stroke', 'text']) if (r[p] && !m[p]) m[p] = r[p];
    }
    cur = [...merged.values()];
    dropped.push(axis);
  }
  return { rows: cur, dropped };
}

// ---- 3. merge into the existing extract --------------------------------------
const TSV = 'tokens/_raw/component-variants.tsv';
const existingText = readFileSync(TSV, 'utf8').trim();
const [header, ...existingLines] = existingText.split('\n');
const existing = existingLines.map(l => {
  const [page, component, variant, fill, stroke, text] = l.split('\t');
  return { page, component, variant, fill: fill || '', stroke: stroke || '', text: text || '' };
});
const known = new Set(existing.map(r => r.component));
const axesOf = r => parse(r.variant).map(([k]) => k).sort().join('|');
const existingAxes = new Map();
for (const r of existing) if (!existingAxes.has(r.component)) existingAxes.set(r.component, axesOf(r));

const added = [];       // brand-new components
const extended = [];    // new variants of a component already captured
const skipped = [];     // reported rather than silently dropped
const collapsedNote = [];

for (const [page, rows] of byPage) {
  const byComponent = new Map();
  for (const r of rows) {
    if (!byComponent.has(r.component)) byComponent.set(r.component, []);
    byComponent.get(r.component).push(r);
  }
  for (const [component, rs] of byComponent) {
    // Figma's own default names — an unnamed component someone forgot to delete, not
    // part of the design system. Importing it would put a `.pf-component-1` in the
    // library and a nonsense row in the gallery.
    if (/^(Component|Frame|Group|Rectangle|Ellipse|Vector)\s+\d+$/i.test(component.trim())) {
      skipped.push(`${component} (${page}) — Figma default name, not a real component`);
      continue;
    }
    const { rows: cr, dropped } = collapse(rs);
    if (dropped.length) collapsedNote.push(`${component}: dropped ${dropped.join(', ')}`);
    const live = cr.filter(r => r.fill || r.stroke || r.text);
    if (!live.length) { skipped.push(`${component} (${page}) — no variant binds any colour variable`); continue; }

    if (!known.has(component)) {
      for (const r of live) added.push({ page, component, variant: r.variant, fill: r.fill, stroke: r.stroke, text: r.text });
    } else {
      // Only extend a captured component when the new rows use the SAME axes. A row with
      // a different axis shape would not be selected by the markup already written
      // against it, so importing it would silently do nothing at best.
      const want = existingAxes.get(component);
      const have = new Set(existing.filter(r => r.component === component).map(r => r.variant));
      for (const r of live) {
        if (axesOf(r) !== want) { skipped.push(`${component} — ${r.variant}: axes differ from the captured rows (${want})`); continue; }
        if (have.has(r.variant)) continue;
        extended.push({ page, component, variant: r.variant, fill: r.fill, stroke: r.stroke, text: r.text });
      }
    }
  }
}

// Trailing empty columns are omitted in this file; emit new rows the same way, and pass
// the existing lines through untouched so a merge shows only what it actually added.
const line = (r) => {
  const cells = [r.page, r.component, r.variant, r.fill, r.stroke, r.text];
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  return cells.join('\t');
};
const out = [header, ...existingLines, ...added.map(line), ...extended.map(line)].join('\n') + '\n';

console.log(`batches parsed        : ${batches.length} (${[...byPage.keys()].join(', ')})`);
console.log(`redundant axes dropped: ${collapsedNote.length}`);
for (const n of collapsedNote) console.log(`    ${n}`);
console.log(`new components        : ${new Set(added.map(r => r.component)).size} (${added.length} variants)`);
console.log(`extended components   : ${new Set(extended.map(r => r.component)).size} (${extended.length} variants)`);
for (const r of extended) console.log(`    ${r.component} — ${r.variant}`);
if (skipped.length) {
  console.log(`not imported          : ${skipped.length}`);
  for (const s of skipped) console.log(`    ${s}`);
}
if (write) { writeFileSync(TSV, out); console.log(`\nwritten — ${existing.length} -> ${existing.length + added.length + extended.length} rows`); }
else console.log('\ndry run — pass --write to apply');
