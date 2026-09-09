#!/usr/bin/env node
// Inlines dist/tokens.css, dist/components.css and dist/type.css into a prototype
// .src.html and verifies token discipline.
import { readFileSync, writeFileSync } from 'node:fs';
const src = process.argv[2], out = process.argv[3];
const tokens = readFileSync('dist/tokens.css', 'utf8');
const components = readFileSync('dist/components.css', 'utf8');
const type = readFileSync('dist/type.css', 'utf8');
let html = readFileSync(src, 'utf8');
if (!html.includes('/*__TOKENS__*/')) { console.error('no /*__TOKENS__*/ placeholder'); process.exit(1); }
html = html.replace('/*__TOKENS__*/', tokens);
if (html.includes('/*__COMPONENTS__*/')) html = html.replace('/*__COMPONENTS__*/', components);
if (html.includes('/*__TYPE__*/')) html = html.replace('/*__TYPE__*/', type);
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

console.log(`built ${out}  (${(html.length/1024).toFixed(0)} KB)`);
console.log(`tokens referenced: ${new Set(used).size} distinct, ${used.length} uses`);
console.log(`undefined tokens : ${undef.length ? undef.join(', ') : 'none'}`);
console.log(`raw hex colours  : ${rawHex.length ? rawHex.join(', ') : 'none'}`);
console.log(`raw rgb colours  : ${rawRgb.length ? rawRgb.join(', ') : 'none'}`);
if (undef.length || rawHex.length || rawRgb.length) process.exit(1);
