#!/usr/bin/env node
// Tags every design-system element in a built screen and writes a manifest.
//
//   node scripts/tag-elements.mjs <built>.html [--write]
//
// Why: a screen is handed to developers, or to an AI pipeline that turns it into Angular.
// Both need to address elements BY NAME rather than by CSS selector, which changes every
// time the layout does. Three things are needed per element — which component it is,
// which variant, and a stable name for that instance.
//
// Only the NAME is authored, as data-pf-id. Component and variant are derived from the
// class and its data-* attributes, because those already come from Figma and re-typing
// them by hand is how they drift.
//
//   <button class="pf-button" data-type="Action" data-pf-id="approve-selected">
//
// becomes, in the manifest:
//
//   { "id": "approve-selected", "component": "Button", "variant": { "type": "Action" },
//     "parent": "card-review-request", "tag": "button", "repeat": null,
//     "text": "Approve selected" }
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const file = process.argv[2];
const write = process.argv.includes('--write');
if (!file) { console.error('usage: node scripts/tag-elements.mjs <built>.html [--write]'); process.exit(2); }

// class -> Figma component name, straight from the extract, so the manifest carries the
// name a designer would recognise rather than a kebab-cased guess.
const [h, ...rows] = readFileSync('tokens/_raw/component-variants.tsv', 'utf8').trim().split('\n');
const keys = h.split('\t');
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byClass = new Map();
// The variant PROPERTIES Figma actually defines per component. A data attribute that is
// not one of these is not a variant — it is something someone typed — and a pipeline
// would turn it into an @Input the component does not have. `data-darkmode="False"` was
// sitting on a Selected action banner whose only Figma property is `Mobile`.
const propsFor = new Map();
for (const r of rows) {
  const o = Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? '']));
  byClass.set('pf-' + kebab(o.component), o.component);
  if (!propsFor.has(o.component)) propsFor.set(o.component, new Set());
  for (const pair of (o.variant || '').split(', ')) {
    if (pair.includes('=')) propsFor.get(o.component).add(kebab(pair.split('=')[0]));
  }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext()).newPage();
await page.goto('file://' + resolve(file));
const found = await page.evaluate((classMap) => {
  const map = new Map(classMap);
  const els = [...document.querySelectorAll('[class*="pf-"]')]
    .filter(el => [...el.classList].some(c => map.has(c)))
    // A region the screen marks as not part of itself — a specimen block showing every
    // variant is not screen content, and listing it would put six identical buttons in a
    // manifest a developer is meant to trust.
    .filter(el => !el.closest('[data-pf-ignore]'));
  const index = new Map(els.map((el, i) => [el, i]));

  return els.map((el) => {
    const cls = [...el.classList].find(c => map.has(c));
    // Variants as STRUCTURED values, not a joined string. A pipeline generating Angular
    // maps each one onto an @Input; "type=Action, state=Hover" would have to be re-parsed
    // by whoever consumes this, and re-parsing is where formats go wrong.
    const variant = {};
    for (const a of el.attributes) {
      if (!a.name.startsWith('data-')) continue;
      if (['data-pf-id', 'data-pf-repeat', 'data-pf-ignore', 'data-theme'].includes(a.name)) continue;
      variant[a.name.replace(/^data-/, '')] = a.value;
    }
    // Containment. A flat list cannot tell a pipeline that this button belongs to that
    // card, and the component tree is the thing being generated.
    let p = el.parentElement, parent = null;
    while (p) { if (index.has(p)) { parent = p.getAttribute('data-pf-id'); break; } p = p.parentElement; }

    return {
      id: el.getAttribute('data-pf-id') || null,
      component: map.get(cls),
      cls,
      variant,
      parent,
      tag: el.tagName.toLowerCase(),
      repeat: el.getAttribute('data-pf-repeat') || null,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
    };
  });
}, [...byClass.entries()]);
await browser.close();

const named = found.filter(f => f.id);
const unnamed = found.filter(f => !f.id);
const dupes = Object.entries(named.reduce((a, f) => (a[f.id] = (a[f.id] || 0) + 1, a), {}))
  .filter(([, n]) => n > 1);

// A name being PRESENT is not the same as a name being USABLE, and this check once
// reported "130 of 130 addressable by name" on a screen whose names included
// `button-path-d-m29-2-9-7c29-64` and `filter-chip-all-248`. Present-and-unique was all
// it measured. These are the three ways a derived name comes out unusable:
const STOP = new Set(['the','a','an','to','of','on','in','at','by','for','with','from','and','or','is','are','be','this','that','my','your','their','its','it','as','has','have']);
const POOR = [
  // Icon path data that leaked in because the label was read through an inline <svg>.
  [/(^|-)(path|fill|rule|evenodd|stroke|viewbox)(-|$)/, 'carries SVG path data, not a label'],
  [/-[a-z]?\d+-\d+-\d+/, 'carries SVG path data, not a label'],
  // A bare counter. Positional row names (r2c3) are deliberate and exempt.
  [/-\d+$/, 'ends in a number — sample data, or a collision counter'],
  // A sentence cut mid-phrase by the three-word cap.
  [/-([a-z]+)$/, 'ends in a dangling stop-word'],
];
// A variant the component does not have is worse than no variant: it is a plausible lie.
const invented = [];
for (const f of found) {
  const known = propsFor.get(f.component) || new Set();
  for (const k of Object.keys(f.variant)) {
    if (!known.has(kebab(k))) invented.push([f.id || '(unnamed)', f.component, k]);
  }
}

const poor = [];
for (const f of named) {
  if (/-r\d+c\d+(-|$)/.test(f.id)) continue;
  for (const [re, why] of POOR) {
    const m = f.id.match(re);
    if (!m) continue;
    if (why.startsWith('ends in a dangling') && !STOP.has(m[1])) continue;
    poor.push([f.id, why]);
    break;
  }
}

console.log(`design-system elements : ${found.length}  (excluding data-pf-ignore regions)`);
console.log(`named (data-pf-id)     : ${named.length}`);
console.log(`UNNAMED                : ${unnamed.length}`);
for (const u of unnamed.slice(0, 15)) console.log(`    ${u.component.padEnd(22)} ${u.variant || '-'}   "${u.text}"`);
if (unnamed.length > 15) console.log(`    ... and ${unnamed.length - 15} more`);
if (dupes.length) {
  console.log(`DUPLICATE NAMES        : ${dupes.length}`);
  for (const [id, n] of dupes) console.log(`    ${id} x${n}`);
}
if (invented.length) {
  console.log(`INVENTED VARIANTS      : ${invented.length}  (data-* attributes Figma has no such property for)`);
  for (const [id, comp, k] of invented.slice(0, 15)) console.log(`    ${id.padEnd(44)} ${comp} has no "${k}"`);
  if (invented.length > 15) console.log(`    ... and ${invented.length - 15} more`);
}
if (poor.length) {
  console.log(`UNUSABLE NAMES         : ${poor.length}  (present and unique, but no use to a developer)`);
  for (const [id, why] of poor.slice(0, 15)) console.log(`    ${id.padEnd(44)} ${why}`);
  if (poor.length > 15) console.log(`    ... and ${poor.length - 15} more`);
}

const bad = dupes.length || unnamed.length || poor.length || invented.length;
const verdict = bad
  ? `${unnamed.length} unnamed, ${dupes.length} duplicate, ${poor.length} unusable name(s), ${invented.length} invented variant(s)`
  : `${named.length} of ${found.length} elements addressable by a usable name, every variant real`;

if (write) {
  const out = file.replace(/\.html$/, '.manifest.json');
  // The manifest carries its own field guide. Whoever receives this file — a developer,
  // or a generator turning it into Angular — should not need a second document to read
  // it, because the second document is the one that gets lost or goes stale.
  const fields = {
    id: 'Stable name for this ONE element. The only authored value; everything else is derived. Address elements by this, never by CSS selector — a selector changes every time the layout does.',
    component: "Figma component name, exactly as it appears in the Figma library (e.g. 'Side navigation tab').",
    cls: "CSS class in dist/components.css that renders it (e.g. 'pf-button'). Component and class are two names for the same thing.",
    variant: "Figma's variant properties for this instance, as an object: {\"type\": \"Positive\"} means Figma's Type property is set to Positive. Keys are only ever properties the component really has.",
    parent: 'id of the nearest enclosing element in this list, or null if it is a top-level one. Gives you the component tree, not just a flat list.',
    tag: 'HTML element it was rendered as.',
    repeat: "'row' if it is part of a repeating template rather than a distinct element — the cells of a table body are one row rendered N times, which is what an *ngFor consumes. null otherwise.",
    text: 'Visible text, first 60 characters. Sample content, not a label to build against.',
  };
  // A field guide that has drifted from the data is worse than none, because it is
  // believed. If the two ever disagree, say so and write nothing.
  const documented = Object.keys(fields).sort().join(',');
  const emitted = Object.keys(found[0] || {}).sort().join(',');
  if (found.length && documented !== emitted) {
    console.error(`\nfield guide does not match the data it describes:`);
    console.error(`  documented: ${documented}`);
    console.error(`  emitted   : ${emitted}`);
    console.error(`Update the \`fields\` block in this script and re-run.`);
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify({
    screen: file.split('/').pop().replace(/\.html$/, ''),
    generated: 'scripts/tag-elements.mjs — do not hand-edit',
    about: 'Every design-system element on this screen, addressable by name. Regenerate with: node scripts/tag-elements.mjs <screen>.html --write',
    fields,
    counts: {
      elements: found.length,
      roots: found.filter(f => !f.parent).length,
      repeating: found.filter(f => f.repeat).length,
    },
    elements: found,
  }, null, 2) + '\n');
  console.log(`\nwritten — ${out}`);
}
console.log(`\n${verdict}`);
process.exit(bad ? 1 : 0);
