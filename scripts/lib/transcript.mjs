// Finding and validating the batches the extract scripts read out of session transcripts.
//
// WHY THIS FILE EXISTS. The four extract-*.mjs scripts each grew their own copy of the same
// three mechanisms, and all four copies carried the same two defects:
//
//   1. `readdirSync(dir).filter(...).sort().pop()` takes the lexicographically LAST FILENAME,
//      not the newest file, and takes exactly ONE of them. Transcript names are random uuids,
//      so "last" is arbitrary. Two of the four scripts OVERWRITE their output file, so a run
//      that spanned two sessions would rewrite the whole extract from half the batches and
//      report it as a success.
//   2. Every batch header declares `COUNT n` and no script ever compared it to the rows it
//      parsed. Batches are emitted under a 20KB truncation cap, so a batch CAN arrive short —
//      and a short batch that reports success is a partial extract wearing a complete one's
//      clothes. That is the failure this repo keeps finding: a mechanism that cannot tell two
//      states apart reports the wrong one confidently.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const TRANSCRIPT_DIR = '/root/.claude/projects/-home-user-ds';

// Every transcript, OLDEST FIRST by mtime. Order matters: the scripts all resolve a collision
// by letting the later batch win, so "later in the list" must mean "read more recently".
// Filename order does not mean that and never did.
export function transcriptFiles(dir = TRANSCRIPT_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(dir, f))
    .map((p) => ({ path: p, mtime: statSync(p).mtimeMs, size: statSync(p).size }))
    .sort((a, b) => a.mtime - b.mtime);
}

// Every string anywhere in the transcript whose START matches. The `^` is load-bearing and the
// absence of the `m` flag is deliberate: the batch must be the first thing in its string value,
// so the format documented in CLAUDE.md or discussed in conversation cannot be mistaken for data.
export function scrapeBatches(paths, re) {
  const batches = [];
  const walk = (v) => {
    if (typeof v === 'string') { if (re.test(v)) batches.push(v); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const p of paths) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { walk(JSON.parse(line)); } catch { /* partial trailing line */ }
    }
  }
  return batches;
}

// ---------------------------------------------------------------------------
// FIGMA RESPONSES, BY PROVENANCE RATHER THAN BY SHAPE.
//
// scrapeBatches above keeps any string matching a regex, wherever it sits. For the BATCH markers
// that is right — a batch is anchored with `^` and cannot be confused with prose. For a FIGMA
// RESPONSE there is no anchor available: the markers the drift checks use (`data-node-id=`, and
// the style trailer) sit in the middle of a generated file, so a string that merely CONTAINS one
// matches. And this repo's own comments quote those formats verbatim, on purpose, to explain the
// parsers that read them.
//
// The result was the same defect five times: 133 unknown tokens for a real 2; the token check's
// own header scraped as a bound variable, five times; six of the type check's own comments scraped
// on its first live run, one of which — being last — won and reported a difference that did not
// exist; two more spellings of the same ellipsis today; and finally the very prompt that
// investigated the contamination, which matches both markers and is now in the transcript.
//
// Every one of those fixes was a CONTENT heuristic, and each closed a spelling rather than the
// class. This closes the class, because a transcript records WHO SAID IT:
//
//   a tool result   type:"user", a `tool_result` block in message.content[], carrying tool_use_id
//   its tool        that id equals the `id` of a `tool_use` block on an assistant record, which
//                   carries `name` (mcp__Figma__get_design_context) and `input` (fileKey, nodeId)
//
// Counted over the real transcript: of 156 strings matching the style marker, 127 are under a
// `mcp__Figma__*` result and 29 are not — and every one of the 29 resolves to Bash, Write or
// Agent. Of 326 matching `data-node-id=`, 302 against 24, the same way. There is no ambiguous
// middle: the filter removes 100% of the contamination and 0% of the real data.
//
// AND IT DEDUPES. Every result is stored TWICE — once in message.content[] and again in the
// top-level `toolUseResult` mirror (213 strings in both, 3 only in the mirror). So every count
// these checks have ever printed was roughly doubled. Keying by tool_use_id fixes that; the three
// mirror-only strings are the price, and a response that reached only the mirror is one this
// could not attribute anyway.
//
// A SEPARATE FUNCTION, NOT AN OPTION ON scrapeBatches. The five extract-*.mjs scripts must keep
// the old behaviour exactly: their batches arrive as BASH RESULTS — a script printed them — so any
// provenance rule written for Figma would zero them out. 0 of the 8 batches in this transcript
// survive a `mcp__Figma__` filter. Keeping the two apart is the whole point.
export const FIGMA_TOOL = /^mcp__Figma__/;

// Every tool call in a transcript: tool_use_id -> { name, input }.
export function toolCalls(text) {
  const calls = new Map();
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant') continue;
    const blocks = o.message && o.message.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b && b.type === 'tool_use' && b.id) {
        calls.set(b.id, { name: String(b.name || ''), input: b.input || {} });
      }
    }
  }
  return calls;
}

// Every string matching `re` that FIGMA actually returned, with what produced it.
//
// Returns { reads, unattributed, calls }, each read being { text, tool, fileKey, nodeId, id }.
// `fileKey` comes from the CALL's input rather than the response — a design-context response does
// not carry one, which is why this repo recorded file attribution as impossible. It is not: the
// join supplies it, and this transcript turns out to hold three different Figma files.
//
// `unattributed` counts matching strings inside a tool_result whose tool could not be resolved.
// It is NEVER silently dropped: a haystack that has quietly shrunk looks exactly like a clean run,
// which would be this same bug in a new place. Callers report it.
export function scrapeFigma(paths, re) {
  const reads = []; const seen = new Set();
  let unattributed = 0; let calls = 0;

  for (const p of paths) {
    const text = readFileSync(p, 'utf8');
    const byId = toolCalls(text);
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      if (o.type !== 'user') continue;
      const blocks = o.message && o.message.content;
      if (!Array.isArray(blocks)) continue;
      for (const b of blocks) {
        if (!b || b.type !== 'tool_result' || !b.tool_use_id) continue;
        // The canonical path ONLY. The top-level toolUseResult mirror is deliberately not walked —
        // reading both is what doubled every count this repo has printed.
        const hits = [];
        const collect = (v) => {
          if (typeof v === 'string') { if (re.test(v)) hits.push(v); }
          else if (Array.isArray(v)) v.forEach(collect);
          else if (v && typeof v === 'object') Object.values(v).forEach(collect);
        };
        collect(b.content);
        if (!hits.length) continue;

        const call = byId.get(b.tool_use_id);
        if (!call) { unattributed += hits.length; continue; }
        if (!FIGMA_TOOL.test(call.name)) continue;   // Bash, Write, Agent — us, not Figma
        calls++;
        for (const h of hits) {
          // Keyed by call AND content: one call returns several blocks, and the same block
          // re-delivered by that call is the same evidence rather than two votes.
          const k = `${b.tool_use_id} ${h}`;
          if (seen.has(k)) continue;
          seen.add(k);
          reads.push({
            text: h,
            tool: call.name,
            fileKey: String((call.input && call.input.fileKey) || ''),
            nodeId: String((call.input && call.input.nodeId) || ''),
            id: b.tool_use_id,
          });
        }
      }
    }
  }
  return { reads, unattributed, calls };
}

// Split a batch into its header and its data lines, and CHECK THE COUNT.
//
// `headerLines` is how many lines precede the data — 2 where the marker and `COUNT n` are on
// separate lines, 1 where the count rides on the marker line (the icon exports).
//
// Returns { header, lines, declared, errors }. `errors` is never a warning: every caller treats
// a non-empty errors array as a hard failure, because the two things it catches — a count that
// disagrees with the rows, and a row with the wrong number of columns — are both truncation.
export function parseBatch(text, { headerLines, columns, label = 'batch' }) {
  const all = text.replace(/\n+$/, '').split('\n');
  const header = all.slice(0, headerLines);
  const lines = all.slice(headerLines).filter((l) => l.trim());
  const m = header.join('\n').match(/COUNT (\d+)/);
  const declared = m ? +m[1] : null;
  const errors = [];
  const where = `${label} "${header[0].replace(/\t/g, ' ')}"`;

  if (declared === null) errors.push(`${where}: no COUNT in the header`);
  else if (lines.length !== declared) {
    errors.push(`${where}: COUNT says ${declared}, found ${lines.length} rows`
      + (lines.length < declared ? ' — TRUNCATED, the tail of this batch never arrived' : ''));
  }

  // Strict arity. A batch cut off mid-row leaves a final line with too few columns, and a row
  // count alone cannot see it: 10 whole rows plus one half row still counts as 11. The batch
  // format therefore carries every column including the empty trailing ones, so a short row is
  // always a broken row. (Trailing blanks are still dropped when a row is WRITTEN to the TSV —
  // that is the file's convention, not the wire format's.)
  if (columns) {
    lines.forEach((l, i) => {
      const n = l.split('\t').length;
      if (n !== columns) {
        errors.push(`${where}: row ${i + 1} has ${n} columns, expected ${columns} `
          + `— ${JSON.stringify(l.slice(0, 60))}`);
      }
    });
  }
  return { header, lines, declared, errors };
}

// ---------------------------------------------------------------------------
export function selfTest() {
  let failures = 0;
  const miss = (msg) => { failures++; console.log(`  MISS ${msg}`); };

  const good = 'PAGE\tForms\nCOUNT 2\na\tb\tc\nd\te\tf';
  let r = parseBatch(good, { headerLines: 2, columns: 3 });
  if (r.errors.length) miss(`a well-formed batch must pass (got ${JSON.stringify(r.errors)})`);
  if (r.lines.length !== 2 || r.declared !== 2) miss('a well-formed batch must parse its rows and count');

  // THE TRUNCATION CASE. This is the whole reason the file exists.
  r = parseBatch('PAGE\tForms\nCOUNT 3\na\tb\tc\nd\te\tf', { headerLines: 2, columns: 3 });
  if (!r.errors.some((e) => /TRUNCATED/.test(e))) miss('a batch short of its COUNT must fail, and say it was truncated');

  // A batch cut off MID-ROW still has the right number of lines. Only arity catches it.
  r = parseBatch('PAGE\tForms\nCOUNT 2\na\tb\tc\nd\te', { headerLines: 2, columns: 3 });
  if (!r.errors.some((e) => /expected 3/.test(e))) miss('a row with too few columns must fail even when the COUNT agrees');

  r = parseBatch('PAGE\tForms\nno count here\na\tb\tc', { headerLines: 2, columns: 3 });
  if (!r.errors.some((e) => /no COUNT/.test(e))) miss('a header with no COUNT must fail rather than skip the check');

  // One-line header, the icon-export shape.
  r = parseBatch('FROM 0 NEXT 2 OF 9 COUNT 2\n0\tTick\tx\n1\tFilter\ty', { headerLines: 1, columns: 3 });
  if (r.errors.length || r.declared !== 2) miss('a one-line header must take its COUNT from that line');

  // Blank lines are not rows.
  r = parseBatch('PAGE\tForms\nCOUNT 1\n\na\tb\tc\n\n', { headerLines: 2, columns: 3 });
  if (r.errors.length) miss('blank lines must not be counted as rows');

  // The anchor: a batch quoted inside prose must NOT be scraped.
  const re = /^PAGE\t.+\nCOUNT \d+/;
  if (re.test('Here is an example:\nPAGE\tForms\nCOUNT 1\na\tb\tc')) {
    miss('a batch quoted inside prose must not match — the ^ anchor is what keeps documentation out of the data');
  }
  if (!re.test('PAGE\tForms\nCOUNT 1\na\tb\tc')) miss('a real batch must match');

  // -------------------------------------------------------------------------
  // PROVENANCE. A synthetic transcript in the real shape: one Figma call and its result, one
  // Write whose INPUT is a source file quoting the same marker verbatim, and one Bash result
  // echoing it back. Only the first is Figma speaking, and all three are byte-identical in the
  // one thing scrapeBatches looks at.
  const MARK = 'These styles are contained in the design: X: Font(size: 13)';
  const A = `<div data-node-id="1:2"/>${MARK} A`;
  const MIRROR_ONLY = `${MARK} mirror-only`;   // 3 real strings reach only the mirror
  const C = `${MARK} C`; const D = `${MARK} D`;
  const rec = (o) => JSON.stringify(o);
  const jsonl = [
    rec({ type: 'assistant', uuid: 'a1', message: { content: [{ type: 'tool_use', id: 'tu_figma',
      name: 'mcp__Figma__get_design_context', input: { fileKey: 'KEY1', nodeId: '1:2' } }] } }),
    // One call, the SAME block delivered twice — that is one piece of evidence, not two votes.
    // And a mirror carrying something the canonical path does not: walking both is what doubled
    // every count this repo has ever printed.
    rec({ type: 'user', parentUuid: 'a1', message: { content: [{ type: 'tool_result',
      tool_use_id: 'tu_figma', content: [{ type: 'text', text: A }, { type: 'text', text: A }] }] },
    toolUseResult: [{ type: 'text', text: A }, { type: 'text', text: MIRROR_ONLY }] }),
    // A second call returning two DIFFERENT blocks — both are evidence and both must survive, or
    // a dedupe keyed on the call alone would silently throw one away.
    rec({ type: 'assistant', uuid: 'a1b', message: { content: [{ type: 'tool_use', id: 'tu_figma2',
      name: 'mcp__Figma__get_variable_defs', input: { fileKey: 'KEY1', nodeId: '9:9' } }] } }),
    rec({ type: 'user', parentUuid: 'a1b', message: { content: [{ type: 'tool_result',
      tool_use_id: 'tu_figma2', content: [{ type: 'text', text: C }, { type: 'text', text: D }] }] } }),
    rec({ type: 'assistant', uuid: 'a2', message: { content: [{ type: 'tool_use', id: 'tu_write',
      name: 'Write', input: { file_path: 'x.mjs', content: `// ${MARK}` } }] } }),
    rec({ type: 'user', parentUuid: 'a2', message: { content: [{ type: 'tool_result',
      tool_use_id: 'tu_write', content: [{ type: 'text', text: `wrote // ${MARK}` }] }] } }),
    rec({ type: 'assistant', uuid: 'a3', message: { content: [{ type: 'tool_use', id: 'tu_bash',
      name: 'Bash', input: { command: `cat x.mjs` } }] } }),
    rec({ type: 'user', parentUuid: 'a3', message: { content: [{ type: 'tool_result',
      tool_use_id: 'tu_bash', content: [{ type: 'text', text: `// ${MARK}` }] }] } }),
  ].join('\n');

  const dir = mkdtempSync(join(tmpdir(), 'pf-transcript-'));
  const file = join(dir, 'a.jsonl');
  try {
    writeFileSync(file, `${jsonl}\n`);
    const marker = /These styles are contained in the design/;

    // The state of play this replaces: the old scraper cannot tell the three apart.
    if (scrapeBatches([file], marker).length < 4) {
      miss('the un-provenanced scraper must still see all of them — that is the defect being fixed');
    }

    const r = scrapeFigma([file], marker);
    const got = r.reads.map((x) => x.text);
    // A (deduped from two identical blocks) + C + D. Not the mirror-only string, not the Write
    // input, not the Bash echo.
    if (got.length !== 3) {
      miss(`exactly the three distinct Figma blocks must survive (got ${got.length}: `
        + `${JSON.stringify(r.reads.map((x) => x.tool))})`);
    }
    if (r.reads.some((x) => !FIGMA_TOOL.test(x.tool))) {
      miss('a Write input or a Bash echo of the same bytes must never be read as a Figma response');
    }
    // THE MIRROR is not a second reading of anything. A string only it carries is one this cannot
    // attribute, and reading both paths is what doubled every count this repo has printed.
    if (got.some((t) => /mirror-only/.test(t))) {
      miss('the toolUseResult mirror must not be walked — it double-counts the canonical path');
    }
    // One call delivering the same block twice is ONE piece of evidence...
    if (got.filter((t) => / A$/.test(t)).length !== 1) {
      miss('a block delivered twice by one call must count once, not twice');
    }
    // ...but two DIFFERENT blocks from one call are two, or a dedupe keyed on the call alone
    // would throw evidence away while looking like it had deduped.
    if (!got.some((t) => / C$/.test(t)) || !got.some((t) => / D$/.test(t))) {
      miss(`two different blocks from one call are both evidence (got ${JSON.stringify(got)})`);
    }
    if (r.calls !== 2) miss(`each call must count once (got ${r.calls})`);

    // The file key comes from the CALL, which is the whole reason attribution is possible.
    const a = r.reads.find((x) => / A$/.test(x.text));
    if (a && a.fileKey !== 'KEY1') miss(`a read must carry the fileKey of the call that made it (got ${a.fileKey})`);
    if (a && a.nodeId !== '1:2') miss('a read must carry its nodeId too');

    // A result whose call is missing is UNATTRIBUTED and counted — never silently dropped, which
    // would be a quietly shrunken haystack wearing a clean run's clothes.
    const orphan = join(dir, 'b.jsonl');
    writeFileSync(orphan, `${rec({ type: 'user', message: { content: [{ type: 'tool_result',
      tool_use_id: 'tu_gone', content: [{ type: 'text', text: MARK }] }] } })}\n`);
    const o = scrapeFigma([orphan], marker);
    if (o.reads.length !== 0) miss('a result with no call is not attributable and must not be read');
    if (o.unattributed !== 1) miss(`an unattributable match must be COUNTED (got ${o.unattributed})`);

    // And the extractors' path must be untouched by any of this.
    if (scrapeBatches([file], /^PAGE\t/).length !== 0) miss('an anchored batch marker is unaffected');
  } finally { rmSync(dir, { recursive: true, force: true }); }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — a short batch, a mid-row truncation and a missing COUNT each fail, '
    + 'blank lines are not rows, a batch quoted in prose is not data, and a Figma response is told '
    + 'from a byte-identical Write input or Bash echo by WHO SAID IT rather than by what it looks '
    + 'like: the mirror copy counts once, the call supplies the fileKey and nodeId, and a result '
    + 'whose call is missing is counted as unattributable rather than quietly dropped');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  for (const f of transcriptFiles()) console.log(`${new Date(f.mtime).toISOString()}  ${(f.size / 1e6).toFixed(1)}MB  ${f.path}`);
}
