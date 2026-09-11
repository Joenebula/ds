#!/usr/bin/env node
// Generates dist/type.css — a class per Figma text style.
//
//   node scripts/build-type-css.mjs
//
// Before this, every screen hand-wrote font-size, font-weight and letter-spacing, which
// is hand-written component CSS by another name and drifts from Figma the same way.
//
//   <h1 class="pf-text-xl-heading">Absence requests</h1>
//   <span class="pf-text-label">Return-to-work date</span>
//
// Names drop Figma's "Desktop text/" prefix, since desktop is the default; the mobile
// ramp keeps its prefix because it is a genuinely different set of sizes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [header, ...lines] = readFileSync('tokens/_raw/text-styles.tsv', 'utf8').trim().split('\n');
const keys = header.split('\t');
const styles = lines.map(l => Object.fromEntries(l.split('\t').map((v, i) => [keys[i], v ?? ''])));

// Open Sans weights. The system's stated rule is 400 and 600 only; Light and Medium exist
// in the text styles but no shipping component uses them, so they are emitted with a
// warning comment rather than silently blessed.
const WEIGHT = { Light: '300', Regular: '400', Medium: '500', SemiBold: '600', Bold: '700' };
const OFF_RAMP = new Set(['Light', 'Medium', 'Bold']);

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const className = (s) => {
  let n = s.name.replace(/^Desktop text\//, '').replace(/^Mobile text\//, 'mobile ');
  n = n.replace(/\(semi bold, 600\)/i, 'semibold').replace(/\(bold\)/i, 'semibold')
       .replace(/\(light\)/i, 'light').replace(/\(italic\)/i, 'italic')
       .replace(/\(uppercase\)/i, 'uppercase');
  // The two styles Figma both calls "Button text" differ only by size and case.
  if (/button text/i.test(n) && s.textCase === 'UPPER') n = 'button text uppercase';
  return 'pf-text-' + kebab(n);
};

const out = [];
out.push('/* People First — type classes, generated from the Figma text styles.');
out.push(' *');
out.push(' * DO NOT EDIT. Regenerate with: npm run build');
out.push(' * Source: tokens/_raw/text-styles.tsv (read from Figma).');
out.push(' *');
out.push(' *   <h1 class="pf-text-xl-heading">Absence requests</h1>');
out.push(' *   <span class="pf-text-label">Return-to-work date</span>');
out.push(' *');
out.push(' * Colour is NOT set here — pair a type class with a --pf-text-* token, so the');
out.push(' * same size can be primary, secondary or negative text.');
out.push(' *');
out.push(' * LINE HEIGHT: every one of the 23 styles is set to Figma\'s automatic line');
out.push(' * height, so `normal` is the faithful value and is what these classes emit.');
out.push(' * Any specific line-height on a People First screen is an invention, not a');
out.push(' * Figma value — this was being hand-written on screens before it was checked.');
out.push(' */');
out.push('');

const seen = new Map();
let count = 0, noWeight = [];
for (const s of styles) {
  let cls = className(s);
  // Guard against two styles kebabbing to the same class rather than silently
  // overwriting one with the other.
  const n = (seen.get(cls) || 0) + 1;
  seen.set(cls, n);
  if (n > 1) cls = `${cls}-${n}`;

  const d = [];
  d.push(`font-size: ${s.size}px`);
  if (s.weight) {
    d.push(`font-weight: ${WEIGHT[s.weight] || '400'}`);
    if (s.weight === 'Italic') { d.pop(); d.push('font-weight: 400', 'font-style: italic'); }
  } else {
    // Figma records no weight on ten styles. Emitting nothing does NOT mean "inherit the
    // design system's default" — it means the browser's UA stylesheet decides, and on an
    // <h2> that is 700. Open Sans here ships 400 and 600 only, so 700 was synthesised:
    // `.pf-text-sub-heading` on a heading rendered a weight the design system does not
    // have, and no check could see it.
    //
    // 400 is not a guess. Every unweighted style has a "(semi bold, 600)" sibling —
    // `Sub heading` next to `Sub heading (semi bold, 600)`, `Label text` next to
    // `Label text (semibold)`. The pair only makes sense if the plain one is Regular.
    d.push('font-weight: 400');
    noWeight.push(s.name);
  }
  const ls = parseFloat(s.letterSpacing);
  if (Number.isFinite(ls) && ls !== 0) d.push(`letter-spacing: ${ls / 100}em`);
  if (s.textCase === 'UPPER') d.push('text-transform: uppercase');
  d.push('line-height: normal');
  d.push('font-family: var(--pf-font-body)');

  out.push(`/* ${s.name}${s.weight ? '' : '  — NO WEIGHT SET IN FIGMA; 400 emitted, see the note in the generator'}${
    OFF_RAMP.has(s.weight) ? `  — ${s.weight} is outside the system's stated 400/600 weights` : ''} */`);
  out.push(`.${cls} {`);
  for (const x of d) out.push(`  ${x};`);
  out.push('}');
  out.push('');
  count++;
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/type.css', out.join('\n'));
console.log(`type.css written — ${count} type classes`);
console.log(`  line height    : normal on all (Figma uses automatic throughout)`);
if (noWeight.length) console.log(`  no weight in Figma: ${noWeight.length} (400 emitted; see the generator note)`);
