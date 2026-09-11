#!/usr/bin/env node
// Re-proves every claim in docs/PIPELINE-FIX-SPEC.md.
//
//   node scripts/verify-spec.mjs
//
// A spec whose evidence has gone stale is worse than no spec, because it reads as
// authoritative. This runs the same commands the document quotes. When a fault is fixed,
// its claims here SHOULD start failing — that is the signal to update the document, not a
// bug in this script.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }); } catch { return ''; } };
const count = (f, re) => (readFileSync(f, 'utf8').match(re) || []).length;

const claims = [
  // Fault 1 is fixed. The OS still has no Open Sans installed — that is true and no longer
  // relevant, because the face is embedded rather than looked up. What must stay true is
  // that the build ships it; these two assert the fix, so they FAIL if it regresses.
  ['1', 'FIX HOLDS: the build ships the typeface',
    () => count('working/case-mgmt-my-team.html', /@font-face/g) > 0],
  ['1', 'FIX HOLDS: both weights are vendored',
    () => sh('ls assets/fonts/open-sans-400.woff2 assets/fonts/open-sans-600.woff2').split('\n').filter(Boolean).length === 2],
  ['2', 'verify-components reads the same two files the build reads',
    () => ['scripts/verify-components.mjs', 'scripts/build-components-css.mjs']
      .every(f => /_raw\/component-geometry\.tsv/.test(readFileSync(f, 'utf8'))
                && /_raw\/component-variants\.tsv/.test(readFileSync(f, 'utf8')))],
  ['2', 'no script contacts Figma',
    // --exclude this file: it names those strings to test for them, and would match itself.
    () => sh('grep -ln "use_figma\\|api.figma" scripts/*.mjs --exclude=verify-spec.mjs').trim() === ''],
  ['3', 'geometry rows far fewer than variant rows',
    () => readFileSync('tokens/_raw/component-geometry.tsv', 'utf8').trim().split('\n').length
        < readFileSync('tokens/_raw/component-variants.tsv', 'utf8').trim().split('\n').length],
  ['4', 'components emit their own type rather than composing a text style',
    () => count('dist/components.css', /font-size:/g) > 100],
  ['4', 'nothing in scripts/ reads textStyleId',
    () => sh('grep -rln textStyleId scripts/ --exclude=verify-spec.mjs').trim() === ''],
];

// A claim is one of two kinds. A FAULT claim asserts something is still broken — when it
// stops being true, the fault is fixed and the spec needs updating. A FIX HOLDS claim
// asserts a completed fix is still in place — when it stops being true, something has
// regressed. Both are "the claim is true", so they are tested the same way and reported
// differently.
let held = 0, changed = 0;
for (const [fault, claim, test] of claims) {
  const isFix = claim.startsWith('FIX HOLDS: ');
  const text = claim.replace('FIX HOLDS: ', '');
  if (test()) {
    held++;
    console.log(`  ${isFix ? 'HOLDS ' : 'OPEN  '} fault ${fault}  ${text}`);
  } else {
    changed++;
    console.log(`  ${isFix ? 'BROKEN' : 'FIXED '} fault ${fault}  ${text} — ${isFix ? 'the fix has regressed' : 'update the spec'}`);
  }
}
console.log(`\n${held} of ${claims.length} verified as written; ${changed} changed.`);
process.exit(claims.some(([, c, t]) => c.startsWith('FIX HOLDS: ') && !t()) ? 1 : 0);
