#!/usr/bin/env node
// Adds a data-pf-id to every design-system element in a .src.html that lacks one.
//
//   node scripts/name-elements.mjs <screen>.src.html [--write]
//
// Naming 113 elements by hand per screen is not reasonable, and hand-typed names drift.
// A name is derived from the component and the element's own label — `Approve selected`
// on a Button becomes `button-approve-selected` — which is stable as long as the label is,
// readable to a developer, and obvious to match back to the design.
//
// Where a derived name would collide, BOTH get a numeric suffix and the collision is
// reported: two things with the same name is precisely the failure this is meant to
// prevent, so it is surfaced rather than silently resolved. Edit either to something
// meaningful and re-run; an id already present is never overwritten.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const write = process.argv.includes('--write');
if (!file || !file.endsWith('.src.html')) {
  console.error('usage: node scripts/name-elements.mjs <screen>.src.html [--write]'); process.exit(2);
}

const [h, ...rows] = readFileSync('tokens/_raw/component-variants.tsv', 'utf8').trim().split('\n');
const keys = h.split('\t');
const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const known = new Set();
for (const r of rows) {
  const o = Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? '']));
  known.add('pf-' + kebab(o.component));
}

let src = readFileSync(file, 'utf8');
const used = new Map();
for (const m of src.matchAll(/data-pf-id="([^"]+)"/g)) used.set(m[1], 1);

let added = 0, skipped = 0, ignored = 0, repeats = 0;
const collisions = [];

// Regions the screen marks as not part of itself — the variant-reference block at the
// foot of these prototypes is a specimen gallery, and naming its buttons would put six
// duplicate "button-action"s in a manifest a developer is meant to trust.
const ignoreRanges = [];
for (const m of src.matchAll(/<([a-z]+)[^>]*\bdata-pf-ignore\b[^>]*>/gi)) {
  const close = src.indexOf(`</${m[1]}`, m.index + m[0].length);
  ignoreRanges.push([m.index, close < 0 ? src.length : close]);
}
const inIgnored = (i) => ignoreRanges.some(([a, b]) => i >= a && i <= b);

// Rows of a data table are one repeating template, not N distinct elements. An Angular
// pipeline wants the template once and an ngFor, so cells are named by their position
// rather than fought over: r2c3 is honest about what it is.
const rowIndex = [];
let rn = 0;
for (const m of src.matchAll(/<tbody[^>]*>|<tr\b[^>]*>|<\/tbody>/gi)) {
  if (/^<tbody/i.test(m[0])) rn = 0;
  else if (/^<tr/i.test(m[0])) rowIndex.push([m.index, ++rn]);
}
const rowAt = (i) => { let r = 0; for (const [at, n] of rowIndex) if (at < i) r = n; return r; };

// Walk opening tags in document order. Only tags carrying a known pf- class are touched.
src = src.replace(/<([a-z][a-z0-9]*)\b([^>]*)>/gi, (whole, tag, attrs, offset) => {
  if (/\bdata-pf-id=/.test(attrs)) { skipped++; return whole; }
  const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
  const hit = cls.split(/\s+/).find(c => known.has(c));
  if (!hit) return whole;
  if (inIgnored(offset)) { ignored++; return whole; }

  // The label. Use the match's OFFSET, not indexOf — seven sidebar links share an
  // identical opening tag, and indexOf gave all of them the first one's text.
  // Prefer an explicit aria-label: it is what the element is called, and a container's
  // raw text run is every label it happens to wrap.
  const aria = (attrs.match(/aria-label="([^"]*)"/) || [])[1];
  // (decode is defined just below and used for both)
  const after = src.slice(offset + whole.length, offset + whole.length + 300);
  // Decode entities BEFORE slugging. `Review request &mdash; Marcus` otherwise names the
  // element `...-request-mdash`, which reads like a component nobody has heard of.
  const decode = t => t
    .replace(/&(mdash|ndash|minus);/g, ' ').replace(/&(nbsp|ensp|emsp|thinsp);/g, ' ')
    .replace(/&(middot|bull|sdot);/g, ' ').replace(/&(lsquo|rsquo|apos|#39);/g, '')
    .replace(/&(ldquo|rdquo|quot);/g, '').replace(/&amp;/g, ' and ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
  const inner = decode(after.split(new RegExp(`</${tag}>`, 'i'))[0]
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ').trim();
  // A container wraps many labels; a control has one. Take at most three words, so a
  // wrapper cannot absorb the whole section's text into its name.
  const label = (aria || inner).split(' ').slice(0, 3).join(' ').slice(0, 30);

  let base = kebab(hit.replace(/^pf-/, '') + (label ? '-' + label : ''));
  if (!label) {
    // No text to name it by — fall back to the variant, then to a counter.
    const v = (attrs.match(/data-(?!pf-id)([a-z-]+)="([^"]+)"/) || []);
    base = kebab(hit.replace(/^pf-/, '') + (v[2] ? '-' + v[2] : ''));
  }
  // Inside a table body, position IS the identity.
  const row = /^(td|th)$/i.test(tag) ? rowAt(offset) : 0;
  if (row > 1) {
    let col = 1;
    const before = src.slice(rowIndex.filter(([at]) => at < offset).pop()?.[0] ?? 0, offset);
    col = (before.match(/<t[dh]\b/gi) || []).length + 1;
    repeats++;
    return `<${tag}${attrs} data-pf-id="${kebab(hit.replace(/^pf-/, ''))}-r${row}c${col}" data-pf-repeat="row">`;
  }

  let id = base, n = 1;
  if (used.has(id)) { collisions.push(id); while (used.has(id)) id = `${base}-${++n}`; }
  used.set(id, 1);
  added++;
  return `<${tag}${attrs} data-pf-id="${id}">`;
});

console.log(`already named  : ${skipped}`);
console.log(`names added    : ${added}`);
console.log(`repeating rows : ${repeats}  (named by position, marked data-pf-repeat)`);
console.log(`ignored        : ${ignored}  (inside a data-pf-ignore region)`);
if (collisions.length) {
  console.log(`\nCOLLISIONS (${collisions.length}) — these got a numeric suffix; rename them to something`);
  console.log('meaningful, because a number tells a developer nothing:');
  for (const c of [...new Set(collisions)]) console.log(`    ${c}`);
}
if (write) { writeFileSync(file, src); console.log(`\nwritten — ${file}`); }
else console.log('\ndry run — pass --write to apply');
