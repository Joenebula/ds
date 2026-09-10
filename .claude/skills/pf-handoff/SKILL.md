---
name: pf-handoff
description: Turn a People First design, screen or prototype into a developer handoff spec — the tokens, Figma components and variants, states, geometry and accessibility notes needed to build it. Use whenever someone asks for a handoff, dev spec, build spec, redlines, implementation notes, or asks what a developer needs to build a People First screen, or asks to document or annotate a design for engineering.
---

# Developer handoff for a People First screen

A handoff is only useful if a developer can build from it without opening Figma and
without guessing. Every value in it must be traceable — extracted, not estimated.

## The rule that matters

**Never invent a value.** If a number is not in the token files, the geometry
reference, or the variant reference, do not put it in the spec. Write
*"not specified — confirm with design"* instead.

A spec with a plausible wrong number is worse than one with an honest gap: the gap gets
a conversation, the wrong number gets built.

## Gathering the facts

Run these rather than reading the CSS by eye — the page may resolve differently from
how it is written:

```bash
node scripts/pf-audit.mjs <page>.html --json      # every colour actually painted
node scripts/verify-geometry.mjs <page>.html      # measured shapes vs Figma
```

Then map each element to its Figma origin using
`.claude/skills/people-first/references/variants.md` (which component and variant) and
`references/geometry.md` (its measured size, padding, radius, type).

**Name the class as well as the component.** Most elements on a People First page are
already a class in `dist/components.css` — the class name is written straight off the
Figma variant (`Button` + `Type=Positive` → `.pf-button[data-type="Positive"]`). Giving
the developer the class turns half the spec from "numbers to retype" into "a stylesheet
to link", and the numbers stay in the spec as the record of what that class should
produce.

## Spec structure

Use this shape. It is ordered the way a developer works: what to build, then what it is
made of, then what can change, then what to check.

```markdown
# [Screen name] — developer handoff

## What this screen does
One paragraph. The user's job, not the UI's structure.

## Components used
| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Approve button | Button | Type=Positive, State=Default | `.pf-button[data-type="Positive"]` | leading Tick icon |

The class column matters: `dist/components.css` already implements these, so a
developer who uses it inherits the right shape and colour instead of rebuilding them
from the tables below.

## Tokens
| Purpose | Token | Light | Dark |
|---|---|---|---|
| Page background | `--pf-bg-secondary` | #fafafa | #1d1f27 |

Semantic tokens only. If a primitive appears, flag it — it will not adapt to dark mode.

## Geometry
| Element | Height | Padding | Radius | Type |
|---|---|---|---|---|
| Button | 32px | 0 20px | 20px (pill) | 13px SemiBold |

## States to build
Every interactive element, every state it has in Figma — default, hover, disabled,
error, selected. Name the variant each maps to. A state missing here gets missed.

## Responsive
Breakpoints from the layout grid: 1588 (24 col) · 1454 (22) · 1320 (18) · 784 (12).
All 20px gutter, 47px column. Say what changes at each, or say it does not change.

## Accessibility
- Contrast results from the audit, including anything marked disabled-exempt
- Keyboard order and focus treatment
- Labels, `aria-*`, and what screen readers should announce
- Hit targets: 44px minimum on touch

## Open questions
Anything genuinely unspecified. Name it rather than filling the gap.
```

## Getting dark mode right in a spec

Give both values for every colour, taken from the token file rather than eyeballed —
`scripts/pf-audit.mjs --json` reports both modes.

Call out the three tokens that behave unusually, because they are the ones developers
get wrong:

- `--pf-text-inverted-primary` **flips** between modes.
- `--pf-text-always-white` and `--pf-text-always-grey-slate` deliberately **do not**.
- Chart colours are mode-stable by design — safe on any surface.

## Hand over the manifest too

A prose spec is for a person reading it. A pipeline that turns the screen into Angular
needs the same facts as data, and every screen already has them:

```bash
node scripts/tag-elements.mjs <page>.html --write   # writes <page>.manifest.json
```

One entry per design-system element — its name, its Figma component, its variant
properties as an object, what it sits inside, and whether it is one of a repeating set:

```json
{ "id": "button-approve", "component": "Button", "cls": "pf-button",
  "variant": { "type": "Positive" }, "parent": "card-marcus-webb",
  "tag": "button", "repeat": null, "text": "Approve" }
```

The file carries its own `fields` block explaining every key, so nobody needs this page
to read it — and the generator refuses to write a manifest whose field guide has drifted
from the data.

Two things about it worth saying out loud in the handoff:

- **The `id` is the contract.** It is the only authored value; everything else is derived
  from the class and its data attributes. A developer wires to the name, not a selector,
  because a selector changes every time the layout does.
- **`repeat: "row"` means one template, not N elements.** The cells of a table body are a
  single row rendered many times — an `*ngFor`, not eight components.

## Known source issues to carry into the spec

If the screen uses these, say so — a developer implementing faithfully will otherwise
reproduce them, or waste time thinking they made a mistake:

- **`Tags` Type=Theme** binds a border token for its text where its six siblings bind a
  content token. Looks like a Figma mis-binding.
- **`Toast message`** and the **AI components** bind fixed colours, so they do not adapt
  in dark mode.
- **`Icon-size-xxxs` is 0px** — unset in Figma, do not use.
