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
import { TRANSCRIPT_DIR, transcriptFiles, scrapeFigma } from './lib/transcript.mjs';
import { buildIndex, knownNames, decode } from './lib/decode-var.mjs';

const DEBT = 'tokens/_raw/uncaptured-tokens.tsv';
const safeRead = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
// This design system's Figma file. A transcript can hold reads of OTHER files — the Pathway test
// file is in this one — and their variables are not this system's to be missing.
export const FILE_KEY = 'aRWjBnTvdLiG50xtwodGwH';

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

// COLLECTIONS FIGMA ITSELF MARKS AS RETIRED. Out of this design system by definition, not by
// seven individual decisions — Figma named the collection "DEPRECATED COLOURS", which is the
// whole statement. Extracting one would import into the shipped system exactly what is being
// retired, so a rule states it once and covers the next one automatically.
//
// This replaced seven `pending:` rows in uncaptured-tokens.tsv on the design lead's instruction.
// The rows went; the VISIBILITY did not, and that distinction is the point. Every one of these is
// still counted and named in the verdict line with the components that bind it, because
// CLAUDE.md's rule is absolute: "Never delete that count to tidy the output; it is the only thing
// keeping a known gap from becoming a forgotten one." What changed is where the knowledge lives,
// never whether anyone can see it.
//
// It is also not an excuse. Each of the seven is an exact duplicate of a live primitive at the
// same value — DEPRECATED COLOURS/White is #FFFFFF, and so is Base colours/White. It is a
// Figma-side rebinding job, and the rule below does not make it go away; it stops it being
// restated seven times here.
//
// This paragraph used to carry numbers — "nine components still bind the retired name, `Full page`
// binds four of them" — measured once from the extracted components and never again. A sweep of the
// live file on 2026-09-11 found 46 retired styles and 1,940 references, and `Full page` was clean of
// the colours that sentence was about. The numbers are gone from here on purpose: this file cannot
// measure them, and a figure a mechanism cannot re-derive is a figure that will be wrong later and
// believed anyway. `censusNote` below points at the dated snapshot that CAN.
export const isDeprecatedCollection = (key) => /^deprecated-colours\//.test(String(key));

// WHAT THIS CHECK CANNOT SEE, said in the verdict line rather than assumed away.
//
// The line here used to end "...but nine components still bind the retired NAME". Nine was true of
// the EXTRACTED components when it was written, it was never re-measured, and a sweep of the live
// file on 2026-09-11 found the retired collection is 46 styles carrying 1,940 references — 511 of
// which have since been rebound. A hardcoded number in a verdict line is the thing this repo keeps
// diagnosing in other people's mechanisms: a figure people learn to read past.
//
// So it names the census instead of a number, and REPORTS THE CENSUS'S OWN DATE. A snapshot with no
// staleness signal rots in silence, which is the same failure one layer up. A missing or undated
// census is said out loud rather than skipped — this check cannot re-count Figma, and pretending
// otherwise is how the nine got here.
export function censusNote(read) {
  const files = ['tokens/_raw/deprecated-collection-census.tsv', 'tokens/_raw/deprecated-white-census.tsv'];
  const seen = [];
  for (const f of files) {
    const text = read(f);
    if (text === null) { seen.push(`${f} IS MISSING`); continue; }
    const date = (text.match(/^# checked:\s*(\S+)/m) || [])[1];
    const refs = (text.match(/^# references-at-last-sweep:\s*(\d+)/m) || [])[1];
    if (!date) { seen.push(`${f} carries no "# checked:" date, so nothing can say how stale it is`); continue; }
    seen.push(`${f} — ${refs || '?'} references as at ${date}`);
  }
  return 'this check reads TRANSCRIPTS, so it cannot see a retired style used anywhere Figma has not '
    + 'been read into one. The live count lives in a dated snapshot instead: '
    + seen.join('; ')
    + '. Re-sweep with docs/figma-rebind-deprecated.js before trusting either.';
}

// A declaration nothing binds any more. Normally that is FOLKLORE — a reason kept for something
// gone — and it fails.
//
// But provenance surfaced a second state. A transcript ROTATES; the TSVs are the durable record,
// not it. `grey` is the case: recorded as bound by Menu-search-settings (829:31644), and that read
// is simply not on disk any longer. Absence from a rotated transcript is not absence from Figma,
// and deleting a row on that basis would be exactly the silent deletion this repo forbids
// everywhere else — the same rule as "a captured variant absent from a re-read is reported, never
// deleted".
//
// So `unverifiable:` is the marker for it, beside `pending:`. It passes and is COUNTED AND NAMED
// every run. It is not an excuse: it says nobody can check this here, which is a different and
// more honest claim than either "it is fine" or "it is gone".
export function classifyDeclared(declared, debt) {
  const gone = [...declared.keys()].filter((k) => !debt.has(k));
  const isUnverifiable = (k) => /^unverifiable:/i.test(declared.get(k) || '');
  return { stale: gone.filter((k) => !isUnverifiable(k)), unverifiable: gone.filter(isUnverifiable) };
}

// The actionable half of what the seven deleted rows carried: WHICH components still bind each
// retired colour, and what each should be instead. Kept here so removing the rows did not remove
// the finding. Every value is an exact duplicate of the live primitive named beside it.
// CHECKED AGAINST THE LIVE FIGMA FILE ON 2026-09-11, and three of the nine were already clean.
// This map used to be derived from design-context responses in the transcripts and stated as
// current fact. A direct read says otherwise, so every line below now records what Figma HAS
// rather than what an old read once showed:
//
//   Full page, Header, Mobile key actions   NO deprecated style at all — the extract was stale
//   AI Assistant                            THREE, not one
//   [S] Config child menu                   TWO, not one
//
// They are PAINT STYLES (fillStyleId / strokeStyleId), not variable bindings, which is why they
// never appear in a node's boundVariables. That also means the fix is not a same-value rename:
// every one of these values maps to SEVERAL semantic variables, and choosing between them is a
// design decision that is invisible in light mode and wrong in dark if guessed.
export const BOUND_BY = {
  'deprecated-colours/white':
    'WORKED 2026-09-11. The waffle is done (270 vectors across 15 Waffle theme variants -> '
    + 'Icons/Icon - Always white), and so is most of the rest: a whole-file sweep found 203 nodes '
    + 'carrying this style, 22 were rebound, and two agreeing sweeps now read 141. Those 22 edits '
    + 'cleared 62 nodes because 40 were instances that inherit. Tables, Controls and Analytics and '
    + 'charts are completely clear. Every rebind preserves light mode exactly — a rebind that '
    + 'changes how light mode looks is a design decision, not a rebind. The full sorted worklist is '
    + 'tokens/_raw/deprecated-white-census.tsv, which no check reads. What is LEFT in components '
    + 'this repo ships is not token work: Header\'s Configr app icon and [S] Config child menu\'s '
    + '14x7 Vector are white artwork on a white surface (invisible as drawn, so there is no '
    + 'appearance to preserve and the token depends on intent — probably Navigation/Configr nav, '
    + '#656565 light and #FFFFFF dark), and Status type=New social group has fills[0].visible '
    + 'false, so its badge background is switched off entirely. Role matching here is a LOOKUP, '
    + 'not a judgement: twelve semantics resolve to #FFFFFF in light and fan out in dark, and '
    + 'their scopes (TEXT_FILL / SHAPE_FILL / STROKE_COLOR / FRAME_FILL) cut that to two or three '
    + 'candidates before anyone has to think. '
    + 'NOT Full page, Header or Mobile key actions: already clean of the OTHER retired colours',
  'deprecated-colours/grey-steel':
    '#E5E5E5 — Table header icons (3 Hover FILLS). The AI Assistant stroke and the '
    + '[S] Config child menu divider were rebound to Border/Default full on 2026-09-11. What is '
    + 'left is a role mismatch, not a rename: a hover BACKGROUND, and every semantic at this value '
    + 'is a Border/* token. Background/Tertiary is role-correct at #F2F2F2, a different colour',
  'deprecated-colours/grey-slate-(a)':
    '#3E3E3E — NOTHING references it any more. AI Assistant\'s "How can I help you today?" was '
    + 'rebound to Text/Primary on 2026-09-11 (same in light, #FFFFFF in dark, which the style '
    + 'never did)',
  'deprecated-colours/blue-ocean-(a)':
    '#0075BE — Browser drop down (Option fill), Option (Selected=Yes fill). Every semantic at '
    + 'this value is a TEXT or ICON token; there is no background token for a selected row',
  'deprecated-colours/blue-turquoise':
    '#5CC4EA — no component in this file references it any more (checked 2026-09-11)',
  'deprecated-colours/blue-shark':
    '#1D1F27 — no component in this file references it any more (checked 2026-09-11)',
  'deprecated-colours/default-theme-pink-(a)':
    '#CD2359 — NOTHING references it any more. AI Assistant\'s four "10" counter labels were '
    + 'rebound to Text/Theme on 2026-09-11. Text/Theme rather than Background/Theme because the '
    + 'two share this value in light and diverge in dark (#5CC4EA against #33B5E5) — the role has '
    + 'to match or the swap is invisible now and wrong later',
};

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
// ITS ORIGINAL JOB IS NOW PROVENANCE'S. The paragraph above describes this file's own header being
// scraped as a token — that cannot happen any more, because scrapeFigma reads only what came back
// from an `mcp__Figma__*` tool, so this repo's source is not in the haystack at all. What the guard
// still does is narrower and real: a GENUINE design-context response is generated code plus prose,
// and prose can contain `var(--` too. Kept for that, not for the case that found it.
//
// TIGHTENED 2026-09-11, because the first version closed one SPELLING rather than the class. It
// rejected the single character `…` and still accepted `--...` (a dot was in the allowed set) and
// `--…` (the escape spelling, whose backslash was allowed for the sake of `--text\/primary`).
// Both are in this file's OWN comments and self-test, and both came back as UNKNOWN tokens the
// moment a session re-read it — the same false positive, through the two spellings the guard
// happened not to cover.
//
// So it is now written from what a Figma name IS rather than from what prose has been seen to do:
// of the 228 names this repo holds, none contains a dot and none contains a backslash. The only
// backslash that is ever legitimate is the `\/` a kebab CSS variable uses to escape the collection
// separator, so a backslash is allowed ONLY in that pair, and the dot is gone entirely.
const NAME_SHAPE = /^--(?:\\\/|[A-Za-z0-9\/_%+()-])(?:\\\/|[A-Za-z0-9\/_%+() -])*$/;

// ESCAPING DEPTH IS NOT MEANING. The same binding reaches the transcript as `var(--border\/theme)`
// from one read and `var(--border\\/theme)` from another, depending on how many string literals
// the response passed through on its way here. NAME_SHAPE allows exactly one backslash, so the
// doubled form failed the shape test and the binding was DROPPED — silently, because a name that
// fails the guard is filtered out rather than reported.
//
// Measured after provenance landed: 53 occurrences across 17 genuine Figma reads of this file,
// including `--border\\/default-full`, one of the tokens this check exists to find. Most of the
// rest resolve to tokens the repo holds, so nothing was ever reported WRONG — the check was just
// quietly measuring less than it said. A haystack that has shrunk in silence is the failure this
// file keeps finding in other mechanisms.
//
// Collapsing any run of backslashes to one normalises depth without loosening the shape: the guard
// still rejects prose, and `decode()` strips backslashes entirely for the lookup anyway.
export const unescapeDepth = (v) => String(v).replace(/\\+/g, '\\');

export function scanVars(text) {
  return [...text.matchAll(/var\((--[^,)]+)/g)].map((m) => unescapeDepth(m[1]))
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
  const deprecated = new Map();
  // Neither known, nor unknown, nor declared debt. Counted in its own bucket so the verdict line
  // can name it — silently swallowing these is the one outcome this rule must not have.
  const takeDeprecated = (key) => {
    if (!isDeprecatedCollection(key)) return false;
    deprecated.set(key, (deprecated.get(key) || 0) + 1);
    return true;
  };
  // Exact Figma names from get_variable_defs. No decoding: they are compared to the names the
  // repo holds directly, so there is no near-miss to guess at.
  const norm = (n) => String(n).toLowerCase().replace(/\s+/g, ' ').trim();
  const haveExact = new Set([...knownExact].map(norm));
  for (const name of exactNames) {
    if (haveExact.has(norm(name))) { known.add(name); continue; }
    const key = debtKey(name);
    if (takeDeprecated(key)) continue;
    if (declared.has(key)) { debt.set(key, declared.get(key)); continue; }
    unknown.set(key, (unknown.get(key) || 0) + 1);
  }
  for (const raw of rawNames) {
    const d = decode(raw, index);
    if (d.name) { known.add(d.name); continue; }
    // The key a person would have to write in the debt file: the kebab name as Figma spells it.
    const key = raw.replace(/^--/, '').replace(/\\/g, '').split(',')[0].trim();
    if (takeDeprecated(key)) continue;
    if (declared.has(key)) { debt.set(key, declared.get(key)); continue; }
    unknown.set(key, (unknown.get(key) || 0) + 1);
  }
  return { unknown, known, debt, deprecated };
}

function main() {
  const files = transcriptFiles(TRANSCRIPT_DIR);
  const paths = files.map((f) => f.path);
  // PROVENANCE, NOT SHAPE. These two scrapes used to keep any string matching, wherever it sat,
  // which is how this check kept reading its OWN comments as bound Figma variables — 133 unknowns
  // for a real 2, then the ellipsis five times, then two more spellings of it. scrapeFigma keeps
  // only what came back from an `mcp__Figma__*` tool, which closes the class rather than a spelling.
  const dc = scrapeFigma(paths, DESIGN_CONTEXT);
  const vd = scrapeFigma(paths, /^\s*\{\s*"/);

  // ...AND ONLY THIS DESIGN SYSTEM'S FILE. A design-context response does not carry its file key,
  // which is why this was recorded as impossible; the CALL carries it, and the join supplies it.
  // The transcript holds three Figma files, so a fifth of these reads were another file's — which
  // is exactly what the six Pathway rows in uncaptured-tokens.tsv were written to excuse.
  const ours = (r) => !r.fileKey || r.fileKey === FILE_KEY;
  const foreign = [...dc.reads, ...vd.reads].filter((r) => !ours(r));
  const texts = dc.reads.filter(ours).map((r) => r.text);
  const raw = texts.flatMap(scanVars);
  const defsTexts = vd.reads.filter(ours).map((r) => r.text);
  const exact = defsTexts.flatMap(scanVariableDefs);
  const unattributed = dc.unattributed + vd.unattributed;

  const names = allKnownNames();
  const index = buildIndex(names);
  let declared = new Map();
  try {
    for (const l of readFileSync(DEBT, 'utf8').trim().split('\n').slice(1)) {
      const [name, reason] = l.split('\t');
      if (name) declared.set(name.trim(), (reason || '').trim());
    }
  } catch { /* no debt file yet */ }

  const { unknown, known, debt, deprecated } = judge(raw, index, declared, exact, new Set(names));

  console.log(`transcripts read   : ${files.length}`);
  console.log(`design reads seen  : ${texts.length} from Figma`
    + (foreign.length ? `, ${foreign.length} from ANOTHER Figma file (excluded)` : '')
    + (unattributed ? `, ${unattributed} unattributable` : ''));
  // Counted and named every run. A read this cannot attribute is a read it did not measure, and a
  // quietly shrunken haystack looks exactly like a clean run.
  if (foreign.length) {
    const byKey = new Map();
    for (const r of foreign) byKey.set(r.fileKey, (byKey.get(r.fileKey) || 0) + 1);
    for (const [k, n] of byKey) {
      console.log(`  other file  ${n} read(s) of Figma file ${k} are in this transcript and are NOT `
        + 'this design system — its variables are not ours to be missing');
    }
  }
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
  for (const [k, n] of [...deprecated].sort()) {
    console.log(`  retired  "${k}" is bound in Figma ${n} time(s) and is OUT BY RULE — Figma names `
      + `its collection DEPRECATED COLOURS. ${BOUND_BY[k] || 'components not recorded'}`);
  }
  for (const [k, n] of [...unknown].sort()) {
    console.log(`  UNKNOWN  "${k}" is bound in Figma ${n} time(s) and is in neither semantic.tsv `
      + 'nor primitives.tsv — extract it, or give it a line in uncaptured-tokens.tsv saying why not');
  }
  // Declared debt that nothing binds any more: a reason kept for something gone is folklore.
  // A declaration nothing binds is normally FOLKLORE — a reason kept for something gone.
  //
  // But there is a second state, and it surfaced the moment provenance made these reads
  // attributable: a row whose evidence was in a transcript THAT IS NO LONGER ON DISK. Transcripts
  // rotate; the TSVs are the durable record, not them. `grey` is the case — recorded as bound by
  // Menu-search-settings (829:31644), and that read is simply not here any more. Absence from a
  // rotated transcript is not absence from Figma, and deleting a row on that basis is exactly the
  // silent deletion this repo forbids everywhere else.
  //
  // So `unverifiable:` is the marker for it, beside `pending:`. It PASSES and is counted and named
  // every run — never a reason to stop reporting it, only a reason not to call it folklore.
  const { stale, unverifiable } = classifyDeclared(declared, debt);
  for (const k of stale) console.log(`  stale    "${k}" has a line in uncaptured-tokens.tsv and nothing binds it`);
  for (const k of unverifiable) {
    console.log(`  unverifiable  "${k}" — ${declared.get(k)}`);
  }

  console.log(`\n${known.size} resolved, ${unknown.size} unknown, ${debt.size} declared, `
    + `${deprecated.size} retired (out by rule), ${stale.length} stale`
    + (unverifiable.length ? `, ${unverifiable.length} unverifiable (the read is no longer on disk)` : ''));
  if (deprecated.size) {
    console.log('the retired ones are each an exact duplicate of a live primitive at the same '
      + 'value — nothing to extract, and the rebinding job is Figma-side. ' + censusNote(safeRead));
  }
  process.exit(unknown.size || stale.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {

  let failures = 0;
  const miss = (m) => { failures++; console.log(`  MISS ${m}`); };

  // These sat ABOVE `miss` when first written, and every one of them could only ever PASS: an
  // assertion of the shape `if (!ok) miss(...)` never touches `miss` while it is passing, so the
  // temporal-dead-zone error only appears once something is actually broken. Five mutants all
  // "died" of a ReferenceError and proved nothing until the harness insisted a mutant must die of
  // a recorded MISS. A test that cannot fail is worse than no test: it reports green for both
  // states, which is this file's own recurring diagnosis.
  const ok = censusNote((f) => f.includes('collection')
    ? '# checked: 2026-09-11\n# references-at-last-sweep: 1429\n'
    : '# checked: 2026-09-11\n# references-at-last-sweep: 141\n');
  if (!/1429 references as at 2026-09-11/.test(ok)) miss('the note must carry the census COUNT and DATE, not a number of its own');
  if (!/re-sweep/i.test(ok)) miss('the note must say the snapshot has to be re-swept to be trusted');
  if (/\bnine\b/.test(ok)) miss('no hardcoded count may come back into this line');
  const missingCensus = censusNote(() => null);
  if (!/IS MISSING/.test(missingCensus)) miss('a census this line points at, that is not there, must be REPORTED not skipped');
  const undated = censusNote(() => 'style\tvalue\trefs\n');
  if (!/no "# checked:" date/.test(undated)) miss('an undated census must be called out — a snapshot with no date rots in silence');
  const idx = buildIndex(['Text/Primary', 'Base colours/White']);

  // Prose that merely CONTAINS `var(--` is not a binding. This repo's own source explains itself
  // with an ellipsis inside one, and it was scraped as a token five times.
  if (scanVars('pulls every `var(--\u2026)` out of them').length !== 0) {
    miss('a var() whose name is not name-shaped must be rejected, not reported as a Figma token');
  }
  // ...AND ITS OTHER TWO SPELLINGS. The first guard closed the character and left these, so both
  // came back as UNKNOWN tokens from this file's own source the moment a session re-read it.
  for (const prose of ['// Every `var(--...)` in a chunk of text, as the raw name',
    'if (scanVars(\'pulls every `var(--\\u2026)` out of them\')']) {
    if (scanVars(prose).length !== 0) {
      miss(`a var() spelled with dots or a \\u escape is prose, not a token (${JSON.stringify(scanVars(prose))})`);
    }
  }
  // And the tightening must not reject the real thing: a kebab name escapes its separator as \/.
  if (scanVars(String.raw`var(--text\/primary)`).length !== 1) {
    miss('an escaped separator is the normal spelling of a kebab variable and must be accepted');
  }
  if (scanVars('var(--navigation/nav-bg-top)').length !== 1) {
    miss('an unescaped separator must also be accepted');
  }
  if (scanVars(String.raw`var(--navigation\/nav-bg-top,#fff)`).length !== 1) {
    miss('a real kebab variable name must still be accepted');
  }
  // ESCAPING DEPTH IS NOT MEANING. The same binding arrives singly or doubly escaped depending on
  // how many string literals the response passed through. The doubled form used to fail the shape
  // guard and be dropped in silence — 53 real bindings across 17 Figma reads of this file.
  {
    const doubled = scanVars(String.raw`var(--border\\/default-full)`);
    if (doubled.length !== 1) {
      miss(`a doubly-escaped binding is the same binding and must be read (got ${JSON.stringify(doubled)})`);
    }
    if (doubled[0] !== String.raw`--border\/default-full`) {
      miss(`escaping depth must be normalised, not merely tolerated (got ${JSON.stringify(doubled[0])})`);
    }
    // The two spellings must land on ONE token, or a binding would be counted twice.
    const both = scanVars(String.raw`var(--border\/theme) var(--border\\/theme)`);
    if (new Set(both).size !== 1) {
      miss(`both escapings of one name must normalise to one (got ${JSON.stringify(both)})`);
    }
    // And normalising depth must not loosen the guard: prose is still prose.
    if (scanVars('pulls every `var(--…)` out').length !== 0) {
      miss('normalising backslashes must not let prose through');
    }
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
  // ---- the DEPRECATED COLOURS rule ------------------------------------------------------
  // It replaced seven declaration rows. The danger in that trade is that a rule is invisible
  // where a row was not, so these check the rule EXCUSES the token and still COUNTS it.
  {
    const j = judge([], idx, new Map(), ['DEPRECATED COLOURS/White', 'Text/Primary'],
      new Set(['Text/Primary']));
    if (j.unknown.size) miss('a retired collection must not be reported UNKNOWN — that is what the '
      + 'seven deleted rows were suppressing, and the rule has to do the same job');
    if (!j.deprecated.has('deprecated-colours/white')) {
      miss('a retired colour must be COUNTED in its own bucket, never silently swallowed — '
        + 'CLAUDE.md: never delete the count to tidy the output');
    }
    if (j.known.has('DEPRECATED COLOURS/White')) {
      miss('a retired colour is not "resolved" — the repo deliberately does not hold it');
    }
    if (!j.known.has('Text/Primary')) miss('a live token beside a retired one must still resolve');
  }
  // The rule must not reach past its own collection. "deprecated" appearing anywhere in a name
  // is not the test; the collection prefix is.
  {
    const j = judge([], idx, new Map(), ['Background/Deprecated soon'], new Set());
    if (j.deprecated.size) {
      miss('the rule must match the COLLECTION prefix only — excusing anything merely containing '
        + '"deprecated" would let a live token through unreported');
    }
    if (!j.unknown.size) miss('a non-retired unknown must still be reported UNKNOWN');
  }
  // And every retired key must carry its components, or removing the rows really did lose the
  // actionable half.
  for (const k of Object.keys(BOUND_BY)) {
    if (!isDeprecatedCollection(k)) miss(`BOUND_BY key "${k}" is not matched by the rule`);
  }
  if (Object.keys(BOUND_BY).length !== 7) {
    miss(`all seven retired colours must name the components that bind them `
      + `(got ${Object.keys(BOUND_BY).length})`);
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

  // A DECLARATION NOTHING BINDS. Folklore by default — and the one exception, which provenance
  // created: a transcript rotates, so a row whose read is no longer on disk is unverifiable here
  // rather than gone. Deleting it on that basis is the silent deletion this repo forbids.
  {
    const decl = new Map([
      ['still/bound', 'pending: because'],
      ['nothing/binds', 'pending: because'],
      ['read/rotated', 'unverifiable: the read that established this is no longer on disk'],
    ]);
    const bound = new Map([['still/bound', 'pending: because']]);
    const c = classifyDeclared(decl, bound);
    if (!c.stale.includes('nothing/binds')) miss('a declaration nothing binds is STALE and must fail');
    if (c.stale.includes('read/rotated')) {
      miss('a row whose read has rotated off disk is not folklore — absence from a rotated '
        + 'transcript is not absence from Figma');
    }
    if (!c.unverifiable.includes('read/rotated')) {
      miss('an `unverifiable:` row must be COUNTED and NAMED, not silently passed');
    }
    if (c.stale.includes('still/bound') || c.unverifiable.includes('still/bound')) {
      miss('a declaration something still binds is neither stale nor unverifiable');
    }
    // And the marker must not be a way to excuse anything: only the row that carries it.
    if (c.unverifiable.includes('nothing/binds')) miss('`unverifiable:` excuses only the row it is on');
  }

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
