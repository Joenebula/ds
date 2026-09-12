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

// Zero, since fault 3 was fixed and the geometry extract became per-variant. It may not
// rise without someone deciding to raise it: up means a new mis-transcription.
const DRIFT_BASELINE = 0;
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
// Does the stylesheet make a CLAIM about this property for this class? A reset does not
// count. A variant rule has to neutralise whichever of height/min-height it does not set
// — otherwise the base rule's value leaks through the cascade — but `height: auto` is the
// absence of a claim, not a claim of its own. Counting it as one made every panel whose
// height is deliberately dropped (Full page, Side filter, Side panel) read as drift
// against the content height of an empty test div.
// Only these two are cascade resets. `border-radius: 0`, `padding: 0` and `gap: 0` are
// real measurements from Figma and must still count as claims — treating every 0 as a
// reset silently dropped 204 genuine checks.
const RESET = (prop, val) =>
  (prop === 'height' && val === 'auto') || (prop === 'min-height' && val === '0');
// Which properties does the stylesheet actually CLAIM for a given element? This used to
// be answered per CLASS by scanning the CSS text, which cannot tell one variant from
// another: `Control Radio=Yes` declares `padding: 0`, so the class looked like it
// asserted padding, and `Radio=No` — whose padding the generator deliberately drops,
// because 10px on a 20px box leaves nothing for content — was then compared against a
// value it never claimed and reported as drift. Twice before, the same approximation
// produced a false result. It is now answered per ELEMENT, in the browser, by walking
// the rules that actually match it, where the cascade is a fact rather than a guess.

const specs = [];
for (const [i, t] of truth.entries()) {
  const base = cls(t.component);
  if (!new RegExp(`\\.${base}[\\s{\\[,]`).test(css)) continue;   // not in the library
  const attrs = (t.variant || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(p => { const k = p.slice(0, p.indexOf('=')), v = p.slice(p.indexOf('=') + 1);
                return ` data-${kebab(k)}="${v}"`; }).join('');
  specs.push({ id: 'c' + i, t, html: `<div id="c${i}" class="${base}"${attrs}>Ag</div>` });
}

// Both stylesheets are INLINED, not linked. Over file:// a linked sheet's cssRules
// throws a security error, so the rule walk that decides what the stylesheet claims
// would silently see nothing and every check would vanish — 0 of 0, reported as a pass.
writeFileSync('tmp-figma-truth-check.html',
  `<style>${readFileSync('dist/fonts.css', 'utf8')}</style>
<style>${readFileSync('dist/tokens.css', 'utf8')}</style>
<style>${readFileSync('dist/components.css', 'utf8')}</style>
<body style="margin:0">${specs.map(s => s.html).join('\n')}</body>`);
// the stylesheet under test is the one on disk unless we are self-testing
if (selfTest) writeFileSync('tmp-figma-truth-check.css', css);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-figma-truth-check.html');
if (selfTest) await p.addStyleTag({ content: css });
await p.evaluate(() => document.fonts.ready);

const got = await p.evaluate(({ ids }) => {
  // Every rule in every sheet, in document order, so the last match wins like the cascade.
  const rules = [];
  for (const sheet of document.styleSheets) {
    let list; try { list = sheet.cssRules; } catch { continue; }
    // Collect first, THEN recurse. Since nested CSS landed, every CSSStyleRule carries
    // its own (usually empty) cssRules, so an `if (r.cssRules) recurse; else collect`
    // walk descends into all of them and collects nothing — 741 readable rules became 0
    // matched, every check silently disappeared, and the run reported 0 of 0 as success.
    const walk = rs => { for (const r of rs) {
      if (r.selectorText) rules.push(r);
      if (r.cssRules && r.cssRules.length) walk(r.cssRules);
    } };
    walk(list);
  }
  const declaredFor = el => {
    const out = {};
    for (const r of rules) {
      let hit = false;
      for (const sel of r.selectorText.split(',')) {
        // A rule keyed on a pseudo-class the test div can never be in (:hover) is not a
        // claim about its resting state.
        const plain = sel.trim();
        if (/:(hover|focus|active|focus-visible)\b/.test(plain)) continue;
        try { if (el.matches(plain)) { hit = true; break; } } catch { /* unsupported selector */ }
      }
      if (!hit) continue;
      for (const prop of r.style) {
        const val = r.style.getPropertyValue(prop).trim();
        // The browser normalises values, so `min-height: 0` comes back as "0px". Match
        // the shape, not the literal text — comparing against "0" quietly classified
        // every reset as a real claim and put twelve dropped heights back under test.
        const isReset = (prop === 'height' && val === 'auto')
          || (prop === 'min-height' && /^0(px|%)?$/.test(val));
        out[prop] = !isReset;
      }
    }
    return out;
  };
  return ids.map(id => {
  const el = document.getElementById(id);
  const cs = getComputedStyle(el);
  return { id, declared: declaredFor(el), height: Math.round(el.getBoundingClientRect().height),
    padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]
      .map(v => Math.round(parseFloat(v))).join(' '),
    radius: Math.round(parseFloat(cs.borderTopLeftRadius)),
    radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius,
      cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
      .map(v => Math.round(parseFloat(v))).join(' '),
    gap: cs.gap === 'normal' ? 0 : Math.round(parseFloat(cs.gap)),
    fontSize: Math.round(parseFloat(cs.fontSize)), fontWeight: +cs.fontWeight };
});
}, { ids: specs.map(s => s.id) });
await browser.close();
unlinkSync('tmp-figma-truth-check.html');
try { unlinkSync('tmp-figma-truth-check.css'); } catch {}

const byId = new Map(got.map(g => [g.id, g]));
const fails = [], checks = [], unmeasured = [];
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
  const declared = p => g.declared[p] === true;
  if (declared('height') || declared('min-height')) cmp('height', t.h, g.height);
  // Both sides must be rounded the same way. The rendered padding is rounded above; a
  // Figma value of 18.5 compared against a rendered 19 is a unit mismatch, not drift,
  // and no edit to the stylesheet could ever clear it.
  const roundPad = v => String(v).trim().split(/\s+/).map(x => Math.round(parseFloat(x))).join(' ');
  if (declared('padding') || declared('padding-top')) cmp('padding', t.padding === '' ? '' : roundPad(t.padding), g.padding);
  // Figma gives four corner values when they differ. Compare all four rather than the
  // top-left one, so a panel rounded along one edge is actually checked. The bare word
  // "mixed" means the walk has not measured that component's corners yet, and asserting
  // against it can only ever produce noise — it is counted as unmeasured instead.
  if (declared('border-radius') || declared('border-top-left-radius')) {
    if (/^[\d.]+( [\d.]+){3}$/.test(String(t.radius)))
      cmp('radius', String(t.radius).trim().split(/\s+/).map(x => Math.round(parseFloat(x))).join(' '), g.radii);
    else if (t.radius === 'mixed') unmeasured.push(`${t.component}${t.variant ? '  ' + t.variant : ''} — corner radius`);
    else cmp('radius', t.radius, g.radius);
  }
  if (declared('gap') || declared('row-gap')) cmp('gap', t.gap, g.gap);
  if (declared('font-size')) cmp('font-size', t.fontSize, g.fontSize);
  if (t.fontStyle && declared('font-weight')) cmp('font-weight', WEIGHT[t.fontStyle], g.fontWeight);
}

if (unmeasured.length) {
  console.log(`\n  ${unmeasured.length} value(s) Figma reports as varying and the walk has not measured:`);
  for (const u of unmeasured) console.log('    ' + u);
  console.log('  These are NOT passes. Re-walk the page emitting the four corners.');
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
