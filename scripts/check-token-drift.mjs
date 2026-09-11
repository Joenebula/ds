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
// NO FIGMA CALLS. It reads responses already durable in the session transcripts — the same trick
// the extractors use — and resolves what they bind against the tokens the repo holds. So it
// measures exactly what has been read, and gets stronger as more pages are read.
//
// TWO SOURCES, AND THE SECOND ONE WAS MISSING FOR A WHILE. Design-context responses carry kebab
// CSS variables (`var(--navigation\/nav-bg-top)`) that have to be decoded back to a Figma name.
// get_variable_defs responses carry the Figma names VERBATIM as JSON keys, which needs no
// decoding and cannot be near-missed — a strictly better source. This check read only the first,
// so a whole page screened with get_variable_defs was invisible to it. Re-reading Navigation on
// 2026-09-11 surfaced five more missing tokens by hand — Navigation/Nav items, Nav bg left,
// Search bg, Notification selected and Configr nav — and the check could not see one of them.
// Finding a token by hand that the mechanism cannot find is the mechanism failing.
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

// What makes a string a get_variable_defs response: a JSON object, every value a string, and at
// least one value shaped like something only Figma writes — a hex colour, a Font(...) or an
// Effect(...). This repo's own JSON never matches: components.json is an array, other.json and
// the live-sets files hold arrays as values.
export function isVariableDefs(text) {
  if (!/^\s*\{/.test(text)) return null;
  let o; try { o = JSON.parse(text); } catch { return null; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const vals = Object.values(o);
  if (vals.length < 2 || !vals.every((v) => typeof v === 'string')) return null;
  const figmaish = (v) => /^#[0-9a-fA-F]{3,8}$/.test(v) || /^(Font|Effect)\(/.test(v);
  return vals.some(figmaish) ? o : null;
}

// The COLOUR entries of a get_variable_defs response, by their exact Figma names.
//
// Deliberately only the colours. Such a response also carries fonts, sizes, effects, booleans and
// even a component's prose property values ("Description": "Change is a constant in today's…").
// Judging those against this repo's colour files would manufacture unknowns out of things that
// are not colours and were never missing — the exact mistake the first version of this file made
// at a larger scale.
export function scanVariableDefs(text) {
  const o = isVariableDefs(text);
  if (!o) return [];
  return Object.entries(o).filter(([, v]) => /^#[0-9a-fA-F]{3,8}$/.test(v)).map(([k]) => k);
}

// The key a person writes in uncaptured-tokens.tsv, from an exact Figma name. One vocabulary for
// the debt file whichever source found the token: `Navigation/Nav bg top` -> `navigation/nav-bg-top`,
// which is what the kebab decoder would have produced from the design-context side.
export const debtKey = (figmaName) => String(figmaName).toLowerCase().trim().replace(/\s+/g, '-');

// Every `var(--...)` in a chunk of text, as the raw name the decoder takes. `--pf-*` is skipped:
// that is this repo's OWN output namespace, emitted by build-css.mjs, and can never be a Figma
// variable name. Counting it was how the first version of this check reported 133 for 2.
//
// AND THE NAME MUST LOOK LIKE A NAME. The data-node-id gate says "this string is a design-context
// response", but a string can contain one AND contain prose. This file's own header explains
// itself with the literal text `var(--` followed by an ellipsis; read into a transcript beside a
// component, it was scraped as a bound variable called "..." and reported as an UNKNOWN token,
// five times. A Figma variable name is word characters, spaces and a little punctuation — never
// an ellipsis, never a sentence. Rejecting anything else costs nothing and closes the whole class,
// not just the one character that found it.
const NAME_SHAPE = /^--[A-Za-z0-9\\/_.%+()-][A-Za-z0-9\\/_.%+() -]*$/;
export function scanVars(text) {
  return [...text.matchAll(/var\((--[^,)]+)/g)].map((m) => m[1])
    .filter((v) => !/^--pf-/.test(v) && NAME_SHAPE.test(v));
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

export function judge(rawNames, index, declared, exactNames = [], knownExact = new Set()) {
  const unknown = new Map(); const known = new Set(); const debt = new Map();
  // Exact Figma names from get_variable_defs. No decoding: they are compared to the names the
  // repo holds directly, so there is no near-miss to guess at.
  const norm = (n) => String(n).toLowerCase().replace(/\s+/g, ' ').trim();
  const haveExact = new Set([...knownExact].map(norm));
  for (const name of exactNames) {
    if (haveExact.has(norm(name))) { known.add(name); continue; }
    const key = debtKey(name);
    if (declared.has(key)) { debt.set(key, declared.get(key)); continue; }
    unknown.set(key, (unknown.get(key) || 0) + 1);
  }
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
  const paths = files.map((f) => f.path);
  const texts = scrapeBatches(paths, DESIGN_CONTEXT);
  const raw = texts.flatMap(scanVars);
  const defsTexts = scrapeBatches(paths, /^\s*\{\s*"/);
  const exact = defsTexts.flatMap(scanVariableDefs);

  const names = allKnownNames();
  const index = buildIndex(names);
  let declared = new Map();
  try {
    for (const l of readFileSync(DEBT, 'utf8').trim().split('\n').slice(1)) {
      const [name, reason] = l.split('\t');
      if (name) declared.set(name.trim(), (reason || '').trim());
    }
  } catch { /* no debt file yet */ }

  const { unknown, known, debt } = judge(raw, index, declared, exact, new Set(names));

  console.log(`transcripts read   : ${files.length}`);
  console.log(`design reads seen  : ${texts.length}`);
  console.log(`variable-def reads : ${defsTexts.filter(isVariableDefs).length}`);
  console.log(`variables bound    : ${raw.length} kebab + ${exact.length} exact `
    + '(--pf-* excluded: that is this repo\'s output, not Figma\'s)');
  // Measuring nothing is not a pass — whether because no component was read, or because every
  // read yielded no variable. Both look exactly like a clean bill of health and neither is one.
  if ((!texts.length || !raw.length) && !exact.length) {
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

  // Prose that merely CONTAINS `var(--` is not a binding. This repo's own source explains itself
  // with an ellipsis inside one, and it was scraped as a token five times.
  if (scanVars('pulls every `var(--\u2026)` out of them').length !== 0) {
    miss('a var() whose name is not name-shaped must be rejected, not reported as a Figma token');
  }
  if (scanVars(String.raw`var(--navigation\/nav-bg-top,#fff)`).length !== 1) {
    miss('a real kebab variable name must still be accepted');
  }
  // get_variable_defs: only the COLOUR entries, by their exact Figma names.
  const defs = JSON.stringify({ 'Navigation/Nav items': '#656565', 'Size/S': '16',
    Description: 'Change is a constant', 'Drop shadow': 'Effect(type: DROP_SHADOW)' });
  if (JSON.stringify(scanVariableDefs(defs)) !== JSON.stringify(['Navigation/Nav items'])) {
    miss(`only hex-valued entries of a variable-defs response are colours `
      + `(got ${JSON.stringify(scanVariableDefs(defs))})`);
  }
  // The array values must be REJECTED BY TYPE, not by luck. A one-element array stringifies to
  // its element, so `['#656565']` passes a hex test the moment the type guard is dropped — and a
  // live-sets file with a single-token component is exactly that shape. This fixture fails if the
  // guard is removed; an `['x']` fixture does not, and passed a mutant that deserved to die.
  const arrayish = JSON.stringify({ 'Navigation/Nav items': ['#656565'], Other: ['#3e3e3e'] });
  if (scanVariableDefs(arrayish).length !== 0) {
    miss('an object whose values are ARRAYS is this repo\'s own JSON (tokens/_raw/live-sets-*.json), '
      + 'never a variable-defs response — and a one-element array must not sneak through by '
      + 'stringifying to its element');
  }
  if (debtKey('Navigation/Nav bg top') !== 'navigation/nav-bg-top') {
    miss(`an exact Figma name must fold to the same debt key the kebab side produces `
      + `(got ${debtKey('Navigation/Nav bg top')})`);
  }
  {
    const decl = new Map([['navigation/nav-items', 'pending: blocked']]);
    const j = judge([], idx, decl, ['Navigation/Nav items', 'Navigation/Nav bg left', 'Text/Primary'],
      new Set(['Text/Primary']));
    if (!j.debt.has('navigation/nav-items')) miss('a declared exact-name token must count as debt, not unknown');
    if (!j.unknown.has('navigation/nav-bg-left')) miss('an undeclared exact-name token must be reported UNKNOWN');
    if (!j.known.has('Text/Primary')) miss('an exact name the repo holds must resolve');
  }

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
