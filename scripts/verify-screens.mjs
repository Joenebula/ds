#!/usr/bin/env node
// Runs the per-page checks against EVERY built prototype, not one named favourite.
//
//   node scripts/verify-screens.mjs
//
// This exists because payroll-run-summary.html sat in the repo scoring 4 of 13 geometry
// checks and nothing noticed: npm run verify only ever named the absence screen. A check
// is only as good as what it is pointed at, and a screen no check covers drifts silently.
//
// Screens are discovered from the directory rather than listed here, so a new one is
// covered the moment it exists rather than when someone remembers to add it.
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// BOTH DIRECTORIES, and `working/` matters more.
//
// This checked `prototypes/` alone for most of the project's life, which is precisely
// backwards. CLAUDE.md is explicit that the prototypes are rough test fixtures and not
// reference implementations, and that "the thing that must be correct is the other
// direction: when asked to build something FROM a Figma design, the output must match
// that design" — and the pages that do that live in `working/`. So the six axes ran in
// full against the pages that are allowed to be wrong, and never once against the page
// that is not. Pointing it at `working/` immediately found a shape check that could not
// run anywhere but the screen it was written for, and 35 untagged elements on the page
// built from Figma.
const DIRS = ['working', 'prototypes'];
const screens = DIRS.flatMap(d => !existsSync(d) ? [] : readdirSync(d)
  .filter(f => f.endsWith('.html') && !f.endsWith('.src.html'))
  .sort()
  .map(f => `${d}/${f}`));

if (!screens.length) { console.error('no built screens in working/ or prototypes/'); process.exit(1); }

const CHECKS = [
  ['geometry', 'scripts/verify-geometry.mjs'],
  ['colour', 'scripts/verify-rendered.mjs'],
  ['icons', 'scripts/check-icon-fidelity.mjs'],
  ['audit', 'scripts/pf-audit.mjs'],
  // Every design-system element must be addressable by name, or the screen cannot be
  // handed to a developer or a pipeline that assigns elements by name.
  ['tagging', 'scripts/tag-elements.mjs'],
  // The axis none of the others cover: whether an element can actually be SEEN. Every
  // check above measures an element in isolation and all five passed on a screen that
  // was slicing 126px off its own table.
  ['layout', 'scripts/verify-layout.mjs'],
];

let failed = 0;
for (const screen of screens) {
  const path = screen;
  // A built screen with no source is a stale artefact; say so rather than checking it.
  const src = path.replace(/\.html$/, '.src.html');
  const note = existsSync(src) ? '' : '  (no .src.html — built by hand?)';
  console.log(`\n=== ${screen}${note} ===`);
  for (const [name, script] of CHECKS) {
    let out = '', ok = true;
    try {
      out = execFileSync('node', [script, path], { encoding: 'utf8' });
    } catch (e) {
      ok = false;
      out = (e.stdout || '') + (e.stderr || '');
    }
    // Take the last RESULT line. Indented lines are explanatory notes (pf-audit prints
    // several saying what it does not cover), and taking those instead reported a
    // check's footnote as its verdict.
    const lines = out.trim().split('\n').filter(l => l.trim() && !/^\s/.test(l));
    const last = lines.pop() || '(no output)';
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(9)} ${last}`);
    if (!ok) failed++;
  }
}

console.log(`\n${screens.length} screens checked, ${failed} check failures`);
process.exit(failed ? 1 : 0);
