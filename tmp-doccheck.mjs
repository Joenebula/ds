// Checks that every class/attribute combination documented in the people-first skill
// actually selects a rule in dist/components.css. A doc naming an attribute the
// stylesheet ignores is worse than no doc: it fails silently and looks fine.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { chromium } from 'playwright-core';

const md = readFileSync('.claude/skills/people-first/SKILL.md', 'utf8');
const table = md.split('### The classes you will reach for most')[1].split('Three of these')[0];
const cases = [];
for (const line of table.split('\n')) {
  const m = line.match(/^\| (.+?) \| `\.([a-z0-9-]+)` \| (.+?) \|$/);
  if (!m) continue;
  const [, comp, cls, axes] = m;
  const attrs = {};
  if (axes.trim() !== '—') for (const part of axes.split('·')) {
    const a = part.match(/`data-([a-z0-9-]+)`\s+(.+)/);
    if (a) attrs[a[1]] = a[2].trim().split('/');
  }
  if (!Object.keys(attrs).length) { cases.push({ comp, cls, attrs: {}, axis: '(base)' }); continue; }
  for (const [k, vals] of Object.entries(attrs))
    for (const v of vals) {
      const set = {};
      for (const [k2, v2] of Object.entries(attrs)) set[k2] = k2 === k ? v : v2[0];
      cases.push({ comp, cls, attrs: set, axis: `${k}=${v}` });
    }
}

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const css = readFileSync('dist/components.css', 'utf8');
writeFileSync('tmp-doccheck.html', `<style>${css}</style>
<body>${cases.map((c,i)=>`<div id="c${i}" class="${c.cls}"${
  Object.entries(c.attrs).map(([k,v])=>` data-${k}="${esc(v)}"`).join('')}>x</div>`).join('\n')}</body>`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('file:///home/user/ds/tmp-doccheck.html');
const res = await p.evaluate(n => [...Array(n).keys()].map(i => {
  const el = document.getElementById('c' + i);
  let matched = 0;
  for (const sheet of document.styleSheets)
    for (const r of sheet.cssRules)
      if (r.selectorText && el.matches(r.selectorText)) matched++;
  return matched;
}), cases.length);
await b.close();
unlinkSync('tmp-doccheck.html');

let bad = 0;
cases.forEach((c, i) => {
  // 1 match = the bare base rule only, i.e. the attribute selected nothing extra
  const need = c.axis === '(base)' ? 1 : 2;
  if (res[i] < need) { bad++; console.log(`SELECTS NOTHING  ${c.comp.padEnd(20)} .${c.cls}  ${c.axis}`); }
});
console.log(`\n${cases.length - bad} of ${cases.length} documented class/attribute combinations select a real rule, ${bad} select nothing`);
process.exit(bad ? 1 : 0);
