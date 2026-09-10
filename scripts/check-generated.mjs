#!/usr/bin/env node
// Fails if any generated file is stale — that is, if `npm run build` would change it.
//
//   node scripts/check-generated.mjs
//
// `tokens/_raw/` is the input and everything else is generated, but the generators are
// separate scripts and it is easy to run one and not the rest. That happened: a fix to
// the components generator was applied with `node scripts/build-components-css.mjs`
// rather than `npm run build`, so dist/components.css was correct while the six files
// that INLINE it — the component gallery and five ds-bundle pages — were left carrying
// the previous version, and the repo was committed in that state. Every check passed,
// because every check reads dist/, not the copies.
//
// The git stop-hook noticed before anyone shipped it. This is that catch, automated.
import { execSync } from 'node:child_process';

const dirty = () => execSync('git status --porcelain', { encoding: 'utf8' })
  .split('\n').map(l => l.slice(3).trim()).filter(Boolean);

const before = new Set(dirty());
try {
  execSync('npm run build', { stdio: 'pipe' });
} catch (e) {
  console.error('the build itself failed:');
  console.error((e.stdout || e.stderr || '').toString().slice(-2000));
  process.exit(1);
}
// Anything dirty AFTER the build that was clean BEFORE it was stale on disk.
const stale = dirty().filter(f => !before.has(f));

if (stale.length) {
  console.log(`${stale.length} generated file(s) were STALE — the build changed them:`);
  for (const f of stale) console.log(`    ${f}`);
  console.log('They are now up to date; commit them. Run `npm run build`, not a single');
  console.log('generator, after editing anything under tokens/_raw or scripts/build-*.');
  process.exit(1);
}
console.log(`every generated file is up to date with its source`);
