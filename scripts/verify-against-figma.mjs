#!/usr/bin/env node
// Compares the RENDERED stylesheet against an INDEPENDENT measurement of Figma.
//
//   node scripts/verify-against-figma.mjs [--self-test]
//
// This is the check the project did not have. verify-components.mjs renders
// dist/components.css and compares it to component-geometry.tsv and
// component-variants.tsv — the two files the stylesheet is generated from. It is
// internally consistent by construction, so it printed "2722 of 2722" while four
// mis-transcriptions shipped.
//
// Here the two sides have separate origins: the stylesheet comes from the build, the
// expectation comes from tokens/_raw/figma-truth.tsv, which is measured by its own walk
// of Figma and which no build script reads. A wrong transcription now shows up.
//
// Width is deliberately NOT compared: a Figma frame may hug or be fixed, and the extract
// does not record which, so a width mismatch is not evidence of anything. Height,
// padding, radius, gap and type are unambiguous.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const selfTest = process.argv.includes('--self-test');

// Drift found on the first run, every instance of fault 3 in docs/PIPELINE-FIX-SPEC.md:
// one geometry row per component, so whichever variant was measured wins. It may go DOWN
// freely — that is the extract getting closer to Figma. It may not go UP without someone
// deciding to raise it, because up means a new mis-transcription.
const DRIFT_BASELINE = 14;
const [head, ...lines] = readFileSync('tokens/_raw/figma-truth.tsv', 'utf8').trim().split('\n');
const keys = head.split('\t');
const truth = lines.map(l => Object.fromEntries(l.split('\t').map((v, i) => [keys[i], v ?? ''])));

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = n => 'pf-' + kebab(n);
const WEIGHT = { Regular: 400, SemiBold: 600, Bold: 700, Light: 300, Medium: 500, Italic: 400 };

let css = readFileSync('dist/components.css', 'utf8');
if (selfTest) {
  // Break one value the way a mis-transcription would, and confirm it is caught.
  css = css.replace(/(\.pf-button \{[^}]*?)height: 32px/, '$1height: 30px');
}

// Which properties does the stylesheet actually ASSERT for a class? A component whose
// height comes from its content has no height rule, and comparing the probe's rendered
// height to Figma's frame would measure my test markup, not a drift. Only compare what
// the library claims.
const asserts = (base, prop) => {
  const re = new RegExp(`(^|\\})[^{}]*\\.${base}[\\s{\\[,][^{}]*\\{[^}]*(^|;|\\s)${prop}\\s*:`, 'm');
  return re.test(css);
};

const specs = [];
for (const [i, t] of truth.entries()) {
  const base = cls(t.component);
  if (!new RegExp(`\\.${base}[\\s{\\[,]`).test(css)) continue;   // not in the library
  const attrs = (t.variant || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(p => { const k = p.slice(0, p.indexOf('=')), v = p.slice(p.indexOf('=') + 1);
                return ` data-${kebab(k)}="${v}"`; }).join('');
  specs.push({ id: 'c' + i, t, html: `<div id="c${i}" class="${base}"${attrs}>Ag</div>` });
}

writeFileSync('tmp-figma-truth-check.html',
  `<style>${readFileSync('dist/fonts.css', 'utf8')}</style>
<link rel="stylesheet" href="dist/tokens.css"><link rel="stylesheet" href="dist/components.css">
<style>#out${css.length ? '' : ''}{}</style>
<body style="margin:0">${specs.map(s => s.html).join('\n')}</body>`);
// the stylesheet under test is the one on disk unless we are self-testing
if (selfTest) writeFileSync('tmp-figma-truth-check.css', css);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-figma-truth-check.html');
if (selfTest) await p.addStyleTag({ content: css });
await p.evaluate(() => document.fonts.ready);

const got = await p.evaluate(ids => ids.map(id => {
  const el = document.getElementById(id);
  const cs = getComputedStyle(el);
  return { id, height: Math.round(el.getBoundingClientRect().height),
    padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]
      .map(v => Math.round(parseFloat(v))).join(' '),
    radius: Math.round(parseFloat(cs.borderTopLeftRadius)),
    gap: cs.gap === 'normal' ? 0 : Math.round(parseFloat(cs.gap)),
    fontSize: Math.round(parseFloat(cs.fontSize)), fontWeight: +cs.fontWeight };
}), specs.map(s => s.id));
await browser.close();
unlinkSync('tmp-figma-truth-check.html');
try { unlinkSync('tmp-figma-truth-check.css'); } catch {}

const byId = new Map(got.map(g => [g.id, g]));
const fails = [], checks = [];
for (const s of specs) {
  const g = byId.get(s.id), t = s.t;
  const cmp = (prop, want, have) => {
    if (want === '' || want === null || want === undefined) return;
    checks.push(1);
    // A pill: Figma writes the real radius, CSS writes 999. Same shape.
    if (prop === 'radius' && have >= 999 && +want >= g.height / 2 - 1) return;
    if (String(want) !== String(have))
      fails.push(`${t.component}${t.variant ? '  ' + t.variant : ''}\n       ${prop}: Figma ${want}, rendered ${have}`);
  };
  const base = cls(t.component);
  if (asserts(base, 'height')) cmp('height', t.h, g.height);
  if (asserts(base, 'padding')) cmp('padding', t.padding, g.padding);
  if (asserts(base, 'border-radius')) cmp('radius', t.radius, g.radius);
  if (asserts(base, 'gap')) cmp('gap', t.gap, g.gap);
  if (asserts(base, 'font-size')) cmp('font-size', t.fontSize, g.fontSize);
  if (t.fontStyle && asserts(base, 'font-weight')) cmp('font-weight', WEIGHT[t.fontStyle], g.fontWeight);
}

for (const f of fails.slice(0, 25)) console.log('  DRIFT  ' + f);
if (fails.length > 25) console.log(`  ... and ${fails.length - 25} more`);
console.log(`\n${checks.length - fails.length} of ${checks.length} rendered values match an INDEPENDENT measurement of Figma`);
console.log(`  (${specs.length} shapes across ${new Set(specs.map(s => s.t.component)).size} components; the stylesheet and the expectation have separate sources)`);

if (selfTest) {
  const caught = fails.some(f => /height: Figma 32, rendered 30/.test(f));
  console.log(caught ? '\nself-test OK — the deliberate break was caught'
                     : '\nSELF-TEST FAILED — the break went unnoticed');
  process.exit(caught ? 0 : 1);
}
if (fails.length > DRIFT_BASELINE) {
  console.log(`\nFAIL — drift went UP: ${fails.length}, baseline ${DRIFT_BASELINE}. A value has been mis-transcribed.`);
  process.exit(1);
}
if (fails.length < DRIFT_BASELINE)
  console.log(`\nnote — down ${DRIFT_BASELINE - fails.length} from baseline; lower DRIFT_BASELINE to ${fails.length} to lock it in`);
else if (fails.length)
  console.log(`\n${fails.length} known drifts, all fault 3 (one geometry row per component) — see docs/PIPELINE-FIX-SPEC.md`);
process.exit(0);
