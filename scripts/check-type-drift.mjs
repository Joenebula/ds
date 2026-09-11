#!/usr/bin/env node
// Does text-styles.tsv still agree with Figma?
//
//   node scripts/check-type-drift.mjs
//   node scripts/check-type-drift.mjs --self-test
//
// WHY THIS EXISTS. `verify-type.mjs` checks `dist/type.css` against `text-styles.tsv`, and
// `build-type-css.mjs` generates the one from the other. So the type layer is internally
// consistent — and NOTHING checked the extract against Figma. That is precisely the hole the
// component extracts had before the re-extract, and the token layer had before tokens:check: two
// files agreeing with each other says nothing at all about whether either is right.
//
// It is the same shape as check-token-drift.mjs and shares its limits. No Figma calls: it reads
// the design-context responses already durable in the session transcripts, where Figma reports
// the styles a component uses verbatim —
//
//   These styles are contained in the design: Desktop text/Label text:
//   Font(family: "Open Sans", style: Regular, size: 13, weight: 400, lineHeight: 100,
//   letterSpacing: 0)
//
// — and compares each against the captured row.
//
// TWO THINGS MAKE A NAIVE COMPARISON WRONG, AND BOTH ARE THE POINT.
//
// 1. FIGMA REPORTS SOME VALUES AS VARIABLES, NOT LITERALS. `Desktop text/Body text` comes back as
//    `family: "Body", style: Weight/Regular, size: Size/S` — where the extract records
//    `16 / Regular`. Those are the SAME STYLE. Size/S is 16 and Weight/Bold is SemiBold, and both
//    live in other.json. Comparing the raw strings reports three differences that do not exist,
//    which is this repo's recurring failure: a mechanism that cannot distinguish two states
//    reporting the wrong one confidently.
//
// 2. TWO STYLES SHARE ONE NAME. `Desktop text/Button text` is captured twice — 16px sentence case
//    and 13px UPPER. A name alone cannot say which row a report refers to, so the match is on name
//    AND size, and a name whose reported size matches no captured row is a real difference rather
//    than a wrong pairing.
//
// 3. THE MARKER IS UNANCHORED, SO THIS REPO'S OWN SOURCE IS IN THE HAYSTACK. `scrapeBatches`
//    anchors a batch with `^` precisely so a format quoted in prose cannot be mistaken for data,
//    and that is not available here: Figma appends this marker at the END of a generated file, so
//    the string it sits in starts with code. Every transcript therefore also contains this
//    repo's own comments and self-test fixtures, which quote reports verbatim. The first live run
//    of this check scraped SIX such occurrences — `Font(...)` from a comment two screens up, a
//    `family: ' + '"Open Sans"` from a wrapped string literal, and a `weight: 300, …)` from an
//    ellipsis in backfill-text-weights.mjs — and, being last, one of them WON and reported a
//    difference that did not exist. Exactly the false positive tokens:check had.
//
//    Two mechanisms, because neither is sufficient alone:
//
//    A SHAPE GUARD. A genuine report always carries family, style, size and weight. An occurrence
//    missing any of them, or carrying an ellipsis or a JS string seam, MEASURED NOTHING — it is
//    rejected and COUNTED, never read as evidence of absence. (Today every rejection is this
//    repo's own source. The guard is written for truncation too: batches come under a 20KB cap,
//    and a half-arrived Font() is indistinguishable from a style that lost its letterSpacing.)
//
//    AGREEMENT INSTEAD OF LAST-WINS. 81 reads say Label text is 13/Regular and one junk string
//    said otherwise; last-wins picked the junk. Occurrences are now collated by name and RESOLVED
//    size, repeats reinforce, and a genuine disagreement is reported as a CONFLICT naming both
//    sides and their counts — never silently resolved by picking one. A check whose verdict can
//    be steered by whatever happened to be scraped last is not measuring Figma.
//
//    WHAT THIS STILL CANNOT DO. A verbatim, well-formed report quoted in a source comment is
//    byte-identical to a real one and passes both mechanisms — build-type-css.mjs's self-test
//    fixture is one, and it agrees with Figma so it changes nothing today. If such a fixture ever
//    went stale it would surface as a CONFLICT of 1 against 80-odd rather than as a verdict,
//    which is the right failure mode, but it is a limit and not a solved problem.
//
// COVERAGE IS REPORTED AND IS NOT A PASS. A style no component in these transcripts happens to use
// was never checked against anything. Saying "0 differences" while silently meaning "across half
// of them" is the `--` problem — a check that measured nothing reading exactly like one that
// passed. The unobserved ones are counted AND NAMED on every run.
import { readFileSync } from 'node:fs';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches } from './lib/transcript.mjs';

const TSV = 'tokens/_raw/text-styles.tsv';
const OTHER = 'tokens/_raw/other.json';

// The marker Figma appends to a design-context response that carries styles. Unanchored, because
// it sits at the end of the generated code rather than at the start of the string.
export const STYLE_BLOCK = /These styles are contained in the design/;

// `Desktop text/Label text: Font(...)`. Two constraints, and it is worth being exact about which
// one does what, because the first draft of this comment credited the wrong one.
//
// `Font\(` is what keeps the EFFECT styles out — Figma lists `Drop shadow: Effect(...)` in the
// same trailer, and it is not type.
//
// Requiring the name to START with `Desktop text/` or `Mobile text/` does something different and
// less obvious: it ANCHORS the name's left edge. Figma comma-separates the entries, so a pattern
// that merely forbids a colon walks backwards over the previous entry's tail and captures
// `"#517A38, Desktop text/Label text"` as the style name. That matches no captured row, so every
// one of them would be reported ABSENT — 27 false differences on the current transcripts. A
// mutation test caught exactly this: widening the name changed nothing about Effect styles,
// which is how the comment was found to be wrong.
//
// `[^:\n]` and `[^)\n]` are both deliberately newline-free: a Figma style name and its Font() are
// always on one line, and letting either span a newline is how a whole screen of quoted source
// code was scraped as a single "style name" on the first live run.
const STYLE = /((?:Desktop|Mobile) text\/[^:\n]+):\s*Font\(([^)\n]*)\)/g;

// A genuine report always carries these four. An occurrence missing one measured nothing.
const REQUIRED = ['family', 'style', 'size', 'weight'];
// A truncated response and a source-code quote both leave a tell inside the values: Figma's own
// `…`, or the `' + '` / `\n` seam of a wrapped JS string literal.
const NOT_A_VALUE = /…|\.\.\.|' \+ '|\\n|\\"/;

// Every occurrence, in order, with the malformed ones separated rather than dropped. Returns
// { styles: [{ name, fields }], rejected: [{ name, why }] } — the rejections are COUNTED by the
// caller, because a rising count means the haystack changed and nobody would otherwise notice.
export function scanStyles(text) {
  const styles = []; const rejected = [];
  for (const m of String(text).matchAll(STYLE)) {
    const name = m[1].trim().slice(0, 60);
    const raw = m[2];
    const fields = {};
    for (const part of raw.split(',')) {
      const i = part.indexOf(':');
      if (i > 0) fields[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    }
    const lacking = REQUIRED.filter((k) => fields[k] === undefined || fields[k] === '');
    if (lacking.length) { rejected.push({ name, why: `no ${lacking.join('/')}` }); continue; }
    if (NOT_A_VALUE.test(raw)) { rejected.push({ name, why: 'truncated or quoted source' }); continue; }
    styles.push({ name, fields });
  }
  return { styles, rejected };
}

// Fold every occurrence into one observation per name and RESOLVED size. Resolution comes first,
// because the same style is reported both ways — `Desktop text/Body text (semi bold, 600)` arrives
// 43 times as `Weight/Bold`/`Size/S` and 6 times as `SemiBold`/`16`, and those are one style, not
// a contradiction. What survives as a conflict is a real disagreement, and it is NEVER resolved
// here: both sides and their counts are reported and a person decides.
export function collate(styles, resolve) {
  const seen = new Map();
  for (const { name, fields } of styles) {
    const size = resolve(fields.size);
    const key = `${name}\u0000${size}`;
    const shape = `${resolve(fields.style)}\u0000${String(fields.letterSpacing ?? '').trim()}`;
    if (!seen.has(key)) seen.set(key, { name, size, counts: new Map() });
    const c = seen.get(key).counts;
    c.set(shape, (c.get(shape) || 0) + 1);
  }
  const observed = []; const conflicts = [];
  for (const { name, size, counts } of seen.values()) {
    const parts = [...counts].sort((a, b) => b[1] - a[1]);
    if (parts.length > 1) {
      conflicts.push(`CONFLICT "${name}" (${size}) is reported ${parts.length} different ways: `
        + parts.map(([sh, n]) => {
          const [st, ls] = sh.split('\u0000');
          return `${n}x ${st || '(none)'}/${ls || '(none)'}`;
        }).join(', ') + ' — not resolved here');
      continue;
    }
    const [style, letterSpacing] = parts[0][0].split('\u0000');
    observed.push({ name, size, style, letterSpacing });
  }
  return { observed, conflicts };
}

// Resolve a Figma variable name to its value. `Size/S` -> `16`, `Weight/Bold` -> `SemiBold`.
// Anything not a known variable is already a literal and passes through untouched.
export function resolver(other) {
  const by = new Map();
  for (const group of ['dimensions', 'typography']) {
    for (const e of (other && other[group]) || []) {
      if (e && e.name !== undefined) by.set(String(e.name), String(e.value));
    }
  }
  return (v) => {
    const s = String(v === undefined ? '' : v).trim().replace(/^"|"$/g, '');
    return by.has(s) ? by.get(s) : s;
  };
}

// ---------------------------------------------------------------------------
// `observed` is collate()'s list — already resolved and already agreed. judge() is now only the
// comparison against the captured rows.
export function judge(observed, captured) {
  // name -> every captured row under it, because two styles share the name `Button text`.
  const byName = new Map();
  for (const r of captured) {
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r);
  }

  const problems = []; const matched = new Set();
  for (const { name, size, style, letterSpacing } of observed) {
    const ls = String(letterSpacing || '').trim();
    const rows = byName.get(name) || [];

    if (!rows.length) {
      problems.push(`ABSENT   "${name}" is used in Figma and has no row in text-styles.tsv`);
      continue;
    }
    // Match on name AND size — a name alone cannot choose between the two Button text rows.
    const row = rows.find((r) => r.size === size);
    if (!row) {
      problems.push(`SIZE     "${name}": Figma reports ${size}, captured `
        + `${rows.map((r) => r.size).join(' / ')}`);
      continue;
    }
    matched.add(`${name} ${size}`);

    // The extract stores letterSpacing with a percent sign; Figma reports the number.
    if ((row.letterSpacing || '').replace(/%$/, '') !== ls) {
      problems.push(`SPACING  "${name}" (${size}): captured ${row.letterSpacing || '(none)'}, `
        + `Figma reports ${ls}`);
    }
    // A blank captured weight is deliberate — ten styles have no weight set in Figma at all — so
    // it is only a difference when Figma actually reports one AND the extract disagrees.
    if ((row.weight || '') !== style) {
      problems.push(`WEIGHT   "${name}" (${size}): captured ${row.weight || '(none)'}, `
        + `Figma reports ${style || '(none)'}`);
    }
  }

  // Everything the transcripts never showed. Not a failure — but never a pass either.
  const unobserved = captured
    .filter((r) => !matched.has(`${r.name} ${r.size}`))
    .map((r) => `${r.name} (${r.size})`)
    .sort();

  return { problems, checked: matched.size, unobserved };
}

export function readCaptured(text) {
  const lines = String(text).replace(/\n+$/, '').split('\n').filter((l) => l.trim());
  const header = lines[0].split('\t');
  const at = (c) => header.indexOf(c);
  return lines.slice(1).map((l) => {
    const c = l.split('\t');
    const g = (n) => (at(n) === -1 ? '' : (c[at(n)] || '').trim());
    return { name: g('name'), size: g('size'), weight: g('weight'), letterSpacing: g('letterSpacing') };
  }).filter((r) => r.name);
}

// ---------------------------------------------------------------------------
function main() {
  const files = transcriptFiles(TRANSCRIPT_DIR);
  const texts = scrapeBatches(files.map((f) => f.path), STYLE_BLOCK);

  const styles = []; const rejected = [];
  for (const t of texts) {
    const r = scanStyles(t);
    styles.push(...r.styles); rejected.push(...r.rejected);
  }

  const captured = readCaptured(readFileSync(TSV, 'utf8'));
  const resolve = resolver(JSON.parse(readFileSync(OTHER, 'utf8')));
  const { observed, conflicts } = collate(styles, resolve);
  const r = judge(observed, captured);

  console.log(`transcripts read  : ${files.length}`);
  console.log(`style blocks seen : ${texts.length}`);
  console.log(`reports scraped   : ${styles.length} usable, ${rejected.length} rejected`);
  console.log(`styles observed   : ${observed.length} distinct, ${captured.length} captured`);

  // Measuring nothing is not a pass — the same rule tokens:check follows.
  if (!observed.length) {
    console.log('\nno usable style report in any transcript, so NOTHING WAS MEASURED — this is not '
      + 'a pass. Run it in a session that has read components with get_design_context.');
    process.exit(2);
  }

  // Counted and named, never tidied away: a rejection is a report that measured nothing, and a
  // rising count is the only sign the haystack changed.
  if (rejected.length) {
    const why = new Map();
    for (const x of rejected) {
      const k = `${x.name} — ${x.why}`;
      why.set(k, (why.get(k) || 0) + 1);
    }
    console.log(`  rejected  ${rejected.length} occurrence(s) carried no measurement (truncated, or `
      + 'this repo\'s own source quoted into the transcript) and were NOT read as evidence:');
    for (const [k, n] of [...why].sort()) console.log(`      ${n}x  ${k}`);
  }

  for (const c of conflicts) console.log(`  ${c}`);
  for (const p of r.problems) console.log(`  ${p}`);
  if (r.unobserved.length) {
    console.log(`  not seen  ${r.unobserved.length} captured style(s) appear in no read here, so `
      + 'they were NOT checked against Figma:');
    for (const u of r.unobserved) console.log(`      ${u}`);
  }

  console.log(`\n${r.checked} style(s) verified against Figma, ${r.problems.length} difference(s), `
    + `${conflicts.length} conflict(s), ${r.unobserved.length} not seen (unchecked, not passed)`);
  process.exit(r.problems.length || conflicts.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
function selfTest() {
  let f = 0;
  const miss = (m) => { f++; console.log(`  MISS ${m}`); };
  const resolve = resolver({
    typography: [{ name: 'Size/S', value: 16 }, { name: 'Weight/Bold', value: 'SemiBold' },
      { name: 'Weight/Regular', value: 'Regular' }, { name: 'Body', value: 'Open Sans' }],
  });
  const cap = [
    { name: 'Desktop text/Body text', size: '16', weight: 'Regular', letterSpacing: '-1%' },
    { name: 'Desktop text/Button text', size: '16', weight: 'SemiBold', letterSpacing: '0%' },
    { name: 'Desktop text/Button text', size: '13', weight: 'SemiBold', letterSpacing: '0%' },
    { name: 'Desktop text/Tag text', size: '13', weight: '', letterSpacing: '-1%' },
  ];
  // One helper, so every case below goes through the whole pipeline rather than a hand-built
  // intermediate. A self-test that constructs collate()'s output by hand proves nothing about
  // collate().
  const run = (text, captured = cap) => {
    const sc = scanStyles(text);
    const c = collate(sc.styles, resolve);
    return { ...c, rejected: sc.rejected, ...judge(c.observed, captured) };
  };
  const report = (name, fields) => `These styles are contained in the design: ${name}: Font(${fields})`;
  const FULL = 'family: "Open Sans", style: Regular, size: 16, weight: 400, letterSpacing: -1';

  // The scraper must find a style in a real design-context trailer and ignore the effect styles
  // beside it — a Drop shadow is not type.
  const real = 'const a = 1;These styles are contained in the design: Desktop text/Label text: '
    + 'Font(family: "Open Sans", style: Regular, size: 13, weight: 400, lineHeight: 100, '
    + 'letterSpacing: 0), Drop shadow: Effect(type: DROP_SHADOW, radius: 4).';
  const got = scanStyles(real);
  // THE LEFT EDGE. Figma comma-separates the entries, so a name pattern that only forbids a colon
  // walks back over the previous entry and captures "#517A38, Desktop text/Label text". Nothing
  // matches that, so it reports ABSENT — 27 false differences on the current transcripts.
  const run_on = scanStyles('These styles are contained in the design: Desktop text/Sub heading: '
    + 'Font(family: "Open Sans", style: Regular, size: 20, weight: 400, letterSpacing: 0), '
    + 'Desktop text/Body text: Font(' + FULL + ')');
  if (run_on.styles.length !== 2) {
    miss(`both entries of a comma-separated trailer must be scraped (got ${run_on.styles.length})`);
  }
  if (run_on.styles.some((x) => x.name !== x.name.trim() || /[,#)]/.test(x.name))) {
    miss('a style name must start at its own left edge, not swallow the previous entry\'s tail '
      + `(got ${JSON.stringify(run_on.styles.map((x) => x.name))})`);
  }
  if (got.styles.length !== 1 || got.styles[0].name !== 'Desktop text/Label text') {
    miss(`a style must be scraped and an Effect must not (got ${JSON.stringify(got.styles.map((s) => s.name))})`);
  }
  if (got.styles[0] && got.styles[0].fields.size !== '13') miss('the fields must be parsed');

  // THE SHAPE GUARD. Every one of these was really scraped on the first live run, and every one
  // came from this repo's own source quoted into a transcript — not from Figma.
  const junk = [
    ['Desktop text/Label text', '...'],                                        // a comment
    ['Desktop text/Label text', "family: ' + '\"Open Sans\", style: Regular, size: 13, weight: 400"], // a wrapped string
    ['Desktop text/Large heading (light)', 'family: "Open Sans", style: Light, size: 24, weight: 300, …'], // an ellipsis
    ['Desktop text/Body text', 'family: "Open Sans", style: Regular, weight: 400'],  // no size: truncated
  ];
  for (const [n, fields] of junk) {
    const r = scanStyles(report(n, fields));
    if (r.styles.length) {
      miss(`an occurrence carrying no measurement must be REJECTED, not read as evidence: ${fields.slice(0, 40)}`);
    }
    if (r.rejected.length !== 1) miss(`a rejection must be counted and named: ${fields.slice(0, 40)}`);
  }
  // And the false positive it must not create: a whole report is not junk.
  if (scanStyles(report('Desktop text/Body text', FULL)).styles.length !== 1) {
    miss('a complete report must survive the shape guard — a guard that rejects everything is not a guard');
  }

  // THE BUG THIS REPLACED. 81 reads agreed, one junk string came last, and last-wins made the junk
  // the verdict. A rejected occurrence must not be able to displace 81 good ones.
  const many = Array(81).fill(report('Desktop text/Body text', FULL)).join('\n')
    + '\n' + report('Desktop text/Body text', '...');
  const r0 = run(many);
  if (r0.problems.length || r0.conflicts.length) {
    miss(`one junk occurrence must not outvote the real reads (got ${JSON.stringify([...r0.problems, ...r0.conflicts])})`);
  }
  if (r0.checked !== 1) miss('the agreed reads must still count as verified');

  // THE TRAP THIS CHECK EXISTS TO AVOID. Figma reports variable-bound values, the extract records
  // literals, and they are the SAME STYLE. Without resolution this reports false differences —
  // and reported BOTH WAYS in one run (which really happens, 43 times against 6) it would look
  // like a conflict rather than one style.
  const bothWays = report('Desktop text/Body text',
    'family: "Body", style: Weight/Regular, size: Size/S, weight: 400, letterSpacing: -1')
    + '\n' + report('Desktop text/Body text', FULL);
  const r1 = run(bothWays);
  if (r1.problems.length || r1.conflicts.length) {
    miss('a variable-bound report and a literal one of the SAME style must resolve to one '
      + `observation — Size/S IS 16 and Weight/Regular IS Regular (got ${JSON.stringify([...r1.problems, ...r1.conflicts])})`);
  }
  if (r1.observed.length !== 1) miss('resolution must collapse the two reports into one style');
  if (r1.checked !== 1) miss('a resolved match must count as verified');

  // A GENUINE disagreement is a conflict and must NOT be resolved by picking the popular one.
  const clash = Array(9).fill(report('Desktop text/Body text', FULL)).join('\n') + '\n'
    + report('Desktop text/Body text',
      'family: "Open Sans", style: SemiBold, size: 16, weight: 600, letterSpacing: -1');
  const r2 = run(clash);
  if (!r2.conflicts.length) miss('two reads that genuinely disagree must be reported as a CONFLICT');
  if (r2.conflicts.some((c) => !/9x/.test(c) || !/1x/.test(c))) {
    miss(`a conflict must name BOTH sides and their counts (got ${JSON.stringify(r2.conflicts)})`);
  }
  if (r2.checked !== 0) miss('a conflicted style is not verified — it has no agreed value to compare');

  // Real drift must still be caught.
  if (!run(report('Desktop text/Body text',
    'family: "Open Sans", style: SemiBold, size: 16, weight: 600, letterSpacing: -1'))
    .problems.some((p) => p.startsWith('WEIGHT'))) {
    miss('a genuinely changed weight must be reported');
  }
  if (!run(report('Desktop text/Body text',
    'family: "Open Sans", style: Regular, size: 16, weight: 400, letterSpacing: 0'))
    .problems.some((p) => p.startsWith('SPACING'))) {
    miss('a changed letterSpacing must be reported');
  }

  // TWO STYLES SHARE THE NAME `Button text`. The 13px report must pair with the 13px row, not the
  // 16px one — matching on name alone would silently compare the wrong pair and pass.
  if (run(report('Desktop text/Button text',
    'family: "Open Sans", style: SemiBold, size: 13, weight: 600, letterSpacing: 0')).problems.length) {
    miss('a duplicated style name must pair on SIZE — matching by name alone compares the wrong row');
  }
  // And they are two OBSERVATIONS, not a conflict: same name, different size, both real.
  const two = report('Desktop text/Button text', 'family: "Open Sans", style: SemiBold, size: 13, weight: 600, letterSpacing: 0')
    + '\n' + report('Desktop text/Button text', 'family: "Open Sans", style: SemiBold, size: 16, weight: 600, letterSpacing: 0');
  const r3 = run(two);
  if (r3.conflicts.length) miss('one name at two sizes is two styles, not a conflict');
  if (r3.checked !== 2) miss('both sizes of a shared name must be verified separately');

  if (!run(report('Desktop text/Button text',
    'family: "Open Sans", style: SemiBold, size: 99, weight: 600, letterSpacing: 0'))
    .problems.some((p) => p.startsWith('SIZE'))) {
    miss('a reported size matching no captured row is a difference, not a wrong pairing');
  }

  // A style Figma uses that the extract has never heard of.
  if (!run(report('Desktop text/Brand new', FULL)).problems.some((p) => p.startsWith('ABSENT'))) {
    miss('a style used in Figma with no captured row must be reported');
  }

  // COVERAGE. Verifying one style out of four is not a clean bill of health for four, and the
  // three nobody looked at have to be named or "0 differences" is a lie by omission.
  const r4 = run(report('Desktop text/Body text', FULL));
  if (r4.unobserved.length !== 3) {
    miss(`every captured style not seen must be counted as unchecked (got ${r4.unobserved.length})`);
  }
  if (!r4.unobserved.some((u) => u.includes('Tag text'))) miss('the unchecked styles must be NAMED');

  // A blank captured weight is deliberate — ten styles have no weight in Figma — so it must only
  // differ when Figma actually reports one.
  if (!run(report('Desktop text/Tag text',
    'family: "Open Sans", style: Regular, size: 13, weight: 400, letterSpacing: -1'))
    .problems.some((p) => p.startsWith('WEIGHT'))) {
    miss('a blank captured weight against a reported one is still a difference');
  }

  if (f) { console.log(`self-test FAILED — ${f} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — an occurrence carrying no measurement (an ellipsis, a wrapped '
    + 'string literal, a truncated Font) is rejected and counted rather than read as evidence, one '
    + 'junk read cannot outvote 81 good ones, a variable-bound report and a literal one of the same '
    + 'style resolve to ONE observation while a genuine disagreement is reported as a conflict '
    + 'naming both counts, two styles sharing a name pair on size, real weight and letterSpacing '
    + 'drift IS reported, and every captured style nobody looked at is counted and named');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
