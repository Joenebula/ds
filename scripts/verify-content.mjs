#!/usr/bin/env node
// Does the page SAY what the design says?
//
//   node scripts/verify-content.mjs prototypes/absence-requests.html
//
// WHY THIS EXISTS. `npm run verify` had four checks — geometry, colour, icons, tokens — and
// every one of them passed on a screen containing three fabricated strings: a card title that
// is empty in Figma, a second person who does not exist, and a tag whose wording was changed.
// Four checks measured how the page LOOKED. None measured what it SAID, so nothing could see
// content that had been invented.
//
// The fabrication came from building the screen off a 900px screenshot instead of extracting
// it. That is a process failure, and a process failure needs a check, because the next person
// (or the next model) will do the same thing on a tired afternoon.
//
// SUBSTITUTION MUST BE DECLARED. Personal data legitimately gets replaced in a prototype — the
// design carries a named disciplinary case. So the extract file holds an explicit
// `placeholders` map. A page string that matches neither a design string nor a declared
// substitution is an INVENTION and fails. That distinction is the whole check: the first build
// substituted nothing and invented three things, and there was no way to tell the difference
// from the outside.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

const file = process.argv[2];
if (file === '--self-test') { await selfTest(); process.exit(0); }
if (!file) { console.error('usage: verify-content.mjs <built-screen.html> | --self-test'); process.exit(2); }

const extractPath = file.replace(/\.html$/, '.figma.json');
if (!existsSync(extractPath)) {
  // A screen with no extract has nothing to be checked against. That is NOT a pass — it is the
  // same hole this check was written to close, so it exits vacuous (2) exactly like
  // verify-geometry does when it measures nothing.
  console.log(`no ${extractPath} — this screen has no saved Figma extract`);
  console.log('nothing to compare against — content NOT MEASURED');
  process.exit(2);
}
const design = JSON.parse(readFileSync(extractPath, 'utf8'));

// THE PAGE WALK, as a named function so `--self-test` can actually run it. It used to be an
// anonymous callback inline in `page.evaluate`, which meant the one piece of this check that
// decides WHAT COUNTS AS TEXT was the one piece no test could reach — and that is exactly
// where the blind spot below was hiding.
export function collectText() {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    // Decorative text is not design content: avatar initials and icon glyphs are aria-hidden,
    // and the page's own provenance footnote describes the page rather than the design.
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.closest('[data-provenance="note"]')) continue;
    // EACH ELEMENT'S OWN TEXT, not its subtree's. This used to skip any element with an
    // element child and read `textContent` on the rest — leaf-only, to stop an ancestor
    // reporting its children's words as its own. It also made a label beside an icon
    // INVISIBLE: `<button class="pf-button"><svg/>Action</button>` has an element child, so
    // the design string "Action" was reported MISSING from a page that renders it, and an
    // INVENTED one in the same position could never have been seen at all. Taking only the
    // element's direct text children fixes both and still cannot double-count, since every
    // text node belongs to exactly one element.
    const t = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!t) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    out.push({ text: t, fontSize: Math.round(parseFloat(cs.fontSize)), fontWeight: Number(cs.fontWeight),
      transform: cs.textTransform, tag: el.tagName.toLowerCase() });
  }
  return out;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ colorScheme: 'light' });
const page = await ctx.newPage();
await page.goto(file.startsWith('http') ? file : 'file://' + resolve(file));
await page.waitForLoadState('networkidle').catch(() => {});

// Every visible run of text on the page, with the type actually computed for it. Leaf nodes
// only — an ancestor would report its children's text as its own and the counts would inflate.
const onPage = await page.evaluate(collectText);
// Counted in the page, not from the text above: avatars are aria-hidden, so they are
// deliberately absent from `onPage`.
const gotPeople = await page.evaluate(() => document.querySelectorAll('[data-person]').length);
await ctx.close();
await browser.close();

// ---------------------------------------------------------------------------
// The comparison, kept pure: design facts + what the page rendered -> problems.
// Separated from the browser so `--self-test` can drive it with fixtures. A check
// that has only ever been seen to pass is not evidence (F-020).
export function compare(design, onPage, gotPeople) {
  const placeholders = { ...(design.placeholders || {}) };
  delete placeholders.comment;

  // What the page is ALLOWED to say: each design string, or its declared substitution.
  const expected = new Map();
  for (const t of design.text || []) {
    const content = norm(t.content);
    if (!content) continue;                                       // empty stays empty; checked below
    const allowed = norm(placeholders[t.content] ?? content);
    expected.set(allowed, t);
  }

  const problems = [];
  let matched = 0, typeChecked = 0, accepted = 0;

  // ---- 1. every design string is on the page ----------------------------------
  for (const [allowed, t] of expected) {
    const hit = onPage.find((p) => p.text === allowed);
    if (!hit) {
      problems.push(`MISSING  "${allowed}"${placeholders[t.content] ? ` (substituted for "${t.content}")` : ''} is in the design and not on the page`);
      continue;
    }
    matched++;
    // ---- 2. and carries the design's type -------------------------------------
    typeChecked++;
    const ok = t.accept || {};
    if (hit.fontSize !== t.fontSize && hit.fontSize !== ok.fontSize) {
      problems.push(`TYPE     "${allowed}" is ${hit.fontSize}px, Figma says ${t.fontSize}px`);
    } else if (ok.fontSize === hit.fontSize && hit.fontSize !== t.fontSize) accepted++;
    if (t.fontWeight && Math.abs(hit.fontWeight - t.fontWeight) > 50 && hit.fontWeight !== ok.fontWeight) {
      problems.push(`TYPE     "${allowed}" is weight ${hit.fontWeight}, Figma says ${t.fontWeight}`);
    } else if (ok.fontWeight === hit.fontWeight && hit.fontWeight !== t.fontWeight) accepted++;
    if (t.textTransform && hit.transform !== t.textTransform && hit.transform !== ok.textTransform) {
      problems.push(`TYPE     "${allowed}" is text-transform ${hit.transform}, Figma says ${t.textTransform}`);
    } else if (t.textTransform && ok.textTransform === hit.transform && hit.transform !== t.textTransform) accepted++;
  }

  // ---- 3. nothing on the page that the design does not have -------------------
  // The invention check, and the reason this file exists.
  const allowedSet = new Set(expected.keys());
  const invented = onPage.filter((p) => !allowedSet.has(p.text));
  for (const p of invented) {
    problems.push(`INVENTED "${p.text}" is on the page and in neither the design nor the declared placeholders`);
  }

  // ---- 4. an empty design string stays empty ----------------------------------
  for (const t of (design.text || []).filter((x) => x.empty)) {
    const stray = onPage.find((p) => p.fontSize === t.fontSize && p.fontWeight === t.fontWeight
      && !allowedSet.has(p.text));
    if (stray) problems.push(`EMPTY    node ${t.node} is empty in Figma; the page has "${stray.text}" at that type`);
  }

  // ---- 5. one person per card, where the design says so -----------------------
  // The invented second person carried no text of its own — its name shared a run with
  // the first. Counting strings therefore cannot see it, so this counts AVATARS.
  //
  // The page marks them `data-person`. That is a convention the page must keep, so a
  // missing mark is a FAILURE, not a skip: an unmarked page would otherwise count zero
  // and quietly agree with any design at all — the vacuity F-019 was about.
  const people = design.peoplePerCard || {};
  const wantPeople = Object.entries(people).filter(([k]) => k !== 'comment')
    .reduce((n, [, v]) => n + v, 0);
  if (wantPeople) {
    if (gotPeople === 0) {
      problems.push(`PEOPLE   the design has ${wantPeople} person avatar(s); the page marks none `
        + `with data-person, so the count cannot be checked`);
    } else if (gotPeople !== wantPeople) {
      problems.push(`PEOPLE   the design has ${wantPeople} person avatar(s) across its cards, the page has ${gotPeople}`);
    }
  }

  return { problems, matched, typeChecked, accepted, invented, expectedSize: expected.size };
}

const r = compare(design, onPage, gotPeople);
for (const p of r.problems) console.log(p);

console.log(`\n${r.matched} of ${r.expectedSize} design string(s) on the page, `
  + `${r.typeChecked} type check(s), ${r.invented.length} invented, `
  + `${r.accepted} declared divergence(s), ${r.problems.length} problem(s)`);

if (!r.expectedSize) {
  console.log('the extract declares no text — nothing measured');
  process.exit(2);
}
process.exit(r.problems.length ? 1 : 0);


// ---------------------------------------------------------------------------
// The WALK, tested in a real browser rather than against a fixture of its output. Everything
// else here drives `compare()` with hand-written `onPage` arrays, which cannot catch a walk
// that never produced the row in the first place — and that is precisely what was wrong:
// `.pf-button` holds an icon element and a text node, so the leaf-only rule skipped it and
// the design string "Action" was reported MISSING from a page that plainly renders it.
async function walkTest() {
  const html = `<!doctype html><meta charset="utf-8"><body>
    <button style="font-size:13px;font-weight:600"><svg width="16" height="16"></svg>Action</button>
    <p style="font-size:16px">Plain leaf</p>
    <div style="font-size:16px">Own words <em style="font-size:16px">and a child's</em></div>
    <span aria-hidden="true">Decoration</span>
    <p style="display:none">Hidden</p>
  </body>`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  await page.setContent(html);
  const got = await page.evaluate(collectText);
  await browser.close();

  const texts = got.map((g) => g.text);
  const cases = [
    ['a label beside an icon is SEEN', () => texts.includes('Action')],
    ['and carries its own type', () => {
      const a = got.find((g) => g.text === 'Action');
      return a && a.fontSize === 13 && a.fontWeight === 600;
    }],
    ['a plain leaf still counts once', () => texts.filter((t) => t === 'Plain leaf').length === 1],
    ["a parent reports its OWN words, not its child's", () => texts.includes('Own words')],
    ['and the child reports its own, separately', () => texts.includes("and a child's")],
    ['no element reports the whole subtree', () => !texts.some((t) => t.includes('Own words and'))],
    ['aria-hidden decoration stays out', () => !texts.includes('Decoration')],
    ['display:none stays out', () => !texts.includes('Hidden')],
  ];
  let bad = 0;
  for (const [name, fn] of cases) {
    const ok = fn();
    if (!ok) { bad++; console.log(`  MISS  walk: ${name}`); }
  }
  if (bad) { console.log(`self-test FAILED — ${bad} walk case(s)`); process.exit(1); }
  console.log(`  walk: ${cases.length} case(s) pass in a real browser`);
}

// ---------------------------------------------------------------------------
// --self-test. Every mutation below is a real defect that shipped in the first
// build of prototypes/absence-requests.html and passed all four existing checks. The
// test breaks a correct fixture one way at a time and asserts the break is seen.
// A check that has only ever been observed to pass is not evidence.
async function selfTest() {
  await walkTest();

  const design = {
    text: [
      { node: 'a', content: 'Nicholas Smudge', fontSize: 16, fontWeight: 400 },
      { node: 'b', content: 'Case raised', fontSize: 16, fontWeight: 600 },
      { node: 'c', content: 'In-progress', fontSize: 13, fontWeight: 400 },
      { node: 'd', content: '', raw: ' ', fontSize: 16, fontWeight: 600, empty: true },
      { node: 'e', content: 'CLOSE CASE', fontSize: 13, fontWeight: 400, textTransform: 'uppercase',
        accept: { fontWeight: 600, textTransform: 'none', why: 'library button' } },
    ],
    placeholders: { comment: 'x', 'Nicholas Smudge': 'Aisha Bello' },
    peoplePerCard: { comment: 'x', card1: 1, card2: 1 },
  };
  const clean = [
    { text: 'Aisha Bello', fontSize: 16, fontWeight: 400, transform: 'none' },
    { text: 'Case raised', fontSize: 16, fontWeight: 600, transform: 'none' },
    { text: 'In-progress', fontSize: 13, fontWeight: 400, transform: 'none' },
    { text: 'CLOSE CASE', fontSize: 13, fontWeight: 600, transform: 'none' },
  ];
  const copy = (a) => a.map((x) => ({ ...x }));

  const cases = [
    ['a correct page passes', clean, 2, null],
    ['an invented string',
      [...copy(clean), { text: 'Investigation meeting', fontSize: 16, fontWeight: 600, transform: 'none' }], 2, /INVENTED/],
    ['a string invented at the EMPTY node\'s type',
      [...copy(clean), { text: 'Investigation meeting', fontSize: 16, fontWeight: 600, transform: 'none' }], 2, /EMPTY/],
    ['a dropped design string', copy(clean).filter((p) => p.text !== 'Case raised'), 2, /MISSING/],
    ['a wrong font size',
      copy(clean).map((p) => (p.text === 'Case raised' ? { ...p, fontSize: 20 } : p)), 2, /TYPE .*20px, Figma says 16px/],
    ['a wrong font weight',
      copy(clean).map((p) => (p.text === 'Case raised' ? { ...p, fontWeight: 400 } : p)), 2, /TYPE .*weight 400/],
    ['an UNdeclared substitution is an invention',
      copy(clean).map((p) => (p.text === 'Aisha Bello' ? { ...p, text: 'Someone Else' } : p)), 2, /INVENTED "Someone Else"/],
    ['an invented extra person', clean, 3, /PEOPLE .*2 person avatar\(s\) across its cards, the page has 3/],
    ['avatars left unmarked is a FAILURE, not a skip', clean, 0, /the page marks none/],
  ];

  let failures = 0;
  for (const [name, onPage, people, want] of cases) {
    const { problems } = compare(design, onPage, people);
    const hit = want ? problems.some((p) => want.test(p)) : problems.length === 0;
    if (!hit) {
      failures++;
      console.log(`  MISS ${name}`);
      for (const p of problems) console.log(`         ${p}`);
      if (want) console.log(`         expected a problem matching ${want}`);
    }
  }

  // The declared-divergence escape must NOT swallow a real defect: the button fixture
  // accepts weight 600 and transform none, and must still fail on the wrong SIZE.
  const { problems: sized } = compare(design,
    copy(clean).map((p) => (p.text === 'CLOSE CASE' ? { ...p, fontSize: 16 } : p)), 2);
  if (!sized.some((p) => /TYPE .*CLOSE CASE.* is 16px/.test(p))) {
    failures++;
    console.log('  MISS an `accept` block must only excuse what it names');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught an invented string, a string at the empty '
    + "node's type, a dropped string, a wrong size, a wrong weight, an undeclared substitution, "
    + 'an extra person, unmarked avatars, and an `accept` block excusing more than it names');
}
