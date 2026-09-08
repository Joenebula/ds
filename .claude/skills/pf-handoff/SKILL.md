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

## Spec structure

Use this shape. It is ordered the way a developer works: what to build, then what it is
made of, then what can change, then what to check.

```markdown
# [Screen name] — developer handoff

## What this screen does
One paragraph. The user's job, not the UI's structure.

## Components used
| Element | Figma component | Variant | Notes |
|---|---|---|---|
| Approve button | Button | Type=Positive, State=Default | leading Tick icon |

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

## Known source issues to carry into the spec

If the screen uses these, say so — a developer implementing faithfully will otherwise
reproduce them, or waste time thinking they made a mistake:

- **`Tags` Type=Theme** binds a border token for its text where its six siblings bind a
  content token. Looks like a Figma mis-binding.
- **`Toast message`** and the **AI components** bind fixed colours, so they do not adapt
  in dark mode.
- **`Icon-size-xxxs` is 0px** — unset in Figma, do not use.
