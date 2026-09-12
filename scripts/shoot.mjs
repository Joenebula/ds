#!/usr/bin/env node
// Screenshots a built screen in light and dark, so someone can LOOK at it.
//
//   node scripts/shoot.mjs <built>.html [outDir] [--full]
//
// Every automated check on this project has passed at least once while the page was
// visibly broken — icons crushed to empty boxes, a form laid out sideways, hollow
// buttons rendering as filled pills. None of those were caught by a check. They were
// caught by looking, which is why this is a step and not an optional extra.
//
// Shoots the VIEWPORT by default, not the full page. A full-page capture flattens
// `position: sticky` — a pinned sidebar renders at its natural height and looks like it
// stops halfway down, and a sticky panel footer looks like it is clipping the content
// above it. Both read as layout bugs and neither is one. Pass --full when you want the
// whole document and know to discount that.
import { chromium } from 'playwright-core';
import { resolve, basename } from 'node:path';
import { mkdirSync } from 'node:fs';

const file = process.argv[2];
const outDir = (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : 'screenshots';
const full = process.argv.includes('--full');
// A design has a canvas width. Comparing a 1920 Figma frame against a 1440 render makes
// every proportion wrong before anything else is even looked at.
const wArg = process.argv.find(a => a.startsWith('--width='));
const VW = wArg ? parseInt(wArg.split('=')[1], 10) : 1440;
if (!file) { console.error('usage: node scripts/shoot.mjs <built>.html [outDir]'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const name = basename(file).replace(/\.html$/, '');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const theme of ['light', 'dark']) {
  const page = await (await browser.newContext({ viewport: { width: VW, height: 1080 } })).newPage();
  await page.goto('file://' + resolve(file));
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  // WAIT FOR THE PAGE TO SETTLE BEFORE PRESSING THE SHUTTER.
  //
  // Flipping `data-theme` changes every colour at once, and the screens give their chips and
  // buttons a 120ms colour transition. This shot was taken in the same tick as the flip, so
  // every dark screenshot this project has ever produced caught the page PART WAY BETWEEN the
  // two themes. Measured on `absence-requests`: the filter chips came out at 1.09:1 — a mid-fade
  // grey on a mid-fade grey — while the settled page reads 13.03:1. That was reported twice as
  // "the filter chips' dark mode colours are not correct". The colours were right; the picture
  // was wrong, and looking at it is the step this project treats as the final word.
  //
  // Fonts matter for the same reason: an unsettled webfont shoots the fallback face.
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))),
    new Promise(r => setTimeout(r, 2000)),   // an infinite animation must not hang the shot
  ]));
  // And SAY SO if it did not settle. A wait that silently was not long enough is the same
  // failure again, one layer up.
  const moved = await page.evaluate(async () => {
    const els = [...document.querySelectorAll('*')].slice(0, 400);
    const read = () => els.map(e => { const s = getComputedStyle(e); return s.color + s.backgroundColor + s.borderTopColor; }).join('|');
    const a = read();
    await new Promise(r => setTimeout(r, 150));
    return a !== read();
  });
  if (moved) console.error(`  WARNING ${name}.${theme} was still changing colour when it was shot`);
  const out = `${outDir}/${name}.${theme}${full ? '.full' : ''}.png`;
  await page.screenshot({ path: out, fullPage: full });
  console.log(out);
}
await browser.close();
