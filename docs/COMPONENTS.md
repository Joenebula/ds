# People First — component library

**Generated — do not hand-edit.** Rebuilt by `npm run build` from the Figma
extracts in `tokens/_raw/`; `npm run verify` fails if this file has gone stale.

Every component below is a class in `dist/components.css`. The class is the
component name, each Figma variant property is a data attribute, and the values
keep Figma's own spelling:

```html
<button class="pf-button" data-type="Action">Save</button>
<div class="pf-form-field" data-input-type="Date picker" data-state="Error">
```

| | |
|---|---|
| **Components** | **159** |
| — with colour rules | 147 |
| — shape only (Figma binds no colour variable) | 12 |
| Captured variants | 302 |
| Figma pages | 13 |
| Binding a primitive instead of a semantic token | 19 |

Contents: [Buttons and links](#buttons-and-links) · [Forms](#forms) · [Controls](#controls) · [Tables](#tables) · [Cards and panels](#cards-and-panels) · [Navigation](#navigation) · [Tags and ratings](#tags-and-ratings) · [System messages](#system-messages) · [Analytics and charts](#analytics-and-charts) · [People](#people) · [Pages and Layouts](#pages-and-layouts) · [AI](#ai) · [Icons](#icons)

## Buttons and links

11 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Action menu | `.pf-action-menu` | — | 199 x auto | 4 | 13px |
| Action menu button | `.pf-action-menu-button` | Circle: true · false | auto x auto | — | 16px |
| Add attachment | `.pf-add-attachment` | Property 1: Default | 440 x auto | — | 13px SemiBold |
| Button | `.pf-button` | Type: Action · Positive · Negative · Hollow · Sort · Filter<br>State: Default · Disabled · Hover<br>Label: No · Yes | auto x 32 | 20 | 13px SemiBold |
| Drop down button | `.pf-drop-down-button` | Hover: False · True | 192 x auto | 48 | 13px Regular |
| Filter chip | `.pf-filter-chip` | State: Default · Hover · Selected<br>Active: False · True<br>Mobile: False · True | auto x 42 | 76 | 16px, ls -1% |
| Links | `.pf-links` | Link type: Primary · Secondary<br>Hover: True · False<br>Icon position: Right · Left | auto x auto | — | 16px |
| Mobile key actions | `.pf-mobile-key-actions` | Link: Recognition trends · Key actions · External links · Out of office · Social activity · MHR | 126 x 103 | 0 | — |
| Repeating group | `.pf-repeating-group` | — | auto x auto | — | 16px Italic |
| Tool tip | `.pf-tool-tip` | Property 1: Default | auto x auto | 4 | 13px |
| Tooltip | `.pf-tooltip` | Hover: True · False | 28 x 28 | 0 | — |

<details><summary>Notes on these components</summary>

- **Action menu button** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Circle`
- **Button** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. PILL. Leading icon on every variant. Icon-only variant is 32x32 circle.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Label`
- **Filter chip** — PILL. Selected uses SemiBold, gap 10.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Links** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Icon position`
- **Mobile key actions** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 6 variants (Link). No colour variable bound in Figma.
- **Tooltip** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Hover). No colour variable bound in Figma.

</details>

## Forms

19 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] Post content | `.pf-s-post-content` | — | 520 x auto | 0 | 20px |
| [S] Text area | `.pf-s-text-area` | Property 1: Default | 300 x 240 | 8 | 16px |
| Browser drop down | `.pf-browser-drop-down` | — | 440 x auto | 8 | 16px |
| Calendar picker | `.pf-calendar-picker` | — | auto x auto | 0 | 16px |
| Field | `.pf-field` | Right aligned: No · Yes<br>Filled: No · Yes | 300 x 42 | 8 | 16px |
| Field icons | `.pf-field-icons` | State: Filled · Empty | auto x auto | 0 | — |
| Field label | `.pf-field-label` | — | 152 x auto | 0 | 16px |
| Form field | `.pf-form-field` | Input type: Text · Dropdown · Search · Date picker · Time picker<br>State: Default · Disabled · Error · Selected<br>Full width: Yes · No | 564 x auto | 0 | 16px |
| Inline search | `.pf-inline-search` | Filled: False · True | 400 x auto | 0 | 16px |
| Map | `.pf-map` | — | 480 x 200 | 8 | — |
| Message box | `.pf-message-box` | Property 1: Default | auto x 138 | 8 | 16px |
| Multiselect tag | `.pf-multiselect-tag` | — | auto x auto | 4 | 13px |
| Option | `.pf-option` | Selected: No · Yes | 250 x auto | 4 | 16px |
| People and department drop down | `.pf-people-and-department-drop-down` | — | 440 x auto | 0 | 16px |
| Primary search | `.pf-primary-search` | Darkmode: False<br>Icon only: False · True | auto x 38 | 20 | 13px |
| Required field | `.pf-required-field` | — | auto x auto | 0 | 16px |
| Text area | `.pf-text-area` | Type: Standard · Read only · Disabled · Error | auto x 213 | 8 | 16px |
| Text template format editor  | `.pf-text-template-format-editor` | Type: Modal · Correspondence | 440 x auto | — | 16px |
| Time picker | `.pf-time-picker` | — | auto x auto | 0 | 16px |

<details><summary>Notes on these components</summary>

- **[S] Post content** — 73px left padding leaves room for an avatar
- **[S] Text area** — small variant
- **Calendar picker** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token
- **Field** — the input box itself. Placeholder text is italic, the value is not. 4 variants (Right aligned x Filled). Figma has a second, unrelated component also called Field.
- **Field icons** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants
- **Field label** — label sits above its input, 5px gap
- **Form field** — WRAPPER: label + input + helper text. 40 variants (Input type x State) - Text, Dropdown, Search, Date picker, Time picker x Default, Disabled, Error, Selected. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Full width`
- **Inline search** — 2 variants
- **Map** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. not auto-layout
- **Multiselect tag** — **binds a primitive** — Base colours/Blue Ocean (background), Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. the removable tag inside a multiselect
- **Option** — dropdown list row. 2 variants
- **People and department drop down** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token
- **Primary search** — PILL
- **Required field** — the asterisk marker
- **Text area** — inner frame r8
- **Text template format editor ** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Type`
- **Time picker** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token

</details>

## Controls

11 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Checkbox/Radio item | `.pf-checkbox-radio-item` | State: Default · Disabled · Error · Selected · Hover<br>Radio: No · Yes<br>Filled: No · Yes | auto x 22 | 0 | 16px |
| Checkbox/Radio list | `.pf-checkbox-radio-list` | State: Default · Disabled · Error · Selected | 194 x auto | 0 | 16px |
| Control | `.pf-control` | Radio: No · Yes | 20 x 20 | 4 | — |
| Date picker period | `.pf-date-picker-period` | Type: Date · Record | auto x auto | 0 | 20px |
| Date range visual | `.pf-date-range-visual` | Property 1: Default | 371 x auto | 0 | 16px |
| Document previewer | `.pf-document-previewer` | Device: Desktop · Tablet · Mobile | 375 x 642 | 0 | 16px |
| Image picker | `.pf-image-picker` | Property 1: Default | 440 x 220 | 0 | — |
| Radio card | `.pf-radio-card` | State: Enabled · Disabled<br>Selected: Yes · No | 235 x 152 | 4 | 16px SemiBold |
| Radio tile | `.pf-radio-tile` | State: Default · Hover | 235 x auto | 4 | 16px SemiBold |
| Slider | `.pf-slider` | Property 1: Default | 600 x auto | 0 | 13px |
| Toggle | `.pf-toggle` | On: Yes · No<br>Locked: Yes · No | 55 x 25 | 13 | 13px |

<details><summary>Notes on these components</summary>

- **Checkbox/Radio item** — box + label, 10px gap. 18 variants. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Radio`, `Filled`
- **Checkbox/Radio list** — 5px between items. 4 variants
- **Control** — the checkbox/radio box itself, 20x20 r4. 2 variants
- **Date picker period** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Type`
- **Document previewer** — 3 variants
- **Image picker** — not auto-layout
- **Radio card** — 4 variants
- **Radio tile** — 2 variants
- **Toggle** — **binds a primitive** — Base colours/Grey Dolphin (border), Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. PILL; knob inset

</details>

## Tables

13 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| AG field | `.pf-ag-field` | State: Selected · Unselected | 140 x 43 | 8 | 12px |
| AG Filter menus | `.pf-ag-filter-menus` | Variant: Multi & search · Date · Sort<br>State: Default | 208 x 252 | 4 | 12px |
| AG sort item | `.pf-ag-sort-item` | State: Default · Hover · Active | auto x 52 | 0 | 13px |
| Footer (AG) | `.pf-footer-ag` | Mobile: False · True | 1560 x auto | — | 13px |
| Manage columns | `.pf-manage-columns` | Mobile: False · True<br>Darkmode: False | 520 x auto | — | 20px |
| Multi-select checkbox | `.pf-multi-select-checkbox` | State: Default · Selected · Mixed selection · Hover<br>Darkmode: False | 20 x 20 | 4 | — |
| Selected action banner | `.pf-selected-action-banner` | Darkmode: False<br>Mobile: False · True | auto x 48 | 8 | 16px |
| Table (AG) | `.pf-table-ag` | Mobile: False · True | 1705 x auto | 8 | 13px SemiBold |
| Table action bar | `.pf-table-action-bar` | Mobile: False · True | 1654 x auto | — | 16px SemiBold |
| Table card (AG) | `.pf-table-card-ag` | Mobile: False · True | — | 8 | 16px SemiBold |
| Table cell (AG) | `.pf-table-cell-ag` | Type: Default · Checkbox<br>Style: Default · Hover · Stripe | auto x 58 | 0 | 13px |
| Table header (AG) | `.pf-table-header-ag` | Alignment: Left · Right · Checkbox | auto x 54 | 0 | 13px SemiBold |
| Table header icons | `.pf-table-header-icons` | Variant: Sort · Filter · Context menu<br>State: Default · Hover · Ascending · Descending · Filtered · Active | 24 x 24 | 4 | — |

<details><summary>Notes on these components</summary>

- **Table cell (AG)** — rows are TALL

</details>

## Cards and panels

31 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] Attachment | `.pf-s-attachment` | — | 440 x auto | 8 | 13px SemiBold |
| 50/50 layout container | `.pf-50-50-layout-container` | Row colour: false · true<br>Mobile: false · true | 1600 x auto | — | 20px |
| Accordion | `.pf-accordion` | Expanded: False · True<br>Mobile: False · True | auto x 84 | 8 | 20px |
| Attachment with person | `.pf-attachment-with-person` | Property 1: Default | 440 x auto | 8 | 13px |
| Attachments | `.pf-attachments` | Actions: Remove · Context menu | 440 x auto | — | 13px SemiBold |
| Card | `.pf-card` | Property 1: Default | auto | 8 | 20px title |
| Component 1 | `.pf-component-1` | Property 1: Frame 6270951 · Frame 6270952 | 432 x 48 | 8 | 20px |
| Configuration panel | `.pf-configuration-panel` | Property 1: Default | 1600 x auto | mixed | 20px |
| Configuration tile | `.pf-configuration-tile` | Device: Desktop · Mobile | auto x 260 | 8 | 24px |
| Content | `.pf-content` | — | 375 x auto | — | 13px |
| Content cards | `.pf-content-cards` | Mobile: false · true | auto | 8 | 16px |
| Detail item | `.pf-detail-item` | — | 162 x auto | — | 13px |
| Details | `.pf-details` | Layout: Horizontal · Vertical | 355 x auto | — | 13px |
| Draggable card | `.pf-draggable-card` | State: Default · Hover · Drag · Click · Drop | auto x 50 | 8 | 16px |
| Editable list card | `.pf-editable-list-card` | Property 1: Default | auto x auto | 4 | 13px |
| Floaters | `.pf-floaters` | — | 85 x 40 | 0 | — |
| Footer | `.pf-footer` | — | 375 x auto | — | 13px Regular |
| Horizontal scroll | `.pf-horizontal-scroll` | Page: First · Last | auto x 32 | 0 | — |
| Layout container (magazine style) | `.pf-layout-container-magazine-style` | Row colour: True · False<br>Mobile: False · True | 1600 x auto | — | 20px |
| Layout container tabs | `.pf-layout-container-tabs` | Property 1: Default | 1160 x auto | — | 16px SemiBold |
| Layout container title | `.pf-layout-container-title` | Property 1: Default | 1160 x auto | — | 20px |
| Note | `.pf-note` | Property 1: Default | 440 x auto | 8 | 13px |
| Settings card | `.pf-settings-card` | Property 1: Default | auto | 8 | 13px SemiBold |
| Side filter | `.pf-side-filter` | Mobile: False · True | 400 x 885 | mixed | 20px |
| Side panel | `.pf-side-panel` | Mobile: No · Yes<br>Size: Small · Medium · Large | 375 wide | mixed | 20px |
| Side panel header | `.pf-side-panel-header` | Size: Default | auto x 60 | 0 | 20px |
| single layout card | `.pf-single-layout-card` | Mobile: false · true | 800 x auto | — | 20px |
| Spotlight Card | `.pf-spotlight-card` | Horizontal: False · True<br>Mobile: False · True | 375 x auto | 8 | 13px |
| Sticky footer | `.pf-sticky-footer` | Default: Default · Stepper | auto x 52 | 0 | 13px SemiBold |
| Switcher | `.pf-switcher` | Property 1: Default | auto x auto | — | 16px |
| Title panel | `.pf-title-panel` | Mobile: false · true | auto x 135 | 0 | 18px |

<details><summary>Notes on these components</summary>

- **50/50 layout container** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Row colour`, `Mobile`
- **Accordion** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Attachments** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Actions`
- **Card** — shadow 0 0 4px
- **Component 1** — UNNAMED IN FIGMA. It is the row inside Editable list card: a label with a trailing add or remove action. Property 1=Frame 6270951 is the ADD state (no fill, green Plus circle icon); Frame 6270952 is the ADDED state (Background/Tertiary fill, grey Remove icon). The component and both variant values carry Figma default names — raise with design.
- **Configuration tile** — shadow 0 0 4px
- **Details** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Layout`
- **Floaters** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. Single component. No colour variable bound in Figma.
- **Horizontal scroll** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Page). Figma draws it 1160px wide — the artboard, not a rule. No colour variable bound.
- **Layout container (magazine style)** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Settings card** — shadow 0 1 3px
- **Side panel** — shadow 0 0 4px
- **Spotlight Card** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Sticky footer** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token

</details>

## Navigation

33 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] Config child menu | `.pf-s-config-child-menu` | — | auto x auto | — | 16px |
| Clock in | `.pf-clock-in` | Type: Hover · Standard<br>Darkmode: False | 107 x 32 | 20 | 16px |
| Config child menu | `.pf-config-child-menu` | Type: Child · Child + sub · Selected | auto x auto | — | 16px |
| Config menu items | `.pf-config-menu-items` | Kind: Child | auto x auto | — | 16px |
| Config parent menu | `.pf-config-parent-menu` | open: false · true | auto x auto | — | 16px |
| Config side menu | `.pf-config-side-menu` | — | 325 x 980 | 8 | 16px |
| Default header background | `.pf-default-header-background` | Breakpoint: Tablet · Desktop · Mobile<br>Darkmode: False · True | auto x 86 | 0 | — |
| Filter tab single | `.pf-filter-tab-single` | Selected: True · False<br>Breakpoint: Desktop · Tablet · Mobile<br>State: Default · Hover | 224 x 100 | 0 | 24px Regular |
| Filter tabs | `.pf-filter-tabs` | Breakpoints: Desktop · Tablet · Mobile | 1600 x auto | — | 24px SemiBold |
| Full page | `.pf-full-page` | Darkmode: False · True<br>Breakpoint: Desktop · Tablet · Mobile | auto x auto | 0 | — |
| Full page/Header navigation/Yes/No | `.pf-full-page-header-navigation-yes-no` | — | 375 x 138 | 0 | — |
| Header | `.pf-header` | — | auto x 86 | 0 | 16px |
| Header navigation | `.pf-header-navigation` | Darkmode: True · False<br>Levels of navigation: 0 · 1 · 2<br>Breakpoint: Desktop · Mobile · Tablet | auto x auto | 0 | — |
| Menu | `.pf-menu` | Size: Large · Small | 50 x 73 | 0 | — |
| Mobile bottom navigation | `.pf-mobile-bottom-navigation` | Darkmode: False · True<br>Breakpoint: Tablet · Mobile | 375 x 76 | 0 | 11px |
| Nav tabs | `.pf-nav-tabs` | Status: Selected · Unselected · Hover<br>Mobile: True · False | auto x 40 | 0 | — |
| Navigation item | `.pf-navigation-item` | State: Hover · Selected · Unselected<br>Device: Desktop · Mobile · Tablet | 90 x 86 | 0 | 13px SemiBold |
| Navigation tabs | `.pf-navigation-tabs` | Mobile: No · Yes | auto x 36 | 0 | 16px SemiBold |
| Notification categories | `.pf-notification-categories` | Mobile: No · Yes | 300 x auto | 0 | — |
| Notification list | `.pf-notification-list` | Mobile: No · Yes | auto x auto | 0 | — |
| Notification panel | `.pf-notification-panel` | Mobile: Yes · No | auto x auto | 0 | — |
| Notification tabs | `.pf-notification-tabs` | State: Default · Hover · Selected<br>Selected: No · Yes | auto x 65 | 0 | — |
| Pagination buttons | `.pf-pagination-buttons` | — | auto x 32 | 0 | — |
| Search navigation | `.pf-search-navigation` | Mobile: True · False · Mobile3 · Mobile4<br>Darkmode: False | 150 x 32 | 50 | — |
| Secondary nav | `.pf-secondary-nav` | Mobile: False · True | auto x 44 | 0 | 16px |
| Side navigation | `.pf-side-navigation` | Darkmode: True · False<br>Variant: Default · Finance | 90 wide | 0 | 13px |
| Side navigation tab | `.pf-side-navigation-tab` | Selected: false · true | 268 x 48 | 8 | 16px |
| Stepper | `.pf-stepper` | System: People First · Configr | 330 x 160 | 0 | — |
| Steps | `.pf-steps` | System: People First · Configr<br>State: Hover · Completed · Selected · Default enabled · Default disabled<br>Position: Middle · First · Last<br>Current step: No · Yes<br>Completed step: No · Yes | 110 x 48 | 0 | — |
| Tab | `.pf-tab` | State: Default · Selected · Hover | 40 x 34 | 0 | 16px |
| Tertiary nav | `.pf-tertiary-nav` | Mobile: True · False<br>Navigation type: Chips · Page | auto x 55 | 0 | — |
| Top bar app context | `.pf-top-bar-app-context` | Area: Administration · Insights · Recruitment · Goals · Payroll · Audit · Available jobs · Learning · Onboarding · HRM · General ledger · Accounts payable · Accounts receivable · Taxes · News · Data explorer · Case Management · Absence<br>Mobile: False · True | 242 x 66 | 0 | 24px |
| Waffle | `.pf-waffle` | Theme: Dark mode · Default - Cranberry red · Classic · Fern green · Teal ocean · Cool grey · Blue lagoon · Cobalt blue · Orange flame · Striking red · Velvet red · Royal purple · Purple iris · Berry pink · Purple orchid | 90 x 86 | 0 | — |

<details><summary>Notes on these components</summary>

- **Clock in** — PILL
- **Config child menu** — **binds a primitive** — Base colours/Blue Ocean (background) — so this will not adapt between light and dark until Figma binds a semantic token
- **Config parent menu** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `open`
- **Default header background** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. node 13658:7639 exists in Figma and reads fine — 6 variants across Breakpoint x Darkmode — but it is not among the Navigation page's components, so which page it lives on is unconfirmed. Kept: a live node is not a gap.. Full-bleed header bar; height varies by Breakpoint (see size rows). Fill is a raw colour in Figma, not a variable.. per-variant sizes: `Breakpoint=Desktop` auto x 86, `Breakpoint=Tablet` auto x 74, `Breakpoint=Mobile` auto x 62
- **Filter tab single** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`
- **Filter tabs** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoints`
- **Full page** — Figma renamed this from `Full page navigation`. **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. 7 variants. Figma draws it 1920x1080 — a whole page frame, not a component box.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`
- **Full page/Header navigation/Yes/No** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. Single component, mobile width.
- **Header** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token
- **Header navigation** — Figma renamed this from `Header top navigation`. **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. 3 variants (Mobile x Tablet). Figma draws it 1830x130 — the artboard, not a rule.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Darkmode`, `Levels of navigation`, `Breakpoint`
- **Menu** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Size). No colour variable bound in Figma.
- **Mobile bottom navigation** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Darkmode`, `Breakpoint`
- **Nav tabs** — Figma renamed this from `[S] Navigation/main tabs`. 6 variants (Status x Mobile); Mobile does not change the colours.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Navigation item** — rail item, icon above label
- **Navigation tabs** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Notification categories** — 2 variants (Mobile). Figma draws it 1020px tall — the artboard, not a rule.
- **Notification list** — 2 variants (Mobile). Figma draws it 1117x730 — the artboard, not a rule.
- **Notification panel** — 2 variants (Mobile). Figma draws it 1500x1080 — the artboard, not a rule.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Notification tabs** — 3 variants (State x Selected). Node 22973:20747, which this extract previously held as "Side navigation tab" with a different variant structure.
- **Pagination buttons** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. Single component. Binds a primitive for its text — see source issues.
- **Search navigation** — Figma renamed this from `Search home button`. 2 variants (Mobile). PILL.
- **Secondary nav** — Figma renamed this from `[S] Main nav context`. 2 variants (Mobile); both bind the same colours. Mobile=True sets 13px text.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Side navigation** — collapsed rail. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Darkmode`
- **Side navigation tab** — node 22973:20747 is called "Notification tabs" in Figma today and has a different variant structure (State x Selected, not Selected). These rows are a legacy snapshot kept because three prototypes use .pf-side-navigation-tab; the current component is captured separately as Notification tabs.
- **Stepper** — 2 variants (System); both bind the same colours.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `System`
- **Steps** — 26 variants across System x State x Position; 6 distinct colour bindings, keyed on State.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Position`, `Current step`, `Completed step`
- **Tertiary nav** — Figma renamed this from `Secondary nav`. 4 variants (Mobile x Page); Mobile does not change the colours.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`, `Navigation type`
- **Top bar app context** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Area`, `Mobile`
- **Waffle** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 15 variants (Theme). No colour variable bound in Figma.

</details>

## Tags and ratings

4 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Empty section | `.pf-empty-section` | Mobile: False · True | auto x 212 | 0 | 20px SemiBold |
| Star rating | `.pf-star-rating` | Rating: 0 · 1 · 2 · 3 · 4 · 5<br>State: Default · Hover<br>Read only: No · Yes | auto x auto | — | 13px |
| Stars | `.pf-stars` | Active: No · Yes | 25 x 24 | 0 | — |
| Tags | `.pf-tags` | Type: Neutral · Expired · Positive · Warning · Negative · Theme · Other<br>Small: No · Yes | auto x 28 | 4 | 13px Regular |

<details><summary>Notes on these components</summary>

- **Star rating** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Read only`
- **Stars** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Active). No colour variable bound in Figma.
- **Tags** — SENTENCE CASE, not uppercase. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Small`

</details>

## System messages

7 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Confirmation modal | `.pf-confirmation-modal` | Mobile: false · True<br>Type: Confirmation · Success · Information<br>Dark mode: False | 400 x 413 | 8 | 24px Regular |
| Information box | `.pf-information-box` | Type: Success · Information · Warning · Error | 440 x 56 | — | 13px |
| Next actions modal | `.pf-next-actions-modal` | Mobile: false<br>Type: Success · Warning | 400 x 565 | 8 | 24px Regular |
| Notification card | `.pf-notification-card` | Mobile: False · True | auto x 113 | 8 | 13px SemiBold |
| Notification image | `.pf-notification-image` | Type: Person · Custom<br>With status?: False · True<br>Mobile: False · True<br>Status position: High · Low | 44 x 44 | 0 | — |
| Status | `.pf-status` | Status type: Like · Recognition · Comment · New social group · Custom · Absence | 22 x 22 | 100 | — |
| Toast message | `.pf-toast-message` | Message type: Success · Info · Warning · Error | 350 x 114 | 4 | 13px |

<details><summary>Notes on these components</summary>

- **Confirmation modal** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Notification image** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page
- **Status** — **binds a primitive** — Base colours/Light Purple (background) — so this will not adapt between light and dark until Figma binds a semantic token
- **Toast message** — **binds a primitive** — Base colours/White (background), Base colours/Grey Slate (text) — so this will not adapt between light and dark until Figma binds a semantic token. fixed light surface — see dark-mode note

</details>

## Analytics and charts

13 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Bar | `.pf-bar` | Label: Horizontal · Vertical | 29 x 90 | — | 13px |
| Bar chart with axis | `.pf-bar-chart-with-axis` | Breakpoint: Desktop · Mobile<br>Darkmode: False | 326 x 221 | 0 | 13px Regular |
| Data variance | `.pf-data-variance` | Data change: Up · Down · No change<br>Mobile: False | 41 x 45 | 0 | 13px |
| Data variance alternative | `.pf-data-variance-alternative` | Property 1: Default | auto x auto | — | 20px |
| Donut chart with ledger | `.pf-donut-chart-with-ledger` | Darkmode: False<br>Mobile: True · False | 329 x 200 | 0 | 60px |
| Donut pie chart | `.pf-donut-pie-chart` | Segments: 2 · 1 · 3 · 4<br>Icon: False · True | 200 x 200 | 0 | 60px Medium |
| Graph axis | `.pf-graph-axis` | Breakpoint: Mobile · Desktop | 492 x 232 | 0 | 13px |
| Graph legend | `.pf-graph-legend` | Mobile: True · False<br>Key type: Donut graph · Line graph | auto x 33 | 0 | 24px Regular |
| Hemisphere chart | `.pf-hemisphere-chart` | Status: None · Negative · Warning · Neutral · Positive | 200 x 146 | 0 | 13px |
| Metric card | `.pf-metric-card` | Mobile: True · False | 392 x 89 | 8 | 36px |
| Percentage bar | `.pf-percentage-bar` | Percentage: 0 · 25 · 50 · 75 · 100 | 343 x 37 | 0 | 13px |
| Square progress bar | `.pf-square-progress-bar` | Variant: Default · Inline · Bottom label<br>Progress: 0% · 25% · 50% · 75% · 100% | 177 x 34 | 0 | 13px |
| Table progress bar | `.pf-table-progress-bar` | Completion: 0% · 25% · 50% · 75% · 100%<br>Dark cell background: No · Yes | 246 x 14 | 0 | 13px |

<details><summary>Notes on these components</summary>

- **Bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Label`
- **Bar chart with axis** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`
- **Data variance** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Data change`
- **Donut chart with ledger** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Donut pie chart** — centre figure is 60px. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Segments`, `Icon`
- **Graph axis** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`
- **Graph legend** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`, `Key type`
- **Hemisphere chart** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Status`
- **Metric card** — big-number tile. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Percentage bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Percentage`
- **Square progress bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Variant`, `Progress`
- **Table progress bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Completion`, `Dark cell background`

</details>

## People

2 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] People | `.pf-s-people` | Property 1: Header · Inline · Large card · Small card · Table<br>Mobile: False · True | 380 x auto | — | 16px |
| Profile image | `.pf-profile-image` | Size: Extra large · Large · Medium plus · Medium · Small · Extra small | 93 x 93 | 47 | — |

<details><summary>Notes on these components</summary>

- **[S] People** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **Profile image** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. CIRCLE

</details>

## Pages and Layouts

3 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Configuration | `.pf-configuration` | — | 1600 x 809 | 8 | 24px |
| Form | `.pf-form` | Mobile: False · True | 355 x auto | 8 | 18px |
| Menu-search-settings | `.pf-menu-search-settings` | Page: Menu · Search · Settings<br>Darkmode: False | 1920 x 1080 | — | 24px |

<details><summary>Notes on these components</summary>

- **Form** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`

</details>

## AI

8 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Adaptive card | `.pf-adaptive-card` | Mobile: False · True | 478 x auto | — | 12px |
| AI Assistant | `.pf-ai-assistant` | Mobile: True · False<br>Darkmode: False<br>Type: Default · Expanded · Active chat | 1628 x auto | — | 20px |
| AI banner | `.pf-ai-banner` | Darkmode: False · True<br>mobile: True · False | auto x 94 | 8 | 20px |
| AI button | `.pf-ai-button` | Style: Light mode · Inverted<br>Hover: False · True<br>Mobile: False · True | 146 x 32 | 55 | 13px Regular |
| AI card modal | `.pf-ai-card-modal` | Property 1: Default | 440 x 505 | 8 | 20px |
| AI Gradient component | `.pf-ai-gradient-component` | Property 1: Frame 62710147 · Frame 62710148 · Variant3 | 408 x 408 | — | 24px SemiBold |
| AI message bubble | `.pf-ai-message-bubble` | Type: AI chat · User chat | 455 x 149 | 0 | 12px |
| Clickable AI element | `.pf-clickable-ai-element` | State: default · Hover | 382 x 38 | 8 | 13px |

<details><summary>Notes on these components</summary>

- **Adaptive card** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **AI Assistant** — **binds a primitive** — Base colours/Default Pink (text) — so this will not adapt between light and dark until Figma binds a semantic token. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **AI banner** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `mobile`
- **AI button** — **binds a primitive** — Base colours/White (text), Base colours/Default Pink (text), Base colours/White (border) — so this will not adapt between light and dark until Figma binds a semantic token. PILL. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`
- **AI Gradient component** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Property 1`
- **Clickable AI element** — **binds a primitive** — Base colours/Default Pink (text) — so this will not adapt between light and dark until Figma binds a semantic token

</details>

## Icons

4 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Bar chart | `.pf-bar-chart` | Breakpoint: Desktop · Mobile<br>Darkmode: False | 415 x 193 | 0 | 13px |
| Circle icons | `.pf-circle-icons` | Size: XS - 28px · S - 36px · M - 44px · L - 52px | auto x auto | 999 | — |
| Org chart | `.pf-org-chart` | Type: Org · Manager · Reportee | 293 x auto | 8 | 16px |
| Signature | `.pf-signature` | Mandatory: False<br>State: Default | auto x auto | 0 | 16px |

<details><summary>Notes on these components</summary>

- **Bar chart** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`
- **Circle icons** — CIRCLE. Four sizes as Size variants; each size row below carries its own box.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Size`. per-variant sizes: `Size=XS - 28px` 28 x 28, `Size=S - 36px` 36 x 36, `Size=M - 44px` 44 x 44, `Size=L - 52px` 52 x 52

</details>

## Not in the library

These exist in the Figma file but have no rules, each for a stated reason. Listed
so nobody has to guess whether one is an oversight — none of them is.

**26 — on a documentation page — describes the design system rather than being part of it**

`AI link` · `Avatar` · `Description` · `Document label spec` · `Document order spec` · `Dos and don'ts` · `Header` · `Logos` · `MHR logo` · `People first logo` · `Project info - Files and Resources` · `Project info - Meeting notes` · `Project info - Stakeholders and Team` · `Project info - Timeframe and schedule` · `Project info - UX PRD summary` · `Prototype context screen` · `Prototype cover page` · `Skeleton state` · `Storybook link` · `Team member` · `Thumbnail` · `Thumbnail/Brand logo` · `Wiki menu` · `Work item` · `design system header` · `iTrent logo`

**10 — no variant binds a colour variable in Figma — nothing to put in a stylesheet**

`Field icons` · `Floaters` · `Horizontal scroll` · `Map` · `Menu` · `Mobile key actions` · `Notification image` · `Profile image` · `Stars` · `Tooltip`

**1 — its variants are sample content (one per fictional employee), not design**

`People`

**1 — node 22973:20811 no longer exists in Figma — deleted**

`Side navigation panel`

**1 — node 14990:11954 is a variant child of the Header component set, named "System=People First" — it was never a component in its own right**

`Counter`

