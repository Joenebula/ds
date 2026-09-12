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
// This file used to continue "`ds-bundle/` has since been deleted: it had no reader anywhere."
// IT IS BACK. The 2026-09-12 merge restored it deliberately — the other branch's package.json
// calls its builder on every build — so the premise that closed this gap by ABSENCE is false, and
// the five ds-bundle pages have been ungated ever since, inlining dist/components.css with nothing
// comparing them to it.
//
// That mattered on 2026-09-12: `build-ds-bundle.mjs` ran at step 8 of `npm run build` and
// `build-components-css.mjs` at step 11, so every single build left those five pages carrying the
// PREVIOUS run's stylesheet. It converged only because people build more than once. Proved by
// changing one input, building once and diffing (they disagreed), then building again (they
// agreed). The order is fixed — ds-bundle now runs after both stylesheets it inlines.
//
// IT IS STILL NOT GATED, and that is named rather than quietly true: the GENERATED table below is
// `[one output file, its builder]` and invokes `node <builder> <out>`, while build-ds-bundle.mjs
// writes a whole directory it first rm -rf's. Gating it needs an out-ROOT argument and a
// directory-compare, which is a different shape from this table, not a row in it.
//
// These six DO have readers, and that is the whole reason they are the ones gated:
//
//   docs/components.html                     CLAUDE.md tells people to open it rather than guess
//                                            whether a class exists
//   reference/index.html                     the token reference
//   .claude/skills/.../references/variants.md the people-first SKILL loads it — 139 components
//   .claude/skills/.../references/geometry.md the people-first SKILL loads it — the shapes
//   docs/figma-rebind-deprecated.js          the Figma driver, with the rebind rule INLINED from
//                                            scripts/lib/rebind-rule.mjs because a plugin sandbox
//                                            cannot import — a stale copy is a fixed rule still
//                                            being run in its broken form, pasted by hand
//   docs/figma-icon-digest.js                the icon-drift collector, with the digest definition
//                                            INLINED from scripts/check-icon-drift.mjs. It was a
//                                            snippet in that file's header until the comparison
//                                            was rewritten twice under it and the snippet was not
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
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { compare } from './verify-built.mjs';

// The generated files with readers, and the script that produces each.
export const GENERATED = [
  ['docs/components.html', 'scripts/build-components-gallery.mjs'],
  ['reference/index.html', 'scripts/build-reference.mjs'],
  ['.claude/skills/people-first/references/variants.md', 'scripts/build-variants-ref.mjs'],
  ['.claude/skills/people-first/references/geometry.md', 'scripts/build-geometry-ref.mjs'],
  ['docs/figma-rebind-deprecated.js', 'scripts/build-figma-rebind.mjs'],
  ['docs/figma-icon-digest.js', 'scripts/build-figma-icon-digest.mjs'],
  ['docs/COMPONENTS.md', 'scripts/build-components-md.mjs'],
];

// Generated TREES, which the table above cannot hold: their builders write whole sets of files
// they first remove, so there is no single output path to hand them. Each takes an output ROOT and
// mirrors the repo layout beneath it, so one shape serves them all rather than each inventing its
// own — a second near-identical mechanism is the "hand-copied rule" fault in a new place.
//
// The ds-bundle pages inline dist/components.css and on 2026-09-12 were found a whole build
// behind, with nothing able to see it. The templates are worse if they rot: CLAUDE.md tells people
// to PASTE them, so a stale one is not a stale preview, it is markup somebody ships. Measured the
// same day: eight generated files were perturbed and the entire suite passed, these among them.
export const GENERATED_TREES = [
  ['scripts/build-ds-bundle.mjs', ['ds-bundle']],
  ['scripts/build-templates.mjs', ['dist/templates', 'docs/templates.html']],
];

// Every file under a path, relative to it. A FILE is a tree of one, so the same comparison serves
// `docs/templates.html` and `dist/templates/` without a second code path. Sorted, so a missing file
// and an extra one are told apart by name rather than by position.
export function treeOf(root) {
  if (!statSync(root).isDirectory()) return [''];
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p); else out.push(p);
    }
  };
  walk('');
  return out;
}

// Committed against rebuilt. A file that is EXTRA matters as much as one that differs: the builders
// remove their output first, so a leftover file on disk is one nothing generates any more, and it
// would go on being read as though it did.
export function compareTrees(committedRoot, builtRoot) {
  const a = treeOf(committedRoot), b = treeOf(builtRoot);
  const at = (root, f) => (f ? join(root, f) : root);
  const problems = [];
  for (const f of a) if (!b.includes(f)) problems.push(`EXTRA    ${f || committedRoot} — on disk, and the builder does not produce it`);
  for (const f of b) if (!a.includes(f)) problems.push(`MISSING  ${f} — the builder produces it and it is not committed`);
  for (const f of a) {
    if (!b.includes(f)) continue;
    const x = readFileSync(at(committedRoot, f)), y = readFileSync(at(builtRoot, f));
    if (!x.equals(y)) problems.push(`STALE    ${f || committedRoot} — committed copy is ${x.length} bytes, a fresh build is ${y.length}`);
  }
  return { problems, files: a.length };
}

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

    for (const [builder, paths] of GENERATED_TREES) {
      const out = join(dir, `tree-${basename(builder, '.mjs')}`);
      mkdirSync(out, { recursive: true });
      try {
        execFileSync('node', [builder, out], { encoding: 'utf8', stdio: 'pipe' });
      } catch (e) {
        console.log(((e.stdout || '') + (e.stderr || '')).trim());
        console.log(`  FAIL ${builder} does not run, so its output cannot be reproduced`);
        stale++;
        continue;
      }
      for (const path of paths) {
        if (!existsSync(path)) {
          console.log(`  --   ${path} — NOT PRESENT, so nothing was measured`);
          missing++;
          continue;
        }
        const r = compareTrees(path, join(out, path));
        checked += r.files;
        if (!r.problems.length) { console.log(`  ok   ${path}${r.files > 1 ? ` (${r.files} files)` : ''}`); continue; }
        stale++;
        console.log(`  FAIL ${path} — the committed copy is not what ${builder} builds`);
        for (const p of r.problems) console.log(`    ${p}`);
      }
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

  // THE TREE GATE. Same hazard as above, one shape out: if a tree builder ignored its root it
  // would rebuild over the committed files, and compareTrees would then compare them against
  // themselves — pass for ever, and destroy the thing it was checking on the way past.
  const dir2 = mkdtempSync(join(tmpdir(), 'pf-generated-treetest-'));
  try {
    if (!GENERATED_TREES.length) miss('the tree list must not be empty if it exists at all');
    for (const [builder, paths] of GENERATED_TREES) {
      if (!existsSync(builder)) miss(`${builder} is listed but does not exist`);
      for (const path of paths) if (!existsSync(path)) miss(`${path} is listed but does not exist`);
      const out = join(dir2, `probe-${basename(builder, '.mjs')}`);
      mkdirSync(out, { recursive: true });
      try { execFileSync('node', [builder, out], { encoding: 'utf8', stdio: 'pipe' }); }
      catch (e) { miss(`${builder} does not run: ${(e.stderr || '').trim().split('\n')[0]}`); continue; }
      for (const path of paths) {
        if (!existsSync(join(out, path))) {
          miss(`${builder} IGNORES its output root for ${path} — this gate would then compare the `
            + 'committed copy against itself, pass for ever, and overwrite it');
        }
      }
    }

    // And compareTrees itself, against fixtures: it has to see each of the three ways a tree can
    // be wrong, stay quiet when it is right, and treat a single FILE as a tree of one.
    const mk = (name, files) => {
      const r = join(dir2, name);
      for (const [f, body] of Object.entries(files)) {
        mkdirSync(join(r, f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : ''), { recursive: true });
        writeFileSync(join(r, f), body);
      }
      return r;
    };
    const file = (name, body) => { const p = join(dir2, name); writeFileSync(p, body); return p; };
    const base = mk('base', { 'a/one.html': 'ONE', 'b/two.html': 'TWO' });
    const same = mk('same', { 'a/one.html': 'ONE', 'b/two.html': 'TWO' });
    const drift = mk('drift', { 'a/one.html': 'ONE', 'b/two.html': 'CHANGED' });
    const short = mk('short', { 'a/one.html': 'ONE' });
    const extra = mk('extra', { 'a/one.html': 'ONE', 'b/two.html': 'TWO', 'c/three.html': 'THREE' });

    const cases = [
      ['an identical tree is clean', () => compareTrees(base, same).problems.length === 0],
      ['it counts the files it compared', () => compareTrees(base, same).files === 2],
      ['a changed file is STALE', () => /^STALE .*two\.html/m.test(compareTrees(base, drift).problems.join('\n'))],
      ['a file on disk the builder does not produce is EXTRA',
        () => /^EXTRA .*two\.html/m.test(compareTrees(base, short).problems.join('\n'))],
      ['a file the builder produces that is not committed is MISSING',
        () => /^MISSING .*three\.html/m.test(compareTrees(base, extra).problems.join('\n'))],
      // Byte-for-byte, not length: two files of the same size that differ must not pass.
      ['same length, different bytes is still STALE', () =>
        compareTrees(mk('x', { 'a.html': 'AAAA' }), mk('y', { 'a.html': 'BBBB' })).problems.length === 1],
      ['it walks NESTED directories rather than the top level only',
        () => treeOf(base).join() === 'a/one.html,b/two.html'],
      // A single FILE has to work through the same path, or docs/templates.html needs a second one.
      ['a single FILE that matches is clean',
        () => compareTrees(file('f1', 'SAME'), file('f2', 'SAME')).problems.length === 0],
      ['a single FILE that differs is STALE',
        () => compareTrees(file('f3', 'ONE'), file('f4', 'TWO')).problems.length === 1],
    ];
    for (const [name, fn] of cases) { let ok = false; try { ok = fn(); } catch (e) { ok = false; } if (!ok) miss(`compareTrees: ${name}`); }
  } finally { rmSync(dir2, { recursive: true, force: true }); }

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
