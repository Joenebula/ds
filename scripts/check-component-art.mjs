#!/usr/bin/env node
// Two things no other check measures.
//
// 1. Every piece of extracted artwork actually reaches the stylesheet.
// 2. The number of SHELL classes — a component class carrying no background, no
//    border, no colour and no artwork — does not grow.
//
// Why this exists: `.pf-header` was 86px of transparent nothing and every check
// passed. verify-components reads colours, verify-geometry reads boxes, and an
// empty box has correct colours (none) and a correct box. So the header got
// hand-written, and a hand-written header is where the wrong font weight and the
// flat pink band came from. A shell is not a bug in itself — a layout container
// legitimately has no paint — but a shell that should have paint is invisible to
// everything else here, so the count is pinned.
import { readFileSync } from 'node:fs';

// The count of shell classes at the time this check was written. It may go DOWN
// freely — that is the extract capturing more of each component. It may not go up
// without someone deciding to raise it, because up means a component quietly lost
// its paint.
//
// Raised 69 -> 70 on the People page walk, then CORRECTED to 2 — see below. The number
// was not measuring what it said.
//
// Raised 2 -> 5 deliberately. `Calendar picker`, `Time picker` and `Repeating group` each
// had exactly one colour: a text colour the extract had taken from ONE of their labels and
// which the class then painted on every descendant, so the calendar rendered white on
// white. The generator now drops such a colour (see its note on one child's colour recorded
// for the whole component) and the templates give each label its own. So these three lost
// their only paint — which is what this check is for noticing, and in this one case is the
// fix rather than the fault. They were invisible before and are honest now.
//
// Raised 5 -> 14, and none of the nine lost anything. The scanner below split a rule's
// selector list on commas, and a generated comment above a bare rule became part of that
// list whenever the comment contained a comma — which every SHAPE ONLY component's comment
// does ("...binds a colour variable in Figma, so the class..."). So nine classes were never
// entered in the census at all, and the check reported 5 of 14. Comments are stripped now.
// The nine are `Field icons`, `Floaters`, `Horizontal scroll`, `Map`, `Notification image`,
// `People`, `Stars`, `Tooltip` and `Waffle`: every one shape-only, carrying a measured box
// and no paint because Figma binds them no colour variable. That is a real gap in what the
// extract can reach, and it is now a number somebody can watch instead of a silence.
const SHELL_BASELINE = 14;

// COMMENTS OUT FIRST, because the rule scanner below reads everything between `}` and `{`
// as a selector list and splits it on commas — and a generated comment sentence containing
// a comma ("...binds a colour variable in Figma, so the class...") then ends up as the
// "selector", so the rule that follows it is attributed to nothing. `pf-waffle` sat outside
// this census for exactly that reason and its bare rule was never tested for paint. The
// count only moved when an unrelated change happened to put a `}` immediately before it.
// That is the third time this check has been found counting the wrong set.
const css = readFileSync('dist/components.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
let failures = 0;

// ---- 1. artwork reaches the stylesheet --------------------------------------
const [head, ...artRows] = readFileSync('tokens/_raw/component-art.tsv', 'utf8').trim().split('\n');
const cols = head.split('\t');
let artChecked = 0;
for (const line of artRows) {
  const r = Object.fromEntries(line.split('\t').map((v, i) => [cols[i], v]));
  const bytes = readFileSync(`assets/component-art/${r.file}`);
  const head64 = bytes.toString('base64').slice(0, 64);
  if (!css.includes(head64)) {
    console.log(`  FAIL  ${r.component} / ${r.variant} — artwork extracted but not in the stylesheet`);
    failures++;
  }
  artChecked++;
}

// ---- 2. shell census ---------------------------------------------------------
//
// Does any rule anywhere paint this class? Answered by parsing the rules and reading each
// selector.
//
// THE OLD CENSUS WAS COUNTING RULES, NOT CLASSES, AND ITS ANSWER WAS BACKWARDS. It walked
// every bare `.pf-x { }` rule and logged one as a shell if that rule's own body had no
// paint. The generator emits each component TWICE at the bare class — once for geometry,
// once for colour — so a component with a perfectly good background had its geometry rule
// counted as a shell. The escape hatch, "paint arrives on a later, more specific rule",
// only looked for a VARIANT selector (`^\.name\[`), so it never saw the second bare rule
// where the colour actually is.
//
// The result: `69` was, near enough, a count of the components that DO have paint. Tool
// tip has `background: var(--pf-bg-tertiary); color: var(--pf-text-primary)` and was in
// that list. The real number is 2.
//
// It surfaced because the composed type rules changed the text around those rules and the
// second, looser fallback regex — which ran across multi-selector lists and could match a
// background-image belonging to a different class in the same rule — stopped accidentally
// matching for three of them, pushing the count UP and failing the build. A census that
// can be flipped by unrelated text nearby is not measuring what it claims.
const PAINT = /(^|;|\s)(background|background-image|background-color|color|border-color|box-shadow)\s*:\s*([^;}]+)/g;
const paintedClasses = new Set();
const ruleFor = new Map();                       // class -> its own bare rule body
for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  const selectors = m[1].split(',').map(s => s.trim()).filter(Boolean);
  let paints = false;
  for (const d of m[2].matchAll(PAINT)) {
    const value = d[3].trim();
    // `background: transparent`, `border-color: transparent` and `border: 0` are the
    // generator's UA reset, not paint.
    if (value === 'transparent' || value === 'none' || value === '0') continue;
    paints = true;
  }
  for (const sel of selectors) {
    const c = /^\.(pf-[a-z0-9-]+)/.exec(sel);
    if (!c) continue;
    if (sel === '.' + c[1]) ruleFor.set(c[1], m[2]);
    if (paints) paintedClasses.add(c[1]);
  }
}
const shells = [...ruleFor.keys()].filter(name => !paintedClasses.has(name)).sort();

console.log(`${artChecked} artwork bindings reach dist/components.css`);
console.log(`${shells.length} shell classes (baseline ${SHELL_BASELINE}) — a class with no paint of any kind`);
if (shells.length && shells.length <= SHELL_BASELINE)
  console.log(`        ${shells.join(', ')}`);
if (shells.length > SHELL_BASELINE) {
  console.log('  FAIL  shell count went UP. A component lost its paint:');
  for (const s of shells) console.log('        ' + s);
  failures++;
} else if (shells.length < SHELL_BASELINE) {
  console.log(`  note  down ${SHELL_BASELINE - shells.length} from baseline — lower SHELL_BASELINE to ${shells.length} to lock it in`);
}

process.exit(failures ? 1 : 0);
