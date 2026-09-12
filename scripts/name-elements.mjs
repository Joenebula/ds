#!/usr/bin/env node
// Adds a data-pf-id to every design-system element in a .src.html that lacks one.
//
//   node scripts/name-elements.mjs <screen>.src.html [--write] [--redo]
//
// Naming 200 elements by hand per screen is not reasonable, and hand-typed names drift.
// A name is derived from the component and the element's own label — `Approve selected`
// on a Button becomes `button-approve-selected` — which is stable as long as the label is,
// readable to a developer, and obvious to match back to the design.
//
// Three things a derived name must never be, because each is a name a developer cannot
// use:
//
//   * SAMPLE DATA. `All 248` names a filter chip `filter-chip-all-248`, and next month
//     the count is 251 and the name is a lie. Trailing letter-free words are dropped.
//   * SVG PATH DATA. Reading 300 characters of inner HTML can stop mid-`<path d="M29.2…">`,
//     and a half-open tag survives tag-stripping — hence `button-path-d-m29-2-9-7c29-64`.
//     Icons are skipped whole and any dangling fragment is cut.
//   * A BARE NUMBER. `tags-approved-4` tells a developer nothing about which tag it is.
//     A colliding name is qualified by its nearest named ancestor first — the tag inside
//     `card-marcus-webb` becomes `card-marcus-webb-tags-approved` — and only falls back
//     to a number, reported as a collision, if that still does not separate them.
//
// Everything inside a <tbody> is one repeating template rather than N distinct elements,
// so its cells are named by position (`r2c3`) and marked data-pf-repeat: that is what an
// *ngFor consumes. An id already present is never overwritten unless --redo is passed.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
const write = process.argv.includes('--write');
const redo = process.argv.includes('--redo');
if (!file || !file.endsWith('.src.html')) {
  console.error('usage: node scripts/name-elements.mjs <screen>.src.html [--write] [--redo]'); process.exit(2);
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
if (redo) src = src.replace(/ data-pf-id="[^"]*"/g, '').replace(/ data-pf-repeat="[^"]*"/g, '');
const used = new Map();
for (const m of src.matchAll(/data-pf-id="([^"]+)"/g)) used.set(m[1], 1);

let added = 0, skipped = 0, ignored = 0, repeats = 0;
const collisions = [], qualified = [];

// Regions the screen marks as not part of itself — the variant-reference block at the
// foot of these prototypes is a specimen gallery, and naming its buttons would put six
// duplicate "button-action"s in a manifest a developer is meant to trust.
const ignoreRanges = [];
for (const m of src.matchAll(/<([a-z]+)[^>]*\bdata-pf-ignore\b[^>]*>/gi)) {
  // Depth-aware: a specimen block that nests another element of the same tag would
  // otherwise end at the first close, leaking the rest of the gallery back in.
  const tag = m[1].toLowerCase();
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = m.index + m[0].length;
  let depth = 1, end = src.length, hit;
  while ((hit = re.exec(src))) {
    depth += hit[1] ? -1 : 1;
    if (depth === 0) { end = hit.index + hit[0].length; break; }
  }
  ignoreRanges.push([m.index, end]);
}
const inIgnored = (i) => ignoreRanges.some(([a, b]) => i >= a && i <= b);

// Row and column positions inside <tbody>. A <thead> row is NOT one of these: a header
// cell has a stable label ("Employee") and deserves to be named by it.
const bodyRanges = [];
for (const m of src.matchAll(/<tbody[^>]*>[\s\S]*?<\/tbody>/gi)) bodyRanges.push([m.index, m.index + m[0].length]);
const inBody = (i) => bodyRanges.some(([a, b]) => i >= a && i < b);
const trAt = [];
for (const m of src.matchAll(/<tr\b[^>]*>/gi)) if (inBody(m.index)) trAt.push(m.index);
const rowNo = (i) => {
  const body = bodyRanges.find(([a, b]) => i >= a && i < b);
  if (!body) return 0;
  return trAt.filter(at => at >= body[0] && at < body[1] && at < i).length;
};
const colNo = (i) => {
  const start = trAt.filter(at => at < i).pop() ?? 0;
  return (src.slice(start, i).match(/<t[dh]\b/gi) || []).length + 1;
};

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

// Entities decoded BEFORE slugging. `Review request &mdash; Marcus` otherwise names the
// element `...-request-mdash`, which reads like a component nobody has heard of.
const decode = t => t
  .replace(/&(mdash|ndash|minus);/g, ' ').replace(/&(nbsp|ensp|emsp|thinsp);/g, ' ')
  .replace(/&(middot|bull|sdot);/g, ' ').replace(/&(lsquo|rsquo|apos|#39);/g, '')
  .replace(/&(ldquo|rdquo|quot);/g, '').replace(/&amp;/g, ' and ')
  .replace(/&[a-z]+;|&#\d+;/gi, ' ');

// Two kinds of trailing word carry no identity and are dropped from the END only:
//   * a word with no letters — a count, a total, a date, a currency amount. "All 248"
//     is the same chip next month when it reads "All 251". ("Over 48 hrs" keeps its 48,
//     because that 48 is not trailing.)
//   * a dangling stop-word left by the three-word cap. "Set by the" is where a sentence
//     was cut, not what the field is called; "set-by" reads as a name, "set-by-the" does not.
const STOP = new Set(['the','a','an','to','of','on','in','at','by','for','with','from','and','or','is','are','be','this','that','my','your','their','its','it','as','has','have']);
const dropTail = words => {
  const w = [...words];
  while (w.length > 1 && (!/[a-z]/i.test(w[w.length - 1]) || STOP.has(w[w.length - 1].toLowerCase()))) w.pop();
  return w;
};

const labelFor = (offset, whole, tag, attrs) => {
  const aria = (attrs.match(/aria-label="([^"]*)"/) || [])[1];
  let raw = aria;
  if (!raw) {
    // A generous window, because a card's own label can sit behind 900 characters of
    // inline icon path data. The three-word cap below, not the window, is what stops a
    // wrapper absorbing its whole section.
    const after = src.slice(offset + whole.length, offset + whole.length + 6000)
      .split(new RegExp(`</${tag}>`, 'i'))[0];
    raw = decode(after
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Icons carry no label, only path data. Drop them whole, truncated or not.
      .replace(/<svg[\s\S]*?(<\/svg>|$)/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      // A 400-character window can end mid-tag; the fragment is markup, not text.
      .replace(/<[^>]*$/, ' '));
  }
  const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  // A container wraps many labels; a control has one. At most three words, so a wrapper
  // cannot absorb a whole section's text into its name. Length is capped on a word
  // boundary — `...-entitlement-remaining-calculat` is a name a developer has to guess at.
  const out = dropTail(words.slice(0, 3)).join(' ');
  if (out.length <= 30) return out;
  const cut = out.slice(0, 30);
  return cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut;
};

// Walk opening AND closing tags in document order, keeping a stack, so an element that
// needs qualifying can be told what it sits inside.
const stack = [];
src = src.replace(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, (whole, slash, tag, attrs, offset) => {
  const lower = tag.toLowerCase();
  if (slash) {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === lower) { stack.length = i; break; }
    return whole;
  }
  const selfClosing = /\/$/.test(attrs.trim()) || VOID.has(lower);
  const frame = { tag: lower, id: null };
  if (!selfClosing) stack.push(frame);

  if (/\bdata-pf-id=/.test(attrs)) {
    frame.id = (attrs.match(/data-pf-id="([^"]*)"/) || [])[1] || null;
    skipped++; return whole;
  }
  const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
  const hit = cls.split(/\s+/).find(c => known.has(c));
  if (!hit) return whole;
  if (inIgnored(offset)) { ignored++; return whole; }
  const comp = hit.replace(/^pf-/, '');

  // Inside a table body, position IS the identity.
  if (/^(td|th)$/i.test(lower) && inBody(offset)) {
    const id = `${kebab(comp)}-r${rowNo(offset)}c${colNo(offset)}`;
    frame.id = id; repeats++;
    return `<${tag}${attrs} data-pf-id="${id}" data-pf-repeat="row">`;
  }
  // …as does anything nested inside such a cell.
  const cell = [...stack].reverse().find(f => f.id && /-r\d+c\d+$/.test(f.id));
  if (cell) {
    let id = `${cell.id}-${kebab(comp)}`, n = 1;
    while (used.has(id)) id = `${cell.id}-${kebab(comp)}-${++n}`;
    used.set(id, 1); frame.id = id; repeats++;
    return `<${tag}${attrs} data-pf-id="${id}" data-pf-repeat="row">`;
  }

  const label = labelFor(offset, whole, tag, attrs);
  let base = kebab(comp + (label ? '-' + label : ''));
  if (!label) {
    // No text to name it by — fall back to the variant, then to the ancestor.
    const v = (attrs.match(/data-(?!pf-id)([a-z-]+)="([^"]+)"/) || []);
    base = kebab(comp + (v[2] ? '-' + v[2] : ''));
  }

  let id = base;
  if (used.has(id)) {
    // Qualify by what it sits inside before resorting to a number — `card-marcus-webb-tags-approved`
    // is a name; `tags-approved-4` is a serial number.
    const anc = [...stack].reverse().find(f => f.id && f.id !== base);
    if (anc && !used.has(`${anc.id}-${base}`)) { id = `${anc.id}-${base}`; qualified.push(id); }
    else { collisions.push(base); let n = 1; while (used.has(id)) id = `${base}-${++n}`; }
  }
  used.set(id, 1); frame.id = id; added++;
  return `<${tag}${attrs} data-pf-id="${id}">`;
});

console.log(`already named  : ${skipped}`);
console.log(`names added    : ${added}`);
console.log(`repeating rows : ${repeats}  (named by position, marked data-pf-repeat)`);
console.log(`ignored        : ${ignored}  (inside a data-pf-ignore region)`);
if (qualified.length) console.log(`qualified      : ${qualified.length}  (named by what they sit inside, not a number)`);
if (collisions.length) {
  console.log(`\nCOLLISIONS (${collisions.length}) — these got a numeric suffix; rename them to something`);
  console.log('meaningful, because a number tells a developer nothing:');
  for (const c of [...new Set(collisions)]) console.log(`    ${c}`);
}
if (write) { writeFileSync(file, src); console.log(`\nwritten — ${file}`); }
else console.log('\ndry run — pass --write to apply');
