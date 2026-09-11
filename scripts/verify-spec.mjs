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
  ['1', 'Open Sans is not installed — fc-match falls back',
    () => /DejaVu/.test(sh('fc-match "Open Sans"'))],
  ['1', 'weight 600 has no SemiBold face and snaps to Bold',
    () => /Bold/.test(sh('fc-match "Open Sans:weight=demibold"'))],
  ['1', 'no @font-face in the built page',
    () => count('working/case-mgmt-my-team.html', /@font-face/g) === 0],
  ['1', 'the repo ships no font file',
    () => sh('find . -iname "*.woff*" -o -iname "*.ttf" | grep -v node_modules').trim() === ''],
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

let open = 0, fixed = 0;
for (const [fault, claim, test] of claims) {
  const stillTrue = test();
  if (stillTrue) { open++; console.log(`  OPEN   fault ${fault}  ${claim}`); }
  else { fixed++; console.log(`  FIXED  fault ${fault}  ${claim} — update the spec`); }
}
console.log(`\n${open} of ${claims.length} spec claims still hold; ${fixed} no longer apply.`);
