#!/usr/bin/env node
// Does Figma bind a variable that this repo's token extract has never heard of?
//
//   node scripts/check-token-drift.mjs
//   node scripts/check-token-drift.mjs --self-test
//
// WHY THIS EXISTS. The repo could already tell you a COMPONENT had drifted — that is what
// check-catalogue-drift.mjs and sync-check.mjs do. Nothing could tell you a TOKEN had. The
// component extract records a colour by its Figma variable name, and every reader downstream
// assumes that name is one the token layer knows. Nothing checked it.
//
// Two were found by accident on 2026-09-11, while decoding a Navigation component:
// `Navigation/Nav bg top` and `Border/Default full` are bound in Figma today and appear in
// neither semantic.tsv nor primitives.tsv. They were caught only because the kebab decoder
// refused to guess at a near miss and said so. Luck is not a mechanism.
//
// NO FIGMA CALLS. It reads the design-context responses already durable in the session
// transcripts — the same trick the extractors use — pulls every `var(--…)` out of them, and
// resolves each against the tokens the repo holds. So it measures exactly what has been read,
// and gets stronger as more pages are read.
//
// THE FIRST VERSION OF THIS FILE MEASURED THE WRONG THING, CONFIDENTLY. It scanned every string
// in the transcript, so it counted this repo's OWN `--pf-*` output variables, and fragments of
// its own source code, as "variables Figma binds". It reported 133 unknown tokens when the real
// number was 2. Two rules fix it, and both are the point rather than details:
//   * only DESIGN-CONTEXT RESPONSES are Figma talking. They are identified by the fixed trailer
//     the tool appends to every one; anything else in the transcript is us, not Figma.
//   * `--pf-*` is this repo's output namespace by construction, never a Figma variable name.
// And the universe it resolves against is every name the repo holds — colours in semantic.tsv
// and primitives.tsv, but also the dimensions, typography, text, effect, grid and gradient names
// in other.json. Judging a spacing variable against the colour files would call it missing when
// it is merely filed elsewhere.
//
// A token that is genuinely not coming gets a line in tokens/_raw/uncaptured-tokens.tsv saying
// why, the same visible-debt pattern as uncaptured-reasons.tsv: a `pending:` reason PASSES and is
// counted and named in the verdict line on every run. An UNEXPLAINED absence fails.
import { readFileSync } from 'node:fs';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches } from './lib/transcript.mjs';
import { buildIndex, knownNames, decode } from './lib/decode-var.mjs';

const DEBT = 'tokens/_raw/uncaptured-tokens.tsv';

// What makes a string Figma speaking rather than this repo's own code or CSS quoted in the
// conversation. NOT the "SUPER CRITICAL" trailer: that arrives as its OWN output block, separate
// from the code, so gating on it selected 66 strings containing no variables at all and the check
// passed having measured nothing — the second wrong answer this file gave before it gave a right
// one. `data-node-id` is stamped into the code itself by get_design_context and appears nowhere
// in this repo's own output.
export const DESIGN_CONTEXT = /data-node-id=/;

// Every `var(--…)` in a chunk of text, as the raw name the decoder takes. `--pf-*` is skipped:
// that is this repo's OWN output namespace, emitted by build-css.mjs, and can never be a Figma
// variable name. Counting it was how the first version of this check reported 133 for 2.
export function scanVars(text) {
  return [...text.matchAll(/var\((--[^,)]+)/g)].map((m) => m[1]).filter((v) => !/^--pf-/.test(v));
}

// Every Figma name the repo holds, across all of its extracts — not just the colour files.
export function allKnownNames(dir = 'tokens/_raw') {
  const names = [...knownNames(dir)];
  const other = JSON.parse(readFileSync(`${dir}/other.json`, 'utf8'));
  for (const group of Object.values(other)) {
    if (Array.isArray(group)) for (const e of group) if (e && e.name) names.push(e.name);
  }
  for (const line of readFileSync(`${dir}/text-styles.tsv`, 'utf8').trim().split('\n').slice(1)) {
    const n = line.split('\t')[0];
    if (n) names.push(n);
  }
  return names;
}

export function judge(rawNames, index, declared) {
  const unknown = new Map(); const known = new Set(); const debt = new Map();
  for (const raw of rawNames) {
    const d = decode(raw, index);
    if (d.name) { known.add(d.name); continue; }
    // The key a person would have to write in the debt file: the kebab name as Figma spells it.
    const key = raw.replace(/^--/, '').replace(/\\/g, '').split(',')[0].trim();
    if (declared.has(key)) { debt.set(key, declared.get(key)); continue; }
    unknown.set(key, (unknown.get(key) || 0) + 1);
  }
  return { unknown, known, debt };
}

function main() {
  const files = transcriptFiles(TRANSCRIPT_DIR);
  const texts = scrapeBatches(files.map((f) => f.path), DESIGN_CONTEXT);
  const raw = texts.flatMap(scanVars);

  const index = buildIndex(allKnownNames());
  let declared = new Map();
  try {
    for (const l of readFileSync(DEBT, 'utf8').trim().split('\n').slice(1)) {
      const [name, reason] = l.split('\t');
      if (name) declared.set(name.trim(), (reason || '').trim());
    }
  } catch { /* no debt file yet */ }

  const { unknown, known, debt } = judge(raw, index, declared);

  console.log(`transcripts read   : ${files.length}`);
  console.log(`design reads seen  : ${texts.length}`);
  console.log(`variables bound    : ${raw.length} (--pf-* excluded: that is this repo's output, not Figma's)`);
  // Measuring nothing is not a pass — whether because no component was read, or because every
  // read yielded no variable. Both look exactly like a clean bill of health and neither is one.
  if (!texts.length || !raw.length) {
    console.log(`\n${texts.length} design read(s) yielded ${raw.length} bound variable(s), so `
      + 'NOTHING WAS MEASURED — this is not a pass. Re-run in a session that has read components '
      + 'with get_design_context.');
    process.exit(2);           // vacuous, the repo's own code for "measured nothing"
  }
  console.log(`variables resolved : ${known.size} distinct`);
  for (const [k, why] of debt) console.log(`  pending  "${k}" — ${why}`);
  for (const [k, n] of [...unknown].sort()) {
    console.log(`  UNKNOWN  "${k}" is bound in Figma ${n} time(s) and is in neither semantic.tsv `
      + 'nor primitives.tsv — extract it, or give it a line in uncaptured-tokens.tsv saying why not');
  }
  // Declared debt that nothing binds any more: a reason kept for something gone is folklore.
  const stale = [...declared.keys()].filter((k) => !debt.has(k));
  for (const k of stale) console.log(`  stale    "${k}" has a line in uncaptured-tokens.tsv and nothing binds it`);

  console.log(`\n${known.size} resolved, ${unknown.size} unknown, ${debt.size} declared, ${stale.length} stale`);
  process.exit(unknown.size || stale.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (m) => { failures++; console.log(`  MISS ${m}`); };
  const idx = buildIndex(['Text/Primary', 'Base colours/White']);

  if (JSON.stringify(scanVars(String.raw`bg-[var(--text\/primary,#3e3e3e)] x`)) !== JSON.stringify(['--text\\/primary'])) {
    miss(`a var() must be pulled out whole (got ${JSON.stringify(scanVars(String.raw`bg-[var(--text\/primary,#3e3e3e)] x`))})`);
  }

  // THE CASE THIS FILE EXISTS FOR: a variable Figma binds that the token extract lacks.
  let r = judge(['--text\\/primary', '--navigation\\/nav-bg-top'], idx, new Map());
  if (!r.unknown.has('navigation/nav-bg-top')) miss('a variable absent from the token extract must be reported UNKNOWN');
  if (r.known.size !== 1) miss('a variable present in the extract must resolve and not be reported');

  // Counted, so a token bound fifty times is not mistaken for a one-off typo.
  r = judge(['--a\\/b', '--a\\/b', '--a\\/b'], idx, new Map());
  if (r.unknown.get('a/b') !== 3) miss(`an unknown token must be counted, not just listed (got ${r.unknown.get('a/b')})`);

  // A DECLARED one passes, and is reported rather than hidden — the visible-debt pattern.
  r = judge(['--navigation\\/nav-bg-top'], idx, new Map([['navigation/nav-bg-top', 'pending: because']]));
  if (r.unknown.size) miss('a declared token must not be reported as unknown');
  if (!r.debt.has('navigation/nav-bg-top')) miss('a declared token must still be REPORTED, never silently dropped');

  // A declaration must not make a DIFFERENT token pass.
  r = judge(['--something\\/else'], idx, new Map([['navigation/nav-bg-top', 'pending: because']]));
  if (!r.unknown.has('something/else')) miss('a declaration must only excuse the token it names');

  // THIS REPO'S OWN OUTPUT IS NOT FIGMA'S INPUT. `--pf-*` is emitted by build-css.mjs. Counting
  // it is how the first version of this check reported 133 unknown tokens for a real 2.
  const mixed = String.raw`color: var(--pf-text-primary); background: var(--navigation\/nav-bg-top)`;
  const got = scanVars(mixed);
  if (got.length !== 1 || /pf-/.test(got[0])) miss(`--pf-* must never be counted as a Figma variable (got ${JSON.stringify(got)})`);

  // THE MARKER must select the code, not the trailer. Gating on the "SUPER CRITICAL" trailer
  // selected 66 strings with no variables in them and the check passed having measured nothing.
  if (!DESIGN_CONTEXT.test('<div data-node-id="1:2" class="bg-[var(--text/primary)]">')) {
    miss('a design-context code block must be recognised as Figma speaking');
  }
  if (DESIGN_CONTEXT.test('SUPER CRITICAL: The generated React+Tailwind code MUST be converted')) {
    miss('the trailer is NOT the code — gating on it measures nothing and calls it a pass');
  }

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a variable Figma binds that the token extract lacks is reported and '
    + 'counted, a declared one passes but is still named, and a declaration excuses only the token it names');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
