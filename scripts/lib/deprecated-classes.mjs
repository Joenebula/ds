#!/usr/bin/env node
// Which component classes still ship but should not be used on new work.
//
//   node scripts/lib/deprecated-classes.mjs --self-test
//
// One reader, three consumers: the stylesheet writes the notice into the class's own comment
// block, the gallery marks the swatch, and the skill reference marks the table. A page author
// reads one of those three and never all of them, so a deprecation that appears in only one
// is a deprecation half the readers never see.
//
// IT IS ONE READER BECAUSE IT WAS BRIEFLY TWO. The first version of this shipped as a lib the
// gallery and the skill reference imported, while build-components-css.mjs kept its own inline
// copy of the same five lines — so a change to the parse would have reached two of the three
// consumers and the third would have gone on producing the old answer, silently. That is the
// hand-copied-rule failure this repo has already found in the Figma driver, reintroduced in the
// same week by the same person.
import { readFileSync, existsSync } from 'node:fs';

export const DEPRECATED_PATH = 'tokens/_raw/deprecated-classes.tsv';

export function parseDeprecated(text) {
  const out = new Map();
  for (const line of String(text).split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [component, supersededBy, nodeId, decided, decidedBy, why] = line.split('\t');
    out.set(component, { supersededBy, nodeId, decided, decidedBy, why });
  }
  return out;
}

export function readDeprecated(path = DEPRECATED_PATH) {
  if (!existsSync(path)) return new Map();
  return parseDeprecated(readFileSync(path, 'utf8'));
}

// BOTH ENDS MUST BE REAL. A notice pointing at a class that does not exist is worse than no
// notice: it sends a page author to a class they cannot use, and it does it with the authority
// of a generated file. `known` is the build's own set of components that have rules, which is
// why this takes it as an argument rather than reading anything itself.
export function validateDeprecated(deprecated, known) {
  const problems = [];
  for (const [component, d] of deprecated) {
    for (const [what, name] of [['component', component], ['supersededBy', d && d.supersededBy]]) {
      if (!known.has(name)) {
        problems.push(`deprecated-classes.tsv: ${what} "${name}" has no rules in this build — a `
          + 'deprecation notice pointing at a class that does not exist is worse than none');
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
function selfTest() {
  let miss = 0;
  const bad = (name, why) => { miss++; console.log(`  MISS  ${name}: ${why}`); };
  const ok = (name, cond, why) => { if (!cond) bad(name, why); };

  const row = 'Side navigation tab\tNotification tabs\t22973:20747\t2026-09-12\tdesign lead\tbecause';
  const p = parseDeprecated(`# a comment\n\n${row}\n`);
  ok('a comment and a blank line are not rows', p.size === 1, `parsed ${p.size} row(s), wanted 1`);
  ok('the columns land in the right fields',
    p.get('Side navigation tab')?.supersededBy === 'Notification tabs'
    && p.get('Side navigation tab')?.nodeId === '22973:20747'
    && p.get('Side navigation tab')?.decided === '2026-09-12',
    'a column moved');
  // The `why` is the last column and holds prose. A row whose prose contains a tab would move
  // nothing after it, since there is nothing after it — but a row SHORT of columns must not
  // silently make `supersededBy` undefined and then pass validation against a `known` set that
  // happens to contain undefined. It cannot, but the assertion says so.
  // Optional chaining is not tidiness here: without it, a parser mutated to split on the wrong
  // character makes this `.get()` return undefined and the test dies of a TypeError instead of a
  // recorded MISS. A mutant that crashes proves the test ran, not that the test can see anything.
  ok('a short row leaves supersededBy undefined, not empty-string',
    parseDeprecated('Only a name').get('Only a name')?.supersededBy === undefined
    && parseDeprecated('Only a name').has('Only a name'),
    'a short row invented a value, or the whole line was not taken as the name');

  const known = new Set(['Side navigation tab', 'Notification tabs']);
  ok('a good row raises nothing', validateDeprecated(p, known).length === 0, 'a valid row was rejected');

  const noComp = parseDeprecated('Ghost\tNotification tabs\t1:1\t2026-09-12\tx\ty');
  const r1 = validateDeprecated(noComp, known);
  ok('a deprecated component with no rules FAILS',
    r1.length === 1 && /component "Ghost"/.test(r1[0]), `got ${JSON.stringify(r1)}`);

  const noRepl = parseDeprecated('Side navigation tab\tNo such thing\t1:1\t2026-09-12\tx\ty');
  const r2 = validateDeprecated(noRepl, known);
  ok('a replacement with no rules FAILS — the half a one-sided guard would miss',
    r2.length === 1 && /supersededBy "No such thing"/.test(r2[0]), `got ${JSON.stringify(r2)}`);

  const neither = parseDeprecated('Ghost\tAlso a ghost\t1:1\t2026-09-12\tx\ty');
  ok('both ends wrong reports both', validateDeprecated(neither, known).length === 2,
    'reported fewer than both ends');

  ok('an empty declaration is not an error', validateDeprecated(new Map(), known).length === 0,
    'an empty file was treated as a problem');

  if (miss) { console.log(`self-test FAILED — ${miss} case(s)`); process.exit(1); }
  console.log('deprecated-classes: self-test passed — the parser keeps its columns and the guard '
    + 'catches a missing component, a missing replacement, and both at once');
}

if (process.argv[2] === '--self-test') selfTest();
