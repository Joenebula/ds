#!/usr/bin/env node
// Renders dist/type.css in Chromium and checks every type class against the Figma
// text-style extract.
//
//   node scripts/verify-type.mjs              check the type layer
//   node scripts/verify-type.mjs --self-test  prove the check actually fails
//
// The same idea as verify-components.mjs, for the layer that had no check at all.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const selfTest = process.argv.includes('--self-test');
const [header, ...lines] = readFileSync('tokens/_raw/text-styles.tsv', 'utf8').trim().split('\n');
const keys = header.split('\t');
const styles = lines.map(l => Object.fromEntries(l.split('\t').map((v, i) => [keys[i], v ?? ''])));

const css = readFileSync('dist/type.css', 'utf8');
// Read the class names back out of the generated CSS in order, so the check tests what
// was actually emitted rather than re-deriving the naming and agreeing with itself.
const classes = [...css.matchAll(/^\.(pf-text-[a-z0-9-]+) \{/gm)].map(m => m[1]);
if (classes.length !== styles.length) {
  console.log(`FAIL ${styles.length} text styles in Figma but ${classes.length} classes emitted`);
  process.exit(1);
}

const WEIGHT = { Light: '300', Regular: '400', Medium: '500', SemiBold: '600', Bold: '700', Italic: '400' };
const specs = styles.map((s, i) => ({
  id: 't' + i, name: s.name, cls: classes[i],
  size: +s.size,
  weight: s.weight ? (WEIGHT[s.weight] || '400') : null,
  italic: s.weight === 'Italic',
  letterSpacing: parseFloat(s.letterSpacing) || 0,
  upper: s.textCase === 'UPPER',
}));

writeFileSync('tmp-type-check.html', `<style>${css}</style>
${selfTest ? '<style>.pf-text-body-text{font-size:9px !important;letter-spacing:5px !important}</style>' : ''}
<body style="margin:0;font-size:16px">${
  specs.map(s => `<p id="${s.id}" class="${s.cls}">Hg</p>`).join('\n')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await browser.newContext()).newPage();
await p.goto('file:///home/user/ds/tmp-type-check.html');
const found = await p.evaluate(ids => ids.map(id => {
  const cs = getComputedStyle(document.getElementById(id));
  return { id, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
           letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, lineHeight: cs.lineHeight };
}), specs.map(s => s.id));
await browser.close();
unlinkSync('tmp-type-check.html');

const byId = new Map(found.map(f => [f.id, f]));
const results = [];
for (const s of specs) {
  const f = byId.get(s.id);
  const add = (prop, want, got, ok) => results.push({ name: s.name, prop, want, got, ok });

  add('font-size', s.size + 'px', f.fontSize, f.fontSize === s.size + 'px');
  if (s.weight) add('font-weight', s.weight, f.fontWeight, f.fontWeight === s.weight);
  if (s.italic) add('font-style', 'italic', f.fontStyle, f.fontStyle === 'italic');
  // -1% of the font size, which is what an em-based letter-spacing resolves to.
  const wantLs = s.letterSpacing === 0 ? 'normal' : (s.size * s.letterSpacing / 100).toFixed(2) + 'px';
  add('letter-spacing', wantLs, f.letterSpacing,
      s.letterSpacing === 0 ? f.letterSpacing === 'normal'
                            : Math.abs(parseFloat(f.letterSpacing) - s.size * s.letterSpacing / 100) < 0.05);
  add('text-transform', s.upper ? 'uppercase' : 'none', f.textTransform,
      f.textTransform === (s.upper ? 'uppercase' : 'none'));
  // Figma sets automatic line height on every style, so anything but `normal` is invented.
  add('line-height', 'normal', f.lineHeight, f.lineHeight === 'normal');
}

const fails = results.filter(r => !r.ok);
for (const r of fails.slice(0, 30))
  console.log(`FAIL ${r.name}\n       ${r.prop}: expected ${r.want}, got ${r.got}`);
console.log(`\n${results.length - fails.length} of ${results.length} type checks match Figma, ${fails.length} off`);
if (selfTest) {
  const caught = fails.filter(f => /Body text$/.test(f.name)).length;
  console.log(caught ? `self-test OK — the deliberate break was caught (${caught} failures)`
                     : 'self-test FAILED — the deliberate break was NOT caught');
  process.exit(caught ? 0 : 1);
}
process.exit(fails.length ? 1 : 0);
