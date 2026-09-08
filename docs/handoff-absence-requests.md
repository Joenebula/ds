# Absence requests — developer handoff

Generated from the extracted Figma data, not from reading the CSS. Every value below
traces to `tokens/design-tokens.json`, `tokens/_raw/component-geometry.tsv` or
`tokens/_raw/component-variants.tsv`.

## What this screen does

A line manager reviews absence requests from their team and approves or declines them.
The table is the primary surface; the review panel acts on the selected request.

## Components used

| Element | Figma component | Variant | Notes |
|---|---|---|---|
| Approve selected / Approve | `Button` | Type=Positive, State=Default | leading Tick icon |
| Export, Save draft, Undo | `Button` | Type=Hollow, State=Default | leading icon; Undo is disabled |
| Decline | `Button` | Type=Negative, State=Default | leading Close x cancel icon |
| Filter row | `Filter chip` | State=Selected, Active=True | pill, 42px |
| Status pills | `Tags` | Type=Positive | 7 statuses, sentence case |
| Absence table | `Table cell (AG)` | Type=Default, Style=Stripe | 58px rows, hover = Background/Theme |
| Sort control | `Table header icons` | Variant=Sort, State=Ascending | real AG Grid sort arrow |
| Row select | `Multi-select checkbox` | State=Selected | 20x20, 4px radius |
| Form fields | `Form field` | Input type=Text, State=Error | 42px, 8px radius |
| Deduct toggle | `Toggle` | On=Yes, Locked=No | 55x25 pill |

## Tokens

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Page background | `var(--pf-bg-secondary)` | `#fafafa` | `#1d1f27` |
| Card / panel surface | `var(--pf-bg-primary)` | `#ffffff` | `#2c313c` |
| Body text | `var(--pf-text-primary)` | `#3e3e3e` | `#ffffff` |
| Supporting text | `var(--pf-text-secondary)` | `#656565` | `#c1c1c1` |
| Error text | `var(--pf-text-negative)` | `#be2028` | `#ff8080` |
| Link / selected field | `var(--pf-text-link)` | `#0075be` | `#5cc4ea` |
| Brand text, selected chip | `var(--pf-text-theme)` | `#cd2359` | `#5cc4ea` |
| Action button fill | `var(--pf-bg-secondary-button)` | `#4e6998` | `#5cc4ea` |
| Action button label | `var(--pf-text-inverted-primary)` | `#ffffff` | `#3e3e3e` |
| Confirm button fill | `var(--pf-bg-primary-button)` | `#517a38` | `#517a38` |
| Destructive button fill | `var(--pf-bg-negative-button)` | `#be2028` | `#a41c22` |
| Input border | `var(--pf-border-form-input)` | `#777777` | `#777777` |
| Table header cell | `var(--pf-table-header-cell)` | `#f2f2f2` | `#141414` |
| Table row | `var(--pf-table-primary-cell)` | `#ffffff` | `#323441` |
| Table stripe row | `var(--pf-table-stripe-cell)` | `#fafafa` | `#23252e` |
| Table row hover | `var(--pf-bg-theme)` | `#fcf4f7` | `#2c3844` |
| Table border | `var(--pf-table-border)` | `#c1c1c1` | `#1a1a1a` |

All semantic — every one carries both modes, so dark mode needs no extra CSS.

## Geometry

| Element | Size (w × h) | Padding | Radius | Type |
|---|---|---|---|---|
| Button | auto x 32 | 0 20 | 20 | 13px SemiBold |
| Button (icon only) | 32 x 32 | 0 20 | 20 | — |
| Filter chip | auto x 42 | 10 20 | 76 | 16px, ls -1% |
| Tags | auto x 28 | 5 10 | 4 | 13px Regular |
| Form field (input) | auto x 42 | 10 10 10 20 | 8 | 16px |
| Table header (AG) | auto x 54 | 15 | 0 | 13px SemiBold |
| Table cell (AG) | auto x 58 | 10 15 | 0 | 13px |
| Card | auto | 20 | 8 | 20px title |
| Toggle | 55 x 25 | 0 7 0 2 | 13 | 13px |
| Multi-select checkbox | 20 x 20 | 0 | 4 | — |

Radius 20 and 76 both mean **pill** — use `border-radius: 999px` in CSS.

## States to build

- **Button**: Type=Action, State=Default; Type=Action, State=Hover; Type=Positive, State=Default; Type=Positive, State=Hover; Type=Negative, State=Default; Type=Negative, State=Hover; Type=Hollow, State=Default; Type=Hollow, State=Hover; …
- **Form field**: Input type=Text, State=Default; Input type=Text, State=Disabled; Input type=Text, State=Error; Input type=Text, State=Selected; Input type=Dropdown, State=Default; Input type=Dropdown, State=Disabled; Input type=Dropdown, State=Error; Input type=Dropdown, State=Selected; …
- **Table cell (AG)**: Type=Default, Style=Default; Type=Default, Style=Stripe; Type=Default, Style=Hover; Type=Checkbox, Style=Default; Type=Checkbox, Style=Stripe; Type=Checkbox, Style=Hover
- **Filter chip**: State=Default, Active=False; State=Selected, Active=True; State=Hover, Active=False
- **Checkbox/Radio item**: State=Default; State=Hover; State=Disabled; State=Error; State=Selected
- **Toggle**: On=No, Locked=No; On=Yes, Locked=No; On=No, Locked=Yes; On=Yes, Locked=Yes

## Responsive

Layout grid from Figma: **1588** (24 col) · **1454** (22) · **1320** (18) · **784** (12).
All use a 20px gutter and 47px column, centre-aligned.

Not specified — confirm with design: what the review panel does below 784px (the
prototype stacks it, but that is an implementation choice, not a Figma decision).

## Accessibility

From `node scripts/pf-audit.mjs` on the built page:

- **100% token coverage**, light and dark
- **No contrast failures** in either mode
- Two disabled elements sit at 3.64:1 (`Entitlement remaining`, `Undo`). WCAG 1.4.3
  exempts disabled controls and `--pf-text-disabled` is 3.64:1 by design — acceptable,
  but never use that token for live text.
- Hit targets: buttons are 32px tall, **below the 44px touch minimum**. Fine on desktop;
  increase the tap area on touch layouts.

## Known Figma source issues

Carry these through so they are not mistaken for implementation bugs:

- `Tags` Type=Theme binds `Tags/Borders/Info` for its text where all six siblings bind a
  `Tags/Content/*` token. Treated here as `--pf-tag-content-info`.
- `Toast message` and the AI components bind fixed colours and will not adapt in dark mode.
- `Icon-size-xxxs` is 0px in Figma — unset, do not use.

## Open questions

- Only 9 of 289 Figma icons are extracted. The table **filter** glyph is still a drawn
  substitute, not the real asset.
- The side navigation here is simplified. The real `Navigation item` is a 90×86 rail with
  the icon above the label — confirm which is intended.

