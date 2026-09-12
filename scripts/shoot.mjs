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
  const out = `${outDir}/${name}.${theme}${full ? '.full' : ''}.png`;
  await page.screenshot({ path: out, fullPage: full });
  console.log(out);
}
await browser.close();
