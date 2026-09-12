// Does the BARE class paint the fill every one of its variants agrees on?
//
// The colour rules are emitted per variant, so before this a class painted nothing until a
// page wrote a data attribute — and the component's own template writes none. 19 templates
// rendered a transparent box for a fill Figma states unambiguously on every single variant.
//
// This asserts both directions, because only one of them is the interesting half:
//   - AGREE   every variant binds the same semantic fill  -> the bare class MUST paint it
//   - DIFFER  the variants bind different fills           -> if the bare class paints at all,
//             the colour MUST be one some variant of that component actually binds
// The negative is what stops the hoist from being widened into a guess later. `Button` has
// eight fills and `Tags` seven; giving the bare class a colour none of them has would be
// inventing a default Figma does not have, and it would look like a fix.
//
// The negative was first written as "a differing component must paint nothing bare", which
// is wrong and said so immediately: the generator deliberately collapses a Default state
// onto the bare class, so `.pf-radio-tile` carries `State=Default`'s own fill. That is the
// design, not a default invented by anyone. Asking instead whether the painted colour is
// one of the component's own keeps the guard without overruling that.
//
// The rendered colour is read from the browser rather than the stylesheet text, because a
// rule that matches nothing, a wrong token and a token whose value drifts are three faults
// that all show up as the same wrong pixels and none of them show up in a grep.
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const kebab = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = n => 'pf-' + kebab(n);
const css = readFileSync('dist/components.css', 'utf8');
const tokens = readFileSync('dist/tokens.css', 'utf8');
const libClasses = new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));

const rows = readFileSync('tokens/_raw/component-variants.tsv', 'utf8').trim().split('\n')
  .slice(1).map(l => l.split('\t'));
const fillsBy = new Map();
for (const r of rows) {
  if (!fillsBy.has(r[1])) fillsBy.set(r[1], new Set());
  fillsBy.get(r[1]).add(r[3] || '');
}

// The token each Figma name maps to, so "agrees on a SEMANTIC fill" can be told from
// "agrees on a primitive" — a primitive is a fixed hex and is never hoisted. Read from
// design-tokens.json, the same source the generator uses; the first version scraped a
// comment format tokens.css does not have and mapped nothing, which made every component
// look like a deliberate skip. It was the check's own "one side matched nothing" guard
// that said so rather than a green run.
const tokenName = new Map();
(function walk(o) {
  for (const v of Object.values(o)) {
    if (!v || typeof v !== 'object') continue;
    if (v.$value !== undefined) {
      const e = (v.$extensions || {})['com.mhr.pf'] || {};
      if (e.figmaName && e.cssVar) tokenName.set(e.figmaName, e.cssVar);
    } else walk(v);
  }
})(JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8')));

const agree = [], differ = [];
for (const [component, fills] of fillsBy) {
  const base = cls(component);
  if (!libClasses.has(base)) continue;
  if (fills.size === 1) {
    const only = [...fills][0];
    if (only) agree.push({ base, component, figma: only });
  } else if ([...fills].every(Boolean) || fills.size > 1) {
    differ.push({ base, component });
  }
}

// Every token any of these components binds, rendered once, so a bare class's colour can be
// compared against the colours its own variants use rather than against a name.
const probeTokens = [...new Set([...fillsBy.values()].flatMap(f => [...f])
  .map(n => tokenName.get(n)).filter(Boolean))];
writeFileSync('tmp-hoisted.html', `<style>${tokens}${css}</style><body style="background:#808080">`
  + [...agree, ...differ].map(x => `<div class="${x.base}" id="x-${x.base}"></div>`).join('')
  + probeTokens.map(t => `<div id="t-${t.slice(2)}" style="background:var(${t})"></div>`).join('')
  + '</body>');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.goto('file://' + process.cwd() + '/tmp-hoisted.html');
const { painted, tokenColour } = await page.evaluate(({ ids, toks }) => {
  const read = el => {
    if (!el) return null;
    const bg = getComputedStyle(el).backgroundColor;
    return (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') ? null : bg;
  };
  return {
    painted: Object.fromEntries(ids.map(id => [id, read(document.getElementById('x-' + id))])),
    tokenColour: Object.fromEntries(toks.map(t => [t, read(document.getElementById('t-' + t.slice(2)))])),
  };
}, { ids: [...agree, ...differ].map(x => x.base), toks: probeTokens });
await browser.close();
unlinkSync('tmp-hoisted.html');

const problems = [];
let nAgreePainted = 0, nAgreeSkipped = 0;
for (const a of agree) {
  // A fill that resolves to no token at all, or to a primitive, is deliberately not hoisted.
  const tok = tokenName.get(a.figma);
  const hoistable = tok && !tok.startsWith('--pf-base-');
  if (!hoistable) { nAgreeSkipped++; continue; }
  if (!painted[a.base]) {
    problems.push(`.${a.base} — every variant of ${a.component} binds "${a.figma}", but the bare `
      + `class paints nothing, so the template renders a transparent box`);
  } else nAgreePainted++;
}
let nDifferClean = 0;
for (const d of differ) {
  const bg = painted[d.base];
  if (!bg) { nDifferClean++; continue; }
  const own = [...fillsBy.get(d.component)].map(n => tokenColour[tokenName.get(n)]).filter(Boolean);
  if (own.includes(bg)) { nDifferClean++; continue; }
  problems.push(`.${d.base} — the variants of ${d.component} bind ${own.length} different fills and `
    + `the bare class paints ${bg}, which is none of them: that is an invented default`);
}

// HOW MANY TEMPLATES STILL HAND YOU AN UNPAINTED BOX. This is the number the whole change
// exists to move: it was 38 before the hoist. The rest are components whose variants really
// do differ, so a page must choose — that is not a defect and the number should not be
// driven to zero by picking defaults Figma does not have. It is pinned so a regression that
// puts paint back behind a variant selector shows up as a rise.
const NEED_VARIANT_BASELINE = 19;
const paintsBare = new Set(Object.entries(painted).filter(([, v]) => v).map(([k]) => k));
const cssRules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)]
  .map(m => ({ sel: m[1].trim(), body: m[2] }));
const needVariant = [];
for (const f of readdirSync('dist/templates').filter(f => f.endsWith('.html'))) {
  const t = readFileSync(`dist/templates/${f}`, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const root = /<\w+\s+class="(pf-[a-z0-9-]+)"([^>]*)>/.exec(t);
  if (!root || /data-/.test(root[2])) continue;
  const base = root[1];
  if (paintsBare.has(base)) continue;
  const paintsVariant = cssRules.some(r => r.sel.split(',').some(one =>
    one.trim().startsWith('.' + base + '[')) && /background:\s*var\(/.test(r.body));
  if (paintsVariant) needVariant.push(base);
}

console.log(`${nAgreePainted} class(es) paint the fill every one of their variants binds`);
console.log(`  ${nAgreeSkipped} agree on a fill that is a primitive or has no token, so it is `
  + `deliberately not carried to the bare class`);
console.log(`  ${nDifferClean} class(es) whose variants bind different fills paint either nothing `
  + `bare or one of their own variants' colours — never a value Figma does not give them`);
console.log(`  ${needVariant.length} template(s) still write a bare class whose paint lives only on `
  + `variant selectors (baseline ${NEED_VARIANT_BASELINE}) — their variants bind different fills, so `
  + `the page must choose one`);
if (needVariant.length > NEED_VARIANT_BASELINE) {
  problems.push(`${needVariant.length} templates hand you an unpainted box, up from ${NEED_VARIANT_BASELINE}: `
    + needVariant.join(', '));
}
if (!nAgreePainted || !nDifferClean) {
  console.error('  this check proved nothing: one of its two sides matched no component at all');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
