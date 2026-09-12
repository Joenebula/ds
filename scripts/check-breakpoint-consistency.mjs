// What a component looks like must not depend on the viewport except where Figma says it does.
//
// Two things are asserted, both found by asking what the responsive pass made vary that nothing
// measures. The breakpoint mirror puts a variant's rule on the bare class wherever the
// breakpoint was that component's only axis, so a property keyed per variant can reach the bare
// class at ONE width and nowhere else — an asymmetry that is nobody's design decision.
//
// 1. A bare class that sets its own TEXT COLOUR must paint its own BACKGROUND.
//
// The responsive pass mirrors each mobile and tablet variant with the breakpoint axis stripped
// out, and where a component's only axis IS the breakpoint that leaves the rule on the bare
// class. `Header` and `Header navigation` have no bare-class rules of their own at all — the
// pink band behind them is separate artwork by design — and their mobile variants bind white.
// So at 390px, and only at 390px, those classes carried white text over whatever the page
// provides. Measured at the time: 1:1. White on white. The desktop side showed nothing,
// because the desktop variants bind no text colour at all.
//
// This is FIGMA-ISSUES §11's rule — a colour and the surface it was chosen against are a pair,
// and half a pair is worse than neither — and nothing was checking it at a breakpoint.
//
// The assertion is structural rather than a contrast ratio, on purpose. A ratio needs a
// background to measure against, and the whole fault is that there isn't one: on a white test
// page white text reads 1:1, on a dark one 21:1, and neither number is about the component.
//
// It is also NOT "states a colour but paints no background", which was the first attempt and
// fired on sixty classes at every width. That is the ordinary case and not a fault: most
// components sit on a surface something else paints — `Detail item` on a card,
// `Top bar app context` on the header band, which CLAUDE.md names as correct. Sixty failures
// is not a finding, it is a wrong question.
//
// The fault is the ASYMMETRY. A component either states its own text colour or it does not;
// what it must never do is state one at some widths and not others, because the breakpoint
// then decides whether the text is the component's colour or the page's. That is precisely
// what happened: nothing at desktop, white at mobile, over no background at all.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const css = readFileSync('dist/components.css', 'utf8');
const classes = [...new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]))].sort();
const WIDTHS = { desktop: 1400, tablet: 800, mobile: 390 };

writeFileSync('tmp-bpc.html',
  ['fonts', 'tokens', 'components', 'type'].map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${classes.map((c, i) => `<div class="${c}" id="c${i}">x</div>`).join('')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const seen = {};
for (const [name, width] of Object.entries(WIDTHS)) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto('file://' + process.cwd() + '/tmp-bpc.html');
  await page.evaluate(() => document.fonts.ready);
  seen[name] = await page.evaluate(n => Array.from({ length: n }, (_, i) => {
    const el = document.getElementById('c' + i);
    const s = getComputedStyle(el);
    const bg = s.backgroundColor;
    // The element's OWN paint only — an inherited page colour is not the component's answer.
    const paints = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || s.backgroundImage !== 'none';
    // A colour it merely inherited is not a colour it states; compare against the body's.
    const stated = s.color !== getComputedStyle(document.body).color;
    return { paints, stated, shadow: s.boxShadow };
  }), classes.length);
  await page.close();
}
await browser.close();
unlinkSync('tmp-bpc.html');

const widths = Object.keys(WIDTHS);
const problems = [];
let consistent = 0, stating = 0, onOwnSurface = 0;
const pairedAtOneWidth = [];
classes.forEach((c, i) => {
  const says = widths.filter(w => seen[w][i].stated);
  // An asymmetry alone is not the fault — the fault is a colour arriving WITHOUT the surface it
  // was chosen against. `Notification categories` gains a text colour and its own background
  // together at mobile: a complete pair, self-consistent, and simply a distinct mobile
  // appearance Figma drew. `Header` gained white and nothing to put it on.
  const bare = says.filter(w => !seen[w][i].paints);
  if (says.length && says.length !== widths.length && bare.length) {
    const quiet = widths.filter(w => !says.includes(w));
    problems.push(`.${c} states its own text colour at ${says.join('/')} width and not at `
      + `${quiet.join('/')}, and at ${bare.join('/')} it paints no background to state it `
      + `against — so at that width alone the colour lands on whatever the page provides`);
  } else if (says.length && says.length !== widths.length) {
    pairedAtOneWidth.push(`${c} (at ${says.join('/')})`);
    consistent++;
  } else {
    consistent++;
    if (says.length) { stating++; if (seen[widths[0]][i].paints) onOwnSurface++; }
  }
});

// 2. A DROP SHADOW must be the same at every width unless Figma's own measurements differ.
//
// Eight floating surfaces — `Side filter`, `Form`, `Manage columns`, `Table card (AG)` among
// them — had a shadow on a phone and none on a desktop. Figma casts the identical shadow at
// both (`Side filter` is `0 0 4 0` at Mobile=False and `0 0 4 0` at Mobile=True); the
// asymmetry was only ever which selector the rule was keyed on. The exception is read from
// the measurements rather than allowed by name: `Notification categories` really is `2 0 4 0`
// at desktop and `0 0 4 0` at mobile, and the desktop one matches no token, so it differs
// honestly — see FIGMA-ISSUES.md §12.
const kebab = n => 'pf-' + String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const figmaShadows = new Map();       // class -> Set of "x y blur spread colour" per variant
for (const line of readFileSync('tokens/_raw/component-shadow.tsv', 'utf8').trim().split('\n').slice(1)) {
  const c = line.split('\t');
  if (c[3] !== 'DROP_SHADOW') continue;
  const k = kebab(c[0]);
  if (!figmaShadows.has(k)) figmaShadows.set(k, new Set());
  figmaShadows.get(k).add(`${c[4]} ${c[5]} ${c[6]} ${c[7]} ${c[8]}`);
}
let sameShadow = 0;
const shadowExcused = [];
classes.forEach((c, i) => {
  const vals = new Set(widths.map(w => seen[w][i].shadow));
  if (vals.size === 1) { sameShadow++; return; }
  if ((figmaShadows.get(c) || new Set()).size > 1) { shadowExcused.push(c); return; }
  problems.push(`.${c} casts a different drop shadow at different widths (${[...vals].map(v => v === 'none' ? 'none' : v.slice(0, 24)).join('  vs  ')}) `
    + `while Figma measures the same one at every breakpoint — a floating surface that is flat `
    + `on a desktop and shadowed on a phone`);
});

console.log(`${classes.length} class(es) checked at ${Object.values(WIDTHS).join('/')}px`);
console.log(`  ${sameShadow} cast the same drop shadow at every width`);
if (shadowExcused.length) {
  console.log(`  ${shadowExcused.length} differ because Figma's own measurements differ: ${shadowExcused.join(', ')}`);
}
console.log(`  ${consistent} answer the same way at every width — a breakpoint never decides whose `
  + `colour the text is`);
console.log(`  ${stating} of those state a colour of their own, ${onOwnSurface} of them over a `
  + `surface they paint themselves; the rest sit on one something else paints, which is the design`);
if (pairedAtOneWidth.length) {
  console.log(`  ${pairedAtOneWidth.length} take on a colour AND their own surface at one width `
    + `only, which is a complete pair and a mobile appearance Figma drew: ${pairedAtOneWidth.join(', ')}`);
}
if (!stating) {
  console.error('  this check proved nothing: not one class stated a colour, so nothing was tested');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
