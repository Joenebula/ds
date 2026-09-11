#!/usr/bin/env node
// End-to-end proof: renders the prototype in Chromium and compares COMPUTED colours
// against the values Figma binds for each variant, in BOTH modes.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));
const flat = new Map();
(function walk(n) {
  if (n && typeof n === 'object') {
    if (n.$type) flat.set(n.$extensions['com.mhr.pf'].figmaName, n);
    else Object.values(n).forEach(walk);
  }
})(t.color);

// Figma variable name -> resolved hex for a mode (follows alias chains)
function resolveToken(name, mode) {
  const n = flat.get(name);
  if (!n) return null;
  const e = n.$extensions['com.mhr.pf'];
  let v = e.tier === 'semantic' ? e.modes[mode] : n.$value;
  for (let i = 0; i < 10 && typeof v === 'string' && v.startsWith('{'); i++) {
    let node = t; for (const p of v.slice(1, -1).split('.')) node = node[p];
    const e2 = node.$extensions['com.mhr.pf'];
    v = e2.tier === 'semantic' ? e2.modes[mode] : node.$value;
  }
  return v;
}
const toRgb = hex => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${+a.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
};

const variants = readFileSync('tokens/_raw/component-variants.tsv', 'utf8')
  .trim().split('\n').slice(1).map(l => l.split('\t'));
const row = (c, v) => variants.find(x => x[1] === c && x[2] === v);

// selector, property, Figma component, variant, which slot of the TSV row
const CHECKS = [
  [".pf-button[data-type='Action']",        'backgroundColor', 'Button', 'Type=Action, State=Default',   3],
  [".pf-button[data-type='Action']",        'color',           'Button', 'Type=Action, State=Default',   5],
  [".pf-button[data-type='Action'][data-state='Hover']",'backgroundColor','Button', 'Type=Action, State=Hover',     3],
  [".pf-button[data-type='Positive']",      'backgroundColor', 'Button', 'Type=Positive, State=Default', 3],
  [".pf-button[data-type='Positive']",      'color',           'Button', 'Type=Positive, State=Default', 5],
  [".pf-button[data-type='Negative']",      'backgroundColor', 'Button', 'Type=Negative, State=Default', 3],
  [".pf-button[data-type='Hollow']",        'borderTopColor',  'Button', 'Type=Hollow, State=Default',   4],
  [".pf-button[data-type='Hollow']",        'color',           'Button', 'Type=Hollow, State=Default',   5],
  [".pf-button[data-type='Hollow'][data-state='Hover']",'backgroundColor','Button', 'Type=Hollow, State=Hover',     3],
  [".pf-tags[data-type='Positive']",      'backgroundColor', 'Tags', 'Type=Positive', 3],
  [".pf-tags[data-type='Positive']",      'borderTopColor',  'Tags', 'Type=Positive', 4],
  [".pf-tags[data-type='Positive']",      'color',           'Tags', 'Type=Positive', 5],
  [".pf-tags[data-type='Negative']",      'backgroundColor', 'Tags', 'Type=Negative', 3],
  [".pf-tags[data-type='Negative']",      'color',           'Tags', 'Type=Negative', 5],
  [".pf-tags[data-type='Warning']",       'backgroundColor', 'Tags', 'Type=Warning',  3],
  [".pf-tags[data-type='Expired']",       'color',           'Tags', 'Type=Expired',  5],
  [".pf-tags[data-type='Other']",         'backgroundColor', 'Tags', 'Type=Other',    3],
  ['tbody tr:nth-child(1) td','backgroundColor','Table cell (AG)', 'Type=Default, Style=Default', 3],
  ['tbody tr:nth-child(2) td','backgroundColor','Table cell (AG)', 'Type=Default, Style=Stripe',  3],
  ['thead th',            'backgroundColor', 'Table header (AG)', 'Alignment=Left', 3],
  [".pf-draggable-card[data-state='Hover']",      'backgroundColor', 'Draggable card', 'State=Hover', 3],
  [".pf-draggable-card[data-state='Hover']",      'borderTopColor',  'Draggable card', 'State=Hover', 4],
  [".pf-draggable-card[data-state='Drop']",       'backgroundColor', 'Draggable card', 'State=Drop',  3],
  [".pf-form-field[data-state='Error'] .pf-field", 'borderTopColor', 'Form field', 'Input type=Text, State=Error', 4],
  [".pf-form-field[data-state='Error'] .lbl",     'color',          'Form field', 'Input type=Text, State=Error', 5],
  [".pf-form-field[data-state='Selected'] .lbl",  'color',          'Form field', 'Input type=Text, State=Selected', 5],
  [".pf-filter-chip[data-state='Selected']",'color',         'Filter chip', 'State=Selected, Active=True', 5],
  // The sidebar row is `Side navigation tab` (268x48, horizontal). `Navigation item` is a
  // 90x86 rail item with the icon ABOVE the label — a different component entirely.
  [".pf-side-navigation-tab[data-selected='true']", 'color', 'Side navigation tab', 'Selected=true', 5],
];

const file = 'file://' + resolve(process.argv[2]);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const failures = [];

for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: mode });
  const page = await ctx.newPage();
  await page.goto(file);
  console.log(`\n=== ${mode.toUpperCase()} ===`);
  for (const [sel, prop, comp, variant, slot] of CHECKS) {
    const r = row(comp, variant);
    if (!r) { failures.push(`no TSV row: ${comp}/${variant}`); fail++; continue; }
    const figmaToken = (r[slot] || '').trim();
    if (!figmaToken) continue;
    const expectHex = resolveToken(figmaToken, mode);
    if (!expectHex) { failures.push(`unresolved token ${figmaToken}`); fail++; continue; }
    const actual = await page.evaluate(([s, p]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el)[p] : null;
    }, [sel, prop]);
    if (actual === null) { failures.push(`${mode}: selector not in DOM: ${sel}`); fail++; continue; }
    const expect = toRgb(expectHex);
    if (actual === expect) { pass++; }
    else { fail++; failures.push(`${mode}: ${comp} ${variant} [${prop}] on ${sel}\n       expected ${expect} (${figmaToken})\n       actual   ${actual}`); }
  }
  console.log(`  checked ${CHECKS.length} bindings`);
  await ctx.close();
}
await browser.close();

// A component that simply is not on this page is not a mismatch — every screen uses a
// different subset. But a page where NOTHING was found is not a pass either; that is the
// same hollow result check-icon-fidelity was giving on a page with no glyphs.
const absent = failures.filter(f => /not in DOM/.test(f));
const wrong = failures.filter(f => !/not in DOM/.test(f));
if (wrong.length) { console.log('\nFAILURES:'); wrong.forEach(f => console.log('  ' + f)); }
if (absent.length) console.log(`\n${absent.length} binding(s) not on this page — skipped`);
console.log(`\n${pass} rendered colours match the extract, ${wrong.length} mismatched`);
if (pass === 0) {
  console.log('nothing was checked — this page uses none of the bindings, which is not a pass');
  process.exit(2);
}
process.exit(wrong.length ? 1 : 0);
