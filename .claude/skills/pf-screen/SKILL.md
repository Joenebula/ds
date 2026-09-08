---
name: pf-screen
description: Build a screen, page, prototype or component in the People First design system (MHR) — an HR or workforce UI such as an approvals list, dashboard, form, settings page, table view, or employee record. Use whenever someone asks for a People First screen, mockup, prototype or artifact, or asks to build UI that matches People First or MHR. Produces a page using the real Figma tokens, variants and measured component geometry, then verifies it against Figma before handing it over.
---

# Build a People First screen

The failure mode this skill exists to prevent: a page whose **colours** are perfect and
whose **shapes** are invented. That has happened — buttons shipped with a 4px radius
where Figma has pills, tags shipped uppercase where the real component is sentence
case. Colour and shape are independent, and both have to come from Figma.

## Order of work

**1. Read before writing.** Load these, in this order:

| File | What you need from it |
|---|---|
| `.claude/skills/people-first/SKILL.md` | Token names, hard rules, component recipes |
| `.claude/skills/people-first/references/geometry.md` | Measured sizes, padding, radii, type |
| `.claude/skills/people-first/references/variants.md` | The exact tokens each variant binds |

Do not infer geometry from the spacing or radius tokens. They are a separate system:
the radius tokens are 4px and 8px, and **buttons use neither** — they are pills.

**2. Pick the components you need and look up their variants.** If the screen has an
errored field, a hovered row, a selected chip, find that exact variant in
`variants.md` and use the tokens it names. Variant bindings are often
counter-intuitive: the Action button's text is `--pf-text-inverted-primary`, not white,
and that is what keeps it legible in dark mode.

**3. Build with tokens for colour, measured numbers for shape.**

```css
/* colour: always a token */
background: var(--pf-bg-secondary-button);
/* shape: the measured Figma value, as a literal */
height: 32px; padding: 0 20px; border-radius: 20px;
```

Both are correct. A token for a shape you guessed is still a guess.

**4. Verify before handing over.** Both checks, every time. On a fresh clone run
`npm install` first — the checks drive a real browser and need `playwright-core`:

```bash
npm install                                              # once per clone
node scripts/build-prototype.mjs <src>.html <out>.html   # inlines tokens, fails on raw hex
node scripts/verify-geometry.mjs <out>.html              # shapes match Figma
node scripts/verify-rendered.mjs <out>.html              # colours match Figma, both modes
```

A page that passes one and not the other is not finished. Report the numbers.

## The five shapes that decide whether it reads as People First

Full detail in `geometry.md`; these carry most of the resemblance:

1. **Buttons are pills** — `border-radius: 20px`, height 32px, 13px SemiBold,
   **a leading icon on every one**, 10px gap. Icon-only variants are 32×32 circles.
2. **Filter chips are pills too** — height 42px, 16px text. Noticeably bigger than buttons.
3. **Tags** — sentence case, 4px radius, 28px tall, 13px Regular. Never uppercase.
4. **Inputs** — 42px tall, 8px radius, `padding: 10px 10px 10px 20px`.
5. **Table rows 58px, headers 54px**, both 13px. People First tables are airy.

Avatars are circles; checkboxes and radios are square with a 4px radius.

## Icons

Real Figma icons live in `assets/icons/`. Use them rather than drawing your own —
`assets/icons/tick.svg`, `add-plus.svg`, `close-x-cancel.svg`, `save.svg`, `history.svg`,
`export.svg`, `search.svg`, `information.svg`, `sort-arrow-ag-grid.svg`.

They are authored at `viewBox="0 0 36 36"` with `fill="currentColor"`, so they inherit
text colour and scale to any size:

```html
<svg width="14" height="14" viewBox="0 0 36 36" aria-hidden="true"><!-- paths --></svg>
```

Only 9 of the 289 Figma icons are extracted so far. If you need one that is missing,
say so rather than drawing a substitute — a hand-drawn icon next to real ones is
obvious, and the export is a known follow-on job.

## Artifacts and design canvases

An artifact or `.dc.html` artboard is a standalone page: it **cannot** link to
`dist/tokens.css`, and a `<link>` fails silently with no error. Inline the whole
stylesheet into a `<style>` block. `scripts/build-prototype.mjs` does this from a source
file containing a `/*__TOKENS__*/` placeholder.

Dark mode needs nothing extra — the tokens carry both modes.

## Content

Write real HR content, not lorem. People First is workforce software: absence requests,
timesheets, payroll runs, onboarding, performance reviews, org charts. Use UK
conventions — DD/MM/YYYY dates, "annual leave" not "PTO", "line manager" not "supervisor".
Mark sample data as sample at handover.
