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
| `docs/templates.html` | The markup INSIDE each composite component — a card, table or panel is not its class |

**2. Build the components from the stylesheet, not by hand.** `dist/components.css`
carries 160 classes, generated from Figma and checked against it: 147 components and 302
variants with colour bindings, plus 13 the extract carries as shape only because Figma
binds them no colour at all. The component is the class, each Figma variant property is a data
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

**2a. For a composite component the class is not enough — paste its template.**
`.pf-card` is a rounded rectangle with nothing in it. So are `.pf-table-ag`,
`.pf-metric-card`, `.pf-header`, `.pf-notification-panel` and 150 others: **all 154 of them
render NOTHING from the bare class**, and they pass the colour and geometry checks while
doing it. The contents live in `dist/templates/<class>.html`, generated from each
component's Figma child tree.

```bash
cat dist/templates/pf-metric-card.html     # paste this, not a div of your own
```

Replace the placeholder text and the sample instances. Change nothing else — every class
in there is real, every colour is a token, every `<!--pf-icon:name-->` expands at build
time. A comment inside a template is telling you something: a repeating run kept short, a
container Figma has more in, or a child the library genuinely does not have.

Writing your own contents for a composite component is the same mistake as writing your own
CSS for a simple one, and it is the one this project made most often.

If a component you need is under **Not in the library** in `docs/components.html`, say so
rather than approximating it — that section names each one and why it is missing. All 25
are documentation about the design system; nothing on a product page is missing.

**3. Verify before handing over.** All of them, every time. On a fresh clone run
`npm install` first — the checks drive a real browser and need `playwright-core`:

```bash
npm install                                              # once per clone
node scripts/build-prototype.mjs <src>.html <out>.html   # inlines both stylesheets, fails on raw hex
node scripts/verify-geometry.mjs <out>.html              # shapes match Figma
node scripts/verify-rendered.mjs <out>.html              # colours match Figma, both modes
node scripts/check-icon-fidelity.mjs <out>.html          # every glyph is a real Figma icon
node scripts/pf-audit.mjs <out>.html                     # on-system, contrast, both modes
node scripts/verify-layout.mjs <out>.html                # nothing cut off with no way to reach it
```

A page that passes one and not the others is not finished. Report the numbers.

The first four all measure one element in isolation — its size, its colour, its glyphs,
its contrast. `verify-layout` asks the question they cannot: can the element be SEEN?
All four passed on a screen quietly slicing 126px off its own table, because Figma draws
`Table (AG)` as a hug-contents frame and the faithful `display: inline-flex` grew past
its column and clipped the rest. A scroll region is fine; being clipped with no way to
scroll to the content is not, and that is the distinction this check makes.

**4. Name every element.** A screen is handed to developers, or to a pipeline that turns
it into Angular. Both address elements by NAME, not by CSS selector — selectors change
every time the layout does. Run:

```bash
node scripts/name-elements.mjs <src>.src.html --write   # derive a data-pf-id for each
                                                        # add --redo to re-derive existing ones
node scripts/tag-elements.mjs <out>.html --write        # write the manifest; fails on an
                                                        # element that is unnamed, repeated,
                                                        # carries a name nobody can use, or
                                                        # claims a variant Figma has no
                                                        # such property for
```

Only the NAME is authored. The component and variant are derived from the class and its
data attributes, because those already come from Figma and retyping them is how they
drift. The manifest is what a pipeline consumes — one entry per element, variants as
structured values, and `parent` so the component tree is recoverable:

```json
{ "id": "button-approve", "component": "Button", "variant": { "type": "Positive" },
  "parent": "card-marcus-webb", "tag": "button", "repeat": null, "text": "Approve" }
```

**A name that exists is not the same as a name that is usable**, and this is where the
tagging check reported `176 of 176 addressable by name` on a screen whose names included
`button-path-d-m29-2-9-7c29-64`. Three kinds are now rejected outright:

- **Path data.** An icon-led button has 900 characters of `<path d="…">` before its
  label. The label reader skips SVG whole; if one still leaks through, the check fails.
- **Sample data.** `All 248` names a chip `filter-chip-all-248`, and next month the count
  is 251 and the name is a lie. Trailing letter-free words are dropped.
- **A bare number.** `tags-approved-4` tells a developer nothing. A colliding name is
  qualified by what it sits inside first — `card-marcus-webb-tags-approved` — and a
  number is a reported failure, not a resolution.

Two things still need a decision from you, not from the script:

- **A specimen block is not screen content.** Mark it `data-pf-ignore` and its subtree is
  excluded — otherwise a gallery of every button variant puts six identical
  `button-action`s in a manifest a developer is meant to trust. Two of these three
  prototypes shipped without that marker, and their galleries were most of the collisions.
- **An icon-only control has no label to derive from.** Give it an `aria-label`; it needs
  one anyway, and the name then comes out right for free.

A `data-*` attribute that is not one of Figma's variant properties for that component now
fails the check outright. It is worse than no variant, because it is a plausible lie: a
`data-darkmode="False"` sat on a Selected action banner whose only Figma property is
`Mobile`, and a pipeline would have generated an `@Input` for it.

Everything inside a `<tbody>` is named by position (`r3c2`) and marked `data-pf-repeat`,
because it is one repeating template rather than N distinct elements — which is what an
`*ngFor` needs. A `<thead>` cell is not: `Employee` is a stable label.

**5. Then look at it.**

```bash
node scripts/shoot.mjs <out>.html screenshots          # light and dark, viewport-sized
```

Actually read the screenshot. On this project the scripts have passed three separate times while the page
was visibly broken — icons crushed to empty boxes, hollow buttons rendering as filled
pills, a form laid out sideways. Every one was caught by looking, none by a check.
Checks cover the axis they measure and nothing else.

Read a full-page capture (`--full`) with one caveat: it flattens `position: sticky`, so a
pinned sidebar renders at its natural height and looks like it stops halfway down the
page, and a sticky panel footer looks like it is clipping the content above it. Both read
as layout bugs and neither is one. The default viewport shot shows the truth.

## The five shapes that decide whether it reads as People First

**The classes already carry these.** They are here so you can recognise a page that has
drifted off-library — if a button in front of you is not a pill, something is wrong.
Full detail in `.claude/skills/people-first/references/geometry.md`:

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
