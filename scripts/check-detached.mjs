#!/usr/bin/env node
// Every component the file USES but no page walk can REACH is accounted for.
//
//   node scripts/check-detached.mjs
//
// Figma's page walk — `page.findAllWithCriteria()` — is how every extractor in this
// pipeline finds components, and it only finds what sits on a page. A component can be
// used by the file and still have no page: the Plugin API resolves it by id, reports
// `parent: null` and `page: null`, and no walk will ever see it.
//
// This is not hypothetical and it is not rare. It cost this project the header artwork
// (`Default header background`, node 13658:7639) — which had a SECOND reason to go
// missing, so the page problem stayed hidden behind the colour problem. Chasing
// `Tabs navigation` turned up 55 more, found by walking every INSTANCE on every page and
// following it to its main component.
//
// The census in tokens/_raw/detached-components.tsv is the record. This check asserts:
//
//   1. The count has not grown. A new detached component means something in Figma was
//      moved or deleted while still in use, and that should be noticed.
//   2. Every `not-captured` row is written up in uncaptured-reasons.tsv, so "we do not
//      have this component" is always a recorded decision rather than an oversight.
//
// It does NOT try to capture them. Most are superseded — `Tabs navigation` binds
// `Base colours/Default Pink`, a raw primitive, which is what components looked like
// before the semantic layer existed. Importing them would import that.
import { readFileSync } from 'node:fs';

const DETACHED_BASELINE = 55;

const tsv = (f) => {
  const [head, ...rows] = readFileSync(f, 'utf8').trim().split('\n');
  const keys = head.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
};

const detached = tsv('tokens/_raw/detached-components.tsv');
const reasons = readFileSync('tokens/_raw/uncaptured-reasons.tsv', 'utf8');
let failures = 0;

const byStatus = detached.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log(`${detached.length} component sets are used by the file but sit on no page `
  + `(baseline ${DETACHED_BASELINE})`);
console.log(`  ${byStatus['not-captured'] || 0} not captured, `
  + `${byStatus['superseded-copy'] || 0} an older copy of a captured component, `
  + `${byStatus['pinned-variant'] || 0} a single pinned variant rather than a set`);

if (detached.length > DETACHED_BASELINE) {
  console.log('  FAIL  more components have come off the page tree than before.');
  failures++;
} else if (detached.length < DETACHED_BASELINE) {
  console.log(`  note  down ${DETACHED_BASELINE - detached.length} — lower DETACHED_BASELINE to ${detached.length} to lock it in`);
}

// A `not-captured` row needs a written reason. A superseded copy does not: the component
// IS captured, just from its live node rather than this orphan.
const unexplained = detached
  .filter(r => r.status === 'not-captured')
  .filter(r => !reasons.includes(r.name))
  .map(r => `${r.name} (${r.variants} variant${r.variants === '1' ? '' : 's'}, used on ${r.usedOnPages})`);

if (unexplained.length) {
  console.log(`  FAIL  ${unexplained.length} detached component(s) with no recorded reason:`);
  for (const u of unexplained) console.log('        ' + u);
  failures++;
} else {
  console.log('  every uncaptured one has a recorded reason in uncaptured-reasons.tsv');
}

process.exit(failures ? 1 : 0);
