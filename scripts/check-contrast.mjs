#!/usr/bin/env node
// WCAG contrast check for the foreground/background pairs the components actually use.
// Pairings verified against the Figma component sets, not assumed.
import { readFileSync } from 'node:fs';
const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));

const flat = new Map();
(function walk(n) {
  if (n && typeof n === 'object') {
    if (n.$type) flat.set(n.$extensions['com.mhr.pf'].figmaName, n);
    else Object.values(n).forEach(walk);
  }
})(t.color);

function resolve(figmaName, mode) {
  const n = flat.get(figmaName);
  if (!n) throw new Error('unknown token: ' + figmaName);
  const e = n.$extensions['com.mhr.pf'];
  let v = e.tier === 'semantic' ? e.modes[mode] : n.$value;
  for (let i = 0; i < 10 && typeof v === 'string' && v.startsWith('{'); i++) {
    let node = t;
    for (const p of v.slice(1, -1).split('.')) node = node[p];
    const e2 = node.$extensions['com.mhr.pf'];
    v = e2.tier === 'semantic' ? e2.modes[mode] : node.$value;
  }
  return v;
}

const lum = hex => {
  const c = hex.replace('#', '').slice(0, 6);
  const v = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Pairs taken from the Figma component sets (Button, Filter chip, Links, Tags, Tables).
const PAIRS = [
  ['body text',            'Text/Primary',            'Background/Primary'],
  ['secondary text',       'Text/Secondary',          'Background/Primary'],
  ['body on secondary bg', 'Text/Primary',            'Background/Secondary'],
  ['body on tertiary bg',  'Text/Primary',            'Background/Tertiary'],
  ['link',                 'Text/Link',               'Background/Primary'],
  ['error text',           'Text/Negative',           'Background/Primary'],
  ['success text',         'Text/Positive',           'Background/Primary'],
  ['warning text',         'Text/Warning',            'Background/Primary'],
  ['disabled text',        'Text/Disabled',           'Background/Primary'],
  ['btn Action',           'Text/Inverted primary',   'Background/Secondary Button'],
  ['btn Action hover',     'Text/Inverted primary',   'Background/Secondary Button Hover'],
  ['btn Positive',         'Base colours/White',      'Background/Primary Button'],
  ['btn Positive hover',   'Base colours/White',      'Background/Primary Button Hover'],
  ['btn Negative',         'Base colours/White',      'Background/Negative Button'],
  ['btn Negative hover',   'Base colours/White',      'Background/Negative Button Hover'],
  ['btn Hollow',           'Text/Primary',            'Background/Primary'],
  ['chip selected',        'Text/Theme',              'Background/Primary'],
  ['chip hover',           'Text/Theme',              'Background/Light Theme'],
  ['tag positive',         'Tags/Content/Positive',   'Tags/Fills/Positive'],
  ['tag negative',         'Tags/Content/Negative',   'Tags/Fills/Negative'],
  ['tag warning',          'Tags/Content/Warning',    'Tags/Fills/Warning'],
  ['tag neutral',          'Tags/Content/Neutral',    'Tags/Fills/Neutral'],
  ['tag info',             'Tags/Content/Info',       'Tags/Fills/Info'],
  ['tag other',            'Tags/Content/Other',      'Tags/Fills/Other'],
  ['tag expired',          'Tags/Content/Expired',    'Tags/Fills/Expired'],
  ['table cell',           'Text/Primary',            'Table/Primary cell'],
  ['table stripe',         'Text/Primary',            'Table/Stripe cell'],
  ['table header',         'Text/Primary',            'Table/Header cell']
];

let fails = 0;
const results = [];
for (const mode of ['light', 'dark']) {
  for (const [label, fg, bg] of PAIRS) {
    const a = resolve(fg, mode), b = resolve(bg, mode);
    const r = ratio(a, b);
    const verdict = r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large-only' : 'FAIL';
    if (verdict !== 'AA') fails++;
    results.push({ mode, label, fg, bg, fgHex: a, bgHex: b, ratio: +r.toFixed(2), verdict });
  }
}

if (process.argv.includes('--json')) { console.log(JSON.stringify(results, null, 2)); process.exit(0); }
for (const mode of ['light', 'dark']) {
  console.log(`\n=== ${mode.toUpperCase()} ===`);
  for (const r of results.filter(x => x.mode === mode && x.verdict !== 'AA'))
    console.log(`  ${r.verdict.padEnd(14)} ${String(r.ratio).padStart(5)}  ${r.label}  —  ${r.fg} on ${r.bg}  (${r.fgHex} / ${r.bgHex})`);
  const ok = results.filter(x => x.mode === mode && x.verdict === 'AA').length;
  console.log(`  ${ok}/${PAIRS.length} pass AA`);
}
process.exit(0);
