#!/usr/bin/env node
// Inlines dist/tokens.css, dist/components.css and dist/type.css into a prototype
// .src.html and verifies token discipline.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const src = process.argv[2], out = process.argv[3];
// Fonts first: a face declared after the rules that use it means the first paint
// borrows a fallback, and on a screenshot that IS the result.
const fonts = readFileSync('dist/fonts.css', 'utf8');
const tokens = readFileSync('dist/tokens.css', 'utf8');
const components = readFileSync('dist/components.css', 'utf8');
const type = readFileSync('dist/type.css', 'utf8');
let html = readFileSync(src, 'utf8');
if (!html.includes('/*__TOKENS__*/')) { console.error('no /*__TOKENS__*/ placeholder'); process.exit(1); }
html = html.replace('/*__TOKENS__*/', fonts + '\n' + tokens);
if (html.includes('/*__COMPONENTS__*/')) html = html.replace('/*__COMPONENTS__*/', components);
if (html.includes('/*__TYPE__*/')) html = html.replace('/*__TYPE__*/', type);

// ---- icon references -------------------------------------------------------
// Using a real Figma icon used to mean opening assets/icons/<name>.svg and pasting its
// markup by hand. That friction is what makes someone draw their own instead, which is
// the one thing the icon set exists to prevent. Write a reference instead:
//
//   <!--pf-icon:tick-->        18px, the xxs icon size
//   <!--pf-icon:export 14-->   an explicit pixel size
//
// It expands to the real file's markup at build time, so the output is still the plain
// inline SVG that check-icon-fidelity.mjs already verifies — no runtime cost, no new
// mechanism to trust. A name that does not exist FAILS the build rather than silently
// leaving a comment in the page.
const missingIcons = [];
html = html.replace(/<!--pf-icon:([a-z0-9-]+)(?:\s+(\d+))?-->/g, (m, name, size) => {
  const file = `assets/icons/${name}.svg`;
  if (!existsSync(file)) { missingIcons.push(name); return m; }
  const px = size || 18;
  return readFileSync(file, 'utf8').trim()
    .replace(/^<svg /, `<svg class="pf-icon" width="${px}" height="${px}" aria-hidden="true" focusable="false" `);
});
if (missingIcons.length) {
  console.error(`no such icon: ${[...new Set(missingIcons)].join(', ')} — see docs/icons.html`);
  process.exit(1);
}

writeFileSync(out, html);

// ---- verification ----
const defined = new Set([...tokens.matchAll(/^\s+(--pf-[a-z0-9-]+):/gm)].map(m => m[1]));
const authored = readFileSync(src, 'utf8');                 // page CSS + markup, without tokens
const used = [...authored.matchAll(/var\((--pf-[a-z0-9-]+)\)/g)].map(m => m[1]);
const undef = [...new Set(used)].filter(v => !defined.has(v));

// raw hex / rgb outside the token file
// exclude HTML numeric entities (&#9432;) — those are characters, not colours
const rawHex = [...authored.matchAll(/(^|[^&\w])#([0-9a-fA-F]{3,8})\b/g)]
  .filter(m => /^([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(m[2]))
  .map(m => '#' + m[2]);
const rawRgb = [...authored.matchAll(/\brgba?\([^)]*\)/g)].map(m => m[0]);

const iconCount = (readFileSync(src, 'utf8').match(/<!--pf-icon:/g) || []).length;
console.log(`built ${out}  (${(html.length/1024).toFixed(0)} KB)`);
console.log(`icon references  : ${iconCount} expanded from assets/icons/`);
console.log(`tokens referenced: ${new Set(used).size} distinct, ${used.length} uses`);
console.log(`undefined tokens : ${undef.length ? undef.join(', ') : 'none'}`);
console.log(`raw hex colours  : ${rawHex.length ? rawHex.join(', ') : 'none'}`);
console.log(`raw rgb colours  : ${rawRgb.length ? rawRgb.join(', ') : 'none'}`);
if (undef.length || rawHex.length || rawRgb.length) process.exit(1);
