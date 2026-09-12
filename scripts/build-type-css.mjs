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

// Open Sans weights. The system's stated rule is 400 and 600 only.
//
// Light, Medium and Bold EXIST in the Figma text styles and are recorded in text-styles.tsv,
// because that file's job is to say what Figma has. They are NOT emitted: the design lead ruled
// on 2026-09-11 that anything outside 400/600 comes out of the shipped stylesheet. Until then the
// build emitted them with a warning comment, which meant `font-weight: 300` shipped anyway and the
// warning was read by nobody.
//
// The class is still generated — its size, letter-spacing and case are all in-system — it simply
// declares no font-weight, so it inherits 400. The removals are COUNTED AND NAMED in the verdict
// line on every run, the same visible-debt rule as the placeholder and `pending:` counts: deleting
// the count is how a removed weight becomes a forgotten one.
const WEIGHT = { Light: '300', Regular: '400', Medium: '500', SemiBold: '600', Bold: '700' };
const OFF_RAMP = new Set(['Light', 'Medium', 'Bold']);
const offSystem = [];

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
  if (s.weight === 'Italic') {
    // Italic is a STYLE, not a weight, and sits in the weight column. It is in-system: 400 italic.
    d.push('font-weight: 400', 'font-style: italic');
  } else if (OFF_RAMP.has(s.weight)) {
    // Outside 400/600 — recorded, and NOT shipped at the weight Figma holds.
    //
    // BUT IT STILL EMITS 400, AND THAT CORRECTION CAME OUT OF THE 2026-09-12 MERGE. This branch
    // emitted nothing here and said the class "inherits 400". It does not: emitting nothing means
    // the browser's UA stylesheet decides, and on an <h2> that is 700 — a weight this system does
    // not ship, so it is SYNTHESISED, and no check could see it. The other branch had found that
    // for the no-weight case and fixed it; the same argument applies to this one, because the
    // failure is in emitting nothing rather than in which styles do it.
    offSystem.push(`${s.name} (${s.weight} ${WEIGHT[s.weight]})`);
    d.push('font-weight: 400');
  } else if (s.weight) {
    d.push(`font-weight: ${WEIGHT[s.weight] || '400'}`);
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
    OFF_RAMP.has(s.weight) ? `  — Figma says ${s.weight} (${WEIGHT[s.weight]}), OUTSIDE the system's `
      + `400/600 rule, so 400 is emitted instead` : ''} */`);
  out.push(`.${cls} {`);
  for (const x of d) out.push(`  ${x};`);
  out.push('}');
  out.push('');
  count++;
}

// THE SAME FAULT AS AN UNWEIGHTED STYLE, one layer out: `<strong>`, `<b>` and `<th>` are 700 in
// every UA stylesheet, and this system ships 400 and 600 only — so the browser SYNTHESISES a bold
// that the design system does not have. The type layer declared nothing for them, which meant the
// non-negotiable "Open Sans only, weights 400 and 600" was true of the classes and false of the
// page. Base's font check found it on all three prototypes the moment the merge put the two halves
// together. 600 is the system's bold; the token already resolves to it.
out.push('/* Plain HTML bold. The UA stylesheet says 700 and this system has 400 and 600, so without');
out.push(' * this the browser synthesises a weight the design system does not ship. See build-type-css.mjs. */');
out.push('strong, b, th {');
out.push('  font-weight: var(--pf-font-weight-bold);');
out.push('}');
out.push('');

mkdirSync('dist', { recursive: true });
writeFileSync('dist/type.css', out.join('\n'));
console.log(`type.css written — ${count} type classes`);
console.log(`  line height    : normal on all (Figma uses automatic throughout)`);
if (noWeight.length) console.log(`  no weight in Figma: ${noWeight.length} (400 emitted; see the generator note)`);
// Counted and named every run. Never delete this to tidy the output — it is the only thing keeping
// a weight removed from the stylesheet from becoming a weight nobody remembers Figma still has.
if (offSystem.length) {
  console.log(`  OUTSIDE 400/600   : ${offSystem.length} weight(s) in Figma, NOT shipped — 400 emitted instead`);
  for (const n of offSystem) console.log(`      ${n}`);
}
