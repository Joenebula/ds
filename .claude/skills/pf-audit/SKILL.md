---
name: pf-audit
description: Check whether a web page, screen or component follows the People First design system (MHR), and report exactly what is off-brand. Use whenever someone asks if something is on-brand, matches the design system, uses the right colours or tokens, passes accessibility or contrast, or asks for a design review, brand check, design QA or audit of a page — and before shipping any People First UI. Reports off-palette colours with the correct token to use instead, WCAG contrast failures, and token coverage in both light and dark mode.
---

# Audit a page against People First

Checks what the browser actually paints, not what the source says. That matters: a
colour can arrive through an inherited style, a shorthand, or a stylesheet rule, and
grepping the source misses all three.

## Run it

```bash
node scripts/pf-audit.mjs <file.html>                 # both modes
node scripts/pf-audit.mjs <file.html> --mode light    # one mode
node scripts/pf-audit.mjs <file.html> --json          # machine-readable
```

Exits non-zero when it finds problems, so it works in CI.

Needs `playwright-core` and the token files, so run it from the design system repo. If
`playwright-core` is missing: `npm install --no-save playwright-core`.

## What it reports

**Off-palette colours** — every colour that is not a People First token, with the
nearest token and a distance. Distance is the useful part:

| Distance | Reading |
|---|---|
| 0–5 | Almost certainly meant to be that token. Swap it. |
| 5–30 | A near-miss — someone eyeballed a colour instead of using the token. |
| 30+ | Genuinely foreign to the system. Ask what it is for before replacing it. |

**Contrast failures** — text below WCAG AA against its real background (walked up the
tree, so it accounts for the surface actually behind the text).

**Disabled text** is listed separately and does not count as a failure. WCAG 1.4.3
exempts disabled controls, and People First's `--pf-text-disabled` is 3.64:1 in light
mode by design. Flagging it as a failure trains people to ignore the report.

**Token coverage** — the share of painted colours that are real tokens. A healthy
People First page is 100%; anything below ~90% usually means whole components were
built without the system.

## Reading a result

Report findings in this order, because it matches the effort required to fix them:

1. **Contrast failures** — accessibility, and usually a handful of tokens away.
2. **Off-palette at distance 0–5** — trivial swaps, quick credibility win.
3. **Off-palette at distance 30+** — needs a conversation, not a find-and-replace.
4. **Coverage** — the headline number, useful for tracking over time.

Give the specific token to use, never "use a token" — the report already names it.

## What it does NOT check

Be explicit about this when reporting, so nobody reads a pass as more than it is:

- **Shape.** Padding, radii, control heights and type sizes are a separate check —
  `scripts/verify-geometry.mjs`. A page can be 100% on-palette and still look nothing
  like People First, which is exactly how an earlier build shipped square buttons where
  Figma has pills.
- **Layout, spacing rhythm, or whether the right component was chosen** — a human call.
- **Content and tone.**

When a page passes, say what passed: *"100% token coverage in both modes, no contrast
failures — colours are correct. Shape is a separate check."*

## Fixing what it finds

Load the `people-first` skill for the token tables and `references/geometry.md` for
shape. The usual root causes:

- Raw hex where a token exists → swap for the named token.
- A colour picked to look right in light mode → it will break in dark; use a semantic
  token, which carries both.
- A primitive used directly (`--pf-base-*`) → primitives do not change between modes.
  Use the semantic token that points at it.
