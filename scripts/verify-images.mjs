#!/usr/bin/env node
// Does every slot that claims a picture actually paint one?
//
//   node scripts/verify-images.mjs prototypes/case-three-stages.html
//   node scripts/verify-images.mjs --self-test
//
// WHY THIS EXISTS. `dist/avatars.css` was written so that "a missing file degrades to a
// monogram instead of an empty circle". That is a good failure mode and a terrible report:
// the page looks deliberate either way, and for a full day every avatar on every screen was
// a monogram while nine checks called the screens green. The user's requirement is one line
// — "as long as there is an image when one is required" — and nothing measured it.
//
// Same shape as F-020 through F-025: a mechanism that cannot distinguish two states reports
// the wrong one confidently. Here the states are "the photograph is here" and "the photograph
// never arrived", and a graceful fallback is precisely what makes them look identical.
//
// TWO RULES, and the first needs no extract, so it can never be vacuous on a page that uses it:
//
//   1. SELF-DECLARING. Any element carrying `data-avatar="x"` is claiming a photograph. If
//      no image paints, the claim is false. Markup asks the question; nothing needs declaring.
//   2. DECLARED. The extract's `images` block names slots Figma fills with a picture — a hero,
//      a video still, a card image. Each must paint. This is what stops a screen shipping with
//      a grey box where the design has a photograph.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

// ---------------------------------------------------------------------------
export async function measure(browser, url, selectors) {
  const ctx = await browser.newContext({ colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);

  const got = await page.evaluate((sels) => {
    // An <img> that failed to load reports naturalWidth 0. A background-image that was never
    // bound reports 'none'. Both are the empty state this check exists to name.
    const paints = (el) => {
      if (el.tagName === 'IMG') {
        return { kind: 'img', painted: el.complete && el.naturalWidth > 0, ref: el.getAttribute('src') || '' };
      }
      const bg = getComputedStyle(el).backgroundImage;
      const inner = el.querySelector('img');
      if (bg && bg !== 'none') return { kind: 'background', painted: true, ref: bg.slice(0, 60) };
      if (inner) return { kind: 'img', painted: inner.complete && inner.naturalWidth > 0, ref: inner.getAttribute('src') || '' };
      // An inline <svg> is drawn markup, not a photograph. Say which it is rather than
      // counting it as a picture — an icon standing in for a hero image is the defect.
      if (el.querySelector('svg')) return { kind: 'svg', painted: false, ref: 'inline <svg>' };
      return { kind: 'none', painted: false, ref: '' };
    };

    const avatars = [...document.querySelectorAll('[data-avatar]')].map((el) => ({
      key: el.getAttribute('data-avatar'),
      label: (el.textContent || '').trim(),
      ...paints(el),
    }));

    const declared = sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, missing: true };
      return { sel, ...paints(el) };
    });

    // Every person slot, whether or not it claims a photo — so the report can say how many
    // people are on the page and how many of them have a face.
    const people = document.querySelectorAll('[data-person]').length;
    return { avatars, declared, people };
  }, selectors);

  await ctx.close();
  return got;
}

// ---------------------------------------------------------------------------
// The judgement, pure so --self-test can drive it with fixtures.
export function judge(decls, got) {
  const problems = [];
  let checked = 0;

  for (const a of got.avatars) {
    checked++;
    if (!a.painted) {
      problems.push(`NO IMAGE data-avatar="${a.key}"${a.label ? ` (showing the monogram "${a.label}")` : ''}`
        + ' claims a photograph and paints none — no matching file in assets/avatars/');
    }
  }

  for (const d of decls) {
    const g = got.declared.find((x) => x.sel === d.selector);
    if (!g || g.missing) {
      problems.push(`MISSING  ${d.selector} (${d.name || 'declared in the extract'}) is not on this page`);
      continue;
    }
    checked++;
    if (!g.painted) {
      const why = g.kind === 'svg' ? 'an inline <svg> is drawn markup, not the photograph Figma places here'
        : g.kind === 'none' ? 'nothing is bound to it'
        : `the reference does not load (${g.ref.slice(0, 40) || 'empty src'})`;
      problems.push(`NO IMAGE ${d.selector} (${d.name || 'declared'}) paints no picture — ${why}`);
    }
  }

  return { problems, checked, people: got.people };
}

// ---------------------------------------------------------------------------
async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: verify-images.mjs <built-screen.html> | --self-test'); process.exit(2); }
  if (!existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }

  const extractPath = file.replace(/\.html$/, '.figma.json');
  const design = existsSync(extractPath) ? JSON.parse(readFileSync(extractPath, 'utf8')) : null;
  const decls = ((design && design.images) || []).filter((d) => d && d.selector);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const got = await measure(browser, file.startsWith('http') ? file : 'file://' + resolve(file),
    decls.map((d) => d.selector));
  await browser.close();

  // Nothing on the page claims a picture and the extract declares none. That is not a pass —
  // it is a screen this check cannot see. F-019.
  if (!got.avatars.length && !decls.length) {
    console.log(`no [data-avatar] on the page and no \`images\` block in ${extractPath}`);
    console.log('nothing claims a picture — images NOT MEASURED');
    process.exit(2);
  }

  const r = judge(decls, got);
  for (const p of r.problems) console.log(p);

  console.log(`\n${r.checked} image slot(s) checked across ${r.people} person slot(s), `
    + `${r.problems.length} painting nothing`);
  process.exit(r.problems.length ? 1 : 0);
}

// ---------------------------------------------------------------------------
// --self-test. The fixture is the real state of this repo: every avatar bound, no file behind
// any of them, and nine checks reporting green.
function selfTest() {
  const face = (key, painted) => ({ key, label: key.slice(0, 2).toUpperCase(), kind: 'background', painted, ref: 'url(data:image/png' });
  const slot = (sel, kind, painted) => ({ sel, kind, painted, ref: painted ? 'ok.png' : '' });
  const base = { avatars: [], declared: [], people: 0 };
  const hero = { selector: '.hero', name: 'hero image' };

  const cases = [
    ['a bound avatar with a real file behind it',
      [], { ...base, avatars: [face('samantha-stevens', true)], people: 1 }, null],
    ['a bound avatar with no file — the monogram that looked deliberate',
      [], { ...base, avatars: [face('nicholas-smudge', false)], people: 1 }, /NO IMAGE data-avatar="nicholas-smudge"/],
    ['a declared hero image that paints',
      [hero], { ...base, declared: [slot('.hero', 'img', true)] }, null],
    ['a declared hero image left as an empty box',
      [hero], { ...base, declared: [slot('.hero', 'none', false)] }, /paints no picture — nothing is bound/],
    ['an icon standing in for a photograph',
      [hero], { ...base, declared: [slot('.hero', 'svg', false)] }, /drawn markup, not the photograph/],
    ['a broken src',
      [hero], { ...base, declared: [slot('.hero', 'img', false)] }, /does not load/],
    ['a declared slot missing from the page',
      [hero], { ...base, declared: [{ sel: '.hero', missing: true }] }, /MISSING/],
    ['several avatars, one of them empty',
      [], { ...base, avatars: [face('a-one', true), face('b-two', false), face('c-three', true)], people: 3 },
      /data-avatar="b-two"/],
  ];

  let failures = 0;
  for (const [name, d, g, want] of cases) {
    const { problems } = judge(d, g);
    const hit = want ? problems.some((p) => want.test(p)) : problems.length === 0;
    if (!hit) {
      failures++;
      console.log(`  MISS ${name}`);
      for (const p of problems) console.log(`         ${p}`);
      if (want) console.log(`         expected a problem matching ${want}`);
    }
  }

  // The check must not be able to pass by counting slots it never looked at.
  const counted = judge([hero], { ...base, avatars: [face('x-y', true)], declared: [slot('.hero', 'img', true)], people: 1 });
  if (counted.checked !== 2) {
    failures++;
    console.log(`  MISS the tally must count every slot it judged (got ${counted.checked}, expected 2)`);
  }

  // And an implementation that always reports "painted" — the graceful-degradation bug itself —
  // must fail these cases rather than sail through them.
  const survives = cases.filter(([, , , want]) => want && !/MISSING/.test(String(want)))
    .filter(([, d, g]) => {
      const forced = { ...g,
        avatars: g.avatars.map((a) => ({ ...a, painted: true })),
        declared: g.declared.map((s) => ({ ...s, painted: true })) };
      return judge(d, forced).problems.length > 0;
    }).length;
  if (survives !== 0) {
    failures++;
    console.log('  MISS forcing every slot to "painted" must silence these cases — the guard is not measuring');
  }

  if (failures) {
    console.log(`self-test FAILED — ${failures} check(s) did not catch what they exist to catch`);
    process.exit(1);
  }
  console.log('self-test passed — the check caught a bound avatar with no file behind it, an empty '
    + 'hero slot, an icon standing in for a photograph, a broken src and a declared slot missing '
    + 'from the page, while passing a picture that actually paints');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) { selfTest(); process.exit(0); }
  await main();
}
