#!/usr/bin/env node
// Is the screen the checks are about to read the screen its source builds to?
//
//   node scripts/verify-built.mjs prototypes/case-three-stages.html
//   node scripts/verify-built.mjs --self-test
//
// WHY THIS EXISTS. `npm run build` built everything except the seven screens. They were
// built by hand, one at a time, whenever someone remembered — so editing a .src.html and
// running `npm run build && npm run verify` verified the PREVIOUS build.
//
// It was found while mutation-testing: a stage title was changed to "Case escalated", the
// build was run, and verify-content reported `0 invented`. The check was not broken. The
// string had simply never reached the file it reads. Eight checks all reported green, all
// eight were correct, and every one of them was describing a file that no longer
// corresponded to its source.
//
// That is the same shape as F-020, F-021, F-022, F-023 and F-024, moved one step earlier:
// a mechanism that cannot distinguish two states reports the wrong one confidently. Here
// the two states are "this screen is current" and "this screen is yesterday's", and
// nothing in the suite could tell them apart. Every green mark in this repo's history was
// green on the file it was pointed at, and nothing checked that the file was the right one.
//
// WHY BYTES, NOT TIMESTAMPS. mtime does not survive a clone, and a fresh checkout would
// make every screen look stale or every screen look current depending on checkout order.
// Rebuilding the source and comparing the output is a question about content, and content
// is what the other checks read.
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it without a build.
export function compare(built, fresh) {
  if (built === fresh) return { stale: false, problems: [] };

  const a = built.split('\n'), b = fresh.split('\n');
  const problems = [];
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 3; i++) {
    if (a[i] === b[i]) continue;
    shown++;
    const trim = (s) => (s === undefined ? '(end of file)' : s.trim().slice(0, 90));
    problems.push(`STALE    line ${i + 1}`);
    problems.push(`           built:  ${trim(a[i])}`);
    problems.push(`           source: ${trim(b[i])}`);
  }
  if (a.length !== b.length) {
    problems.push(`STALE    the built file has ${a.length} lines, its source builds to ${b.length}`);
  }
  return { stale: true, problems };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: verify-built.mjs <built-screen.html> | --self-test'); process.exit(2); }
  if (!existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }

  const src = file.replace(/\.html$/, '.src.html');
  if (!existsSync(src)) {
    // A built screen with no source cannot be rebuilt, so it cannot be compared. That is
    // not a pass — it is a page nothing can regenerate. Vacuous, per F-019.
    console.log(`no ${src} — this screen has no source to rebuild from`);
    console.log('nothing to compare against — freshness NOT MEASURED');
    process.exit(2);
  }

  const dir = mkdtempSync(join(tmpdir(), 'pf-built-'));
  const out = join(dir, 'fresh.html');
  try {
    execFileSync('node', ['scripts/build-prototype.mjs', src, out], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    console.log(((e.stdout || '') + (e.stderr || '')).trim());
    console.log(`${src} does not build — the screen on disk cannot be reproduced`);
    process.exit(1);
  }

  const r = compare(readFileSync(file, 'utf8'), readFileSync(out, 'utf8'));
  rmSync(dir, { recursive: true, force: true });

  for (const p of r.problems) console.log(p);
  if (r.stale) {
    console.log(`\n${file} is NOT what ${src} builds to — every other check on this screen `
      + 'is measuring a stale file');
    process.exit(1);
  }
  console.log(`\n${file} is byte-identical to a fresh build of its source`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --self-test. The fixture is the real miss: a title edited in the source that never
// reached the built page, which let a mutation test report the check as passing.
function selfTest() {
  const page = (title) => [
    '<!doctype html>', '<body>',
    `  <span class="pf-text-body-text-semibold">${title}</span>`,
    '</body>',
  ].join('\n');

  const cases = [
    ['a screen built from its current source is fresh', page('Case raised'), page('Case raised'), null],
    ['the edit that never reached the page', page('Case raised'), page('Case escalated'), /STALE\s+line 3/],
    ['a line added to the source', page('Case raised'), page('Case raised') + '\n<p>new</p>', /builds to 5/],
    ['a line removed from the source', page('Case raised') + '\n<p>old</p>', page('Case raised'), /builds to 4/],
    ['whitespace-only difference is still stale', page('Case raised'), page('Case raised') + '\n', /builds to 5/],
  ];

  let failures = 0;
  for (const [name, built, fresh, want] of cases) {
    const { stale, problems } = compare(built, fresh);
    const hit = want ? (stale && problems.some((p) => want.test(p))) : !stale;
    if (!hit) {
      failures++;
      console.log(`  MISS ${name}`);
      for (const p of problems) console.log(`         ${p}`);
      if (want) console.log(`         expected a problem matching ${want}`);
    }
  }

  // The self-test must itself be able to fail. Run the same cases through a comparison that
  // always reports "fresh" — the exact bug this file exists to prevent — and require that at
  // least one case rejects it. A self-test no wrong implementation can fail is decoration.
  const alwaysFresh = () => ({ stale: false, problems: [] });
  const survives = cases.filter(([, , , want]) => want)
    .filter(([, built, fresh]) => alwaysFresh(built, fresh).stale).length;
  if (survives !== 0) {
    failures++;
    console.log('  MISS the inverted-implementation guard is not measuring anything');
  }
  const rejected = cases.filter(([, , , want]) => want).length;
  if (rejected === 0) {
    failures++;
    console.log('  MISS no case here can reject a comparison that always reports "fresh"');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught an edit that never reached the built page, '
    + 'a line added, a line removed and a whitespace-only difference, while calling a screen '
    + 'built from its current source fresh');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  await main();
}
