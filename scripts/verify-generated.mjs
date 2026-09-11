#!/usr/bin/env node
// Is every GENERATED file that somebody reads still what its source builds to?
//
//   node scripts/verify-generated.mjs
//   node scripts/verify-generated.mjs --self-test
//
// WHY THIS EXISTS. `verify-built.mjs` gates `prototypes/` and nothing gated anything else.
// Commit 223f4d1 named the gap and deferred it:
//
//   "ds-bundle/ in git was the output of a bug that was fixed before its own commit landed...
//    the build ran at that moment, the TSVs were corrected, and the bundle was committed without
//    a rebuild. verify-built.mjs gates prototypes/ and nothing gates ds-bundle/ or docs/ — the
//    same F-025 in a place the gate does not reach. Rebuilt here; the gate is still missing."
//
// `ds-bundle/` has since been deleted: it had no reader anywhere. These four DO have readers, and
// that is the whole reason they are the ones gated:
//
//   docs/components.html                     CLAUDE.md tells people to open it rather than guess
//                                            whether a class exists
//   reference/index.html                     the token reference
//   .claude/skills/.../references/variants.md the people-first SKILL loads it — 139 components
//   .claude/skills/.../references/geometry.md the people-first SKILL loads it — the shapes
//
// A stale file here is worse than a stale preview page: the skill quotes it as fact, and a
// designer reading the gallery takes it for the library. Both would be confidently wrong.
//
// REBUILD AND COMPARE BYTES, DO NOT TRUST MTIME. Same reasoning verify-built.mjs already carries:
// mtime does not survive a clone, and content is what the readers read. Each builder takes an
// optional output path, so this rebuilds into a temp directory and never touches the real file —
// a check that writes is not a check.
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { compare } from './verify-built.mjs';

// The generated files with readers, and the script that produces each.
export const GENERATED = [
  ['docs/components.html', 'scripts/build-components-gallery.mjs'],
  ['reference/index.html', 'scripts/build-reference.mjs'],
  ['.claude/skills/people-first/references/variants.md', 'scripts/build-variants-ref.mjs'],
  ['.claude/skills/people-first/references/geometry.md', 'scripts/build-geometry-ref.mjs'],
];

// ---------------------------------------------------------------------------
function main() {
  const dir = mkdtempSync(join(tmpdir(), 'pf-generated-'));
  let stale = 0, checked = 0, missing = 0;
  try {
    for (const [file, builder] of GENERATED) {
      if (!existsSync(file)) {
        // Not a pass. A generated file that is simply absent is the same hole as a stale one —
        // whatever reads it is reading nothing, and nothing here measured that.
        console.log(`  --   ${file} — NOT PRESENT, so nothing was measured`);
        missing++;
        continue;
      }
      const out = join(dir, `${checked}-${basename(file)}`);
      try {
        execFileSync('node', [builder, out], { encoding: 'utf8', stdio: 'pipe' });
      } catch (e) {
        console.log(((e.stdout || '') + (e.stderr || '')).trim());
        console.log(`  FAIL ${file} — ${builder} does not run, so the file cannot be reproduced`);
        stale++;
        continue;
      }
      checked++;
      const r = compare(readFileSync(file, 'utf8'), readFileSync(out, 'utf8'));
      if (!r.stale) { console.log(`  ok   ${file}`); continue; }
      stale++;
      console.log(`  FAIL ${file} — committed copy is not what ${builder} builds`);
      for (const p of r.problems) console.log(`    ${p}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  console.log(`\n${checked} generated file(s) rebuilt and compared, ${stale} stale`
    + (missing ? `, ${missing} NOT PRESENT (not a pass)` : ''));
  if (stale) console.log('run npm run build — until then, whatever reads these is reading the old one');
  if (!checked) { console.log('nothing measured — generated files NOT MEASURED'); process.exit(2); }
  process.exit(stale || missing ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {
  let f = 0;
  const miss = (m) => { f++; console.log(`  MISS ${m}`); };

  // compare() is verify-built.mjs's, already mutation-proved there. What THIS file has to get
  // right is its own list: every entry must name a file that exists and a builder that exists,
  // or the gate silently covers less than it claims to.
  if (!GENERATED.length) miss('the list must not be empty — a gate over nothing is not a gate');
  for (const [file, builder] of GENERATED) {
    if (!existsSync(builder)) miss(`${builder} is listed but does not exist`);
    if (!existsSync(file)) miss(`${file} is listed but does not exist`);
  }

  // And the thing that would make all of the above worthless: every builder must actually honour
  // an output argument. If one ignores it and writes to its default path, this check would
  // compare a file against ITSELF and pass for ever — the exact shape of "a mechanism that
  // cannot distinguish two states reports the wrong one confidently".
  const dir = mkdtempSync(join(tmpdir(), 'pf-generated-selftest-'));
  try {
    for (const [file, builder] of GENERATED) {
      const out = join(dir, `probe-${basename(file)}`);
      try { execFileSync('node', [builder, out], { encoding: 'utf8', stdio: 'pipe' }); }
      catch (e) { miss(`${builder} does not run: ${(e.stderr || '').trim().split('\n')[0]}`); continue; }
      if (!existsSync(out)) {
        miss(`${builder} IGNORES its output argument and wrote to its default path — this gate `
          + 'would then compare the committed file against itself and pass for ever');
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }

  // compare() must still be able to say no. A gate whose comparison always passes is decoration,
  // and this file's whole job is delegated to it.
  if (compare('a\nb\n', 'a\nb\n').stale !== false) miss('identical content must compare as fresh');
  if (compare('a\nb\n', 'a\nc\n').stale !== true) miss('differing content must compare as STALE');
  if (!compare('a\n', 'a\nb\n').problems.length) miss('an added line must be reported, not just counted');

  if (f) { console.log(`self-test FAILED — ${f} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — every gated file and its builder exist, every builder honours '
    + 'the output argument rather than writing to its default (which would compare a file against '
    + 'itself and pass for ever), and the byte comparison can still say no');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
