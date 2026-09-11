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
| `.claude/skills/people-first/SKILL.md` | Token names, hard rules, the component classes |
| `docs/components.html` | Every component and variant, rendered — check a class exists |
| `.claude/skills/people-first/references/variants.md` | Why a variant binds what it does |
| `.claude/skills/people-first/references/geometry.md` | Measured sizes, only if you go off-library |

**2. Build the components from the stylesheet, not by hand.** `dist/components.css`
carries 138 components and 282 variants as ready classes, generated from Figma and
checked against it. The component is the class, each Figma variant property is a data
attribute, and the values keep Figma's own spelling:

```html
<button class="pf-button" data-type="Action">Approve</button>
<div class="pf-form-field" data-input-type="Date picker" data-state="Error">
<td class="pf-table-cell-ag" data-type="Default" data-style="Stripe">
```

**Do not hand-write component CSS.** That is what produced the failure at the top of
this page: a screen whose colours were perfect and whose every shape was invented. The
class already has the right shape. If you find yourself typing `height: 32px;
border-radius: 20px` for a button, stop and use `.pf-button`.

Your own CSS covers page layout, `cursor`, `transition`, focus rings, `line-height`,
and anything drawn *inside* a component. Keep it in one block and label it local — if
anything in it restates a Figma colour or measurement, that is a bug.

If a component you need is under **Not in the library** in `docs/components.html`, say so
rather than approximating it — that section names each one and why it is missing.

**3. Verify before handing over.** All of them, every time. On a fresh clone run
`npm install` first — the checks drive a real browser and need `playwright-core`:

```bash
npm install                                              # once per clone
node scripts/build-prototype.mjs <src>.html <out>.html   # inlines both stylesheets, fails on raw hex
node scripts/verify-geometry.mjs <out>.html              # shapes match Figma
node scripts/verify-rendered.mjs <out>.html              # colours match Figma, both modes
node scripts/check-icon-fidelity.mjs <out>.html          # every glyph is a real Figma icon
node scripts/pf-audit.mjs <out>.html                     # on-system, contrast, both modes
```

A page that passes one and not the others is not finished. Report the numbers.

**4. Then look at it.** Screenshot the page in light *and* dark and actually read the
screenshot. On this project the scripts have passed three separate times while the page
was visibly broken — icons crushed to empty boxes, hollow buttons rendering as filled
pills, a form laid out sideways. Every one was caught by looking, none by a check.
Checks cover the axis they measure and nothing else.

## The five shapes that decide whether it reads as People First

**The classes already carry these.** They are here so you can recognise a page that has
drifted off-library — if a button in front of you is not a pill, something is wrong.
Full detail in `geometry.md`:

1. **Buttons are pills** — `border-radius: 20px`, height 32px, 13px SemiBold,
   **a leading icon on every one**, 10px gap. Icon-only variants are 32×32 circles.
2. **Filter chips are pills too** — height 42px, 16px text. Noticeably bigger than buttons.
3. **Tags** — sentence case, 4px radius, 28px tall, 13px Regular. Never uppercase.
4. **Inputs** — 42px tall, 8px radius, `padding: 10px 10px 10px 20px`.
5. **Table rows 58px, headers 54px**, both 13px. People First tables are airy.

Avatars are circles; checkboxes and radios are square with a 4px radius.

## Icons

**All 293** People First icons are exported to `assets/icons/<name>.svg`. Browse them in
`docs/icons.html`. **Never draw one by hand** — a hand-drawn glyph next to real ones is
immediately obvious, and `check-icon-fidelity.mjs` will fail the page for it.

Reference an icon rather than pasting its markup; the build expands it:

```html
<!--pf-icon:tick-->        <!-- 18px default -->
<!--pf-icon:export 14-->   <!-- explicit size -->
```

A name that does not exist fails the build. Run `check-icon-fidelity.mjs` on the **built**
page, not the source — the source has references, not glyphs, and the check will tell you
so rather than reporting a hollow pass.

They are authored at `viewBox="0 0 36 36"` with `fill="currentColor"`, so they inherit
their container's colour and scale to any size. Colour them with an **icon** token,
never a text token:

```html
<svg width="14" height="14" viewBox="0 0 36 36" aria-hidden="true"><!-- paths --></svg>
```

Ten are deliberately multi-colour — the file-type badges (`pdf`, `csv`, `doc`, `zip`
and so on), where the badge colour *is* the meaning. Do not recolour those.

## Artifacts and design canvases

An artifact or `.dc.html` artboard is a standalone page: it **cannot** link to
`dist/tokens.css` or `dist/components.css`, and a `<link>` fails silently with no error.
Inline both into a `<style>` block. `scripts/build-prototype.mjs` does this from a source
file containing `/*__TOKENS__*/` and `/*__COMPONENTS__*/` placeholders.

Dark mode needs nothing extra — the tokens carry both modes.

## Content

Write real HR content, not lorem. People First is workforce software: absence requests,
timesheets, payroll runs, onboarding, performance reviews, org charts. Use UK
conventions — DD/MM/YYYY dates, "annual leave" not "PTO", "line manager" not "supervisor".
Mark sample data as sample at handover.
