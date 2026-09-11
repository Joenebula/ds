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
const realChildren = new Map();
for (const line of tsvRows) {
  const [component, path, type, name] = line.split('\t');
  if (!realChildren.has(component)) realChildren.set(component, 0);
  if (path && !(type === 'INSTANCE' && name === component))
    realChildren.set(component, realChildren.get(component) + 1);
}
const composite = [...realChildren.entries()].filter(([, n]) => n > 0).map(([c]) => c);

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

// "Renders something" = it has descendants that occupy space, or text. A box with a
// background and nothing in it does not count, which is the entire point.
const got = await p.evaluate(n => {
  const content = root => {
    if (!root) return 0;
    let n = 0;
    for (const el of root.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) n++;
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
  if (got[i].tpl <= got[i].bare) { emptyTemplates.push(s.component); failures++; }
}

console.log(`${specs.length} composite component(s) — a class alone cannot be any of them`);
if (missing.length) {
  console.log(`  FAIL  ${missing.length} with no template: ${missing.join(', ')}`);
  failures++;
}
if (emptyTemplates.length) {
  console.log(`  FAIL  ${emptyTemplates.length} template(s) render an empty box: ${emptyTemplates.join(', ')}`);
}
if (!failures) console.log('  every one has a template, and every template renders its contents');

const bareEmpty = specs.filter((s, i) => got[i].bare <= 1).length;
console.log(`  ${bareEmpty} of them render NOTHING from the bare class — which is why the templates exist`);

process.exit(failures ? 1 : 0);
