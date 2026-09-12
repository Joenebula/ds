#!/usr/bin/env node
// Builds EVERY prototypes/*.src.html into its sibling .html.
//
//   node scripts/build-prototypes.mjs
//
// WHY THIS EXISTS. `npm run build` built the tokens, the components, the type, the fonts,
// the avatars, the reference and the gallery — everything except the seven screens that
// consume them. Each screen was built by hand, one `node scripts/build-prototype.mjs
// <src> <out>` at a time, whenever someone remembered.
//
// So editing a .src.html and running `npm run build && npm run verify` checked the
// PREVIOUS build. It was found by mutating a title to "Case escalated", running the
// build, and watching verify-content report `0 invented` — because the string never
// reached the file it reads. The mutation test that is supposed to prove a check can fail
// had itself become vacuous, and it was measuring staleness, not the check.
//
// Screens are discovered from the directory, exactly as verify-screens.mjs discovers
// them, so a new one is built the moment it exists rather than when someone adds a line.
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// EVERY DIRECTORY verify-screens CHECKS, which is the whole point of the paragraph above and was
// briefly untrue: the 2026-09-12 merge brought in `working/`, whose screens were still built one
// at a time by hand. The first full build after the merge changed dist/ and both of them went
// stale immediately — `verify-built` caught it, which is what that gate is for, but the fix is
// here rather than in a habit.
const DIRS = ['working', 'prototypes'].filter((d) => existsSync(d));
const jobs = DIRS.flatMap((dir) =>
  readdirSync(dir).filter((f) => f.endsWith('.src.html')).sort().map((src) => ({ dir, src })));
if (!jobs.length) { console.error('no *.src.html to build in ' + DIRS.join(', ')); process.exit(1); }

let failed = 0;
for (const { dir, src } of jobs) {
  const out = src.replace(/\.src\.html$/, '.html');
  try {
    execFileSync('node', ['scripts/build-prototype.mjs', `${dir}/${src}`, `${dir}/${out}`],
      { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.log(`FAILED  ${src}`);
    for (const line of ((e.stdout || '') + (e.stderr || '')).trim().split('\n')) {
      if (line.trim()) console.log(`          ${line}`);
    }
  }
}

console.log(`${jobs.length - failed} of ${jobs.length} screen(s) built across ${DIRS.join(', ')}`);
process.exit(failed ? 1 : 0);
