#!/usr/bin/env node
// Fails the build when a component's type has come loose from the Figma text-style ramp,
// and reports every label the ramp cannot express. The third leg of spec fault 4: the
// extract records the link, the generator composes it, this asks whether it held.
//
//   node scripts/check-component-type.mjs
//
// Three failures, all of which had been possible and invisible:
//
//   1. A component emits its own font-size or font-weight for a label whose text style
//      IS nameable. That is the fault itself — a transcribed copy that can drift.
//   2. A composed rule's values disagree with the text style it claims to be. That would
//      mean the composition is decorative rather than generated.
//   3. The number of labels off the ramp GROWS. Those are real design issues, recorded
//      in docs/FIGMA-ISSUES.md; a new one must be noticed rather than absorbed.
import { readFileSync } from 'node:fs';
import { buildResolver, WEIGHT } from './resolve-component-type.mjs';

// Labels whose type the ramp cannot express today. Every one is written up in
// docs/FIGMA-ISSUES.md section 7. It may fall; it may not rise without a decision.
const OFF_RAMP_BASELINE = 22;

const css = readFileSync('dist/components.css', 'utf8');
const { byComponent, byName, resolve, styles } = buildResolver();
let failures = 0;

// ---- 1. every rule, its selectors and its type ------------------------------
// COMMENTS ARE STRIPPED FROM THE SELECTOR TEXT. `[^{}@]+` happily absorbs the comment
// block that precedes a rule, so the first "selector" came out as
// `/* Desktop text/Body text */\n.pf-action-menu-button` — which meant the composed rules
// could not be recognised as themselves, and four components were reported as writing
// type they had in fact composed.
const RULE = /([^{}@]+)\{([^{}]*)\}/g;
const rules = [];
for (const m of css.matchAll(RULE)) {
  const decl = Object.fromEntries([...m[2].matchAll(/(^|;|\s)([a-z-]+)\s*:\s*([^;}]+)/g)]
    .map(d => [d[2], d[3].trim()]));
  const selectorText = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
  rules.push({ selectors: selectorText.split(',').map(s => s.trim()).filter(Boolean), decl });
}

// ---- 2. the composed rules say what they claim ------------------------------
// Each composed rule is introduced by a `/* <style name> */` comment, so the claim is
// checkable rather than asserted. Read the comment, then the rule that follows it.
// The comment names the style AND its size, because two styles share the name
// `Desktop text/Button text` and the name alone does not identify one.
const blocks = [...css.matchAll(/\/\* ((?:Desktop|Mobile) text\/[^*]+?)\s+\((\d+)px ([^),]+)(, uppercase)?\) \*\/\n([^{]+)\{([^}]*)\}/g)]
  .map(m => ({ name: m[1].trim(), size: +m[2], weight: m[3].trim(), upper: !!m[4],
               selectors: m[5], body: m[6], raw: m }));
let composedChecked = 0;
for (const { name, size, weight, upper, body } of blocks) {
  const st = (styles.filter(x => x.name === name
    && +x.size === size
    && (x.weight || 'Regular') === weight
    && ((x.textCase === 'UPPER') === upper)))[0];
  if (!st) { console.log(`  FAIL  composed rule names "${name}" at ${size}px ${weight}, which is not a text style`); failures++; continue; }
  const decl = Object.fromEntries([...body.matchAll(/(^|;|\s)([a-z-]+)\s*:\s*([^;}]+)/g)]
    .map(d => [d[2], d[3].trim()]));
  const want = {
    'font-size': `${st.size}px`,
    'font-weight': st.weight === 'Italic' ? '400' : (WEIGHT[st.weight] || '400'),
  };
  for (const [prop, v] of Object.entries(want)) {
    if (decl[prop] !== v) {
      console.log(`  FAIL  ${name} ${size}px — composed ${prop}: ${decl[prop]}, the style says ${v}`);
      failures++;
    }
    composedChecked++;
  }
  const ls = parseFloat(st.letterSpacing);
  const wantLs = Number.isFinite(ls) && ls !== 0 ? `${ls / 100}em` : undefined;
  if ((decl['letter-spacing'] || undefined) !== wantLs) {
    console.log(`  FAIL  ${name} ${size}px — composed letter-spacing: ${decl['letter-spacing']}, the style says ${wantLs}`);
    failures++;
  }
  composedChecked++;
}

// ---- 3. no component transcribes type it could have composed ----------------
//
// Re-derived from the same inputs the generator used — the geometry rows and the
// resolver — rather than from a second map of this check's own. An earlier version built
// its own class -> style map and got a different answer: it keyed by class, so a
// component with one italic row and one plain row at the same size lost the distinction
// and reported `Table cell (AG)` Style=Hover, whose style IS italic and is deliberately
// not composed. A check that reasons differently from the thing it checks will disagree
// with it eventually, and be wrong.
const geometryRows = (() => {
  const [h, ...rs] = readFileSync('tokens/_raw/component-geometry.tsv', 'utf8').trim().split('\n');
  const keys = h.split('\t');
  return rs.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v ?? ''])));
})();

const cls = name => 'pf-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The composed rules DO write font-size — that is their whole job — so they are excluded
// by identity, not by selector. A selector appears in both its component's rule and its
// composed rule, so a set of selector names alone cannot tell the two apart and reported
// six components as transcribing type they had in fact composed.
const composedRuleIds = new Set(blocks.map(b => b.selectors.trim().replace(/\s+/g, ' ')));
const writesType = new Set();
for (const { selectors, decl } of rules) {
  if (!decl['font-size'] && !decl['font-weight']) continue;
  if (composedRuleIds.has(selectors.join(',\n').replace(/\s+/g, ' '))) continue;
  for (const sel of selectors) writesType.add(sel.trim());
}

let shouldCompose = 0;
for (const row of geometryRows) {
  const [component, variant] = row.component.includes('|')
    ? [row.component.slice(0, row.component.indexOf('|')), row.component.slice(row.component.indexOf('|') + 1)]
    : [row.component, null];
  const r = resolve(component, row.font, variant);
  if (!r || (r.outcome !== 'bound' && r.outcome !== 'matched') || r.italic) continue;
  shouldCompose++;
  // The bare class is the only selector this check can reconstruct without duplicating
  // the generator's variant-selector logic, so a variant row is checked through it.
  const bare = '.' + cls(component);
  if (variant === null && writesType.has(bare)) {
    console.log(`  FAIL  ${bare} writes its own type — its label is ${r.style}, which it should compose`);
    failures++;
  }
}

// ---- 4. the off-ramp census -------------------------------------------------
const offRamp = [], ambiguous = [];
for (const [component, rows] of byComponent)
  for (const r of rows) {
    const label = `${component}  ${r.size}px ${r.weight}${r.italic ? ' italic' : ''}`;
    if (r.outcome === 'off-ramp') offRamp.push(label);
    if (r.outcome === 'ambiguous') ambiguous.push(`${label}  (${r.candidates.join(' | ')})`);
  }
const off = [...new Set(offRamp)].sort();
const amb = [...new Set(ambiguous)].sort();

const bound = [...byComponent.values()].flat().filter(r => r.outcome === 'bound').length;
const matched = [...byComponent.values()].flat().filter(r => r.outcome === 'matched').length;
console.log(`${bound + matched} of ${[...byComponent.values()].flat().length} component labels resolve to one text style `
  + `(${bound} bound in Figma, ${matched} matched by value)`);
console.log(`  ${composedChecked} composed values checked against the style they name`);
console.log(`  ${off.length} labels off the ramp (baseline ${OFF_RAMP_BASELINE}), ${amb.length} ambiguous — see docs/FIGMA-ISSUES.md`);

if (off.length > OFF_RAMP_BASELINE) {
  console.log('  FAIL  more labels are off the type ramp than before:');
  for (const o of off) console.log('        ' + o);
  failures++;
} else if (off.length < OFF_RAMP_BASELINE) {
  console.log(`  note  down ${OFF_RAMP_BASELINE - off.length} — lower OFF_RAMP_BASELINE to ${off.length} to lock it in`);
}

process.exit(failures ? 1 : 0);
