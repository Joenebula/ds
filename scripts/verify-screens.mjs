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
  // FIRST, and a gate rather than one axis among nine. Every other check reads the built
  // .html; if that file is not what its .src.html builds to, all eight are describing a
  // page that no longer exists. Found by mutating a stage title, running `npm run build`,
  // and watching verify-content report `0 invented` — the string had never reached the
  // file it reads. See F-025.
  ['built', 'scripts/verify-built.mjs'],
  ['geometry', 'scripts/verify-geometry.mjs'],
  ['colour', 'scripts/verify-rendered.mjs'],
  ['icons', 'scripts/check-icon-fidelity.mjs'],
  ['audit', 'scripts/pf-audit.mjs'],
  ['fonts', 'scripts/verify-fonts.mjs'],
  // Do things that should line up actually line up? Compares INK, not boxes.
  ['layout', 'scripts/verify-layout.mjs'],
  // Can the element be SEEN at all — is anything cut off or escaping its container? Both
  // branches wrote a `verify-layout.mjs` and they ask different questions, so the merge kept
  // both and this one took a name that says what it measures. Five checks passed on a screen
  // that was slicing 126px off its own table.
  ['clipped', 'scripts/verify-clipped.mjs'],
  ['frame', 'scripts/verify-frame.mjs'],
  ['content', 'scripts/verify-content.mjs'],
  // Every design-system element must be addressable by name, or the screen cannot be
  // handed to a developer or a pipeline that assigns elements by name.
  ['tagging', 'scripts/tag-elements.mjs'],
  // "as long as there is an image when one is required" — the user, in one line, naming an
  // axis nothing measured. dist/avatars.css degrades a missing photograph to a monogram,
  // which is a good failure mode and an invisible one. See F-026.
  ['images', 'scripts/verify-images.mjs'],
  // Is the design being copied self-consistent? A Figma frame fixed shorter than its own
  // contents clips the rest, and a clipped frame looks exactly like a screen that ends there —
  // so the build inherits whichever height it was handed. The house rule is that frames show
  // the full screen; this is the rule with a detector behind it. See F-028.
  ['source', 'scripts/check-frame-clip.mjs'],
];

// Exit 2 means VACUOUS — the check ran and measured nothing (no saved Figma extract,
// no component on the page). That is neither a pass nor a failure, and collapsing it
// into either is how this repo has twice shipped a check that could not see the thing
// it was pointed at. It gets its own mark and its own tally.
let failed = 0, unmeasured = 0, stale = 0;
for (const screen of screens) {
  const path = screen;
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

    // A stale page makes every later mark meaningless — green on the wrong file reads
    // exactly like green on the right one. Say so instead of printing eight of them.
    if (name === 'built' && code === 1) {
      stale++;
      for (const [skipped] of CHECKS.slice(1)) {
        console.log(`  ---- ${skipped.padEnd(9)} not run — the built page is stale`);
      }
      break;
    }
  }
}

console.log(`\n${screens.length} screens checked, ${failed} check failure(s), `
  + `${unmeasured} check(s) not measured`);
if (unmeasured) {
  console.log('a "--" is a check that measured nothing — it is not a pass');
}
if (stale) {
  console.log(`${stale} screen(s) are not what their source builds to — run \`npm run build\`. `
    + 'Until then nothing on those screens has been measured, whatever the marks say.');
}
process.exit(failed ? 1 : 0);
