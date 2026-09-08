#!/usr/bin/env node
// Audits any HTML page against the People First design system.
//
//   node scripts/pf-audit.mjs <file.html> [--mode light|dark|both] [--json]
//
// Renders the page in Chromium and inspects COMPUTED styles, so it audits what
// the browser actually paints — catching colours that arrive via inherited
// styles, shorthand or a stylesheet, which grepping the source never sees.
//
// Reports three things:
//   1. off-palette colours, with the nearest People First token as a suggestion
//   2. text failing WCAG AA against its real (walked-up) background
//   3. token coverage — how much of the page is already on-system
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const asJson = args.includes('--json');
const modeArg = (args.find(a => a.startsWith('--mode')) || '--mode=both').split('=')[1] || 'both';
const modes = modeArg === 'both' ? ['light', 'dark'] : [modeArg];
if (!file) { console.error('usage: node scripts/pf-audit.mjs <file.html> [--mode light|dark|both] [--json]'); process.exit(2); }

// ---- resolve the token palette per mode ----
const t = JSON.parse(readFileSync('tokens/design-tokens.json', 'utf8'));
const flat = new Map();
(function walk(n) {
  if (n && typeof n === 'object') {
    if (n.$type) flat.set(n.$extensions['com.mhr.pf'].figmaName, n);
    else Object.values(n).forEach(walk);
  }
})(t.color);

function resolveToken(name, mode) {
  const n = flat.get(name); if (!n) return null;
  const e = n.$extensions['com.mhr.pf'];
  let v = e.tier === 'semantic' ? e.modes[mode] : n.$value;
  for (let i = 0; i < 10 && typeof v === 'string' && v.startsWith('{'); i++) {
    let node = t; for (const p of v.slice(1, -1).split('.')) node = node[p];
    const e2 = node.$extensions['com.mhr.pf'];
    v = e2.tier === 'semantic' ? e2.modes[mode] : node.$value;
  }
  return v;
}

const paletteFor = mode => {
  const p = [];
  for (const [figmaName, n] of flat) {
    const e = n.$extensions['com.mhr.pf'];
    const hex = resolveToken(figmaName, mode);
    if (hex) p.push({ cssVar: e.cssVar, figmaName, hex: hex.toLowerCase(), tier: e.tier });
  }
  return p;
};

const parse = c => {
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
};
const hexToRgb = h => {
  const s = h.replace('#', '');
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16),
           a: s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1 };
};
const dist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
const lum = ({ r, g, b }) => {
  const v = [r, g, b].map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const report = { file, modes: {} };

for (const mode of modes) {
  const palette = paletteFor(mode);
  const ctx = await browser.newContext({ colorScheme: mode });
  const page = await ctx.newPage();
  await page.goto(file.startsWith('http') ? file : 'file://' + resolve(file));
  await page.waitForLoadState('networkidle').catch(() => {});

  const samples = await page.evaluate(() => {
    const out = [];
    const seen = new Set();
    const effectiveBg = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || +m[4] > 0.5)) return bg;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'meta', 'link', 'head'].includes(tag)) continue;

      const own = (el.textContent || '').trim();
      const direct = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const path = tag + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

      const push = (prop, value, extra = {}) => {
        if (!value || value === 'rgba(0, 0, 0, 0)' || value === 'transparent') return;
        const key = prop + '|' + value + '|' + path;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ path, prop, value, ...extra });
      };
      push('background-color', cs.backgroundColor);
      push('border-color', cs.borderTopColor !== cs.backgroundColor && parseFloat(cs.borderTopWidth) > 0 ? cs.borderTopColor : null);
      if (direct && own) {
        push('color', cs.color, {
          bg: effectiveBg(el),
          fontSize: parseFloat(cs.fontSize),
          fontWeight: cs.fontWeight,
          sample: own.slice(0, 40)
        });
      }
    }
    return out;
  });

  const offPalette = [];
  const contrastFails = [];
  let onSystem = 0;

  for (const s of samples) {
    const rgb = parse(s.value);
    if (!rgb || rgb.a < 0.05) continue;
    const exact = palette.find(p => { const c = hexToRgb(p.hex); return c.r === rgb.r && c.g === rgb.g && c.b === rgb.b; });
    if (exact) onSystem++;
    else {
      const near = palette.map(p => ({ ...p, d: dist(hexToRgb(p.hex), rgb) })).sort((a, b) => a.d - b.d)[0];
      offPalette.push({ where: s.path, prop: s.prop, value: s.value,
        nearest: near ? { cssVar: near.cssVar, hex: near.hex, distance: Math.round(near.d) } : null });
    }
    if (s.prop === 'color' && s.bg) {
      const bg = parse(s.bg);
      if (bg) {
        const ratio = contrast(rgb, bg);
        const large = s.fontSize >= 24 || (s.fontSize >= 18.66 && +s.fontWeight >= 600);
        const min = large ? 3 : 4.5;
        if (ratio < min) contrastFails.push({ where: s.path, sample: s.sample, ratio: +ratio.toFixed(2),
          required: min, fontSize: s.fontSize, fg: s.value, bg: s.bg });
      }
    }
  }

  report.modes[mode] = {
    sampled: samples.length,
    onSystem,
    offPalette: offPalette.slice(0, 40),
    offPaletteTotal: offPalette.length,
    contrastFails,
    coverage: samples.length ? +(100 * onSystem / (onSystem + offPalette.length)).toFixed(1) : 100
  };
  await ctx.close();
}
await browser.close();

if (asJson) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

let problems = 0;
for (const mode of modes) {
  const r = report.modes[mode];
  console.log(`\n=== ${mode.toUpperCase()} ===`);
  console.log(`  on-system colours : ${r.onSystem}/${r.onSystem + r.offPaletteTotal}  (${r.coverage}% token coverage)`);
  if (r.offPaletteTotal) {
    console.log(`\n  OFF-PALETTE (${r.offPaletteTotal}):`);
    for (const o of r.offPalette) {
      const n = o.nearest ? `  ->  ${o.nearest.cssVar} (${o.nearest.hex}, distance ${o.nearest.distance})` : '';
      console.log(`    ${o.where}  ${o.prop}: ${o.value}${n}`);
    }
    if (r.offPaletteTotal > r.offPalette.length) console.log(`    ...and ${r.offPaletteTotal - r.offPalette.length} more`);
    problems += r.offPaletteTotal;
  }
  if (r.contrastFails.length) {
    console.log(`\n  CONTRAST FAILURES (${r.contrastFails.length}):`);
    for (const c of r.contrastFails)
      console.log(`    ${c.ratio}:1 (needs ${c.required}) ${c.where} — "${c.sample}"`);
    problems += r.contrastFails.length;
  }
  if (!r.offPaletteTotal && !r.contrastFails.length) console.log('  no issues');
}
console.log(`\n${problems === 0 ? 'PASS — page is on-system' : problems + ' issue(s) found'}`);
process.exit(problems ? 1 : 0);
