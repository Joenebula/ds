#!/usr/bin/env node
// Resolves each component label to the ONE text style it should compose, or says why it
// cannot. Shared by build-components-css.mjs (which emits the composition) and
// check-component-type.mjs (which fails the build if a component drifts off the ramp
// without being recorded).
//
// This is the missing half of spec fault 4. `type.css` held the ramp; `components.css`
// held 410 font-size and 131 font-weight declarations transcribed from measurements; and
// nothing joined them, so the two could disagree with both files passing.
//
// Four outcomes, and the difference between them matters:
//
//   bound      Figma names the style. Compose it. No judgement involved.
//   matched    Figma binds nothing (or binds a style in another library file, which this
//              file cannot name), but exactly ONE style has these values. Compose it and
//              report the missing binding.
//   ambiguous  More than one style has these values. Refuse — keep the measured values
//              and report the candidates. Picking one would be the guessing this project
//              keeps paying for.
//   off-ramp   No style has these values at all. Keep the measured values and report it
//              as a design issue: 11px, 12px, 15px and 60px labels exist and the ramp
//              stops at 13.
import { readFileSync } from 'node:fs';

const tsv = (f) => {
  const [head, ...rows] = readFileSync(f, 'utf8').trim().split('\n');
  const keys = head.split('\t');
  return rows.map(r => Object.fromEntries(r.split('\t').map((v, i) => [keys[i], v])));
};

export const WEIGHT = { Regular: '400', SemiBold: '600', Medium: '500', Light: '300',
  Italic: '400', Bold: '700', Thin: '100', ExtraBold: '800', Black: '900' };

// ONE TEXT STYLE, ONE SET OF DECLARATIONS.
//
// `dist/type.css` writes a class per text style; `dist/components.css` writes the same
// styles onto the component labels Figma gives them. The comment above that second block
// says the two have "one source rather than two that can drift apart" — and for a long time
// they were two separate implementations that had already drifted. The type class emitted
// `line-height: normal`, which is Figma's AUTO for all 23 styles; the composed rule emitted
// no line-height at all, so a component label inherited whatever the PAGE set. Measured on a
// page with `line-height: 1.9`: `.pf-text-body-text` came back `normal` and `.pf-filter-chip`,
// composing the same style, came back `30.4px`. Same style, two renderings, and nothing could
// see it — verify-type checks 107 values and line-height was not among them.
//
// Both generators now call this. `fontFamily` is the one real difference: a type class has to
// state the family, and a component class already sets it in its own base rule.
export function declarationsFor(style, { fontFamily = false } = {}) {
  const d = [`font-size: ${style.size}px`];
  if (style.weight === 'Italic') d.push('font-weight: 400', 'font-style: italic');
  else d.push(`font-weight: ${WEIGHT[style.weight] || '400'}`);
  // Figma records no weight on ten styles. Emitting nothing does NOT mean "inherit the
  // design system's default" — it means the browser's UA stylesheet decides, and on an <h2>
  // that is 700. Open Sans here ships 400 and 600 only, so 700 was synthesised and a heading
  // rendered a weight the design system does not have. 400 is not a guess: every unweighted
  // style has a "(semi bold, 600)" sibling, and the pair only makes sense if the plain one is
  // Regular.
  const ls = parseFloat(style.letterSpacing);
  if (Number.isFinite(ls) && ls !== 0) d.push(`letter-spacing: ${ls / 100}em`);
  if (style.textCase === 'UPPER') d.push('text-transform: uppercase');
  // Every one of the 23 styles sets line height to AUTO in Figma, which is `normal`. It is
  // emitted rather than left out precisely so a page's own line-height cannot reach in.
  d.push('line-height: normal');
  if (fontFamily) d.push('font-family: var(--pf-font-body)');
  return d;
}

// The comparison key. All four properties, because size and weight alone put three styles
// in the same bucket and 43 labels had more than one candidate.
const keyOf = (size, weight, letterSpacing, textCase) => [
  String(parseInt(size, 10)),
  WEIGHT[weight] || '400',
  weight === 'Italic' ? 'italic' : 'normal',
  // Figma writes "0%" and "" for the same thing, and -1 vs -1% likewise.
  String(parseFloat(letterSpacing) || 0),
  textCase === 'UPPER' ? 'UPPER' : 'ORIGINAL',
].join('|');

export function buildResolver() {
  const styles = tsv('tokens/_raw/text-styles.tsv');
  const types = tsv('tokens/_raw/component-type.tsv');

  // A STYLE NAME IS NOT A UNIQUE KEY IN THIS FILE. Two different styles are both called
  // `Desktop text/Button text` — 16px SemiBold, and 13px uppercase. A Map keyed on the
  // name keeps whichever came last, so `Notification card` Mobile=Yes, which Figma binds
  // to the 16px one, composed the 13px uppercase one instead: the right name, the wrong
  // style, and the values silently changed underneath a component that was "bound". The
  // duplicate is already recorded as a Figma issue; until it is fixed the name has to be
  // resolved against the label's own measured values.
  const byNameAll = new Map();
  for (const st of styles) {
    // A stable identity that survives the duplicate name: the name plus the values.
    st.id = `${st.name}|${st.size}|${st.weight || ''}|${st.letterSpacing}|${st.textCase}`;
    if (!byNameAll.has(st.name)) byNameAll.set(st.name, []);
    byNameAll.get(st.name).push(st);
  }
  const pickNamed = (name, size, weight, letterSpacing, textCase) => {
    const all = byNameAll.get(name);
    if (!all) return null;
    if (all.length === 1) return all[0];
    const want = keyOf(size, weight, letterSpacing, textCase);
    const exact = all.filter(st => keyOf(st.size, st.weight, st.letterSpacing, st.textCase) === want);
    return exact.length === 1 ? exact[0] : null;
  };
  // For consumers that only need to look a style up once it has been chosen.
  const byName = new Map(styles.map(s => [s.name, s]));
  const byValue = new Map();
  for (const s of styles) {
    const k = keyOf(s.size, s.weight, s.letterSpacing, s.textCase);
    if (!byValue.has(k)) byValue.set(k, []);
    byValue.get(k).push(s.name);
  }

  // component -> [{ key, outcome, style, candidates, size, weight }]
  // Looked up by the label's measured size and weight, because the walk records one row
  // per distinct type shape rather than one per variant — 300 People variants share a
  // label style, and repeating it 300 times would say nothing extra.
  const byComponent = new Map();
  for (const t of types) {
    const k = keyOf(t.size, t.weight, t.letterSpacing, t.textCase);
    let outcome, style = null, candidates = null, resolved = null;
    const named = t.boundStyle && t.boundStyle !== 'EXTERNAL'
      ? pickNamed(t.boundStyle, t.size, t.weight, t.letterSpacing, t.textCase) : null;
    if (named) {
      outcome = 'bound'; style = named.name; resolved = named;
    } else if (t.boundStyle && t.boundStyle !== 'EXTERNAL' && byNameAll.has(t.boundStyle)) {
      // Bound, but to a name two styles share and the label's values match neither or
      // both. Refuse rather than pick.
      outcome = 'ambiguous'; candidates = byNameAll.get(t.boundStyle).map(x => `${x.name} (${x.size}px ${x.weight || 'Regular'})`);
    } else {
      const hits = byValue.get(k) || [];
      if (hits.length === 1) {
        outcome = 'matched'; style = hits[0];
        resolved = styles.find(st => st.name === hits[0]
          && keyOf(st.size, st.weight, st.letterSpacing, st.textCase) === k) || null;
      }
      else if (hits.length > 1) { outcome = 'ambiguous'; candidates = hits; }
      else outcome = 'off-ramp';
    }
    if (!byComponent.has(t.component)) byComponent.set(t.component, []);
    byComponent.get(t.component).push({
      key: k, outcome, style, candidates, resolved, external: t.boundStyle === 'EXTERNAL',
      size: parseInt(t.size, 10), weight: WEIGHT[t.weight] || '400',
      italic: t.weight === 'Italic', variant: t.variant,
    });
  }

  // Finding the row for a rule. Two keys, in order of precision:
  //
  //   1. The VARIANT name, when the walk happens to hold that exact variant. Precise, and
  //      it separates cases nothing else can: Notification card is `Body text (semi bold)`
  //      at Mobile=No and `Button text` at Mobile=Yes — both 16px/600, differing only in
  //      tracking, which component-geometry.tsv does not record.
  //   2. Otherwise the measured font, "13px SemiBold" or "16px" — size and weight, which
  //      is all the geometry extract has.
  //
  // Under (2), several rows can match. If they all resolve to the SAME style that is not
  // ambiguity, it is the same answer written twice — AI button has a 13px row for Light
  // mode and another for Inverted, both Label text. Only a genuine disagreement returns
  // null, and then the component keeps its measured values rather than being given one of
  // two possible styles.
  const resolve = (component, font, variant = null) => {
    const rows = byComponent.get(component);
    if (!rows) return null;
    if (variant != null) {
      const exact = rows.find(r => r.variant === variant);
      if (exact) return exact;
    }
    const m = /^(\d+)px(?:\s+(\S+))?$/.exec(String(font || '').trim());
    if (!m) return null;
    const size = +m[1], weight = WEIGHT[m[2]] || '400', italic = m[2] === 'Italic';
    const hits = rows.filter(r => r.size === size && r.weight === weight && r.italic === italic);
    if (!hits.length) return null;
    const distinct = new Set(hits.map(r => `${r.outcome}|${r.style || ''}`));
    return distinct.size === 1 ? hits[0] : null;
  };

  return { resolve, byComponent, styles, byName, pickNamed };
}

// Run directly for a census.
if (process.argv[1] && process.argv[1].endsWith('resolve-component-type.mjs')) {
  const { byComponent } = buildResolver();
  const tally = { bound: 0, matched: 0, ambiguous: 0, 'off-ramp': 0 };
  const detail = { matched: [], ambiguous: [], 'off-ramp': [] };
  for (const [component, rows] of byComponent)
    for (const r of rows) {
      tally[r.outcome]++;
      if (r.outcome !== 'bound')
        detail[r.outcome].push(`${component}  ${r.size}px ${r.weight}${r.italic ? ' italic' : ''}`
          + (r.external ? '  (bound to another library file)' : '')
          + (r.style ? `  -> ${r.style}` : '')
          + (r.candidates ? `  candidates: ${r.candidates.join(' | ')}` : ''));
    }
  for (const [k, v] of Object.entries(tally)) console.log(`${String(v).padStart(4)}  ${k}`);
  for (const k of ['matched', 'ambiguous', 'off-ramp']) {
    if (!detail[k].length) continue;
    console.log(`\n== ${k}`);
    for (const d of [...new Set(detail[k])].sort()) console.log('   ' + d);
  }
}
