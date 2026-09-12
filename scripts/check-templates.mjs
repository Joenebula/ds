#!/usr/bin/env node
// A composite component's class renders an empty box, and now something says so.
//
//   node scripts/check-templates.mjs [--self-test]
//
// This is the gap nothing else could see. verify-components reads a class's colours,
// verify-against-figma reads its box, check-component-art asks whether it has any paint —
// and `.pf-card` passes all three while being a 520x358 rounded rectangle with nothing
// inside it. Correct fill, correct radius, correct size, unusable. So whoever needed a
// card wrote its contents by hand, and a hand-written component is where the flat pink
// band and the wrong font weights came from.
//
// Two questions, asked in a real browser:
//
//   1. Does the bare class render EMPTY? If a component's Figma tree has children, the
//      class alone cannot be the whole component, and there must be a template.
//   2. Does the template render something? A template that produces an empty box is no
//      better than the class it replaces.
import { unfalsifiablePacking } from './hugs.mjs';
import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const selfTest = process.argv.includes('--self-test');
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cls = name => 'pf-' + kebab(name);

// WHAT COUNTS AS COMPOSITE — the same rule build-templates.mjs applies, or one would
// demand a template the other refuses to write. A component whose only child is an
// instance of ITSELF is not composite: `Information box` wraps an `Information box`, so
// its class already is the whole component.
const tsvRows = readFileSync('tokens/_raw/component-tree.tsv', 'utf8').trim().split('\n').slice(1);
const DRAWING = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON']);
const realChildren = new Map();
for (const line of tsvRows) {
  const [component, path, type, name, main] = line.split('\t');
  if (!realChildren.has(component)) realChildren.set(component, 0);
  if (path && !(type === 'INSTANCE' && (main || name) === component) && !DRAWING.has(type))
    realChildren.set(component, realChildren.get(component) + 1);
}
// The generator refuses to write a template whose outer class the stylesheet does not
// define — see its note on the two `Field`s and the two `People`s. This must apply the
// same rule or it would demand a template the generator will not write.
const libClasses = new Set([...readFileSync('dist/components.css', 'utf8')
  .matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]));
const composite = [...realChildren.entries()].filter(([, n]) => n > 0).map(([c]) => c)
  .filter(c => libClasses.has(cls(c)));

// Expand the icon markers exactly as build-prototype.mjs does, so what is measured is
// what a page would actually get.
const expandIcons = html => html.replace(/<!--pf-icon:([a-z0-9-]+)(?:\s+(\d+))?-->/g, (m, name, size) => {
  const f = `assets/icons/${name}.svg`;
  if (!existsSync(f)) return m;
  return readFileSync(f, 'utf8').trim()
    .replace(/^<svg /, `<svg width="${size || 18}" height="${size || 18}" `);
});

const specs = [];
for (const component of composite.sort()) {
  const base = cls(component);
  const file = `dist/templates/${base}.html`;
  specs.push({
    component, base,
    template: existsSync(file)
      ? readFileSync(file, 'utf8').replace(/^<!--[\s\S]*?-->\n/, '')
      : null,
  });
}

const missing = specs.filter(s => !s.template).map(s => s.component);

// A template can be legitimately empty: its tree may reference only components that are
// DETACHED from the Figma page tree, which nothing can capture. `Signature`'s single child
// is `[S] Signature`, one of the 55. The generator marks those, and they are counted and
// named rather than failed — failing would demand something impossible, and passing
// silently would hide a real gap.
// The test is not "mentions a missing component" — `Toast message` references one and
// still renders four other things. It is "renders nothing AND the reason is a component
// the library does not have", so the exemption only ever applies where the template would
// otherwise fail, and it names which ones rather than passing them silently.
const mentionsDetached = new Set(specs
  .filter(s => s.template && /(detached from the Figma page tree|not in the library)/.test(s.template))
  .map(s => s.component));
const blocked = [];

const page = specs.map((s, i) => `
<section id="bare${i}">${`<div class="${s.base}"></div>`}</section>
<section id="tpl${i}">${s.template ? expandIcons(selfTest && i === 0 ? `<div class="${s.base}"></div>` : s.template) : ''}</section>`).join('\n');

writeFileSync('tmp-templates-check.html',
  `<style>${readFileSync('dist/fonts.css', 'utf8')}</style>
<style>${readFileSync('dist/tokens.css', 'utf8')}</style>
<style>${readFileSync('dist/components.css', 'utf8')}</style>
<style>${readFileSync('dist/type.css', 'utf8')}</style>
<body style="margin:0">${page}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await browser.newPage();
await p.goto('file://' + process.cwd() + '/tmp-templates-check.html');
await p.evaluate(() => document.fonts.ready);

// "Renders something" = it has descendants that occupy VERTICAL space, or text.
//
// Height, not area. Nearly every component class is `display: inline-flex` — Figma
// auto-layout — and the generator deliberately drops a width above 120px, because that is
// the artboard the component was drawn at rather than a rule. An inline box with no
// content therefore has zero WIDTH, and a template whose children are empty placeholder
// instances collapses to 0 wide while being perfectly correct. Measuring area called five
// good templates empty. On a real page the author gives the component its width; what a
// template can honestly promise is that its contents occupy the page at all.
const got = await p.evaluate(n => {
  const content = root => {
    if (!root) return 0;
    let n = 0;
    for (const el of root.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.height > 0) n++;
    }
    return n + ((root.textContent || '').trim() ? 1 : 0);
  };
  const out = [];
  for (let i = 0; i < n; i++)
    out.push({ bare: content(document.getElementById('bare' + i)),
               tpl: content(document.getElementById('tpl' + i)) });
  return out;
}, specs.length);
await browser.close();
unlinkSync('tmp-templates-check.html');

let failures = 0;
const emptyTemplates = [];
// The bare class contributes 1 for its own div. Anything at or below that is an empty box.
for (const [i, s] of specs.entries()) {
  if (!s.template) continue;
  if (got[i].tpl > got[i].bare) continue;               // renders something; fine
  if (mentionsDetached.has(s.component)) { blocked.push(s.component); continue; }
  emptyTemplates.push(s.component); failures++;
}

console.log(`${specs.length} composite component(s) — a class alone cannot be any of them`);
if (missing.length) {
  console.log(`  FAIL  ${missing.length} with no template: ${missing.join(', ')}`);
  failures++;
}
if (emptyTemplates.length) {
  console.log(`  FAIL  ${emptyTemplates.length} template(s) render an empty box: ${emptyTemplates.join(', ')}`);
}
if (blocked.length) {
  console.log(`  ${blocked.length} blocked by a detached component, so nothing can fill them: ${blocked.join(', ')}`);
}
if (!failures) console.log('  every one has a template, and every template renders its contents');

const bareEmpty = specs.filter((s, i) => got[i].bare <= 1).length;
console.log(`  ${bareEmpty} of them render NOTHING from the bare class — which is why the templates exist`);

// NO PRIMITIVES IN A TEMPLATE.
//
// CLAUDE.md's first rule after "never a raw hex" is "semantic tokens, never primitives" —
// a primitive has one value in both modes, so using one breaks dark mode. check-off-system
// enforces that on pages, but a template is not a page and nothing checked it. Six had
// slipped in, because the generator applied the rule to a child's fill and stroke and not
// to its text: `Calendar picker` shipped white text over a background the same generator
// had refused to paint for binding a primitive. Both are fixed; this is what keeps them
// fixed, and it is the cheapest possible check — a template is markup, and the primitives
// are all named `--pf-base-*`.
const primitiveUse = [];
for (const f of readdirSync('dist/templates')) {
  const found = [...new Set([...readFileSync('dist/templates/' + f, 'utf8')
    .matchAll(/var\((--pf-base-[a-z0-9-]+)\)/g)].map(m => m[1]))];
  if (found.length) primitiveUse.push(`${f} (${found.join(', ')})`);
}
if (primitiveUse.length) {
  console.log(`  FAIL  ${primitiveUse.length} template(s) use a PRIMITIVE token, which has one `
    + `value in both modes and so cannot do dark mode: ${primitiveUse.join('; ')}`);
  failures++;
} else {
  console.log('  none of them uses a primitive token, so every one adapts between modes');
}

// EVERY TEMPLATE ON DISK MUST NAME A REAL CLASS. The rule above stops one being written;
// this catches one that survives a rename or an abandoned component. A template is markup
// somebody pastes, and its outer element is the component — `<div class="pf-people-second-
// component">` is a div with a decorative attribute, and the contents rendering is exactly
// what makes it look fine.
const orphaned = readdirSync('dist/templates')
  .map(f => f.replace(/\.html$/, ''))
  .filter(base => !libClasses.has(base));
if (orphaned.length) {
  console.log(`  FAIL  ${orphaned.length} template(s) whose outer class components.css does not `
    + `define, so pasting one gives an unstyled div: ${orphaned.join(', ')}`);
  failures++;
}

// HOW MUCH OF THE TREE IS STILL BEHIND THE DEPTH CAP.
//
// The row cap has a check: a component that will not fit whole is rolled back and named,
// so a partial tree cannot reach the file. The DEPTH cap had none, and for most of this
// project a container three levels down came back with no children — which reads exactly
// like a container Figma leaves empty. Templates rendered a correct outer box around a
// blank one and nothing anywhere said so.
//
// The `kids` column makes the two distinguishable, and this pins the count. It may shrink
// and not grow: a deeper walk is progress, a shallower one silently un-fills templates
// that were full. An INSTANCE is not counted — the walk stops at one on purpose, because
// that component has its own template.
const CAPPED_BASELINE = 3;
const DEPTH = 4;
const CONTAINER = new Set(['FRAME', 'GROUP', 'SLOT']);
const paths = new Map();
for (const line of tsvRows) {
  const [component, path] = line.split('\t');
  if (!paths.has(component)) paths.set(component, []);
  paths.get(component).push(path);
}
let cappedNodes = 0, partialRuns = 0; const cappedIn = new Set();
for (const line of tsvRows) {
  const c = line.split('\t');
  const [component, path, type] = c;
  const kids = Number(c[6] || 0);
  if (!CONTAINER.has(type) || !kids) continue;
  // A RUN KEPT SHORT IS NOT A GAP. Table (AG) has thirteen rows per column and the walk
  // records two, because the third says nothing the second did not. Counting those as
  // truncations would put 60-odd deliberate decisions in a number that is supposed to
  // measure what the walk COULDN'T see — and a measure that counts the wrong thing is the
  // fault this project has now found in four of its own checks.
  const shown = paths.get(component).filter(q => q !== path
    && q.startsWith(path ? path + '.' : '')
    && q.split('.').length === (path ? path.split('.').length + 1 : 1)).length;
  if (shown > 0) { if (shown < kids) partialRuns++; continue; }
  if (path.split('.').length < DEPTH) continue;
  cappedNodes++; cappedIn.add(component);
}
console.log(`  ${cappedNodes} container(s) in ${cappedIn.size} component(s) sit at the walk's `
  + `depth limit holding children it could not reach (baseline ${CAPPED_BASELINE})`
  + (cappedIn.size ? ': ' + [...cappedIn].sort().join(', ') : ''));
console.log(`  ${partialRuns} more keep a sample of a repeating run, which is deliberate`);
if (cappedNodes > CAPPED_BASELINE) {
  console.log('  FAIL  more of the tree is behind the depth cap than before — a template that '
    + 'was full is now a shell.');
  failures++;
} else if (cappedNodes < CAPPED_BASELINE) {
  console.log(`  note  down ${CAPPED_BASELINE - cappedNodes} — lower CAPPED_BASELINE to ${cappedNodes} to lock it in`);
}

// A FRAME WHOSE ONLY CHILD MEASURED ZERO MUST PACK TO THE START.
//
// `Table progress bar`'s `Bar` is `HORIZONTAL MIN CENTER` in Figma, and its only child — the
// fill — measures `0x14`, because Figma draws the component at `Completion=0%` and nowhere
// else. A zero-width child renders identically centred or start-packed, so that CENTER is
// unfalsifiable. The template carried it anyway, and a page supplying a real `width: 75%` got a
// fill floating in the middle of its track; at 15% it is a blue blob in the centre. Reported
// three times, and the first two answers were about the wrong box.
//
// The reading lives in hugs.mjs and is shared with the generator, so this is one fact read
// once. The generator marks each frame it repacked with a comment — whoever pastes the template
// needs to know the start is a READING and not Figma's word — and this asserts that every frame
// the reading names carries that comment, and that the declaration beside it is flex-start.
const packStart = unfalsifiablePacking();
const PACK_NOTE = 'packs to the START';
let packMarked = 0;
for (const key of packStart) {
  const [component] = key.split('|');
  const file = `dist/templates/${cls(component)}.html`;
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const marks = [...html.matchAll(new RegExp(`<div style="([^"]*)">(?:<!--[^>]*-->)*<!-- ${PACK_NOTE}`, 'g'))];
  if (!marks.length) {
    failures++;
    console.error(`FAIL ${file} has a frame whose only child measures zero on its packing axis, `
      + `and the template does not mark it — so nobody pasting it can tell that the start is a `
      + `reading rather than Figma's word`);
    continue;
  }
  for (const m of marks) {
    packMarked++;
    if (!/justify-content:\s*flex-start/.test(m[1]) && /justify-content:/.test(m[1])) {
      failures++;
      console.error(`FAIL ${file} marks a frame as packing to the start but does not pack it `
        + `there: ${m[1]}`);
    }
  }
}
console.log(`  ${packMarked} frame(s) whose only child measured zero on the packing axis pack to `
  + `the START and say so — a zero-wide child cannot evidence a centre`);

// A SPACE_BETWEEN FRAME THAT HUGS DISTRIBUTES NOTHING, and every template had one.
//
// Measured: **27 space-between frames across the templates and not one stated a width**, so
// `justify-content: space-between` was `flex-start` with extra words on every single one.
// `Percentage bar`'s label row is 343px in Figma holding 181px of children — the 162px of slack
// IS the layout, and pasted, the label and the percentage sat against each other.
//
// This is asserted FROM THE FILE rather than from the reading, and that is the fix to a first
// version: the reading names frames some templates legitimately do not contain (a run the walk
// collapsed, a node inside a nested instance), so "the reading names it, therefore the file must
// mark it" reported three templates that were right. What is true file-locally is the property
// that matters — no space-between frame may be without a width.
//
// The companion reading is `collapsesOnZeroChild`: a frame whose ONLY child measures zero cannot
// hug it. `Table progress bar`'s `Bar` is 208x14 in Figma and rendered 2x16, because the fill is
// `0x14` at `Completion=0%`. Whoever pasted that template got an invisible track. Both are
// marked in the markup, because the size is a READING and whoever pastes it has to see that.
let slackFrames = 0, sizeFrames = 0;
for (const f of readdirSync('dist/templates').filter(f => f.endsWith('.html'))) {
  const html = readFileSync(`dist/templates/${f}`, 'utf8');
  for (const m of html.matchAll(/<div style="([^"]*justify-content:\s*(?:safe\s+)?space-between[^"]*)">((?:<!--[^>]*-->)*)/g)) {
    slackFrames++;
    if (!/(?:^|;)width:\s*(?:\d|100%)/.test(m[1])) {
      failures++;
      console.error(`FAIL dist/templates/${f} lays a frame out with space-between and states no `
        + `width, so it hugs its children and distributes nothing — space-between with no slack `
        + `is flex-start with extra words`);
    } else if (!/states its width/.test(m[2])) {
      failures++;
      console.error(`FAIL dist/templates/${f} states a width on a space-between frame without `
        + `saying why — that width is a READING, and whoever pastes this has to see that`);
    }
  }
  for (const m of html.matchAll(/<div style="([^"]*)">((?:<!--[^>]*-->)*<!-- states its own size)/g)) {
    sizeFrames++;
    if (!/(?:^|;)(?:width|height):\s*\d/.test(m[1])) {
      failures++;
      console.error(`FAIL dist/templates/${f} marks a frame as stating its own size and states none`);
    }
  }
}
console.log(`  ${slackFrames} space-between frame(s) state a width, so the slack they distribute `
  + `exists; ${sizeFrames} state their own size because their only child measures zero`);
if (!slackFrames || !sizeFrames) {
  console.error('FAIL one of the degenerate-sample readings matched no template, so it checked nothing');
  failures++;
}


process.exit(failures ? 1 : 0);
