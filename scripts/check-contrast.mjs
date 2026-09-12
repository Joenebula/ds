#!/usr/bin/env node
// WCAG contrast check for the foreground/background pairs the components actually use.
// Pairings verified against the Figma component sets, not assumed.
import { readFileSync } from 'node:fs';
// `resolve` is already this file's token resolver, so the path one comes in aliased.
import { resolve as resolve_ } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  // EVERY STATUS COLOUR IS ALSO USED ON THE RECESSED SURFACE, and only Text/Primary was
  // tested there. `Metric card` paints `Background/Tertiary` and its own generated template
  // puts `Text/Link` on it for the "More details" child — 4.37:1 in light mode, an AA
  // failure shipped by the library rather than by a page. The `Data variance` inside the
  // same card puts `Text/Positive` on it at 4.48. Neither was visible here, because the
  // table paired those tokens with `Background/Primary` and nothing else, so "27 of 28 pass"
  // was a true statement about a set that left out the surface where the components in
  // question actually sit. A pairing the library creates is a pairing this has to test.
  ['link on tertiary bg',    'Text/Link',     'Background/Tertiary'],
  ['success on tertiary bg', 'Text/Positive', 'Background/Tertiary'],
  ['error on tertiary bg',   'Text/Negative', 'Background/Tertiary'],
  ['warning on tertiary bg', 'Text/Warning',  'Background/Tertiary'],
  ['secondary on tertiary bg', 'Text/Secondary', 'Background/Tertiary'],
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

// EXPORTED so the counts quoted in the docs come from here rather than from someone's
// memory of a run. "27 of 28 pass AA" survived in three files after the pair table grew to
// 33, which is the same drift this repo keeps finding: a figure in prose that no check
// reaches. `check-skill-classes.mjs` imports this and pins both counts.
export function contrast() {
  const results = [];
  for (const mode of ['light', 'dark']) {
    for (const [label, fg, bg] of PAIRS) {
      const a = resolve(fg, mode), b = resolve(bg, mode);
      const r = ratio(a, b);
      const verdict = r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large-only' : 'FAIL';
      results.push({ mode, label, fg, bg, fgHex: a, bgHex: b, ratio: +r.toFixed(2), verdict });
    }
  }
  return { results, pairs: PAIRS.length,
    passing: Object.fromEntries(['light', 'dark'].map(m =>
      [m, results.filter(x => x.mode === m && x.verdict === 'AA').length])) };
}

// Run as a script, report; imported, just export the function above. Without this guard the
// top-level `process.exit(0)` below would kill any importer the moment it required this file.
if (process.argv[1] && resolve_(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { results } = contrast();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(results, null, 2)); process.exit(0); }
  for (const mode of ['light', 'dark']) {
    console.log(`\n=== ${mode.toUpperCase()} ===`);
    for (const r of results.filter(x => x.mode === mode && x.verdict !== 'AA'))
      console.log(`  ${r.verdict.padEnd(14)} ${String(r.ratio).padStart(5)}  ${r.label}  —  ${r.fg} on ${r.bg}  (${r.fgHex} / ${r.bgHex})`);
    const ok = results.filter(x => x.mode === mode && x.verdict === 'AA').length;
    console.log(`  ${ok}/${PAIRS.length} pass AA`);
  }

  // THIS USED TO END `process.exit(0)` UNCONDITIONALLY — it reported and could not fail, so
  // nothing it found ever forced a decision. Five pairs have sat below AA the whole time.
  //
  // They are not made to fail outright, because a token pair is a pair a PAGE might create
  // rather than one a component does: refusing the build over a hypothetical would be the
  // wrong severity. Instead the set is pinned BY NAME, the same way
  // `check-component-contrast.mjs` pins its own. The five that are known stay known; a sixth
  // fails. Pinning the names rather than the count is what stops one being fixed while another
  // appears and the total holds still.
  const KNOWN = new Set([
    'light|link on tertiary bg', 'light|success on tertiary bg', 'light|warning on tertiary bg',
    'light|disabled text', 'dark|success text',
  ]);
  const below = results.filter(r => r.verdict !== 'AA');
  const fresh = below.filter(r => !KNOWN.has(`${r.mode}|${r.label}`));
  const gone = [...KNOWN].filter(k => !below.some(r => `${r.mode}|${r.label}` === k));
  console.log(`\n${below.length} pair(s) below AA; ${KNOWN.size} are known and pinned by name`);
  if (gone.length) {
    console.log(`  ${gone.length} known pair(s) now pass — remove from KNOWN to lock it in: ${gone.join(', ')}`);
  }
  if (!below.length && KNOWN.size) {
    console.error('  this check proved nothing: every pair passes but the known set is not empty');
    process.exit(1);
  }
  for (const r of fresh) {
    console.error(`FAIL ${r.mode} — ${r.label} reads ${r.ratio}:1 (${r.fg} on ${r.bg}), which is `
      + `below AA and is not one of the ${KNOWN.size} already recorded`);
  }
  process.exit(fresh.length ? 1 : 0);
}
