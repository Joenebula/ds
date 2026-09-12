# Team timesheet approvals — developer handoff

Build target: `prototypes/timesheet-approvals.html`.

Every value below is traced to `tokens/design-tokens.json`,
`tokens/_raw/component-geometry.tsv`, `tokens/_raw/component-variants.tsv` or the
generated `dist/*.css` — read out of the files or measured in a browser, not estimated.
Where a value genuinely is not specified in Figma it says so rather than guessing.

Verified against the built page on 2026-09-09:

```
pf-audit          100% token coverage, light and dark; 0 contrast failures
verify-geometry   29 checks match Figma, 0 off
verify-rendered   54 rendered colours match Figma, 0 mismatched
icon fidelity     43 of 43 inline glyphs are real Figma icon files
```

---

## What this screen does

A line manager clears the week's timesheets before payroll closes. They scan the team's
submitted hours, spot the ones that break a rule — overtime above the 48-hour working-time
average, missing days, hours that do not match the contract — and either approve them in
bulk or open one submission, adjust the overtime, and approve or query it individually.
The deadline matters: anything not approved misses the September pay run.

The table is the primary surface. The right-hand panel acts on one selected row without
losing the manager's place in the list.

---

## Setup

Three generated stylesheets, in this order:

```html
<link rel="stylesheet" href="dist/tokens.css">      <!-- colours, both modes -->
<link rel="stylesheet" href="dist/components.css">  <!-- every component class -->
<link rel="stylesheet" href="dist/type.css">        <!-- every text style -->
```

Dark mode is `data-theme="dark"` / `"light"` on the root element, or omit it to follow
the OS. No other dark-mode CSS is needed — every token below carries both values.

> **Note on the prototype:** the prototype inlines `tokens.css` and `components.css`
> only. It does **not** inline `type.css`, so it hand-writes `h1`/`h2`/`h3` sizes in its
> local block. Those hand-written values happen to match the real Figma text styles
> exactly, but the production build should link `type.css` and use the classes in the
> **Typography** section instead. This is the one place the prototype is off-system.

---

## Page structure

```
.app  ── CSS grid, 232px │ 1fr │ 375px, align-items: stretch, min-height 100vh
│
├── <nav>    .pf-side-navigation      — brand mark + 8 nav tabs, sticky, 100vh
├── <div>    .main
│   ├── <header> .topbar              — breadcrumb, H1, summary line, 3 buttons
│   └── <div> .content                — 20px/40px padding, 20px flex-column gap
│       ├── <section> statgrid        — 4 × Card, auto-fit minmax(175px, 1fr)
│       ├── <div>     Card + Information box  — working-time warning
│       ├── <section> filters         — 6 filter chips, then search/period/team/sort/toggle
│       ├── <div>     Selected action banner  — bulk approve / query
│       └── <div>     Table (AG)      — 9 columns, 8 rows, footer
└── <aside>  .pf-side-panel           — 375px, sticky, 100vh, one submission
    ├── .pf-side-panel-header         — 60px, name + close
    ├── .sp-body                      — scrolls, 20px padding, 20px gap
    └── .pf-sticky-footer             — 52px, Approve / Raise query
```

The prototype also carries a **"Variant states"** section between the table and the end
of `.content`. It is a verification surface for `verify-geometry` and `verify-rendered`,
not part of the screen. **Delete it when building.**

---

## Components used

Every element on this screen is an existing class in `dist/components.css`. The class
column is the point of this table: use the class and the shape, colour and both modes
come for free — the geometry and token tables below are the record of what that class
should produce, not a list of numbers to retype.

### Page chrome

| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Sidebar container | `Side navigation` | Variant=Default | `.pf-side-navigation` | binds colour only; page layout sets 232px — see Open questions |
| Nav row | `Side navigation tab` | Selected=false | `.pf-side-navigation-tab[data-selected="false"]` | 48px, radius 8 |
| Nav row, current page | `Side navigation tab` | Selected=true | `.pf-side-navigation-tab[data-selected="true"]` | fills `--pf-bg-theme`; add `aria-current="page"` |
| Detail panel | `Side panel` | Mobile=No, Size=Medium | `.pf-side-panel[data-mobile="No"][data-size="Medium"]` | Figma draws 375 wide |
| Panel header | `Side panel header` | Size=Default | `.pf-side-panel-header[data-size="Default"]` | 60px |
| Panel footer | `Sticky footer` | Default=Stepper | `.pf-sticky-footer[data-default="Stepper"]` | 52px |

### Actions

| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Approve all valid | `Button` | Type=Action | `.pf-button[data-type="Action"]` | blue — the default action; leading Tick |
| Approve / Approve selected | `Button` | Type=Positive | `.pf-button[data-type="Positive"]` | green — confirm; leading Tick |
| Query selected / Raise query | `Button` | Type=Negative | `.pf-button[data-type="Negative"]` | leading Comment chat bubble |
| Send reminder, Export, Adjust | `Button` | Type=Hollow | `.pf-button[data-type="Hollow"]` | leading icon |
| Sort | `Button` | Type=Sort | `.pf-button[data-type="Sort"]` | leading Sort arrow |
| More filters | `Button` | Type=Filter | `.pf-button[data-type="Filter"]` | leading Filter |
| Row menu, panel close | `Button` (icon only) | Type=Hollow | `.pf-button.pf-button--icon-only[data-type="Hollow"]` | 32×32 circle — see gap note |
| Bulk action bar | `Selected action banner` | Mobile=False | `.pf-selected-action-banner[data-mobile="False"]` | 48px, `--pf-bg-tertiary` |

**Every button carries a leading icon, 10px gap.** Icon-less buttons look unfinished in
this system.

### Filters

| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Status filter, unselected | `Filter chip` | State=Default, Active=False | `.pf-filter-chip[data-state="Default"][data-active="False"]` | 42px pill |
| Status filter, selected | `Filter chip` | State=Selected, Active=True | `.pf-filter-chip[data-state="Selected"][data-active="True"]` | **both attributes required** — state alone matches nothing |
| Search | `Form field` | Input type=Search, State=Default | `.pf-form-field[data-input-type="Search"]` | wraps `.pf-field` |
| Period | `Form field` | Input type=Date picker, State=Default | `.pf-form-field[data-input-type="Date picker"]` | |
| Team | `Form field` | Input type=Dropdown, State=Default | `.pf-form-field[data-input-type="Dropdown"]` | |
| Any input box | `Field` | Right aligned=No, Filled=No/Yes | `.pf-field[data-right-aligned="No"][data-filled="Yes"]` | 42px, radius 8 |
| Exceptions switch | `Toggle` | On=No, Locked=No | `.pf-toggle[data-on="No"][data-locked="No"]` | Figma spells these **Yes/No**, not true/false |

### Table

| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Table container | `Table (AG)` | Mobile=False | `.pf-table-ag[data-mobile="False"]` | radius 8 |
| Header cell, text | `Table header (AG)` | Alignment=Left | `.pf-table-header-ag[data-alignment="Left"]` | 54px, 13px SemiBold |
| Header cell, figures | `Table header (AG)` | Alignment=Right | `.pf-table-header-ag[data-alignment="Right"]` | |
| Header cell, select-all | `Table header (AG)` | Alignment=Checkbox | `.pf-table-header-ag[data-alignment="Checkbox"]` | |
| Row cell | `Table cell (AG)` | Type=Default, Style=Default | `.pf-table-cell-ag[data-type="Default"][data-style="Default"]` | 58px |
| Row cell, alternate | `Table cell (AG)` | Type=Default, Style=Stripe | `.pf-table-cell-ag[data-type="Default"][data-style="Stripe"]` | stripe **every second row** |
| Checkbox cell | `Table cell (AG)` | Type=Checkbox, Style=Default/Stripe | `.pf-table-cell-ag[data-type="Checkbox"]` | |
| Sort indicator | `Table header icons` | Variant=Sort, State=Ascending | `.pf-table-header-icons[data-variant="Sort"][data-state="Ascending"]` | 24×24 |
| Filter indicator | `Table header icons` | Variant=Filter, State=Filtered | `.pf-table-header-icons[data-variant="Filter"][data-state="Filtered"]` | |
| Row select | `Multi-select checkbox` | State=Default/Selected/Mixed selection | `.pf-multi-select-checkbox[data-state="Selected"]` | 20×20, radius 4 |
| Table footer | `Footer (AG)` | Mobile=False | `.pf-footer-ag[data-mobile="False"]` | |
| Status pill | `Tags` | Type=Warning etc. | `.pf-tags[data-type="Warning"]` | sentence case, 28px, radius 4 |

**Table columns**, left to right, with the widths the prototype uses (layout choices, not
Figma values — see Open questions):

| # | Column | Width | Alignment | Content |
|---|---|---|---|---|
| 1 | select | 44px | Checkbox | `Multi-select checkbox` |
| 2 | Employee | 178px | Left | name (SemiBold, link colour) over role · payroll no. (13px secondary) |
| 3 | Period | 108px | Left | `31/08 – 06/09` |
| 4 | Contracted | 88px | Right | decimal hours, tabular figures |
| 5 | Submitted | 88px | Right | decimal hours |
| 6 | Overtime | 84px | Right | decimal hours, or `—` |
| 7 | Variance | 84px | Right | signed, `+3.50` / `−1.50` |
| 8 | Status | 148px | Left | `Tags` |
| 9 | row menu | 48px | Left | icon-only Button |

Table minimum width is 878px; below that `.tablescroll` scrolls horizontally.

### Detail panel

| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Status pills | `Tags` | Type=Negative / Type=Theme | `.pf-tags[data-type="Negative"]` | see the Theme mis-binding below |
| Rule warning | `Information box` | Type=Error | `.pf-information-box[data-type="Error"]` | see the Information box gap below |
| Day row | `Draggable card` | State=Default | `.pf-draggable-card[data-state="Default"]` | 50px, radius 8, leading clock icon |
| Outcome dropdown | `Form field` | Input type=Dropdown, State=Selected | `.pf-form-field[data-input-type="Dropdown"][data-state="Selected"]` | |
| Adjusted hours | `Form field` | Input type=Text, State=Error | `.pf-form-field[data-input-type="Text"][data-state="Error"]` | `aria-invalid`, `aria-describedby` |
| Cost centre | `Form field` | Input type=Text, State=Disabled | `.pf-form-field[data-input-type="Text"][data-state="Disabled"]` | |
| Note to employee | `Form field` | Input type=Text, State=Default | `.pf-form-field[data-input-type="Text"]` + `textarea.pf-field` | |
| Confirmation checkboxes | `Checkbox/Radio item` | State=Default/Selected/Error/Disabled | `.pf-checkbox-radio-item[data-state="Selected"]` | |
| Pay overtime switch | `Toggle` | On=Yes, Locked=No | `.pf-toggle[data-on="Yes"][data-locked="No"]` | |

### Stat tiles and cards

| Element | Figma component | Variant | Class to use | Notes |
|---|---|---|---|---|
| Stat tile | `Card` | Property 1=Default | `.pf-card[data-property-1="Default"]` | radius 8, padding 20, gap 20 |

`Property 1` really is the name of the axis in Figma — an unnamed variant property. The
bare `.pf-card` is what you normally want.

> **The prototype uses `Card` for the four stat tiles, not `Metric card`.** Figma does have
> a `Metric card` (392×89, `--pf-bg-tertiary`, 36px figure). It was not used here because
> the tiles carry three lines — label, figure, and a supporting line — where `Metric card`
> is a two-part row. Confirm with design which is intended; if `Metric card` is right, the
> class is `.pf-metric-card` and the tiles become grey rather than white.

---

## Tokens

Semantic tokens only. Every one carries both modes, which is what makes dark mode free.

### Surfaces

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Page background | `--pf-bg-secondary` | `#fafafa` | `#1d1f27` |
| Card, panel, nav, header surface | `--pf-bg-primary` | `#ffffff` | `#2c313c` |
| Bulk action banner | `--pf-bg-tertiary` | `#f2f2f2` | `#282a32` |
| Selected nav tab, chip hover, row hover | `--pf-bg-theme` | `#fcf4f7` | `#2c3844` |
| Brand mark | `--pf-bg-theme-full` | `#cd2359` | `#33b5e5` |

### Text

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Body copy, headings | `--pf-text-primary` | `#3e3e3e` | `#ffffff` |
| Supporting, sub-labels, footer | `--pf-text-secondary` | `#656565` | `#c1c1c1` |
| Employee name (row drill-in), selected field label | `--pf-text-link` | `#0075be` | `#5cc4ea` |
| Error text, error field label | `--pf-text-negative` | `#be2028` | `#ff8080` |
| Overtime figure | `--pf-text-warning` | `#b05e00` | `#fc8700` |
| Disabled field label | `--pf-text-disabled` | `#868686` | `#c1c1c1` |
| Selected nav tab, selected chip | `--pf-text-theme` | `#cd2359` | `#5cc4ea` |
| Label on the Action button | `--pf-text-inverted-primary` | `#ffffff` | `#3e3e3e` |

### Buttons

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Action fill | `--pf-bg-secondary-button` | `#4e6998` | `#5cc4ea` |
| Action fill, hover | `--pf-bg-secondary-button-hover` | `#38578b` | `#33b5e5` |
| Positive fill | `--pf-bg-primary-button` | `#517a38` | `#517a38` |
| Positive fill, hover | `--pf-bg-primary-button-hover` | `#43652e` | `#43652e` |
| Negative fill | `--pf-bg-negative-button` | `#be2028` | `#a41c22` |
| Negative fill, hover | `--pf-bg-negative-button-hover` | `#a41c22` | `#7c3030` |
| Hollow / Filter / Sort border | `--pf-border-hollow-button` | `#656565` | `#ffffff` |
| Hollow hover fill | `--pf-button-fill-hollow-hover` | `#65656533` | `#65656533` |

### Borders

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Dividers, cell borders, day-row border | `--pf-border-default` | `#e5e5e5` | `#ffffff` |
| Panel header/footer rule | `--pf-border-secondary` | `#c1c1c1` | `#c1c1c1` |
| Selected chip, focus ring, drop state | `--pf-border-theme` | `#cd2359` | `#5cc4ea` |
| Error field border | `--pf-border-negative` | `#be2028` | `#ff8080` |
| Selected field border | `--pf-border-info` | `#33b5e5` | `#33b5e5` |
| Input border | `--pf-border-form-input` | `#777777` | `#777777` |
| Disabled input border | `--pf-border-disabled` | `#c1c1c1` | `#868686` |

### Table

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Table container | `--pf-table-card` | `#ffffff` | `#2c313c` |
| Table outer border | `--pf-table-border` | `#c1c1c1` | `#1a1a1a` |
| Header cell | `--pf-table-header-cell` | `#f2f2f2` | `#141414` |
| Row | `--pf-table-primary-cell` | `#ffffff` | `#323441` |
| Stripe row | `--pf-table-stripe-cell` | `#fafafa` | `#23252e` |

### Tags — all seven statuses

| Type | Fill (L / D) | Border (L / D) | Text (L / D) |
|---|---|---|---|
| Neutral | `#e1f5fb` / `#00588e` | `#82d4ee` / `#33b5e5` | `#00588e` / `#ffffff` |
| Positive | `#e5f4e7` / `#005711` | `#9ad2a1` / `#14872f` | `#037625` / `#ffffff` |
| Negative | `#ffebef` / `#c01123` | `#eb7379` / `#f75158` | `#c82f3c` / `#ffffff` |
| Warning | `#fff4e5` / `#b65c02` | `#fec57b` / `#f18d13` | `#974f0c` / `#ffffff` |
| Expired | `#f9f9f9` / `#707070` | `#b9b9b9` / `#b9b9b9` | `#5d5d5d` / `#ffffff` |
| Other | `#e7d6ee` / `#6d4ed1` | `#bd88f6` / `#bd88f6` | `#583069` / `#ffffff` |
| Theme | `#ffffff` / `#ffffff` | `#c82f3c` / `#4e6998` | *border token — see below* |

Tokens are `--pf-tag-fill-*`, `--pf-tag-border-*`, `--pf-tag-content-*`.

### Icons

Icons have their **own** token family. Do not colour an icon with a `--pf-text-*` token.

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Day-row clock, search glyph | `--pf-icon-secondary` | `#656565` | `#c1c1c1` |
| Overtime day marker | `--pf-icon-warning` | `#fc8700` | `#fc8700` |
| Rule-breach glyph | `--pf-icon-negative` | `#be2028` | `#ff8080` |
| Not-worked day | `--pf-icon-disabled` | `#868686` | `#f2f2f2` |
| Checkbox fill, selected states | `--pf-icon-theme` | `#cd2359` | `#5cc4ea` |
| Required-field asterisk | `--pf-icon-required-field` | `#be2028` | `#5cc4ea` |

Three tokens behave unusually and are the ones most often got wrong:

- `--pf-text-inverted-primary` **flips** between modes (white → `#3e3e3e`). It is what
  keeps the Action button legible in dark mode — do not substitute white.
- `--pf-text-always-white` and `--pf-text-always-grey-slate` deliberately **do not** flip.
- The whole `theme` family flips **pink → blue** in dark mode. That is the design
  system's own binding, not a bug.

---

## Typography

Open Sans, weights 400 and 600 only. Link `dist/type.css` and use the class — do not set
size and weight by hand.

| Role on this screen | Figma text style | Class | Size / weight |
|---|---|---|---|
| Page title | Desktop text/Large heading | `.pf-text-large-heading` | 24px / 400 |
| Panel section heading (`h2`) | Desktop text/Sub heading (semi bold) | `.pf-text-sub-heading-semibold` | 20px / 600 |
| Sub-section heading (`h3`) | Desktop text/Body text (semi bold) | `.pf-text-body-text-semibold` | 16px / 600 |
| Body copy | Desktop text/Body text | `.pf-text-body-text` | 16px / 400, ls −1% |
| Placeholder text | Desktop text/Body text (italic) | `.pf-text-body-text-italic` | 16px / 400 italic |
| Field labels, hints, sub-lines, footer | Desktop text/Label text (semi bold) | `.pf-text-label-text-semibold` | 13px / 600 |
| Small supporting text | Desktop text/Label text | `.pf-text-label-text` | 13px |
| Stat figure | Desktop text/XL heading | `.pf-text-xl-heading` | 36px, **no weight set in Figma** |

A type class sets size, weight, letter-spacing, case and line-height — **not colour**.
Pair it with a `--pf-text-*` token.

**Line height is `normal`, and that is the Figma value.** All 23 text styles use automatic
line height. A specific `line-height` on a People First screen is an invention. The
prototype sets `1.45` on body and `1.2`/`1.3` in the table; those exist to stop a 24px
icon growing a 54px header row past its measured height, and they are the developer's call
— but they are not Figma values and should not be copied as if they were.

Figures use `font-variant-numeric: tabular-nums` so columns of hours align. That is a
local decision, not a token.

---

## Geometry

The classes already carry these. This table is the record of what they should produce.

| Element | Size (w × h) | Padding | Radius | Gap | Type |
|---|---|---|---|---|---|
| Button | auto × 32 | 0 20 | pill | 10 | 13px SemiBold |
| Button (icon only) | 32 × 32 | 0 | pill | — | — |
| Filter chip | auto × 42 | 10 20 | pill | 5 | 16px, ls −1% |
| Tags | auto × 28 | 5 10 | 4 | 5 | 13px Regular |
| Field (input) | 300 × 42 | 10 10 10 **20** | 8 | 10 | 16px |
| Table header (AG) | auto × 54 | 15 | 0 | 47 | 13px SemiBold |
| Table cell (AG) | auto × 58 | 10 15 | 0 | 10 | 13px |
| Table header icons | 24 × 24 | 10 | 4 | 10 | — |
| Multi-select checkbox | 20 × 20 | 0 | 4 | — | — |
| Card | auto | 20 | 8 | 20 | 20px title |
| Draggable card | auto × 50 | 10 15 | 8 | 20 | 16px |
| Selected action banner | auto × 48 | 8 20 | 8 | — | 16px |
| Side navigation tab | 268 × 48 | 10 15 | 8 | 20 | 16px |
| Side panel | 375 wide | 0 | mixed | 0 | 20px |
| Side panel header | auto × 60 | 10 15 | 0 | 10 | 20px |
| Sticky footer | auto × 52 | 10 15 | 0 | 20 | 13px SemiBold |
| Toggle | 55 × 25 | 0 7 0 2 | pill | 0 | 13px |
| Checkbox/Radio item | auto × 22 | 0 | 0 | 10 | 16px |
| Information box (row) | auto × 56 | 0 | 0 | 0 | 13px |

Notes that catch people out:

- **Buttons are pills** — Figma stores radius 20, chips 76, toggle 13. In CSS all three
  are `border-radius: 999px`. The radius tokens (4px, 8px) are for cards and inputs and
  are **not** what buttons use.
- **Input left padding is asymmetric** — `10px 10px 10px 20px`. Deliberate.
- **Table rows are 58px and headers 54px, both at 13px.** People First tables are airy;
  38px rows read as a spreadsheet, not this product.
- **Tags are sentence case.** Uppercase tags are the giveaway of a guessed implementation.

### Spacing

5px base: `--pf-space-xsmall` 5 · `-small` 10 · `-medium` 15 · `-large` 20 · `-xlarge` 40.
Do not introduce intermediate values — if a gap wants 12px, use 10 or 15.

Page padding is 20px vertical / 40px horizontal (`--pf-space-large` / `--pf-space-xlarge`),
dropping to 20px horizontal below 620px. Content sections are stacked with a 20px gap.

### Elevation

Only two shadows exist. There is no elevation ramp — do not invent one.

```css
box-shadow: var(--pf-shadow-drop-shadow);          /* 0 0 4px #c1c1c1 — cards, side panel */
box-shadow: var(--pf-shadow-modal-header-shadow);  /* 0 4px 4px rgba(0,0,0,.1) — modal/sticky headers */
```

---

## Icons

All 43 glyphs on this screen are real Figma exports from `assets/icons/`, verified by path
data. **Never draw a substitute** — a hand-drawn glyph is the fastest way to make the
screen look not-quite-People-First, and it is invisible to the colour and geometry checks.

| Icon file | Used for | Count |
|---|---|---|
| `context-menu` | row action menus | 9 |
| `tick` | every approve/confirm button, checkbox art | 7 |
| `export` | Export | 3 |
| `sort-arrow-ag-grid` | Sort button, column sort indicator | 3 |
| `filter` | More filters, column filter indicator | 3 |
| `close-x-cancel` | panel close, query buttons | 3 |
| `clock` | normal day rows | 3 |
| `overtime` | overtime day rows | 3 |
| `warning` | working-time notices | 2 |
| `comment-chat-bubble` | Raise query | 2 |
| `notification-bell` | Send reminder | 1 |
| `search` | search field | 1 |
| `time-edit` | Adjust | 1 |
| `edit` | panel edit | 1 |
| `calendar` | not-worked day | 1 |

Every glyph is `fill="currentColor"`, so it takes its container's colour — set that with
an **icon** token. Icon sizes: `--pf-icon-size-xxs` 18 · `-xs` 22 · `-s` 28 · `-m` 36 ·
`-lg` 44. Buttons on this screen render their icon at 14px, which is below the smallest
named size — a layout choice, not a token. `Icon-size-xxxs` is 0px in Figma (unset) —
do not use it.

---

## States to build

Every interactive element, every state it has in Figma. A state missing here gets missed.

**Button** — `Type` × `State`
| Type | Default | Hover | Disabled |
|---|---|---|---|
| Action | ✔ | ✔ | see warning below |
| Positive | ✔ | ✔ | see warning below |
| Negative | ✔ | ✔ | see warning below |
| Hollow | ✔ | ✔ | border → `--pf-border-disabled`, text → `--pf-text-disabled` |
| Filter | ✔ | ✔ | as Hollow |
| Sort | ✔ | ✔ | as Hollow |

> ⚠️ **A disabled Action, Positive or Negative button looks identical to an enabled one.**
> Figma binds exactly the same fill and text for `State=Disabled` as for `State=Default`
> on those three types. Only the hollow types visibly change. This is a real accessibility
> problem — colour alone will not tell the user the control is dead. **Do not** ship a
> disabled solid button without a second signal (an explanatory line, or hiding the
> control). Raise it against the Figma file.

**Filter chip** — `State` × `Active`
- `State=Default, Active=False` — white fill, hollow-button border, primary text
- `State=Selected, Active=True` — white fill, theme border, theme text (both attributes required)
- `State=Hover, Active=False` — theme-tint fill, theme border, theme text

**Form field** — `Input type` × `State`. Input types on this screen: Text, Dropdown,
Search, Date picker. States: Default, Selected, Error, Disabled. See **GAP 1** below —
Figma binds only the *label* colour for these states, not the input box.

**Field** — `Right aligned=No` × `Filled=No | Yes`. `Filled=No` renders placeholder-weight
secondary text; `Filled=Yes` renders primary.

**Table cell (AG)** — `Type=Default | Checkbox` × `Style=Default | Stripe | Hover`.
Stripe is every second row. Hover fills `--pf-bg-theme`.

**Table header icons** — `Variant=Sort | Filter | Context menu` ×
`State=Default | Ascending | Descending | Filtered | Active`.

**Multi-select checkbox** — `State=Default | Hover | Selected | Mixed selection`.
See **GAP 3**: Selected and Mixed selection bind the same fill, so the tick and the dash
must be drawn.

**Checkbox/Radio item** — `State=Default | Hover | Selected | Error | Disabled`.
See **GAP 2**.

**Toggle** — `On=No|Yes` × `Locked=No|Yes`. Figma's spelling is **Yes/No**;
`data-on="true"` does nothing.

**Draggable card** — `State=Default | Hover | Click | Drag | Drop`. Only Default is used
on the live screen; the others exist for the day-row reorder interaction.

**Side navigation tab** — `Selected=true | false`.

---

## What you still have to write yourself

Generated CSS only carries what Figma measures. These are legitimately yours, and writing
them is **not** a violation of the "never hand-write component CSS" rule:

- **Page layout** — the `.app` grid, column widths, page padding, where things sit
- **Behaviour** — `cursor`, `transition`, `:focus-visible` rings
- **`line-height`** — not captured by the extract
- **Art drawn inside a component** — the tick inside a checkbox, the dash in a mixed
  checkbox, the knob inside a toggle

Keep that CSS in one clearly-labelled block. **If something in it restates a Figma value —
a colour, a height, a radius — that is a bug, not a local style.**

### Gaps in the extract you must fill

The prototype labels these `GAP 1`–`GAP 3` in its local CSS. They are real holes in the
Figma bindings, not oversights in the build:

**GAP 1 — Form field states have no box treatment.** Figma binds only the *text* colour
for `State=Error`, `Selected` and `Disabled`. The input box itself gets no border or fill,
so an errored field would look identical to a valid one. Fill it:

```css
.pf-form-field[data-state="Error"]    .pf-field { border-color: var(--pf-border-negative); }
.pf-form-field[data-state="Selected"] .pf-field { border-color: var(--pf-border-info); }
.pf-form-field[data-state="Disabled"] .pf-field { background: var(--pf-bg-secondary);
  color: var(--pf-text-disabled); border-color: var(--pf-border-disabled); }
```

**GAP 2 — Checkbox/Radio item binds only the label colour**, not the 20×20 box. The box
is a child element you draw: 20×20, radius 4, `1.5px solid var(--pf-border-form-input)`,
filling `--pf-icon-theme` when selected.

**GAP 3 — Multi-select checkbox `Selected` and `Mixed selection` bind the same fill.**
Without drawn art they are indistinguishable filled squares. Draw the tick and the dash.

**Icon-only Button has no class.** The Figma icon-only variant binds no colour of its own,
so the generator emits nothing for it. Add the shape locally:

```css
.pf-button--icon-only { width: 32px; padding: 0; justify-content: center; }
```

---

## Responsive

**Figma's layout grid**: 1588 (24 col) · 1454 (22) · 1320 (18) · 784 (12).
All use a 20px gutter and 47px column, centre-aligned.

The prototype's breakpoints are **not** those numbers — they are implementation choices
driven by the three-column shell:

| Breakpoint | What changes |
|---|---|
| > 1280px | Full three-column grid: 232px nav │ fluid content │ 375px panel |
| ≤ 1280px | Detail panel drops below the content, full width, stops being sticky |
| ≤ 860px | Side navigation hidden entirely |
| ≤ 620px | Page horizontal padding drops 40px → 20px |
| any | Table scrolls horizontally below 878px |

Within `.content`, the stat grid is `repeat(auto-fit, minmax(175px, 1fr))` — four across,
reflowing to two and then one.

*Not specified — confirm with design:* whether these breakpoints should be aligned to the
Figma grid (1320 / 784), and what replaces the side navigation below 860px. Figma has a
`Mobile bottom navigation` component (76px) and a mobile `Filter chip` (34px, 13px) that
are unused here; if a mobile layout is in scope, those are the intended pieces.

---

## Accessibility

From `node scripts/pf-audit.mjs prototypes/timesheet-approvals.html`:

- **100% token coverage** in both modes (168 colours light, 164 dark)
- **No contrast failures** in either mode
- Two disabled elements sit at **3.64:1** — the `Undo` button in the variant reference
  block, and the disabled `Cost centre` label. WCAG 1.4.3 exempts disabled controls and
  `--pf-text-disabled` is 3.64:1 by design. Acceptable — but **never use that token for
  live text.**

Known margin to watch, confirmed by `node scripts/check-contrast.mjs` (29/33 pass AA in
light, 32/33 in dark): `--pf-text-positive` on `--pf-bg-primary` is **4.43:1 in dark mode**
(`#00ad60` on `#2c313c`), marginally under 4.5. Fine at 18px+ or SemiBold; for small
success text pair it with an icon or `--pf-bg-positive` rather than relying on colour
alone.

Note that `--pf-icon-required-field` flips from red (`#be2028`) to **blue** (`#5cc4ea`) in
dark mode — the required-field asterisk is not red in dark. Do not rely on it reading as
an error colour; the requirement must be in the accessible name or the hint.

### Structure and semantics

- Landmarks: `<nav aria-label="Main">`, `<header>`, `<aside aria-labelledby>`. Each filter
  and content section carries its own `aria-label`.
- The status filter row is `role="group" aria-label="Approval status"`; each chip is a
  `<button>` with `aria-pressed`.
- Toggles are `role="switch"` with `aria-checked` and `tabindex="0"`.
- Checkbox glyphs that convey state are `role="img"` with an explicit label
  (`"Selected"` / `"Not selected"` / `"Mixed"`). The select-all header checkbox announces
  `"Some rows on this page selected"`.
- The table has a `<caption>`, `scope="col"` on every header, and column sort/filter state
  exposed as `role="img" aria-label="Sorted ascending"` / `"Filtered"`.
- Icon-only buttons carry a specific label — `aria-label="Actions for Aisha Bello"`, not
  `"Actions"`.
- The errored field wires `aria-invalid="true"` and `aria-describedby` to its hint.
- The required-field asterisk is `aria-hidden="true"` — the requirement must also be in
  the accessible name or the hint.

### Keyboard

Order follows the DOM: nav → header actions → filter chips → search/period/team →
sort/filter/toggle → bulk actions → table (row select, name link, row menu) → panel.

Focus is a 2px `--pf-border-theme` outline at 2px offset, applied via `:focus-visible` so
it does not appear on mouse click. That is a local style — Figma specifies no focus ring.

`@media (prefers-reduced-motion: reduce)` disables all transitions.

### Touch

**Buttons are 32px tall — below the 44px WCAG touch minimum.** Filter chips (42px) and
inputs (42px) are also under. Fine on desktop, where this screen lives; if a touch layout
is in scope, increase the tap area without changing the visual height.

---

## Known Figma source issues

Carry these into the build so they are not mistaken for implementation bugs:

- **`Tags` Type=Theme binds a border token for its text.** Its six siblings all bind a
  `Tags/Content/*` token; Theme binds `Tags/Borders/Info` for both border and text. Looks
  like a mis-binding in Figma. The generated class reproduces it faithfully. Used on this
  screen for the "Overtime 9.75" pill.
- **`Information box` binds no background and the same text colour for all four types.**
  Information, Warning, Error and Success are visually identical. This screen compensates
  by placing a coloured icon (`--pf-icon-warning` / `--pf-icon-negative`) next to the text
  and, for the page-level notice, wrapping it in a `Card`. That is a local decision — if
  design intends tinted banners, the `--pf-bg-neutral` / `-positive` / `-warning` /
  `-negative` tokens exist and the Figma component needs fixing.
- **`Toggle` and `Sticky footer` bind primitives** (`--pf-base-grey-dolphin`,
  `--pf-base-white`) in Figma itself, so those two do not fully adapt between modes. The
  generated CSS reproduces the binding; the fault is upstream.
- **`Toast message` and the AI components bind fixed colours** and will not adapt in dark
  mode. Not used on this screen.
- **`Icon-size-xxxs` is 0px** — unset in Figma. Do not use.
- Two text styles share the name `Desktop text/Button text` (16px sentence case and 13px
  uppercase). The 13px one is exported as `Button text (uppercase)`. **Neither uppercase
  style is used by any shipping component** — treat them as legacy and follow the
  components, which are sentence case.

---

## Open questions

Genuinely unspecified. Each needs a decision rather than a guess:

1. **Stat tiles: `Card` or `Metric card`?** The prototype uses `Card` because the tiles
   carry three lines. `Metric card` is the named component for a big-number tile and binds
   a grey `--pf-bg-tertiary` surface. Changing this changes the top of the screen visibly.
2. **The `.eyebrow` treatment is invented.** The breadcrumb and the stat-tile labels render
   13px SemiBold uppercase at `letter-spacing: .07em`. People First has no uppercase style
   in any shipping component, and its type scale uses −1% or 0 letter-spacing — never
   positive tracking. Either add a real text style in Figma or drop to sentence-case
   `.pf-text-label-text-semibold`.
3. **Column widths are layout choices, not Figma values.** The nine widths above came from
   fitting the content, not from a measured frame. Confirm, or let the table auto-size.
4. **Breakpoints** — see Responsive. The prototype's 1280/860/620 are not the Figma grid's
   1320/784.
5. **Sidebar width is 232px, which is not a Figma width.** Figma has `Side navigation` at
   **90 wide** (described in the extract as a "collapsed rail", pairing with the 90×86
   `Navigation item`) and `Side navigation panel` at **268 wide** (pairing with the 268×48
   `Side navigation tab` this screen uses). 232px sits between the two. Since the screen
   uses the tab, 268px is the likely intent — confirm.
6. **Avatar has no Figma component.** The 36px/56px circle with initials is drawn locally
   using `--pf-bg-theme` / `--pf-text-theme`. `Profile image` exists in Figma but binds no
   colour variable, so nothing was generated for it.
7. **Disabled state for solid buttons** — see the warning under States. Needs a design
   answer, not an implementation one.
8. **Icon size in buttons is 14px**, below the smallest named icon token (18px). Confirm
   whether buttons should use `--pf-icon-size-xxs` at 18px instead.

---

## Checking your build

Seven checks, each on a different axis. They are not interchangeable — on this project
every one of them has passed while the page was visibly wrong on an axis it does not
measure.

```bash
node scripts/verify-geometry.mjs <page>.html      # shapes match Figma
node scripts/verify-rendered.mjs <page>.html      # colours match Figma, both modes
node scripts/check-icon-fidelity.mjs <page>.html  # every glyph is a real Figma icon
node scripts/pf-audit.mjs <page>.html             # on-system + WCAG contrast
node scripts/verify-components.mjs                # the whole library vs Figma
node scripts/verify-type.mjs                      # the type classes match Figma
node scripts/check-skill-classes.mjs              # the docs match the stylesheet
```

**None of them replaces looking at the page.** Screenshot the result in light *and* dark
and look at it before calling the screen done.
