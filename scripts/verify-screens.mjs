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

const dir = 'prototypes';
const screens = readdirSync(dir)
  .filter(f => f.endsWith('.html') && !f.endsWith('.src.html'))
  .sort();

if (!screens.length) { console.error('no built screens in prototypes/'); process.exit(1); }

const CHECKS = [
  ['geometry', 'scripts/verify-geometry.mjs'],
  ['colour', 'scripts/verify-rendered.mjs'],
  ['icons', 'scripts/check-icon-fidelity.mjs'],
  ['audit', 'scripts/pf-audit.mjs'],
  ['fonts', 'scripts/verify-fonts.mjs'],
  ['layout', 'scripts/verify-layout.mjs'],
  ['content', 'scripts/verify-content.mjs'],
];

// Exit 2 means VACUOUS — the check ran and measured nothing (no saved Figma extract,
// no component on the page). That is neither a pass nor a failure, and collapsing it
// into either is how this repo has twice shipped a check that could not see the thing
// it was pointed at. It gets its own mark and its own tally.
let failed = 0, unmeasured = 0;
for (const screen of screens) {
  const path = `${dir}/${screen}`;
  // A built screen with no source is a stale artefact; say so rather than checking it.
  const src = path.replace(/\.html$/, '.src.html');
  const note = existsSync(src) ? '' : '  (no .src.html — built by hand?)';
  console.log(`\n=== ${screen}${note} ===`);
  for (const [name, script] of CHECKS) {
    let out = '', code = 0;
    try {
      out = execFileSync('node', [script, path], { encoding: 'utf8' });
    } catch (e) {
      code = e.status ?? 1;
      out = (e.stdout || '') + (e.stderr || '');
    }
    // Take the last RESULT line. Indented lines are explanatory notes (pf-audit prints
    // several saying what it does not cover), and taking those instead reported a
    // check's footnote as its verdict.
    const lines = out.trim().split('\n').filter(l => l.trim() && !/^\s/.test(l));
    const last = lines.pop() || '(no output)';
    const mark = code === 0 ? 'ok  ' : code === 2 ? '--  ' : 'FAIL';
    console.log(`  ${mark} ${name.padEnd(9)} ${last}`);
    if (code === 2) unmeasured++; else if (code !== 0) failed++;
  }
}

console.log(`\n${screens.length} screens checked, ${failed} check failure(s), `
  + `${unmeasured} check(s) not measured`);
if (unmeasured) {
  console.log('a "--" is a check that measured nothing — it is not a pass');
}
process.exit(failed ? 1 : 0);
