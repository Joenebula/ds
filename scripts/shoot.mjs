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

// THE THEME IS SET BEFORE THE FIRST PAINT, AND THE OS IS SET TO MATCH.
//
// This used to `goto` and then set `data-theme` on an already-rendered page. Chromium does
// not fully invalidate that: the custom property on an element reads the dark value, the
// only rule matching it is `color: var(--pf-text-primary)`, and the computed colour stays
// at the LIGHT one — a `cloneNode` of the same element resolves correctly, which is what
// says it is invalidation rather than cascade. Measured on four of the five screens in this
// repo: the Hollow button, the side-navigation tabs and the selected filter chip all shot
// in their light-mode colours on a dark page. Every dark screenshot here was wrong that way.
//
// `check-theme-paths.mjs` toggles the attribute the same way and is green, because it does
// it on a flat synthetic page of bare divs where the bug does not appear. It cannot see this.
//
// Two changes, and both are needed: `colorScheme` makes the browser paint its own surfaces
// for the right mode, and `addInitScript` puts the attribute on before anything renders, so
// there is no restyle to get wrong.
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: 1080 }, colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript(t => {
    document.addEventListener('DOMContentLoaded',
      () => document.documentElement.setAttribute('data-theme', t));
  }, theme);
  await page.goto('file://' + resolve(file));
  const out = `${outDir}/${name}.${theme}${full ? '.full' : ''}.png`;
  await page.screenshot({ path: out, fullPage: full });
  console.log(out);
  await ctx.close();
}
await browser.close();
