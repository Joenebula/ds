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
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dir = 'prototypes';
const srcs = readdirSync(dir).filter((f) => f.endsWith('.src.html')).sort();
if (!srcs.length) { console.error('no prototypes/*.src.html to build'); process.exit(1); }

let failed = 0;
for (const src of srcs) {
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

console.log(`${srcs.length - failed} of ${srcs.length} prototype screen(s) built`);
process.exit(failed ? 1 : 0);
