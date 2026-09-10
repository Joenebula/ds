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
//   { "id": "approve-selected", "component": "Button",
//     "variant": "Type=Action", "tag": "button", "text": "Approve selected" }
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
for (const r of rows) {
  const o = Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? '']));
  byClass.set('pf-' + kebab(o.component), o.component);
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

console.log(`design-system elements : ${found.length}  (excluding data-pf-ignore regions)`);
console.log(`named (data-pf-id)     : ${named.length}`);
console.log(`UNNAMED                : ${unnamed.length}`);
for (const u of unnamed.slice(0, 15)) console.log(`    ${u.component.padEnd(22)} ${u.variant || '-'}   "${u.text}"`);
if (unnamed.length > 15) console.log(`    ... and ${unnamed.length - 15} more`);
if (dupes.length) {
  console.log(`DUPLICATE NAMES        : ${dupes.length}`);
  for (const [id, n] of dupes) console.log(`    ${id} x${n}`);
}

const verdict = dupes.length || unnamed.length
  ? `${unnamed.length} unnamed, ${dupes.length} duplicate name(s)`
  : `${named.length} of ${found.length} elements addressable by name, 0 unnamed`;

if (write) {
  const out = file.replace(/\.html$/, '.manifest.json');
  writeFileSync(out, JSON.stringify({
    screen: file.split('/').pop().replace(/\.html$/, ''),
    generated: 'scripts/tag-elements.mjs — do not hand-edit',
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
process.exit(dupes.length || unnamed.length ? 1 : 0);
