// The two ways of switching mode must agree.
//
// `data-theme="dark"` on the root and the OS preference are documented as equivalent, and for
// 111 tokens they were. What they were not equivalent about is `color-scheme`, which `:root`
// set to `light dark` — telling the BROWSER to follow the system for everything it paints
// itself: the default text colour, form controls, scrollbars. Setting the attribute swapped
// every token and left that alone, so on a light OS the page went dark and the browser went
// on painting inherited text BLACK.
//
// Measured at the time: **69 of the 160 component classes** rendered a different colour
// depending on which way dark mode was turned on — every one of them a class that inherits
// its text colour rather than stating one. Reported from a phone as the filter chips looking
// wrong in dark mode.
//
// Nothing could have caught it from one side. Every dark screenshot in this repo is taken
// with the attribute (`scripts/shoot.mjs` sets `data-theme`) and every probe written this
// session used `colorScheme` — so the two halves of the project were each testing a
// different path and both were green.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const css = readFileSync('dist/components.css', 'utf8');
const classes = [...new Set([...css.matchAll(/\.(pf-[a-z0-9-]+)/g)].map(m => m[1]))].sort();

writeFileSync('tmp-theme-paths.html',
  ['fonts', 'tokens', 'components', 'type'].map(f => `<style>${readFileSync(`dist/${f}.css`, 'utf8')}</style>`).join('')
  + `<body style="margin:0">${classes.map((c, i) => `<div class="${c}" id="c${i}">x</div>`).join('')}</body>`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const read = async (scheme, attr) => {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: scheme });
  await page.goto('file://' + process.cwd() + '/tmp-theme-paths.html');
  if (attr) await page.evaluate(a => document.documentElement.setAttribute('data-theme', a), attr);
  await page.evaluate(() => document.fonts.ready);
  const out = await page.evaluate(n => Array.from({ length: n }, (_, i) => {
    const s = getComputedStyle(document.getElementById('c' + i));
    return { bg: s.backgroundColor, fg: s.color, bd: s.borderTopColor };
  }), classes.length);
  await page.close();
  return out;
};

// The OS is set the OPPOSITE way in each pair on purpose. Matching them would let a page pass
// by following the system while ignoring the attribute entirely, which is the actual fault.
const osDark = await read('dark', null);
const attrDark = await read('light', 'dark');
const osLight = await read('light', null);
const attrLight = await read('dark', 'light');
await browser.close();
unlinkSync('tmp-theme-paths.html');

const problems = [];
const compare = (a, b, mode) => {
  let same = 0;
  classes.forEach((c, i) => {
    const x = a[i], y = b[i];
    if (x.bg === y.bg && x.fg === y.fg && x.bd === y.bd) { same++; return; }
    const which = ['bg', 'fg', 'bd'].filter(k => x[k] !== y[k]).join(', ');
    problems.push(`.${c} renders a different ${which} in ${mode} depending on whether the mode `
      + `came from data-theme or the system — attribute ${y[which.split(',')[0].trim()]}, `
      + `system ${x[which.split(',')[0].trim()]}`);
  });
  return same;
};
const d = compare(osDark, attrDark, 'dark');
const l = compare(osLight, attrLight, 'light');

console.log(`${classes.length} class(es) rendered both ways into each mode`);
console.log(`  ${d} agree in dark, ${l} agree in light — the attribute and the system preference `
  + `are the same answer`);
if (!classes.length) { console.error('  this check proved nothing: no classes'); process.exit(1); }
for (const p of problems.slice(0, 12)) console.error('FAIL ' + p);
if (problems.length > 12) console.error(`FAIL ... and ${problems.length - 12} more`);
process.exit(problems.length ? 1 : 0);
