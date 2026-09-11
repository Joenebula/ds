#!/usr/bin/env node
// Pulls variant colour-binding batches out of the session transcripts and merges them into
// tokens/_raw/component-variants.tsv.
//
//   node scripts/extract-variants.mjs                    report only, touch nothing
//   node scripts/extract-variants.mjs --write            apply additions
//   node scripts/extract-variants.mjs --write --update   apply additions AND corrections
//   node scripts/extract-variants.mjs --self-test
//
// Why read the transcript rather than retype the batches: the data is already on disk once the
// tool result lands, and retyping 300+ rows into the conversation buys nothing but a chance to
// mistype one. It is also what makes a run resumable — a Figma disconnection mid-extract costs
// nothing, because every landed read is already durable.
//
// Each batch is a Figma read of one page. EVERY COLUMN IS PRESENT, including empty trailing
// ones — a batch truncated mid-row is otherwise indistinguishable from a complete one:
//
//   PAGE\t<page name>
//   COUNT <n>
//   <component set>\t<variant>\t<fill>\t<stroke>\t<text>\t<nodeId>
//
// where the colour columns hold the bound VARIABLE name, the literal string LITERAL for a raw
// unbound paint, or empty for no paint at all.
//
// THIS SCRIPT USED TO BE UNABLE TO CORRECT ANYTHING. A component already in the file could gain
// new variants but never fix an existing one: a fill that moved to a different token in Figma
// was dropped in silence. `--update` is that repair, and a difference is REPORTED either way.
//
// THE NODE ID IS THE IDENTITY. Matching on the component name could not tell a rename from a
// deletion plus an addition — the comparison that produced "7 gone, 27 new" when the truth was
// "5 renamed, 2 removed, 22 newly captured".
import { readFileSync, writeFileSync } from 'node:fs';
import { TRANSCRIPT_DIR, transcriptFiles, scrapeBatches, parseBatch } from './lib/transcript.mjs';

const TSV = 'tokens/_raw/component-variants.tsv';
const REASONS = 'tokens/_raw/uncaptured-reasons.tsv';
const COLUMNS = 6;                       // the batch shape, nodeId last
const key = (n) => String(n || '').trim();

// ---- 1. read the batches ----------------------------------------------------
// A page is often read more than once — first its variant sets, later only its plain components
// — and letting the second read replace the first silently discarded everything the first had
// found. Merge per row, with a later read of the same component+variant winning.
export function readBatches(batches) {
  const byPage = new Map();
  const errors = [];
  for (const b of batches) {
    const p = parseBatch(b, { headerLines: 2, columns: COLUMNS, label: 'PAGE' });
    errors.push(...p.errors);
    if (p.errors.length) continue;       // never half-import a batch we know is damaged
    const page = key(p.header[0].split('\t')[1]);
    if (!byPage.has(page)) byPage.set(page, new Map());
    const rows = byPage.get(page);
    for (const line of p.lines) {
      const c = line.split('\t');
      if (!key(c[0])) continue;
      // LITERAL means Figma painted a raw colour with no variable behind it. Recording it as a
      // token would be a lie, and recording the hex would break dark mode — so it is dropped
      // here and reported at the end as a gap in the Figma file.
      const clean = (s) => (s && s !== 'LITERAL' ? s : '');
      // Separator is a TAB, which a name cannot contain because the row was split on tabs. The
      // version of this script that shipped used a literal NUL byte here, and a NUL in the source
      // makes git treat the whole file as binary — every diff of this extractor since it was
      // written read `Bin 12143 -> 23985 bytes` and could not be reviewed.
      rows.set(key(c[0]) + '\t' + key(c[1]), {
        component: key(c[0]), variant: key(c[1]),
        fill: clean(c[2]), stroke: clean(c[3]), text: clean(c[4]), nodeId: key(c[5]),
      });
    }
  }
  for (const [page, rows] of byPage) byPage.set(page, [...rows.values()]);
  return { byPage, errors };
}

// ---- 2. collapse axes that never change the colours -------------------------
// Figma variant sets carry axes that have nothing to do with colour — Darkmode (the CSS tokens
// already handle both modes), Mobile, Full width, Label. Carrying them into the stylesheet would
// force `data-full-width="Yes"` on every input before it took any style at all. An axis is
// redundant when dropping it leaves no contradiction: every group of rows that collapses
// together agrees on each colour, ignoring blanks.
const parse = (v) => v.split(',').map((p) => p.trim()).filter(Boolean)
  .map((p) => { const i = p.indexOf('='); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; });
const fmt = (pairs) => pairs.map(([k, v]) => `${k}=${v}`).join(', ');

export function collapse(rows) {
  let cur = rows.map((r) => ({ ...r, pairs: parse(r.variant) }));
  const axes = cur.length ? cur[0].pairs.map(([k]) => k) : [];
  const dropped = [];
  for (const axis of axes) {
    const groups = new Map();
    let ok = true;
    for (const r of cur) {
      const k = fmt(r.pairs.filter(([a]) => a !== axis));
      if (!groups.has(k)) groups.set(k, { fill: new Set(), stroke: new Set(), text: new Set() });
      const g = groups.get(k);
      for (const p of ['fill', 'stroke', 'text']) if (r[p]) g[p].add(r[p]);
    }
    for (const g of groups.values())
      for (const p of ['fill', 'stroke', 'text']) if (g[p].size > 1) ok = false;
    if (!ok) continue;
    const merged = new Map();
    for (const r of cur) {
      const pairs = r.pairs.filter(([a]) => a !== axis);
      const k = fmt(pairs);
      if (!merged.has(k)) merged.set(k, { component: r.component, variant: k, pairs, nodeId: r.nodeId, fill: '', stroke: '', text: '' });
      const m = merged.get(k);
      for (const p of ['fill', 'stroke', 'text']) if (r[p] && !m[p]) m[p] = r[p];
    }
    cur = [...merged.values()];
    dropped.push(axis);
  }
  return { rows: cur, dropped };
}

// Pages that are documentation about the design system rather than part of it — the wiki, the
// style guide, and the document-management page (Miro/Storybook/Azure logos, "Dos and don'ts"
// panels). Their components are not product UI and would clutter the library with classes
// nobody should ever use on a screen.
const DOC_PAGE = /^(📄|📚|🎨)/;
// Components whose variant axis is sample CONTENT, not design. `People` has one variant per
// fictional employee — 300+ of them — all binding the same two text colours.
const MOCK_CONTENT = new Set(['People']);
const DEFAULT_NAME = /^(Component|Frame|Group|Rectangle|Ellipse|Vector)\s+\d+$/i;

// ---- 3. merge into the existing extract --------------------------------------
export function merge(text, byPage, { update = false } = {}) {
  const lines = text.replace(/\n+$/, '').split('\n');
  const header = lines[0].split('\t');
  const width = header.length;
  const col = (n) => { const i = header.indexOf(n); if (i === -1) throw new Error(`no "${n}" column`); return i; };
  const I = { page: col('page'), component: col('component'), variant: col('variant'),
              fill: col('fill'), stroke: col('stroke'), text: col('text'), nodeId: col('nodeId') };

  // Pad to the header width so a cell always means the column it is named after.
  const rows = lines.slice(1).map((raw) => {
    const cells = raw.split('\t');
    while (cells.length < width) cells.push('');
    return { raw, cells, dirty: false, seen: false };
  });
  const byId = new Map(); const byName = new Map();
  for (const r of rows) {
    const id = key(r.cells[I.nodeId]); const nm = key(r.cells[I.component]);
    if (id) { if (!byId.has(id)) byId.set(id, []); byId.get(id).push(r); }
    if (!byName.has(nm)) byName.set(nm, []); byName.get(nm).push(r);
  }
  const axesOf = (variant) => parse(variant).map(([k]) => k).sort().join('|');
  const emit = (cells) => { const c = [...cells]; while (c.length && !c[c.length - 1]) c.pop(); return c.join('\t'); };

  const added = []; const extended = []; const changed = []; const skipped = [];
  const collapsedNote = []; let unchanged = 0;
  // component -> why it is not in the library. Written out so the gallery can say why a
  // component is missing instead of just omitting it. "No reason recorded" is the one answer a
  // design system should never give.
  const reasons = new Map();
  const because = (component, page, reason) => {
    reasons.set(component, { page, reason });
    skipped.push(`${component} (${page}) — ${reason}`);
  };

  for (const [page, pageRows] of byPage) {
    if (DOC_PAGE.test(page)) {
      for (const c of new Set(pageRows.map((r) => r.component)))
        because(c, page, 'on a documentation page — describes the design system rather than being part of it');
      continue;
    }
    const byComponent = new Map();
    for (const r of pageRows) {
      if (!byComponent.has(r.component)) byComponent.set(r.component, []);
      byComponent.get(r.component).push(r);
    }
    for (const [component, rs] of byComponent) {
      // Figma's own default names — an unnamed component someone forgot to delete. Importing it
      // would put a `.pf-component-1` in the library and a nonsense row in the gallery.
      if (DEFAULT_NAME.test(component)) {
        because(component, page, 'carries a Figma default name — an unnamed component, not part of the system');
        continue;
      }
      if (MOCK_CONTENT.has(component)) {
        because(component, page, 'its variants are sample content (one per fictional employee), not design');
        continue;
      }
      const { rows: cr, dropped } = collapse(rs);
      if (dropped.length) collapsedNote.push(`${component}: dropped ${dropped.join(', ')}`);
      const live = cr.filter((r) => r.fill || r.stroke || r.text);
      if (!live.length) { because(component, page, 'no variant binds a colour variable in Figma — nothing to put in a stylesheet'); continue; }

      const id = key(rs[0].nodeId);
      const mine = (id && byId.get(id)) || byName.get(component) || [];
      if (!mine.length) {
        for (const r of live) {
          const cells = Array(width).fill('');
          cells[I.page] = page; cells[I.component] = component; cells[I.variant] = r.variant;
          cells[I.fill] = r.fill; cells[I.stroke] = r.stroke; cells[I.text] = r.text; cells[I.nodeId] = id;
          added.push({ page, component, variant: r.variant, line: emit(cells) });
        }
        continue;
      }

      // A rename shows up here as one line that says so, rather than as a deletion plus an
      // addition — which is the whole reason the id is carried.
      const wasCalled = key(mine[0].cells[I.component]);
      if (id && wasCalled !== component) {
        changed.push({ component: wasCalled, variant: `${mine.length} rows`, diffs: [{ field: 'component', from: wasCalled, to: component }] });
        if (update) for (const r of mine) { r.cells[I.component] = component; r.dirty = true; }
      }

      // Only extend a captured component when the new rows use the SAME axes. A row with a
      // different axis shape would not be selected by the markup already written against it, so
      // importing it would silently do nothing at best.
      const want = axesOf(key(mine[0].cells[I.variant]));
      const have = new Map(mine.map((r) => [key(r.cells[I.variant]), r]));

      // THE ONE-ROW CASE. collapse() drops every axis of a component Figma gives a single variant,
      // so a re-read of `Image picker` yields variant "" while the captured row says
      // "Property 1=Default". The axis guard then refuses it, and a single-variant component can
      // never be corrected — which is how `.pf-image-picker` kept shipping `background: transparent`
      // when Figma paints Border/Form input across the whole panel.
      //
      // When the component has exactly ONE captured row and the re-read yields exactly ONE live
      // row, there is nothing to match ambiguously: they are the same row whatever the axis is
      // spelled. Pair them and keep the captured spelling, so the class and its data attribute are
      // untouched. Any other shape still goes through the guard.
      const onlyRow = mine.length === 1 && live.length === 1 ? key(mine[0].cells[I.variant]) : null;

      for (const r of live) {
        if (onlyRow !== null) { r.variant = onlyRow; }
        else if (axesOf(r.variant) !== want) { skipped.push(`${component} — ${r.variant}: axes differ from the captured rows (${want})`); continue; }
        const target = have.get(r.variant);
        if (!target) {
          const cells = Array(width).fill('');
          cells[I.page] = page; cells[I.component] = component; cells[I.variant] = r.variant;
          cells[I.fill] = r.fill; cells[I.stroke] = r.stroke; cells[I.text] = r.text; cells[I.nodeId] = id;
          extended.push({ page, component, variant: r.variant, line: emit(cells) });
          continue;
        }
        target.seen = true;
        const diffs = [];
        for (const f of ['page', 'fill', 'stroke', 'text']) {
          const to = f === 'page' ? page : r[f];
          if ((target.cells[I[f]] || '') !== to) diffs.push({ field: f, from: target.cells[I[f]] || '', to });
        }
        const fillsId = id && !key(target.cells[I.nodeId]);
        if (!diffs.length && !fillsId) { unchanged++; continue; }
        changed.push({ component, variant: r.variant, diffs, fillsId });
        if (update) {
          for (const d of diffs) target.cells[I[d.field]] = d.to;
          if (fillsId) target.cells[I.nodeId] = id;
          target.dirty = true;
        }
      }
    }
  }

  // A captured variant that this re-read did not produce. NEVER removed automatically: a batch
  // legitimately covers only part of a page (the original extraction read variant sets first and
  // plain components later), so absence from one read is not absence from Figma. It is reported
  // so a person can decide, which is the same rule the drift check applies to an uncaptured
  // component — an unexplained absence is a question, not a silent deletion.
  const readComponents = new Set();
  for (const [page, pageRows] of byPage) if (!DOC_PAGE.test(page)) for (const r of pageRows) readComponents.add(r.component);
  const gone = rows.filter((r) => !r.seen && readComponents.has(key(r.cells[I.component])))
    .map((r) => `${key(r.cells[I.component])} — ${key(r.cells[I.variant])}`);

  const out = [lines[0], ...rows.map((r) => (r.dirty ? emit(r.cells) : r.raw)),
               ...added.map((a) => a.line), ...extended.map((e) => e.line)];
  return { text: out.join('\n') + '\n', added, extended, changed, skipped, collapsedNote,
           reasons, unchanged, gone,
           unidentified: rows.filter((r) => !key(r.cells[I.nodeId])).length };
}

function main() {
  const write = process.argv.includes('--write');
  const update = process.argv.includes('--update');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = args.length ? args.map((p) => ({ path: p })) : transcriptFiles(TRANSCRIPT_DIR);
  if (!files.length) { console.error(`no transcripts in ${TRANSCRIPT_DIR}`); process.exit(1); }

  const batches = scrapeBatches(files.map((f) => f.path), /^PAGE\t.+\nCOUNT \d+/);
  const { byPage, errors } = readBatches(batches);

  console.log(`transcripts read      : ${files.length}`);
  console.log(`batches parsed        : ${batches.length} (${[...byPage.keys()].join(', ')})`);
  if (errors.length) {
    console.log(`DAMAGED BATCHES       : ${errors.length}`);
    for (const e of errors) console.log(`    ${e}`);
    console.error('\nrefusing to write. A batch that disagrees with its own COUNT is a truncated '
      + 'read, and importing it would leave a partial extract looking like a complete one. '
      + 'Re-read the page and run again.');
    process.exit(1);
  }
  if (!byPage.size) { console.error('no variant batches found in the transcripts'); process.exit(1); }

  const r = merge(readFileSync(TSV, 'utf8'), byPage, { update });

  // A documentation page is excluded as a whole, so the reason applies to every component on it
  // — including the ones no read happened to cover. Take those from the inventory rather than
  // only from what was read, or the gallery reports them as unexplained.
  for (const c of JSON.parse(readFileSync('tokens/_raw/components.json', 'utf8'))) {
    const page = key(c.pageName);
    if (DOC_PAGE.test(page) && !r.reasons.has(c.name))
      r.reasons.set(c.name, { page, reason: 'on a documentation page — describes the design system rather than being part of it' });
  }

  console.log(`redundant axes dropped: ${r.collapsedNote.length}`);
  for (const n of r.collapsedNote) console.log(`    ${n}`);
  console.log(`new components        : ${new Set(r.added.map((x) => x.component)).size} (${r.added.length} variants)`);
  console.log(`extended components   : ${new Set(r.extended.map((x) => x.component)).size} (${r.extended.length} variants)`);
  for (const x of r.extended) console.log(`    ${x.component} — ${x.variant}`);
  console.log(`${update ? 'changed' : 'WOULD CHANGE'}               : ${r.changed.length}`);
  for (const c of r.changed) {
    const what = c.diffs.map((d) => `${d.field} ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`);
    if (c.fillsId) what.push('nodeId filled in');
    console.log(`    ${c.component} — ${c.variant}: ${what.join('; ')}`);
  }
  console.log(`unchanged             : ${r.unchanged}`);
  if (r.gone.length) {
    console.log(`CAPTURED BUT NOT RE-READ: ${r.gone.length} (left in place — decide, do not assume)`);
    for (const g of r.gone) console.log(`    ${g}`);
  }
  if (r.skipped.length) {
    console.log(`not imported          : ${r.skipped.length}`);
    for (const s of r.skipped) console.log(`    ${s}`);
  }

  if (write) {
    writeFileSync(TSV, r.text);
    // Merge with what is already recorded: one run only reads the pages it was given, and
    // forgetting last run's reasons would make the gallery claim a component is unexplained.
    const prior = new Map();
    try {
      for (const l of readFileSync(REASONS, 'utf8').trim().split('\n').slice(1)) {
        const [component, page, reason] = l.split('\t');
        if (component) prior.set(component, { page, reason });
      }
    } catch { /* first run */ }
    for (const [k, v] of r.reasons) prior.set(k, v);
    writeFileSync(REASONS, 'component\tpage\treason\n'
      + [...prior.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([c, v]) => [c, v.page, v.reason].join('\t')).join('\n') + '\n');
    console.log(`\nwritten — ${r.text.trim().split('\n').length - 1} rows, ${r.unidentified} unidentified (no nodeId)`);
    console.log(`reasons recorded for ${prior.size} uncaptured components`);
    if (!update && r.changed.length) {
      console.log(`${r.changed.length} difference(s) were REPORTED AND NOT APPLIED — re-run with --update to apply them`);
    }
  } else console.log('\ndry run — pass --write to apply' + (r.changed.length && !update ? ', --update to apply corrections too' : ''));
}

// ---------------------------------------------------------------------------
function selfTest() {
  let failures = 0;
  const miss = (msg) => { failures++; console.log(`  MISS ${msg}`); };
  const H = 'page\tcomponent\tvariant\tfill\tstroke\ttext\tnodeId';
  // TWO variants with DIFFERENT fills. A component with a single variant has no meaningful axis,
  // so collapse() correctly drops it — a one-row fixture tests the collapse, not the merge.
  const src = `${H}
Forms\tButton\tType=Action\tBackground/Secondary Button\t\tText/Inverted primary\t1:2
Forms\tButton\tType=Hover\tBackground/Secondary Button Hover\t\tText/Inverted primary\t1:2
`;
  const page = (rows) => new Map([['Forms', rows]]);
  const btn = (over = {}) => [
    { component: 'Button', variant: 'Type=Action', fill: 'Background/Secondary Button', stroke: '', text: 'Text/Inverted primary', nodeId: '1:2', ...over },
    { component: 'Button', variant: 'Type=Hover', fill: 'Background/Secondary Button Hover', stroke: '', text: 'Text/Inverted primary', nodeId: '1:2', ...(over.component ? { component: over.component } : {}) },
  ];

  // THE CORRECTION CASE. Before, a fill that moved to a different token was dropped in silence.
  const moved = page(btn({ fill: 'Background/Primary Button' }));
  let r = merge(src, moved, { update: false });
  if (r.changed.length !== 1 || r.added.length || r.extended.length) miss(`a changed fill must be REPORTED (got ${JSON.stringify(r.changed)})`);
  if (r.text !== src) miss('without --update nothing may be written — a report is not a change');
  r = merge(src, moved, { update: true });
  if (!r.text.includes('Background/Primary Button')) miss('with --update the changed fill must actually land');
  if (!r.text.trim().endsWith('\t1:2')) miss('applying a correction must not drop the nodeId');

  // A RENAME must rewrite the rows, not add a second component.
  r = merge(src, page(btn({ component: 'Action button' })), { update: true });
  if (r.added.length) miss('a rename must not add a duplicate component');
  if ((r.text.match(/\tAction button\t/g) || []).length !== 2) miss('a rename must rewrite the name on EVERY row the id points at');
  if (!r.changed.some((c) => c.diffs.some((d) => d.field === 'component'))) miss('a rename must be reported as a rename');

  // Unchanged input must round-trip byte for byte.
  r = merge(src, page(btn()), { update: true });
  if (r.text !== src) miss('an untouched file must round-trip byte for byte');
  if (r.unchanged !== 2) miss(`an identical re-read must be counted as unchanged (got ${r.unchanged})`);
  if (r.gone.length) miss(`a complete re-read must report nothing missing (got ${JSON.stringify(r.gone)})`);

  // A new variant of a captured component extends it; a new component is added with its id.
  r = merge(src, page([...btn(),
    { component: 'Button', variant: 'Type=Ghost', fill: 'Background/Ghost', stroke: '', text: 'Text/Primary', nodeId: '1:2' },
    { component: 'Tag', variant: 'Type=Info', fill: 'Background/Tag', stroke: '', text: 'Text/Primary', nodeId: '9:9' },
    { component: 'Tag', variant: 'Type=Warn', fill: 'Background/Tag Warn', stroke: '', text: 'Text/Primary', nodeId: '9:9' },
  ]), { update: false });
  if (r.extended.length !== 1) miss(`a new variant of a captured component must extend it (got ${r.extended.length})`);
  if (r.added.length !== 2) miss(`a new component must be added with all its variants (got ${r.added.length})`);
  if (!r.added.every((a) => a.line.endsWith('\t9:9'))) miss('a new component must be added WITH its node id');

  // A variant captured but absent from the re-read is reported, NEVER silently deleted.
  r = merge(`${src}Forms\tButton\tType=Ghost\tBackground/Ghost\t\tText/Primary\t1:2\n`, page(btn()), { update: true });
  if (r.gone.length !== 1 || !r.gone[0].includes('Type=Ghost')) miss(`a captured variant missing from the re-read must be reported (got ${JSON.stringify(r.gone)})`);
  if (!r.text.includes('Type=Ghost')) miss('a captured variant missing from the re-read must NOT be deleted');

  // LITERAL is a raw unbound paint, not a token, and must never be recorded as one.
  const lit = readBatches(['PAGE\tForms\nCOUNT 1\nButton\tType=Action\tLITERAL\t\t\t1:2']);
  if (lit.byPage.get('Forms')[0].fill !== '') miss('LITERAL must be dropped, never recorded as a token');

  // A DAMAGED BATCH must never reach the merge.
  const bad = readBatches(['PAGE\tForms\nCOUNT 2\nButton\tType=Action\t\t\t\t1:2']);
  if (!bad.errors.length) miss('a batch short of its COUNT must be reported as damaged');
  if (bad.byPage.size) miss('a damaged batch must be imported from NOT AT ALL, not partially');

  // The documentation pages stay out, with a reason rather than a silence.
  r = merge(src, new Map([['\u{1F4DA} WIKI', [{ component: 'Wiki card', variant: 'Type=A', fill: 'x', stroke: '', text: '', nodeId: '5:5' }]]]), { update: true });
  if (r.added.length) miss('a documentation page must not enter the library');
  if (!r.reasons.has('Wiki card')) miss('an excluded component must get a recorded reason, never a silence');

  // THE ONE-ROW CASE: a single-variant component must be correctable despite collapse() emptying
  // its axis. Without this, `.pf-image-picker` could never be fixed.
  const one = `${H}\nControls\tImage picker\tProperty 1=Default\t\tBorder/Form input\t\t10306:112952\n`;
  r = merge(one, new Map([['Controls', [{ component: 'Image picker', variant: 'Property 1=Default', fill: 'Border/Form input', stroke: '', text: '', nodeId: '10306:112952' }]]]), { update: true });
  if (r.changed.length !== 1 || !r.changed[0].diffs.some((d) => d.field === 'fill')) {
    miss(`a single-variant component must be correctable, not refused on axis shape (got ${JSON.stringify(r.changed)})`);
  }
  if (!r.text.includes('Property 1=Default')) miss('the CAPTURED variant spelling must be kept, so the class and its data attribute do not move');
  if (r.skipped.some((x) => /axes differ/.test(x))) miss('the one-row case must not be reported as an axis mismatch');

  // ...but the guard must STILL hold when there is more than one row to match.
  const two = `${H}\nForms\tX\tA=1\tf1\t\t\t7:7\nForms\tX\tA=2\tf2\t\t\t7:7\n`;
  r = merge(two, new Map([['Forms', [
    { component: 'X', variant: 'B=1', fill: 'f1', stroke: '', text: '', nodeId: '7:7' },
    { component: 'X', variant: 'B=2', fill: 'f2', stroke: '', text: '', nodeId: '7:7' },
  ]]]), { update: true });
  if (!r.skipped.some((x) => /axes differ/.test(x))) miss('with more than one row the axis guard must still refuse a different axis shape');

  // A component that binds no colour variable at all is excluded WITH A REASON, not dropped.
  r = merge(src, page([{ component: 'Divider', variant: 'Type=A', fill: '', stroke: '', text: '', nodeId: '7:7' }]), { update: true });
  if (r.added.length) miss('a component binding no colour variable must not enter the library');
  if (!r.reasons.has('Divider')) miss('a component binding no colour must get a recorded reason');

  if (failures) { console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`); process.exit(1); }
  console.log('self-test passed — a changed binding is reported and, with --update, applied; a rename '
    + 'rewrites its rows instead of duplicating them; a captured variant missing from a re-read is '
    + 'reported and NOT deleted; LITERAL never becomes a token; and a truncated batch is not imported at all');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  main();
}
