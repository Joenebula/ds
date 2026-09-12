#!/usr/bin/env node
// Is every committed screenshot still what the build actually produces?
//
//   node scripts/check-screenshots.mjs
//
// CLAUDE.md makes looking at the picture the final word — "a wrong picture outranks every check
// that passed" — and this week proved it twice over: the dark captures were shot before the
// theme was applied and then again mid-fade, so for the whole life of the project the pictures
// people were looking at were not the pages. Both faults were in `shoot.mjs` and neither could
// be seen from inside the screenshots themselves.
//
// A stale picture is the same failure with a slower fuse. The fix lands, nobody re-shoots, and
// the repo goes on showing the old one. `screenshots/` held six captures taken before the last
// fix and seven more from pages that no longer exist, and nothing distinguished them.
//
// So: every capture is re-shot and compared BYTE FOR BYTE. Chromium's rendering is
// deterministic at a pinned version — measured, two runs of the same page are identical — so
// any difference means the committed picture is not this build's. Captures whose source page is
// gone cannot be re-shot and are listed in `screenshots/ORPHANS.md` with what they were; a file
// that is neither reproducible nor listed fails, which is what stops a keepsake being added
// silently.
//
// Byte-identity is a property of THIS pinned browser. On a different Chromium the bytes may
// differ without anything being wrong, so the failure says "re-shoot" rather than "the page is
// broken".
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = 'screenshots';
const SOURCES = ['prototypes', 'working', 'docs'];
const orphans = new Set(
  [...readFileSync(`${DIR}/ORPHANS.md`, 'utf8').matchAll(/`([^`]+\.png|[^`]+\.\*)`/g)]
    .map(m => m[1]));
const listed = f => orphans.has(f)
  || [...orphans].some(o => o.endsWith('.*') && f.startsWith(o.slice(0, -2)));

const shots = readdirSync(DIR).filter(f => f.endsWith('.png'));
const problems = [];
let matched = 0, kept = 0;

// name.(light|dark)[.full].png  ->  the page it came from
const parse = f => {
  const m = /^(.+?)\.(light|dark)(\.full)?\.png$/.exec(f);
  if (!m) return null;
  const src = SOURCES.map(d => `${d}/${m[1]}.html`).find(existsSync);
  return src ? { src, theme: m[2], full: !!m[3], name: m[1] } : null;
};

const work = mkdtempSync(join(tmpdir(), 'pf-shots-'));
const shotFor = new Map();
try {
  for (const f of shots) {
    const p = parse(f);
    if (!p) {
      if (listed(f)) { kept++; continue; }
      problems.push(`${DIR}/${f} has no source page and is not listed in ${DIR}/ORPHANS.md — `
        + `nobody can tell whether it is current`);
      continue;
    }
    const key = p.src + (p.full ? ' --full' : '');
    if (!shotFor.has(key)) {
      const args = ['scripts/shoot.mjs', p.src, work];
      if (p.full) args.push('--full');
      execFileSync(process.execPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });
      shotFor.set(key, true);
    }
    const fresh = join(work, f);
    if (!existsSync(fresh)) {
      problems.push(`${DIR}/${f} — re-shooting ${p.src} produced no such file`);
      continue;
    }
    if (Buffer.compare(readFileSync(fresh), readFileSync(`${DIR}/${f}`)) === 0) matched++;
    else problems.push(`${DIR}/${f} is not what the build produces now — re-shoot it: `
      + `node scripts/shoot.mjs ${p.src} ${DIR}${p.full ? ' --full' : ''}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`${shots.length} capture(s) in ${DIR}/`);
console.log(`  ${matched} re-shot and byte-identical to the committed file`);
console.log(`  ${kept} kept with no source page, each named in ${DIR}/ORPHANS.md`);
if (!matched) {
  console.error('  this check proved nothing: not one capture could be re-shot');
  process.exit(1);
}
for (const p of problems) console.error('FAIL ' + p);
process.exit(problems.length ? 1 : 0);
