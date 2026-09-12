// Does a class with NO breakpoint attribute follow the viewport?
//
// Figma draws 52 components at more than one width, and for the whole life of this project
// the stylesheet exposed those variants as a data attribute and nothing else — so the
// library did not respond to the viewport at all. The only way to get the mobile header was
// to write data-mobile="Yes" by hand, and every page in this repo instead hard-writes
// Desktop. A phone got the desktop component in a 390px window.
//
// The expectation here comes from `tokens/_raw/component-geometry.tsv`, NOT from
// components.css and not from the generator's agreement logic. Re-deriving the rule the
// generator applies would make this check agree with it by construction and catch nothing;
// reading Figma's own artboard heights makes it an independent claim.
//
// Two directions, because only one of them is the interesting half:
//   FOLLOWS   a bare class must render Figma's height for that breakpoint
//   PINS      a class that writes the attribute must NOT move, at any width
// The second is what keeps the change safe: every existing page pins Desktop explicitly and
// must go on behaving exactly as it did.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const kebab = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = n => 'pf-' + kebab(n);
const css = readFileSync('dist/components.css', 'utf8');
const tokens = readFileSync('dist/tokens.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));

// Figma's artboards, per component per breakpoint.
const MOBILE = /(?:^|,\s*)(?:Mobile=(?:Yes|True|true)|Device=Mobile|Breakpoint=Mobile)(?:,|$)/;
const TABLET = /(?:^|,\s*)(?:Tablet=(?:Yes|True|true)|Device=Tablet|Breakpoint=Tablet)(?:,|$)/;
const heights = new Map();               // component -> { mobile:Set, tablet:Set }
for (const line of readFileSync('tokens/_raw/component-geometry.tsv', 'utf8').trim().split('\n').slice(1)) {
  const c = line.split('\t');
  if (!c[0].includes('|')) continue;
  const [component, variant] = c[0].split('|');
  const m = /^(auto|\d+)\s*x\s*(auto|\d+)$/.exec((c[1] || '').trim());
  if (!m || m[2] === 'auto') continue;
  const isMobile = MOBILE.test(variant), isTablet = TABLET.test(variant);
  if (!isMobile && !isTablet) continue;
  if (isMobile && isTablet) continue;
  if (!heights.has(component)) heights.set(component, { mobile: new Set(), tablet: new Set() });
  heights.get(component)[isMobile ? 'mobile' : 'tablet'].add(+m[2]);
}

// Only a height the generator states EXACTLY can be asserted from the rendered box. Above
// 260px it is emitted as a minimum and above 700px it is dropped as an artboard, both of
// which are documented deliberate behaviour rather than something this check measures.
const EXACT_MAX = 260;
const cases = [];
for (const [component, hs] of heights) {
  const base = cls(component);
  if (!libClasses.has(base)) continue;
  for (const bucket of ['mobile', 'tablet']) {
    if (hs[bucket].size !== 1) continue;             // Figma's own variants disagree
    const h = [...hs[bucket]][0];
    if (h > EXACT_MAX) continue;
    cases.push({ component, base, bucket, h });
  }
}

const WIDTHS = { desktop: 1400, tablet: 800, mobile: 390 };
writeFileSync('tmp-responsive.html', `<style>${tokens}${css}</style><body style="margin:0">`
  + cases.map((c, i) => `<div class="${c.base}" id="f${i}"></div>`).join('')
  + cases.map((c, i) => `<div class="${c.base}" data-mobile="No" data-device="Desktop" data-breakpoint="Desktop" id="p${i}"></div>`).join('')
  + '</body>');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const seen = {};
for (const [name, w] of Object.entries(WIDTHS)) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('file://' + process.cwd() + '/tmp-responsive.html');
  await page.evaluate(() => document.fonts.ready);
  seen[name] = await page.evaluate(n => Array.from({ length: n }, (_, i) => ({
    free: Math.round(document.getElementById('f' + i).getBoundingClientRect().height),
    pinned: Math.round(document.getElementById('p' + i).getBoundingClientRect().height),
  })), cases.length);
  await page.close();
}
await browser.close();
unlinkSync('tmp-responsive.html');

// Pinned so the number can only rise. The five that do not follow are components whose
// Figma variants carry another axis the class still demands, or whose own variants disagree
// on the value at that width — both are readings of the file rather than defects here, and
// neither may quietly grow.
const FOLLOW_BASELINE = 23;
const problems = [];
let follows = 0, stuck = [], pins = 0;
cases.forEach((c, i) => {
  const at = seen[c.bucket][i].free;
  if (at === c.h) follows++;
  else stuck.push(`${c.base} at ${c.bucket} renders ${at}px, Figma draws it ${c.h}px`);
  // The pinned copy must not move between widths — that is what protects every existing page.
  const p = [seen.desktop[i].pinned, seen.tablet[i].pinned, seen.mobile[i].pinned];
  if (new Set(p).size === 1) pins++;
  else problems.push(`.${c.base} writes the breakpoint attribute explicitly and STILL moved `
    + `(${p.join(' / ')} at ${Object.values(WIDTHS).join(' / ')}px): a page that pins a variant must keep it`);
});

console.log(`${follows} of ${cases.length} class(es) render Figma's own height for their breakpoint `
  + `with no attribute written`);
console.log(`  ${pins} of ${cases.length} keep their height at every width when the attribute IS `
  + `written, so a page that pins a variant is unaffected`);
if (stuck.length) {
  console.log(`  ${stuck.length} do not follow the viewport — Figma's variants for these carry another `
    + `axis the class still demands, or disagree on the value:`);
  for (const s of stuck) console.log(`    ${s}`);
}
if (follows < FOLLOW_BASELINE) {
  problems.push(`only ${follows} of ${cases.length} classes follow the viewport, down from `
    + `${FOLLOW_BASELINE}: a component has stopped responding`);
}
if (pins !== cases.length) {
  problems.push(`${cases.length - pins} class(es) ignore an explicitly written breakpoint attribute`);
}
if (!cases.length || !follows) {
  console.error('  this check proved nothing: no component was measured, or none followed');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
