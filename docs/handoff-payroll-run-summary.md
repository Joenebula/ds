# Payroll run summary — developer handoff

Build target: `prototypes/payroll-run-summary.html`.
Element manifest: `prototypes/payroll-run-summary.manifest.json`.

Every value below is traced to `tokens/design-tokens.json`,
`tokens/_raw/component-geometry.tsv`, `tokens/_raw/component-variants.tsv` or the
generated `dist/*.css` — read out of the files or measured in a browser, not estimated.
Where a value genuinely is not specified in Figma it says so rather than guessing.

Verified against the built page on 2026-09-10:

```
pf-audit          100% token coverage, light and dark; 0 contrast failures
verify-geometry   29 checks match Figma, 0 off
verify-rendered   54 rendered colours match Figma, 0 mismatched
icon fidelity     24 of 24 inline glyphs are real Figma icon files
verify-layout     nothing clipped outside a scroll region
tagging           107 of 107 elements addressable by name, every variant real
```

---

## What this screen does

A payroll administrator signs off a monthly run before the RTI submission deadline. They
check the run totals, work through the employees the system has flagged — missing or
invalid bank details, unusual overtime, new starters and leavers — and either approve the
run or hold it while a query is resolved. Three of the 248 employees have validation
errors that will block the FPS being accepted, so the flagged list is the real work and
the totals are the reassurance.

The table is the primary surface. The right-hand panel breaks one employee's pay down into
payments and deductions without losing the administrator's place in the list.

## Components used

29 distinct component-and-variant combinations across 107 elements. Every one is a class
in `dist/components.css` — use the class rather than rebuilding from the geometry tables,
which are here as the record of what the class should produce.

| Element | Figma component | Variant | Class to use | Count |
|---|---|---|---|---|
| Approve pay run | Button | Type=Positive | `.pf-button[data-type="Positive"]` | 2 |
| Approve selected | Button | Type=Action | `.pf-button[data-type="Action"]` | 1 |
| Put on hold, Raise query | Button | Type=Negative | `.pf-button[data-type="Negative"]` | 2 |
| Audit history, Export, Add, Sort | Button | Type=Hollow | `.pf-button[data-type="Hollow"]` | 5 |
| Pay-element rows | Draggable card | State=Default | `.pf-draggable-card[data-state="Default"]` | 5 |
| Department, pay group, search | Field | Filled=No, Right aligned=No | `.pf-field` | 6 |
| Status filters | Filter chip | State=Default, Active=False | `.pf-filter-chip[data-state="Default"]` | 5 |
| Selected filter | Filter chip | State=Selected, Active=True | `.pf-filter-chip[data-state="Selected"]` | 1 |
| Note for payroll | Form field | Input type=Text, State=Default | `.pf-form-field[data-input-type="Text"]` | 1 |
| Sort code (invalid) | Form field | Input type=Text, State=Error | `.pf-form-field[data-state="Error"]` | 1 |
| Pay method | Form field | Input type=Text, State=Selected | `.pf-form-field[data-state="Selected"]` | 1 |
| Validation warning | Information box | Type=Warning | `.pf-information-box[data-type="Warning"]` | 1 |
| Sort-code error | Information box | Type=Error | `.pf-information-box[data-type="Error"]` | 1 |
| Row checkboxes | Multi-select checkbox | State=Default | `.pf-multi-select-checkbox[data-state="Default"]` | 7 |
| Row checkboxes (checked) | Multi-select checkbox | State=Selected | `.pf-multi-select-checkbox[data-state="Selected"]` | 4 |
| Bulk action bar | Selected action banner | Mobile=False | `.pf-selected-action-banner` | 1 |
| Sidebar links | Side navigation tab | Selected=false | `.pf-side-navigation-tab` | 7 |
| Sidebar current | Side navigation tab | Selected=true | `.pf-side-navigation-tab[data-selected="true"]` | 1 |
| Employee table | Table (AG) | Mobile=False | `.pf-table-ag` | 1 |
| Table cells | Table cell (AG) | Type=Default, Style=Default | `.pf-table-cell-ag[data-style="Default"]` | 20 |
| Table cells (striped) | Table cell (AG) | Type=Default, Style=Stripe | `.pf-table-cell-ag[data-style="Stripe"]` | 20 |
| Sort indicator | Table header icons | Variant=Sort, State=Ascending | `.pf-table-header-icons[data-variant="Sort"]` | 1 |
| Approved | Tags | Type=Positive | `.pf-tags[data-type="Positive"]` | 4 |
| Needs review | Tags | Type=Warning | `.pf-tags[data-type="Warning"]` | 3 |
| Failed validation | Tags | Type=Negative | `.pf-tags[data-type="Negative"]` | 2 |
| Not started | Tags | Type=Neutral | `.pf-tags[data-type="Neutral"]` | 1 |
| Query raised | Tags | Type=Other | `.pf-tags[data-type="Other"]` | 1 |
| Leaver | Tags | Type=Expired | `.pf-tags[data-type="Expired"]` | 1 |
| Show only exceptions | Toggle | On=No, Locked=No | `.pf-toggle[data-on="No"]` | 1 |

Address elements by the `data-pf-id` in the manifest, not by these selectors — a selector
changes every time the layout does, a name does not.

## Tokens

Semantic tokens only; the page uses no primitives. Both mode values are read from
`dist/tokens.css`.

| Purpose | Token | Light | Dark |
|---|---|---|---|
| Page background | `--pf-bg-secondary` | Light Ivory `#fafafa` | Blue Shark `#1d1f27` |
| Card / bar surface | `--pf-bg-primary` | White `#ffffff` | Blue Charade `#2c313c` |
| Muted surface | `--pf-bg-tertiary` | White Ivory `#f2f2f2` | `#282a32` |
| Selected row | `--pf-bg-highlight` | White Lilac `#f0f2f6` | Blue Oxford `#3d4a5c` |
| Brand tint | `--pf-bg-theme` | Pale Pink Theme `#fcf4f7` | `#2c3844` |
| Brand solid | `--pf-bg-theme-full` | Default Pink `#cd2359` | Blue Sky `#33b5e5` |
| Body text | `--pf-text-primary` | Grey Slate `#3e3e3e` | White `#ffffff` |
| Secondary text | `--pf-text-secondary` | Grey Fog `#656565` | Grey Dolphin `#c1c1c1` |
| Links | `--pf-text-link` | Blue Ocean `#0075be` | Blue Turquoise `#5cc4ea` |
| Brand text | `--pf-text-theme` | Default Pink `#cd2359` | Blue Turquoise `#5cc4ea` |
| Hairlines | `--pf-border-default` | Grey Steel `#e5e5e5` | White `#ffffff` |
| Control borders | `--pf-border-secondary` | Grey Dolphin `#c1c1c1` | Grey Dolphin `#c1c1c1` |
| Input borders | `--pf-border-form-input` | Grey boulder `#777777` | Grey boulder `#777777` |
| Brand border | `--pf-border-theme` | Default Pink `#cd2359` | Blue Turquoise `#5cc4ea` |
| Table hairline | `--pf-table-border` | Grey Dolphin `#c1c1c1` | `#1a1a1a` |
| Table surface | `--pf-table-card` | = `--pf-bg-primary` | `#2c313c` |
| Header cell | `--pf-table-header-cell` | = `--pf-bg-tertiary` | `#141414` |
| Body cell | `--pf-table-primary-cell` | = `--pf-bg-primary` | `#323441` |
| Striped cell | `--pf-table-stripe-cell` | = `--pf-bg-secondary` | `#23252e` |
| Secondary icons | `--pf-icon-secondary` | Grey Fog `#656565` | Grey Dolphin `#c1c1c1` |
| Disabled icons | `--pf-icon-disabled` | Grey `#868686` | White Ivory `#f2f2f2` |
| Required marker | `--pf-icon-required-field` | Red `#be2028` | Blue Turquoise `#5cc4ea` |
| Chart sequence | `--pf-chart-1` … `--pf-chart-10` | mode-stable by design | same |

Tag colours come from the `Tags/Fills`, `Tags/Borders` and `Tags/Content` groups; use the
`.pf-tags[data-type="…"]` class rather than the tokens directly.

**Three tokens behave unusually** and are the ones developers get wrong:

- `--pf-text-inverted-primary` **flips** between modes.
- `--pf-text-always-white` and `--pf-text-always-grey-slate` deliberately **do not**.
- Chart colours are mode-stable by design — safe on any surface.

## Geometry

Measured in Figma, in `tokens/_raw/component-geometry.tsv`.

| Element | Height | Padding | Radius | Type |
|---|---|---|---|---|
| Button | 32px | 0 20px | 20px (pill) | 13px SemiBold, leading icon, 10px gap |
| Filter chip | 42px | 10px 20px | 76px (pill) | 16px, letter-spacing −1% |
| Tags | 28px | 5px 10px | 4px | 13px Regular, **sentence case** |
| Field / Form field input | 42px | 10px 10px 10px 20px | 8px | 13px |
| Table header cell | 54px | 15px | — | 13px SemiBold |
| Table body cell | 58px (minimum) | 10px 15px | — | 13px Regular |
| Selected action banner | 48px | 8px 20px | 8px | 16px |
| Draggable card | 42px | 10px 15px | 8px | 13px |
| Side navigation tab | 48px | 10px 20px | — | 16px |

Table row height is a **minimum**, not a fixed value: Figma's 58px row with 10px padding
and a 1px border leaves 36px of content box, and two lines of 13px text need 37.6px, so
the cell grows. Do not fight it with `height`.

## States to build

| Component | States in Figma | Notes |
|---|---|---|
| Button | Default, Hover, Disabled | Disabled is `:disabled`; Figma gives 7 components an identical disabled state — see Open questions |
| Filter chip | Default, Hover, Selected × Active True/False | Selected is the pressed filter; set `aria-pressed` |
| Form field | Default, Selected, Error | Error shows the message below the input, not as a tooltip |
| Multi-select checkbox | Default, Selected, Mixed | Mixed is the header checkbox with a partial selection |
| Table cell (AG) | Style=Default, Stripe; Hover on the row | Row hover is a Figma `Style=Hover` binding |
| Toggle | On=Yes/No × Locked=Yes/No | Locked is a policy lock, not a disabled state |
| Side navigation tab | Selected true/false, Hover | Selected carries the brand border and SemiBold |

## Responsive

Breakpoints from the layout grid: 1588 (24 col) · 1454 (22) · 1320 (18) · 784 (12), all
20px gutter and 47px column.

The prototype implements one breakpoint change: below 860px the sidebar is hidden and the
grid collapses to a single column. **Everything else is unspecified in Figma** — the
detail panel's behaviour on a narrow viewport, and where the table's nine columns go, are
not drawn. Confirm with design rather than inventing it.

The table is wider than its column at 1440 and scrolls horizontally inside its card. That
is deliberate and unavoidable at this width with a detail panel open; a fade at the right
edge signals it.

## Accessibility

- **Contrast: 0 failures in either mode**, across 144 sampled colours in light and 140 in
  dark, 100% token coverage.
- **One disabled-exempt note**: the disabled `Undo` button is 3.49:1 against the page
  (Grey `#868686` on Light Ivory `#fafafa`), below the 4.5:1 body-text threshold. WCAG
  exempts disabled controls, and this is Figma's own `Text/Disabled` on
  `Background/Secondary` — so it is the design system's value, not a page mistake. Worth
  raising with design if disabled text needs to be readable.
- Keyboard order follows the DOM: sidebar → page actions → filters → bulk actions → table
  → detail panel. Focus is a 2px `--pf-border-theme` ring at 2px offset.
- Every icon-only control carries an `aria-label`; decorative glyphs are `aria-hidden`.
- The bulk-action bar should be announced when it appears — it is a live region in
  practice, not marked up as one in the prototype.
- Hit targets: buttons are 32px tall, below the 44px touch minimum. Acceptable on desktop,
  needs a decision for touch.

## Open questions

Genuinely unspecified — named rather than filled in.

1. **Responsive behaviour of the detail panel and the nine-column table.** Not drawn in
   Figma at any breakpoint.
2. **Disabled text contrast** (3.49:1). Exempt under WCAG, but a deliberate choice worth
   confirming.
3. **`--pf-border-default` does not exist in the Figma file.** It is used 38 times in
   `dist/components.css` and 18 times in this screen. Figma has `Border/Default full`
   (Grey Steel → Grey Fog) and `Border/Default hidden`, but no `Border/Default`; the
   extract's dark value is White, which matches neither. Either the variable was renamed
   after extraction or the extract was wrong. **A developer should not resolve this** —
   changing it visibly alters every hairline in dark mode.
4. **`--pf-bg-theme-full` likewise has no Figma variable**; its values are identical to
   `Background/Theme`, so it is probably a duplicate that should be retired.
5. **Sample data.** People, payroll numbers, amounts and dates are invented. Nothing here
   is real employee data.
