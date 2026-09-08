#!/usr/bin/env node
// Asserts the prototype's CSS uses the SAME tokens Figma binds for each variant.
// Expected values are read from tokens/_raw/component-variants.tsv, not hardcoded.
import { readFileSync } from 'node:fs';
const css = readFileSync(process.argv[2], 'utf8');
const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));

const cssVarFor = new Map();
(function walk(n) {
  if (n && typeof n === 'object') {
    if (n.$type) { const e = n.$extensions?.['com.mhr.pf']; if (e?.figmaName) cssVarFor.set(e.figmaName, e.cssVar); }
    else Object.values(n).forEach(walk);
  }
})(t);

const variants = readFileSync('tokens/_raw/component-variants.tsv', 'utf8')
  .trim().split('\n').slice(1).map(l => l.split('\t'));
const find = (component, variant) => variants.find(v => v[1] === component && v[2] === variant);

// selector in the prototype  ->  the Figma variant it claims to implement
const CLAIMS = [
  ['.btn--action',                     'Button', 'Type=Action, State=Default'],
  ['.btn--action:hover, .btn--action.is-hover', 'Button', 'Type=Action, State=Hover'],
  ['.btn--positive',                   'Button', 'Type=Positive, State=Default'],
  ['.btn--negative',                   'Button', 'Type=Negative, State=Default'],
  ['.btn--hollow',                     'Button', 'Type=Hollow, State=Default'],
  ['.btn--hollow:hover, .btn--hollow.is-hover', 'Button', 'Type=Hollow, State=Hover'],
  ['.chip:hover',                      'Filter chip', 'State=Hover, Active=False'],
  ['tbody tr',                         'Table cell (AG)', 'Type=Default, Style=Default'],
  ['tbody tr:nth-child(even)',         'Table cell (AG)', 'Type=Default, Style=Stripe'],
  ['tbody tr:hover',                   'Table cell (AG)', 'Type=Default, Style=Hover'],
  ['.tag--positive',                   'Tags', 'Type=Positive'],
  ['.tag--negative',                   'Tags', 'Type=Negative'],
  ['.tag--warning',                    'Tags', 'Type=Warning'],
  ['.tag--expired',                    'Tags', 'Type=Expired'],
  ['.dcard.s-hover',                   'Draggable card', 'State=Hover'],
  ['.dcard.s-drop',                    'Draggable card', 'State=Drop'],
];

// pull the declaration block for a selector
const blockFor = sel => {
  const i = css.indexOf('\n' + sel + ' {');
  if (i < 0) return null;
  return css.slice(i, css.indexOf('}', i));
};

let pass = 0, fail = 0;
for (const [sel, component, variant] of CLAIMS) {
  const row = find(component, variant);
  if (!row) { console.log(`?? no TSV row for ${component} / ${variant}`); fail++; continue; }
  const [, , , fill, stroke, text] = row;
  const block = blockFor(sel);
  if (!block) { console.log(`?? selector not found: ${sel}`); fail++; continue; }

  const expect = [];
  if (fill)   expect.push(['background', cssVarFor.get(fill.trim())]);
  if (stroke) expect.push(['border',     cssVarFor.get(stroke.trim())]);
  if (text)   expect.push(['color',      cssVarFor.get(text.trim())]);

  const missing = expect.filter(([, v]) => v && !block.includes(`var(${v})`));
  if (missing.length) {
    console.log(`FAIL ${component} ${variant}\n     selector ${sel}\n     missing ${missing.map(m => m[0] + '=' + m[1]).join(', ')}`);
    fail++;
  } else {
    console.log(`ok   ${component.padEnd(18)} ${variant.padEnd(34)} -> ${expect.map(e => e[1]).join(' ')}`);
    pass++;
  }
}
console.log(`\n${pass} matched Figma, ${fail} mismatched`);
process.exit(fail ? 1 : 0);
