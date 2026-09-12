#!/usr/bin/env node
// Writes docs/COMPONENTS.md — every component in the design system, in one readable file.
//
// Generated, never hand-written. A hand-kept component list is out of date the first time
// anyone adds a component, and a list that is quietly wrong is worse than no list: it gets
// believed. Everything here comes from the extracts, so `npm run build` is what updates it
// and `npm run verify` fails if it has gone stale.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const tsv = (p) => {
  const [h, ...rows] = readFileSync(p, 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const variants = tsv('tokens/_raw/component-variants.tsv');
const geoRows  = tsv('tokens/_raw/component-geometry.tsv');
const inventory = JSON.parse(readFileSync('tokens/_raw/components.json', 'utf8'));
let uncaptured = [], collapsed = [];
try { uncaptured = tsv('tokens/_raw/uncaptured-reasons.tsv'); } catch {}
try { collapsed  = tsv('tokens/_raw/collapsed-axes.tsv'); } catch {}

const geo = new Map(geoRows.filter(r => !r.component.includes('|')).map(r => [r.component, r]));
const geoByVariant = new Map();
for (const r of geoRows) {
  if (!r.component.includes('|')) continue;
  const [c, v] = r.component.split('|');
  if (!geoByVariant.has(c)) geoByVariant.set(c, []);
  geoByVariant.get(c).push({ ...r, variant: v });
}
const collapsedFor = new Map();
for (const r of collapsed) {
  if (!collapsedFor.has(r.component)) collapsedFor.set(r.component, []);
  collapsedFor.get(r.component).push(r);
}

// Figma's own page for each component, and the flags recorded against it.
const meta = new Map();
for (const c of inventory) {
  if (!c.name) continue;
  meta.set(c.name, { page: (c.pageName || '').trim(), node: c.nodeId,
                     previous: c.figmaPreviousName, stale: c.figmaStale });
}

// Components that reach past the semantic layer to a raw colour. A primitive does not
// change between light and dark, so these are the ones that cannot adapt — worth seeing
// in the same list as everything else rather than only in a build log.
const PRIMITIVES = new Set(readFileSync('tokens/_raw/primitives.tsv', 'utf8').trim()
  .split('\n').map(l => l.split('\t')[0]).filter(Boolean));
const primitiveBound = new Map();
for (const r of variants) {
  for (const [field, role] of [['fill', 'background'], ['stroke', 'border'], ['text', 'text']]) {
    const v = r[field];
    if (v && PRIMITIVES.has(v)) {
      if (!primitiveBound.has(r.component)) primitiveBound.set(r.component, []);
      const list = primitiveBound.get(r.component);
      const entry = `${v} (${role})`;
      if (!list.includes(entry)) list.push(entry);
    }
  }
}

const byComponent = new Map();
for (const r of variants) {
  if (!byComponent.has(r.component)) byComponent.set(r.component, []);
  byComponent.get(r.component).push(r);
}
// Shape-only components: real in Figma, measured, but no variant binds a colour.
const figmaNames = new Set(inventory.map(c => c.name));
const shapeOnly = new Set();
for (const c of geo.keys()) {
  if (byComponent.has(c) || !figmaNames.has(c)) continue;
  byComponent.set(c, []); shapeOnly.add(c);
}

const PAGE_ORDER = ['Buttons and links','Forms','Controls','Tables','Cards and panels',
  'Navigation','Tags and ratings','System messages','Analytics and charts','People',
  'Pages and Layouts','AI','Icons'];
const pageOf = c => (meta.get(c) || {}).page || 'Unfiled';
const byPage = new Map();
for (const c of byComponent.keys()) {
  const p = pageOf(c);
  if (!byPage.has(p)) byPage.set(p, []);
  byPage.get(p).push(c);
}
const pages = [...byPage.keys()].sort((a, b) => {
  const i = PAGE_ORDER.indexOf(a), j = PAGE_ORDER.indexOf(b);
  return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || a.localeCompare(b);
});

// The variant PROPERTIES of a component, as Figma defines them — which is not the same as
// the rows captured here, because an axis binding no new colour collapses away.
const propsOf = (name) => {
  const c = inventory.find(x => x.name === name);
  const p = (c && c.properties) || {};
  return Object.entries(p).filter(([, v]) => v.type === 'VARIANT')
    .map(([k, v]) => `${k}: ${(v.variantOptions || []).join(' · ')}`);
};

const esc = s => String(s).replace(/\|/g, '\\|');
const out = [];
const total = byComponent.size;
const totalVariants = variants.length;

out.push('# People First — component library');
out.push('');
out.push('**Generated — do not hand-edit.** Rebuilt by `npm run build` from the Figma');
out.push('extracts in `tokens/_raw/`; `npm run verify` fails if this file has gone stale.');
out.push('');
out.push(`Every component below is a class in \`dist/components.css\`. The class is the`);
out.push(`component name, each Figma variant property is a data attribute, and the values`);
out.push(`keep Figma's own spelling:`);
out.push('');
out.push('```html');
out.push('<button class="pf-button" data-type="Action">Save</button>');
out.push('<div class="pf-form-field" data-input-type="Date picker" data-state="Error">');
out.push('```');
out.push('');
out.push('| | |');
out.push('|---|---|');
out.push(`| **Components** | **${total}** |`);
out.push(`| — with colour rules | ${total - shapeOnly.size} |`);
out.push(`| — shape only (Figma binds no colour variable) | ${shapeOnly.size} |`);
out.push(`| Captured variants | ${totalVariants} |`);
out.push(`| Figma pages | ${pages.length} |`);
if (primitiveBound.size) {
  out.push(`| Binding a primitive instead of a semantic token | ${primitiveBound.size} |`);
}
out.push('');
out.push('Contents: ' + pages.map(p => `[${p}](#${kebab(p)})`).join(' · '));
out.push('');

for (const page of pages) {
  out.push(`## ${page}`);
  out.push('');
  const comps = byPage.get(page).sort((a, b) => a.localeCompare(b));
  out.push(`${comps.length} component${comps.length === 1 ? '' : 's'}.`);
  out.push('');
  out.push('| Component | Class | Variants in Figma | Size | Radius | Type |');
  out.push('|---|---|---|---|---|---|');
  for (const c of comps) {
    const g = geo.get(c) || {};
    const props = propsOf(c);
    const size = g.size && g.size !== 'auto x auto' ? g.size : (g.size || '—');
    out.push(`| ${esc(c)} | \`.pf-${kebab(c)}\` | ${props.length ? esc(props.join('<br>')) : '—'} | ${esc(size)} | ${esc(g.radius || '—')} | ${esc(g.font || '—')} |`);
  }
  out.push('');

  // Anything that needs saying about a component on this page, said once.
  const notes = [];
  for (const c of comps) {
    const g = geo.get(c) || {}, m = meta.get(c) || {};
    const bits = [];
    if (shapeOnly.has(c)) bits.push('**shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page');
    if (m.previous) bits.push(`Figma renamed this from \`${m.previous}\``);
    if (m.stale) bits.push(m.stale);
    const prim = primitiveBound.get(c);
    if (prim) bits.push(`**binds a primitive** — ${prim.join(', ')} — so this will not adapt between light and dark until Figma binds a semantic token`);
    if (g.notes) bits.push(g.notes);
    const col = collapsedFor.get(c) || [];
    if (col.length) bits.push('axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: ' +
      col.map(x => `\`${x.axis}\``).join(', '));
    const vg = geoByVariant.get(c) || [];
    if (vg.length) bits.push('per-variant sizes: ' + vg.map(x => `\`${x.variant}\` ${x.size}`).join(', '));
    if (bits.length) notes.push(`- **${c}** — ${bits.join('. ')}`);
  }
  if (notes.length) { out.push('<details><summary>Notes on these components</summary>'); out.push('');
    out.push(...notes); out.push(''); out.push('</details>'); out.push(''); }
}

if (uncaptured.length) {
  out.push('## Not in the library');
  out.push('');
  out.push('These exist in the Figma file but have no rules, each for a stated reason. Listed');
  out.push('so nobody has to guess whether one is an oversight — none of them is.');
  out.push('');
  const byReason = new Map();
  for (const u of uncaptured) {
    const k = u.reason || 'no reason recorded — that is a bug in the extraction, not a decision';
    if (!byReason.has(k)) byReason.set(k, []);
    byReason.get(k).push(u.component);
  }
  for (const [reason, names] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
    out.push(`**${names.length} — ${reason}**`);
    out.push('');
    out.push(names.sort().map(n => `\`${n}\``).join(' · '));
    out.push('');
  }
}

mkdirSync('docs', { recursive: true });
// Output path is overridable so the gate can rebuild this elsewhere and byte-compare it; README
// points a reader at this file, which is the same standing the other gated files have.
writeFileSync(process.argv[2] || 'docs/COMPONENTS.md', out.join('\n') + '\n');
console.log(`COMPONENTS.md written — ${total} components, ${totalVariants} variants, ${pages.length} pages`);
