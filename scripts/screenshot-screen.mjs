#!/usr/bin/env node
// Screenshot a built screen in light and dark — and refuse if the type is wrong.
//
//   node scripts/screenshot-screen.mjs prototypes/case-summary.html [outDir]
//   node scripts/screenshot-screen.mjs prototypes/case-summary.html out --crop=.pf-tags
//
// WHY THIS REFUSES. CLAUDE.md's last line is "Always screenshot the result in light and dark
// and look at it before saying a screen is done." That was being done. Every one of those
// screenshots was in DejaVu Sans, because the font never loaded and nothing checked. Looking
// at the wrong typeface is not looking at the screen, and a screenshot that quietly shows the
// wrong face is worse than no screenshot: it is evidence, and it is false evidence.
//
// So the precondition lives in the tool rather than in someone's memory. If the page does not
// render in Open Sans, no PNG is written and the exit code is 1.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { chromium } from 'playwright-core';
import { measure, judge } from './verify-fonts.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: screenshot-screen.mjs <built-screen.html> [outDir] [--crop=<selector>]'); process.exit(2); }
if (!existsSync(file)) { console.error(`no such file: ${file}`); process.exit(2); }

const outDir = (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : 'screenshots';
const crop = (process.argv.find((a) => a.startsWith('--crop=')) || '').slice(7);
const width = Number((process.argv.find((a) => a.startsWith('--width=')) || '=640').split('=')[1]);
// Zoom for looking closely at one component. Ad-hoc one-off scripts are how this repo ended
// up with months of screenshots nobody could reproduce, so the zoom lives in the tool.
const scale = Number((process.argv.find((a) => a.startsWith('--scale=')) || '=2').split('=')[1]);
mkdirSync(outDir, { recursive: true });

const url = 'file://' + resolve(file);
const name = basename(file, '.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ---- the precondition, before a single pixel is written ----------------------
const m = await measure(browser, url);
const v = judge(m);
if (!v.checked) {
  console.log('no text on this page asks for Open Sans — nothing to screenshot honestly');
  await browser.close();
  process.exit(2);
}
if (v.problems.length) {
  for (const p of v.problems) console.log(p);
  console.log(`\nNOT screenshotting ${file} — the page does not render in Open Sans, so a PNG of it`);
  console.log('would be a picture of the wrong typeface. Fix the font layer, then shoot.');
  await browser.close();
  process.exit(1);
}

const written = [];
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 800 },
    deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);        // not networkidle — decoding lags it
  const path = `${outDir}/${name}-${theme}${crop ? '-crop' : ''}.png`;
  if (crop) {
    const el = page.locator(crop).first();
    if (!(await el.count())) { console.error(`--crop=${crop} matches nothing on this page`); process.exit(2); }
    await el.screenshot({ path });
  } else {
    await page.screenshot({ path, fullPage: true });
  }
  written.push(path);
  await ctx.close();
}
await browser.close();

console.log(`${v.checked} text run(s) verified in Open Sans, ${v.groups} distinct weight width(s)`);
for (const p of written) console.log(`  wrote ${p}`);
