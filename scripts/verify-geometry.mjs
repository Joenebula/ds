#!/usr/bin/env node
// Renders a page and checks COMPUTED geometry against the measured Figma values
// in tokens/_raw/component-geometry.tsv.
//
//   node scripts/verify-geometry.mjs <file.html>
//
// This exists because the colour check can pass 54/54 while every control is the
// wrong shape — colour and geometry are independent failure modes, and only
// checking one gives false confidence.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/verify-geometry.mjs <file.html>'); process.exit(2); }

// ---- expected values, parsed from the measured geometry file ----
const geom = new Map();
for (const line of readFileSync('tokens/_raw/component-geometry.tsv', 'utf8').trim().split('\n').slice(1)) {
  const [component, size, padding, radius, gap, font, notes] = line.split('\t');
  geom.set(component, { size, padding, radius, gap, font, notes });
}

const heightOf = c => {
  const m = (geom.get(c)?.size || '').match(/x\s*(\d+)/);
  return m ? +m[1] : null;
};
const radiusOf = c => {
  const r = geom.get(c)?.radius;
  if (!r || r === 'mixed' || r === '—') return null;
  return +r;
};
const fontSizeOf = c => {
  const m = (geom.get(c)?.font || '').match(/(\d+)px/);
  return m ? +m[1] : null;
};

// selector -> what it claims to implement.
// `pill: true` means any radius >= half the height counts (Figma stores 20/76/78;
// CSS 999px is the correct equivalent, so an exact match would be wrong to demand).
const CHECKS = [
  { sel: '.pf-button',        component: 'Button',            height: true, font: true, pill: true },
  { sel: '.pf-button--icon-only',  component: 'Button (icon only)', height: true, width: 32 },
  { sel: '.pf-filter-chip',       component: 'Filter chip',       height: true, font: true, pill: true },
  { sel: '.pf-tags',        component: 'Tags',              height: true, font: true, radius: true,
    textTransform: 'none' },
  { sel: '.pf-field',    component: 'Field', height: true, font: true, radius: true },
  { sel: 'thead th',    component: 'Table header (AG)', height: true, font: true },
  { sel: 'tbody td',    component: 'Table cell (AG)',   height: true, font: true },
  { sel: '.pf-draggable-card',      component: 'Draggable card',    height: true, font: true, radius: true },
  { sel: '.pf-toggle',     component: 'Toggle',            height: true, width: 55, pill: true },
  { sel: '.pf-multi-select-checkbox',      component: 'Multi-select checkbox', height: true, width: 20, radius: true },
  { sel: '.pf-card',      component: 'Card',              radius: true },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ colorScheme: 'light' });
const page = await ctx.newPage();
await page.goto(file.startsWith('http') ? file : 'file://' + resolve(file));
await page.waitForLoadState('networkidle').catch(() => {});

const results = [];
for (const c of CHECKS) {
  const m = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      height: Math.round(r.height), width: Math.round(r.width),
      radius: parseFloat(cs.borderTopLeftRadius),
      fontSize: parseFloat(cs.fontSize),
      textTransform: cs.textTransform,
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat)
    };
  }, c.sel);

  const add = (prop, expected, actual, ok, note = '') =>
    results.push({ component: c.component, sel: c.sel, prop, expected, actual, ok, note });

  if (!m) { add('exists', 'present in DOM', 'missing', false); continue; }

  if (c.height) {
    const want = heightOf(c.component);
    if (want !== null) add('height', want + 'px', m.height + 'px', Math.abs(m.height - want) <= 1);
  }
  if (c.width) add('width', c.width + 'px', m.width + 'px', Math.abs(m.width - c.width) <= 1);
  if (c.font) {
    const want = fontSizeOf(c.component);
    if (want !== null) add('font-size', want + 'px', m.fontSize + 'px', Math.abs(m.fontSize - want) <= 0.5);
  }
  if (c.pill) {
    // Figma stores a large literal radius; CSS 999px is the right equivalent.
    const ok = m.radius >= m.height / 2 - 1;
    add('radius (pill)', `>= ${Math.round(m.height / 2)}px`, m.radius + 'px', ok,
      ok ? '' : 'Figma has this as a pill');
  } else if (c.radius) {
    const want = radiusOf(c.component);
    if (want !== null) add('radius', want + 'px', m.radius + 'px', Math.abs(m.radius - want) <= 1);
  }
  if (c.textTransform) {
    const ok = m.textTransform === c.textTransform;
    add('text-transform', c.textTransform, m.textTransform, ok,
      ok ? '' : 'Figma Tags render sentence case');
  }
}
await ctx.close();
await browser.close();

const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok);
for (const r of results) {
  const mark = r.ok ? 'ok  ' : 'FAIL';
  console.log(`${mark} ${r.component.padEnd(24)} ${r.prop.padEnd(15)} expected ${String(r.expected).padEnd(12)} got ${r.actual}${r.note ? '  — ' + r.note : ''}`);
}
console.log(`\n${pass} geometry checks match Figma, ${fail.length} off`);
process.exit(fail.length ? 1 : 0);
