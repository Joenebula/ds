# Component variants

Every variant below is taken from the Figma component sets, with the exact
variables each variant binds — translated to CSS custom properties.

**How to use this.** When a prototype needs a component in a particular state,
find it here and apply the three bindings: background `fill`, border `stroke`,
and `color` from text. A dash means the variant binds nothing for that slot
(inherit, or the component draws it another way). Every value is mode-aware, so
light and dark both work without extra effort.

Bindings are per-variant, not guessed from the component name — e.g. the Action
button uses `--pf-text-inverted-primary`, NOT white, because that is what the
Figma component actually binds.


## Buttons and links

### Button

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Action, State=Default | `var(--pf-bg-secondary-button)` | — | `var(--pf-text-inverted-primary)` |
| Type=Action, State=Hover | `var(--pf-bg-secondary-button-hover)` | — | `var(--pf-text-inverted-primary)` |
| Type=Positive, State=Default | `var(--pf-bg-primary-button)` | — | `var(--pf-base-white)` |
| Type=Positive, State=Hover | `var(--pf-bg-primary-button-hover)` | — | `var(--pf-base-white)` |
| Type=Negative, State=Default | `var(--pf-bg-negative-button)` | — | `var(--pf-base-white)` |
| Type=Negative, State=Hover | `var(--pf-bg-negative-button-hover)` | — | `var(--pf-base-white)` |
| Type=Hollow, State=Default | — | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| Type=Hollow, State=Hover | `var(--pf-button-fill-hollow-hover)` | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| Type=Filter, State=Default | — | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| Type=Filter, State=Hover | `var(--pf-button-fill-hollow-hover)` | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| Type=Sort, State=Default | — | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| Type=Sort, State=Hover | `var(--pf-button-fill-hollow-hover)` | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| Type=Hollow, State=Disabled | — | `var(--pf-border-disabled)` | `var(--pf-text-disabled)` |
| Type=Filter, State=Disabled | — | `var(--pf-border-disabled)` | `var(--pf-text-disabled)` |
| Type=Sort, State=Disabled | — | `var(--pf-border-disabled)` | `var(--pf-text-disabled)` |
| Type=Action, State=Disabled | `var(--pf-bg-secondary-button)` | — | `var(--pf-text-inverted-primary)` |
| Type=Negative, State=Disabled | `var(--pf-bg-negative-button)` | — | `var(--pf-base-white)` |
| Type=Positive, State=Disabled | `var(--pf-bg-primary-button)` | — | `var(--pf-base-white)` |

### Links

| Variant | Background | Border | Text |
|---|---|---|---|
| Link type=Primary, Hover=False | — | — | `var(--pf-text-link)` |
| Link type=Primary, Hover=True | — | — | `var(--pf-text-link)` |
| Link type=Secondary, Hover=False | — | — | `var(--pf-text-link)` |
| Link type=Secondary, Hover=True | — | — | `var(--pf-text-link)` |

### Filter chip

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default, Active=False | `var(--pf-bg-primary)` | `var(--pf-border-hollow-button)` | `var(--pf-text-primary)` |
| State=Selected, Active=True | `var(--pf-bg-primary)` | `var(--pf-border-theme)` | `var(--pf-text-theme)` |
| State=Hover, Active=False | `var(--pf-bg-theme)` | `var(--pf-border-theme)` | `var(--pf-text-theme)` |

### Add attachment

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Action menu button

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Tool tip

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-tertiary)` | — | `var(--pf-text-primary)` |

### Drop down button

| Variant | Background | Border | Text |
|---|---|---|---|
| Hover=False | — | `var(--pf-border-form-input)` | `var(--pf-text-primary)` |
| Hover=True | `var(--pf-bg-tertiary)` | `var(--pf-border-form-input)` | `var(--pf-text-secondary)` |

### Repeating group

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `Grey-slate` ⚠️ |

### Action menu

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

## Forms

### Form field

| Variant | Background | Border | Text |
|---|---|---|---|
| Input type=Text, State=Default | — | — | `var(--pf-text-primary)` |
| Input type=Text, State=Disabled | — | — | `var(--pf-text-primary)` |
| Input type=Text, State=Error | — | — | `var(--pf-text-negative)` |
| Input type=Text, State=Selected | — | — | `var(--pf-text-link)` |
| Input type=Dropdown, State=Default | — | — | `var(--pf-text-primary)` |
| Input type=Dropdown, State=Disabled | — | — | `var(--pf-text-primary)` |
| Input type=Dropdown, State=Error | — | — | `var(--pf-text-negative)` |
| Input type=Dropdown, State=Selected | — | — | `var(--pf-text-link)` |
| Input type=Search, State=Default | — | — | `var(--pf-text-primary)` |
| Input type=Search, State=Disabled | — | — | `var(--pf-text-primary)` |
| Input type=Search, State=Error | — | — | `var(--pf-text-negative)` |
| Input type=Search, State=Selected | — | — | `var(--pf-text-link)` |
| Input type=Date picker, State=Default | — | — | `var(--pf-text-primary)` |
| Input type=Time picker, State=Default | — | — | `var(--pf-text-primary)` |

### Field

| Variant | Background | Border | Text |
|---|---|---|---|
| Right aligned=No, Filled=No | `var(--pf-bg-primary)` | `var(--pf-border-form-input)` | `var(--pf-text-secondary)` |
| Right aligned=No, Filled=Yes | `var(--pf-bg-primary)` | `var(--pf-border-form-input)` | `var(--pf-text-primary)` |
| Right aligned=Yes, Filled=No | `var(--pf-bg-primary)` | `var(--pf-border-form-input)` | `var(--pf-text-secondary)` |
| Right aligned=Yes, Filled=Yes | `var(--pf-bg-primary)` | `var(--pf-border-form-input)` | `var(--pf-text-secondary)` |

### Text area

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Standard | — | — | `var(--pf-text-primary)` |
| Type=Read only | — | — | `var(--pf-text-primary)` |
| Type=Disabled | — | — | `var(--pf-text-primary)` |
| Type=Error | — | — | `var(--pf-text-negative)` |

### Option

| Variant | Background | Border | Text |
|---|---|---|---|
| Selected=No | — | — | `var(--pf-text-primary)` |
| Selected=Yes | — | — | `var(--pf-text-inverted-primary)` |

### Inline search

| Variant | Background | Border | Text |
|---|---|---|---|
| Filled=False | — | — | `var(--pf-text-primary)` |
| Filled=True | — | — | `var(--pf-text-primary)` |

### Primary search

| Variant | Background | Border | Text |
|---|---|---|---|
| Darkmode=False, Icon only=False | `var(--pf-bg-primary)` | `var(--pf-border-secondary)` | `var(--pf-text-secondary)` |

### Message box

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | `var(--pf-bg-primary)` | `var(--pf-border-form-input)` | `var(--pf-text-secondary)` |

### [S] Text area

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Signature

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Text template format editor 

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Required field

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Field label

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Browser drop down

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-secondary)` | — | `var(--pf-text-always-white)` |

### People and department drop down

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-primary)` | — | `var(--pf-base-white)` |

### Multiselect tag

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-base-blue-ocean)` | — | `var(--pf-base-white)` |

### [S] Post content

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Calendar picker

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-base-white)` |

### Time picker

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-base-white)` |

## Controls

### Toggle

| Variant | Background | Border | Text |
|---|---|---|---|
| On=No, Locked=No | `var(--pf-bg-tertiary)` | `var(--pf-base-grey-dolphin)` | `var(--pf-text-secondary)` |
| On=Yes, Locked=No | `var(--pf-bg-primary-button)` | — | `var(--pf-base-white)` |
| On=No, Locked=Yes | `var(--pf-bg-tertiary)` | `var(--pf-base-grey-dolphin)` | — |
| On=Yes, Locked=Yes | `var(--pf-bg-primary-button)` | — | — |

### Radio tile

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| State=Hover | `var(--pf-bg-theme)` | `var(--pf-border-theme)` | `var(--pf-text-theme)` |

### Radio card

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Enabled, Selected=No | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| State=Enabled, Selected=Yes | `var(--pf-bg-theme)` | `var(--pf-border-theme)` | `var(--pf-text-theme)` |
| State=Disabled, Selected=No | `var(--pf-bg-tertiary)` | `var(--pf-border-disabled)` | `var(--pf-text-disabled)` |
| State=Disabled, Selected=Yes | `var(--pf-bg-tertiary)` | `var(--pf-border-disabled)` | `var(--pf-text-disabled)` |

### Checkbox/Radio item

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | — | — | `var(--pf-text-primary)` |
| State=Hover | — | — | `var(--pf-text-link)` |
| State=Disabled | — | — | `var(--pf-text-secondary)` |
| State=Error | — | — | `var(--pf-text-negative)` |
| State=Selected | — | — | `var(--pf-text-link)` |

### Checkbox/Radio list

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | — | — | `var(--pf-text-primary)` |
| State=Disabled | — | — | `var(--pf-text-primary)` |
| State=Error | — | — | `var(--pf-text-negative)` |
| State=Selected | — | — | `var(--pf-text-link)` |

### Control

| Variant | Background | Border | Text |
|---|---|---|---|
| Radio=No | `var(--pf-bg-primary)` | `var(--pf-icon-disabled)` | — |
| Radio=Yes | `var(--pf-bg-primary)` | `var(--pf-icon-disabled)` | — |

### Image picker

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | — | `var(--pf-border-form-input)` | — |

### Document previewer

| Variant | Background | Border | Text |
|---|---|---|---|
| Device=Mobile | — | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Device=Tablet | — | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Device=Desktop | — | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Date picker period

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Date range visual

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Slider

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

## Tables

### Table header (AG)

| Variant | Background | Border | Text |
|---|---|---|---|
| Alignment=Left | `var(--pf-table-header-cell)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Alignment=Right | `var(--pf-table-header-cell)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Alignment=Checkbox | `var(--pf-table-header-cell)` | — | — |

### Table cell (AG)

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Default, Style=Default | `var(--pf-table-primary-cell)` | `var(--pf-border-default)` | `var(--pf-text-link)` |
| Type=Default, Style=Stripe | `var(--pf-table-stripe-cell)` | `var(--pf-border-default)` | `var(--pf-text-link)` |
| Type=Default, Style=Hover | `var(--pf-bg-theme)` | `var(--pf-border-default)` | — |
| Type=Checkbox, Style=Default | `var(--pf-table-primary-cell)` | `var(--pf-border-default)` | — |
| Type=Checkbox, Style=Stripe | `var(--pf-table-stripe-cell)` | `var(--pf-border-default)` | — |
| Type=Checkbox, Style=Hover | `var(--pf-bg-theme)` | `var(--pf-border-default)` | — |

### Table (AG)

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | — | `var(--pf-table-border)` | `var(--pf-text-primary)` |

### Table card (AG)

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | `var(--pf-table-card)` | — | `var(--pf-text-theme)` |

### Footer (AG)

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | `var(--pf-table-card)` | — | `var(--pf-text-primary)` |

### Multi-select checkbox

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | `var(--pf-bg-primary)` | `var(--pf-icon-disabled)` | — |
| State=Hover | `var(--pf-bg-theme)` | `var(--pf-icon-theme)` | — |
| State=Selected | `var(--pf-icon-theme)` | — | — |
| State=Mixed selection | `var(--pf-icon-theme)` | — | — |

### Table header icons

| Variant | Background | Border | Text |
|---|---|---|---|
| Variant=Sort, State=Default | — | — | — |
| Variant=Sort, State=Ascending | `var(--pf-bg-theme)` | `var(--pf-icon-theme)` | — |
| Variant=Sort, State=Descending | `var(--pf-bg-theme)` | `var(--pf-icon-theme)` | — |
| Variant=Filter, State=Filtered | `var(--pf-bg-theme)` | `var(--pf-icon-theme)` | — |
| Variant=Context menu, State=Active | `var(--pf-bg-theme)` | `var(--pf-icon-theme)` | — |

### AG sort item

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | — | — | `var(--pf-text-primary)` |
| State=Hover | `var(--pf-bg-theme)` | — | `var(--pf-text-primary)` |
| State=Active | `var(--pf-bg-theme)` | — | `var(--pf-text-primary)` |

### AG Filter menus

| Variant | Background | Border | Text |
|---|---|---|---|
| Variant=Multi & search | `var(--pf-filter-menu-background)` | `var(--pf-filter-menu-border)` | `var(--pf-text-disabled)` |
| Variant=Date | `var(--pf-filter-menu-background)` | `var(--pf-filter-menu-border)` | `var(--pf-text-primary)` |
| Variant=Sort | `var(--pf-filter-menu-background)` | `var(--pf-filter-menu-border)` | `var(--pf-text-primary)` |

### Selected action banner

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | `var(--pf-bg-tertiary)` | — | `var(--pf-text-primary)` |

### Manage columns

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Table action bar

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | — | — | `var(--pf-text-theme)` |

### AG field

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Selected | — | `var(--pf-icon-primary)` | `var(--pf-text-disabled)` |
| State=Unselected | `var(--pf-bg-primary)` | `var(--pf-filter-menu-border)` | `var(--pf-text-disabled)` |

## Tags and ratings

### Tags

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Neutral | `var(--pf-tag-fill-neutral)` | `var(--pf-tag-border-neutral)` | `var(--pf-tag-content-neutral)` |
| Type=Positive | `var(--pf-tag-fill-positive)` | `var(--pf-tag-border-positive)` | `var(--pf-tag-content-positive)` |
| Type=Negative | `var(--pf-tag-fill-negative)` | `var(--pf-tag-border-negative)` | `var(--pf-tag-content-negative)` |
| Type=Warning | `var(--pf-tag-fill-warning)` | `var(--pf-tag-border-warning)` | `var(--pf-tag-content-warning)` |
| Type=Expired | `var(--pf-tag-fill-expired)` | `var(--pf-tag-border-expired)` | `var(--pf-tag-content-expired)` |
| Type=Other | `var(--pf-tag-fill-other)` | `var(--pf-tag-border-other)` | `var(--pf-tag-content-other)` |
| Type=Theme | `var(--pf-tag-fill-info)` | `var(--pf-tag-border-info)` | `var(--pf-tag-border-info)` |

### Star rating

| Variant | Background | Border | Text |
|---|---|---|---|
| Rating=0..5, State=Default | — | — | `var(--pf-text-primary)` |
| Rating=0..5, State=Hover | — | — | `var(--pf-text-primary)` |

### Empty section

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | — | — | `var(--pf-text-theme)` |

## System messages

### Toast message

| Variant | Background | Border | Text |
|---|---|---|---|
| Message type=Success | `var(--pf-base-white)` | — | `var(--pf-base-grey-slate)` |
| Message type=Info | `var(--pf-base-white)` | — | `var(--pf-base-grey-slate)` |
| Message type=Warning | `var(--pf-base-white)` | — | `var(--pf-base-grey-slate)` |
| Message type=Error | `var(--pf-base-white)` | — | `var(--pf-base-grey-slate)` |

### Information box

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Information | — | — | `var(--pf-text-primary)` |
| Type=Warning | — | — | `var(--pf-text-primary)` |
| Type=Error | — | — | `var(--pf-text-primary)` |
| Type=Success | — | — | `var(--pf-text-primary)` |

### Notification card

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Confirmation modal

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Confirmation | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Type=Success | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Type=Information | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Next actions modal

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Warning | `var(--pf-bg-primary)` | `var(--pf-border-default)` | — |
| Type=Success | `var(--pf-bg-primary)` | `var(--pf-border-default)` | — |

### Status

| Variant | Background | Border | Text |
|---|---|---|---|
| Status type=Like | `var(--pf-icon-info)` | — | — |
| Status type=Absence | `var(--pf-icon-warning)` | — | — |
| Status type=Recognition | `var(--pf-base-light-purple)` | — | — |
| Status type=Comment | `var(--pf-icon-info)` | — | — |

## Navigation

### Navigation item

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Selected, Device=Desktop | `var(--pf-bg-primary)` | — | `var(--pf-text-theme)` |
| State=Unselected, Device=Desktop | `var(--pf-bg-primary)` | — | `var(--pf-text-secondary)` |
| State=Hover, Device=Desktop | `var(--pf-bg-primary)` | — | `var(--pf-text-theme)` |

### Tab

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | — | — | `var(--pf-text-primary)` |
| State=Hover | — | — | `var(--pf-text-theme)` |
| State=Selected | — | — | `var(--pf-text-theme)` |

### Side navigation tab

| Variant | Background | Border | Text |
|---|---|---|---|
| Selected=false | — | — | `var(--pf-text-primary)` |
| Selected=true | `var(--pf-bg-theme)` | — | `var(--pf-text-theme)` |

### Filter tab single

| Variant | Background | Border | Text |
|---|---|---|---|
| Selected=False, State=Default | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-secondary)` |
| Selected=False, State=Hover | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-theme)` |
| Selected=True, State=Default | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-theme)` |

### [S] Navigation/main tabs

| Variant | Background | Border | Text |
|---|---|---|---|
| Status=Unselected | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Status=Hover | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-theme)` |
| Status=Selected | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-theme)` |

### Config child menu

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Child | — | — | `var(--pf-text-primary)` |
| Type=Selected | `var(--pf-base-blue-ocean)` | — | `var(--pf-text-inverted-primary)` |
| Type=Child + sub | — | — | `var(--pf-text-primary)` |

### Clock in

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Standard | — | `var(--pf-border-default)` | `var(--pf-text-inverted-primary)` |
| Type=Hover | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-theme)` |

### Secondary nav

| Variant | Background | Border | Text |
|---|---|---|---|
| Navigation type=Chips | — | — | `var(--pf-text-theme)` |
| Navigation type=Page | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Side navigation

| Variant | Background | Border | Text |
|---|---|---|---|
| Variant=Default | `var(--pf-bg-primary)` | — | `var(--pf-text-secondary)` |
| Variant=Finance | `var(--pf-bg-primary)` | — | `var(--pf-text-secondary)` |

### Config menu items

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Config parent menu

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Navigation tabs

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-theme)` |

### Header

| Variant | Background | Border | Text |
|---|---|---|---|
| Breakpoint=Desktop | — | — | `var(--pf-text-secondary)` |
| Breakpoint=Tablet | — | — | `var(--pf-base-white)` |
| Breakpoint=Mobile | — | — | `var(--pf-base-white)` |

### Mobile bottom navigation

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-secondary)` |

### Header top navigation

| Variant | Background | Border | Text |
|---|---|---|---|
| Breakpoint=Desktop | — | — | `var(--pf-text-secondary)` |
| Breakpoint=Tablet | — | — | `var(--pf-base-white)` |
| Breakpoint=Mobile | — | — | `var(--pf-base-white)` |

### [S] Main nav context

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-primary)` | — | `var(--pf-text-theme)` |

### Top bar app context

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-base-white)` |

### Search home button

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | — | — | `var(--pf-text-secondary)` |
| Mobile=Mobile3 | — | — | `var(--pf-text-theme)` |

### Full page navigation

| Variant | Background | Border | Text |
|---|---|---|---|
| Breakpoint=Desktop | — | — | `var(--pf-text-secondary)` |
| Breakpoint=Mobile | — | — | `var(--pf-base-white)` |
| Breakpoint=Tablet | — | — | `var(--pf-base-white)` |

### Side navigation panel

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-primary)` | — | `var(--pf-text-theme)` |

### Filter tabs

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-theme)` |

### Config side menu

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### [S] Config child menu

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Counter

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-icon-theme)` | — | `var(--pf-text-inverted-primary)` |

## Cards and panels

### Draggable card

| Variant | Background | Border | Text |
|---|---|---|---|
| State=Default | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| State=Hover | `var(--pf-bg-secondary)` | `var(--pf-border-secondary)` | `var(--pf-text-primary)` |
| State=Click | `var(--pf-bg-primary)` | `var(--pf-border-theme)` | `var(--pf-text-primary)` |
| State=Drag | `var(--pf-bg-primary)` | `var(--pf-border-theme)` | `var(--pf-text-primary)` |
| State=Drop | `var(--pf-bg-theme)` | `var(--pf-border-theme)` | — |

### Accordion

| Variant | Background | Border | Text |
|---|---|---|---|
| Expanded=False | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |
| Expanded=True | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Card

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Content cards

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=false | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Spotlight Card

| Variant | Background | Border | Text |
|---|---|---|---|
| Horizontal=False | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### single layout card

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=false | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Editable list card

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-text-secondary)` |

### Settings card

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | `var(--pf-bg-secondary)` | — | `var(--pf-text-theme)` |

### Configuration tile

| Variant | Background | Border | Text |
|---|---|---|---|
| Device=Desktop | `var(--pf-bg-secondary)` | — | `var(--pf-text-primary)` |

### Title panel

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=false | `var(--pf-bg-tertiary)` | — | `var(--pf-text-primary)` |

### Side panel

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=No, Size=Small | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |
| Mobile=No, Size=Medium | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |
| Mobile=No, Size=Large | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Side panel header

| Variant | Background | Border | Text |
|---|---|---|---|
| Size=Default | `var(--pf-bg-primary)` | `var(--pf-border-secondary)` | `var(--pf-text-primary)` |

### Sticky footer

| Variant | Background | Border | Text |
|---|---|---|---|
| Default=Default | `var(--pf-bg-primary)` | `var(--pf-border-secondary)` | `var(--pf-base-white)` |
| Default=Stepper | `var(--pf-bg-primary)` | `var(--pf-border-secondary)` | `var(--pf-text-primary)` |

### Layout container (magazine style)

| Variant | Background | Border | Text |
|---|---|---|---|
| Row colour=False | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |
| Row colour=True | `var(--pf-bg-theme)` | — | `var(--pf-text-primary)` |

### Org chart

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Org | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |
| Type=Manager | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |
| Type=Reportee | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Note

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | — | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Side filter

| Variant | Background | Border | Text |
|---|---|---|---|
| Mobile=False | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Attachments

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Attachment with person

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | `var(--pf-border-default)` | `var(--pf-text-primary)` |

### Configuration panel

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-theme)` |

### Details

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Switcher

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Layout container title

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Layout container tabs

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-theme)` |

### 50/50 layout container

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### [S] Attachment

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | `var(--pf-border-secondary)` | `var(--pf-text-primary)` |

### Footer

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-tag-content-negative)` |

### Content

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Detail item

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

## AI

### AI button

| Variant | Background | Border | Text |
|---|---|---|---|
| Style=Light mode, Hover=False | — | — | `var(--pf-text-primary)` |
| Style=Light mode, Hover=True | — | — | `var(--pf-base-white)` |
| Style=Inverted, Hover=False | — | — | `var(--pf-base-default-pink)` |
| Style=Inverted, Hover=True | — | `var(--pf-base-white)` | `var(--pf-base-white)` |

### AI Assistant

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=Default | `var(--pf-bg-primary)` | — | `var(--pf-base-default-pink)` |
| Type=Active chat | `var(--pf-bg-primary)` | `var(--pf-border-default)` | `var(--pf-base-default-pink)` |
| Type=Expanded | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### AI banner

| Variant | Background | Border | Text |
|---|---|---|---|
| Darkmode=False | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### AI card modal

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Default | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Clickable AI element

| Variant | Background | Border | Text |
|---|---|---|---|
| State=default | — | — | `var(--pf-text-primary)` |
| State=Hover | — | — | `var(--pf-base-default-pink)` |

### AI message bubble

| Variant | Background | Border | Text |
|---|---|---|---|
| Type=AI chat | — | — | `var(--pf-text-secondary)` |
| Type=User chat | — | — | `var(--pf-text-secondary)` |

### Adaptive card

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-secondary)` |

### AI Gradient component

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

## Analytics and charts

### Bar

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Bar chart

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Bar chart with axis

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Donut pie chart

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Donut chart with ledger

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Hemisphere chart

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Data variance

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Metric card

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-tertiary)` | — | `var(--pf-text-primary)` |

### Data variance alternative

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Graph legend

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Graph axis

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Square progress bar

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Table progress bar

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Percentage bar

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

## People

### [S] People

| Variant | Background | Border | Text |
|---|---|---|---|
| Property 1=Inline | — | — | `var(--pf-text-primary)` |
| Property 1=Header | — | — | `var(--pf-text-inverted-primary)` |
| Property 1=Small card | — | — | `var(--pf-text-primary)` |
| Property 1=Large card | — | — | `var(--pf-text-primary)` |
| Property 1=Table | — | — | `var(--pf-text-primary)` |

## Pages and Layouts

### Configuration

| Variant | Background | Border | Text |
|---|---|---|---|
|  | — | — | `var(--pf-text-primary)` |

### Form

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-primary)` | — | `var(--pf-text-primary)` |

### Menu-search-settings

| Variant | Background | Border | Text |
|---|---|---|---|
| Page=Menu | `var(--pf-bg-secondary)` | — | `var(--pf-text-theme)` |
| Page=Search | `var(--pf-bg-secondary)` | — | `var(--pf-text-primary)` |
| Page=Settings | `var(--pf-bg-secondary)` | — | `var(--pf-text-primary)` |

## Icons

### Circle icons

| Variant | Background | Border | Text |
|---|---|---|---|
|  | `var(--pf-bg-light-theme)` | `var(--pf-border-theme)` | — |

## Notes and quirks

Carried through from Figma rather than silently corrected:

- **`Tags` Type=Theme binds `Tags/Borders/Info` for its text**, where every
  other tag type binds a `Tags/Content/*` token. That looks like a mis-binding
  in Figma — use `var(--pf-tag-content-info)` for tag text and flag it upstream.
- **`Toast message` hardcodes `Base colours/White` and `Base colours/Grey Slate`**
  rather than semantic tokens, so toasts stay light in dark mode. If that is
  deliberate (toasts as a fixed-light surface) it is fine; if not, it is a
  dark-mode gap.
- **`Button` Type=Action binds `Text/Inverted primary`, not white.** This
  matters: white on the dark-mode Action fill would fail contrast, the inverted
  token does not.
- **`AI` components bind `Base colours/Default Pink` directly** instead of
  `Text/Theme`, so they do not flip in dark mode.
- Several sets carry `Darkmode=True/False` as an explicit variant axis. Ignore
  it when building — the CSS tokens handle dark mode automatically. It exists in
  Figma only because Figma cannot show both modes in one frame.
