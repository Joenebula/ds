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
| **Components** | **160** |
| — with colour rules | 147 |
| — shape only (Figma binds no colour variable) | 13 |
| Captured variants | 302 |
| Figma pages | 13 |
| Binding a primitive instead of a semantic token | 19 |

Contents: [Buttons and links](#buttons-and-links) · [Forms](#forms) · [Controls](#controls) · [Tables](#tables) · [Cards and panels](#cards-and-panels) · [Navigation](#navigation) · [Tags and ratings](#tags-and-ratings) · [System messages](#system-messages) · [Analytics and charts](#analytics-and-charts) · [People](#people) · [Pages and Layouts](#pages-and-layouts) · [AI](#ai) · [Icons](#icons)

## Buttons and links

11 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Action menu | `.pf-action-menu` | — | 199 x 136 | 4 | 13px |
| Action menu button | `.pf-action-menu-button` | Circle: true · false | auto x 28 | 0 | 16px |
| Add attachment | `.pf-add-attachment` | Property 1: Default | 440 x 466 | 0 | 13px SemiBold |
| Button | `.pf-button` | Type: Action · Positive · Negative · Hollow · Sort · Filter<br>State: Default · Disabled · Hover<br>Label: No · Yes | auto x 32 | 20 | 13px SemiBold |
| Drop down button | `.pf-drop-down-button` | Hover: False · True | 192 x 32 | 48 | 13px Regular |
| Filter chip | `.pf-filter-chip` | State: Default · Hover · Selected<br>Active: False · True<br>Mobile: False · True | auto x 42 | 76 | 16px SemiBold |
| Links | `.pf-links` | Link type: Primary · Secondary<br>Hover: True · False<br>Icon position: Right · Left | auto x 22 | 0 | 16px |
| Mobile key actions | `.pf-mobile-key-actions` | Link: Recognition trends · Key actions · External links · Out of office · Social activity · MHR | 126 x 103 | 0 | 16px |
| Repeating group | `.pf-repeating-group` | — | auto x 258 | 0 | 16px Italic |
| Tool tip | `.pf-tool-tip` | Property 1: Default | auto x 92 | 4 | 13px |
| Tooltip | `.pf-tooltip` | Hover: True · False | 28 x 28 | 0 | — |

<details><summary>Notes on these components</summary>

- **Action menu button** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Circle`. per-variant sizes: `Circle=true` auto x 28
- **Button** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. PILL. Leading icon on every variant. Icon-only variant is 32x32 circle.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Label`. per-variant sizes: `Type=Action, State=Default, Label=No` 32 x 32, `Type=Negative, State=Default, Label=No` 32 x 32, `Type=Positive, State=Default, Label=No` 32 x 32, `Type=Filter, State=Default, Label=Yes` auto x 32, `Type=Sort, State=Default, Label=Yes` auto x 32, `Type=Hollow, State=Default, Label=No` auto x 32, `Type=Filter, State=Default, Label=No` auto x 32, `Type=Sort, State=Default, Label=No` auto x 32, `Type=Filter, State=Hover, Label=Yes` auto x 32, `Type=Sort, State=Hover, Label=Yes` auto x 32, `Type=Hollow, State=Hover, Label=No` auto x 32, `Type=Filter, State=Hover, Label=No` auto x 32, `Type=Sort, State=Hover, Label=No` auto x 32, `Type=Filter, State=Disabled, Label=Yes` auto x 32, `Type=Sort, State=Disabled, Label=Yes` auto x 32, `Type=Hollow, State=Disabled, Label=No` auto x 32, `Type=Filter, State=Disabled, Label=No` auto x 32, `Type=Sort, State=Disabled, Label=No` auto x 32, `Type=Action, State=Hover, Label=No` 32 x 32, `Type=Negative, State=Hover, Label=No` 32 x 32, `Type=Positive, State=Hover, Label=No` 32 x 32, `Type=Action, State=Disabled, Label=No` 32 x 32, `Type=Negative, State=Disabled, Label=No` 32 x 32, `Type=Positive, State=Disabled, Label=No` 32 x 32
- **Filter chip** — PILL. Selected uses SemiBold, gap 10.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `State=Default, Active=False, Mobile=False` auto x 42, `State=Selected, Active=True, Mobile=True` auto x 34, `State=Default, Active=False, Mobile=True` auto x 34, `State=Hover, Active=False, Mobile=False` auto x 42, `State=Hover, Active=False, Mobile=True` auto x 34
- **Links** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Icon position`. per-variant sizes: `Link type=Secondary, Hover=False, Icon position=Left` auto x 18, `Link type=Secondary, Hover=True, Icon position=Left` auto x 18, `Link type=Secondary, Hover=False, Icon position=Right` auto x 18, `Link type=Secondary, Hover=True, Icon position=Right` auto x 18
- **Mobile key actions** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 6 variants (Link). No colour variable bound in Figma.. per-variant sizes: `Link=Social activity` 132 x 103, `Link=Recognition trends` 132 x 103, `Link=MHR` 126 x 103
- **Tooltip** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Hover). No colour variable bound in Figma.

</details>

## Forms

19 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] Post content | `.pf-s-post-content` | — | 520 x 198 | 0 | 20px |
| [S] Text area | `.pf-s-text-area` | Property 1: Default | 300 x 240 | 8 | 16px |
| Browser drop down | `.pf-browser-drop-down` | — | 440 x 222 | 8 | 16px |
| Calendar picker | `.pf-calendar-picker` | — | auto x 323 | 0 | 16px |
| Field | `.pf-field` | Right aligned: No · Yes<br>Filled: No · Yes | 300 x 42 | 8 | 16px Italic |
| Field icons | `.pf-field-icons` | State: Filled · Empty | auto x 28 | 0 | — |
| Field label | `.pf-field-label` | — | 152 x 22 | 0 | 16px |
| Form field | `.pf-form-field` | Input type: Text · Dropdown · Search · Date picker · Time picker<br>State: Default · Disabled · Error · Selected<br>Full width: Yes · No | 564 x 69 | 0 | 16px |
| Inline search | `.pf-inline-search` | Filled: False · True | 400 x 130 | 0 | 16px |
| Map | `.pf-map` | — | 480 x 200 | 8 | — |
| Message box | `.pf-message-box` | Property 1: Default | 455 x 138 | 8 | 16px |
| Multiselect tag | `.pf-multiselect-tag` | — | auto x 24 | 4 | 13px |
| Option | `.pf-option` | Selected: No · Yes | 250 x 26 | 4 | 16px |
| People and department drop down | `.pf-people-and-department-drop-down` | — | 440 x 320 | 0 | 16px |
| Primary search | `.pf-primary-search` | Darkmode: False<br>Icon only: False · True | 300 x 38 | 20 | 13px |
| Required field | `.pf-required-field` | — | auto x 22 | 0 | 16px Italic |
| Text area | `.pf-text-area` | Type: Standard · Read only · Disabled · Error | 300 x 267 | 0 | 16px |
| Text template format editor  | `.pf-text-template-format-editor` | Type: Modal · Correspondence | 440 x 246 | 0 | 16px |
| Time picker | `.pf-time-picker` | — | auto x 269 | 0 | 16px |

<details><summary>Notes on these components</summary>

- **[S] Post content** — 73px left padding leaves room for an avatar
- **[S] Text area** — small variant
- **Calendar picker** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token
- **Field** — the input box itself. Placeholder text is italic, the value is not. 4 variants (Right aligned x Filled). Figma has a second, unrelated component also called Field.. per-variant sizes: `Right aligned=No, Filled=Yes` 300 x 42, `Property 1=Default` auto x 42
- **Field icons** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants
- **Field label** — label sits above its input, 5px gap
- **Form field** — WRAPPER: label + input + helper text. 40 variants (Input type x State) - Text, Dropdown, Search, Date picker, Time picker x Default, Disabled, Error, Selected. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Full width`. per-variant sizes: `Input type=Text, State=Default, Full width=No` 267 x 69, `Input type=Text, State=Disabled, Full width=No` 267 x 69, `Input type=Text, State=Error, Full width=Yes` 564 x 92, `Input type=Text, State=Error, Full width=No` 267 x 92, `Input type=Text, State=Selected, Full width=No` 267 x 69, `Input type=Dropdown, State=Default, Full width=No` 267 x 69, `Input type=Dropdown, State=Disabled, Full width=No` 267 x 69, `Input type=Dropdown, State=Error, Full width=Yes` 564 x 92, `Input type=Dropdown, State=Error, Full width=No` 267 x 92, `Input type=Dropdown, State=Selected, Full width=No` 267 x 69, `Input type=Search, State=Default, Full width=No` 267 x 69, `Input type=Search, State=Disabled, Full width=No` 267 x 69, `Input type=Search, State=Error, Full width=Yes` 564 x 92, `Input type=Search, State=Error, Full width=No` 267 x 92, `Input type=Search, State=Selected, Full width=No` 267 x 69, `Input type=Date picker, State=Default, Full width=No` 267 x 69, `Input type=Date picker, State=Disabled, Full width=No` 267 x 69, `Input type=Date picker, State=Error, Full width=Yes` 564 x 92, `Input type=Date picker, State=Error, Full width=No` 267 x 92, `Input type=Date picker, State=Selected, Full width=No` 267 x 69, `Input type=Time picker, State=Default, Full width=No` 267 x 69, `Input type=Time picker, State=Disabled, Full width=No` 267 x 69, `Input type=Time picker, State=Error, Full width=Yes` 564 x 92, `Input type=Time picker, State=Error, Full width=No` 267 x 92, `Input type=Time picker, State=Selected, Full width=No` 267 x 69
- **Inline search** — 2 variants
- **Map** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. not auto-layout
- **Multiselect tag** — **binds a primitive** — Base colours/Blue Ocean (background), Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. the removable tag inside a multiselect
- **Option** — dropdown list row. 2 variants
- **People and department drop down** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token
- **Primary search** — PILL. per-variant sizes: `Darkmode=False, Icon only=True` 36 x 36
- **Required field** — the asterisk marker
- **Text area** — inner frame r8
- **Text template format editor ** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Type`. per-variant sizes: `Type=Correspondence` 760 x 366
- **Time picker** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token

</details>

## Controls

11 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Checkbox/Radio item | `.pf-checkbox-radio-item` | State: Default · Disabled · Error · Selected · Hover<br>Radio: No · Yes<br>Filled: No · Yes | auto x 22 | 0 | 16px |
| Checkbox/Radio list | `.pf-checkbox-radio-list` | State: Default · Disabled · Error · Selected | 194 x 81 | 0 | 16px |
| Control | `.pf-control` | Radio: No · Yes | 20 x 20 | 4 | — |
| Date picker period | `.pf-date-picker-period` | Type: Date · Record | auto x 27 | 0 | 20px |
| Date range visual | `.pf-date-range-visual` | Property 1: Default | 371 x 42 | 0 | 16px |
| Document previewer | `.pf-document-previewer` | Device: Desktop · Tablet · Mobile | 375 x 642 | 0 | 16px |
| Image picker | `.pf-image-picker` | Property 1: Default | 440 x 220 | 0 | — |
| Radio card | `.pf-radio-card` | State: Enabled · Disabled<br>Selected: Yes · No | 235 x 152 | 4 | 16px SemiBold |
| Radio tile | `.pf-radio-tile` | State: Default · Hover | 235 x 152 | 4 | 16px SemiBold |
| Slider | `.pf-slider` | Property 1: Default | 600 x 81 | 0 | 13px |
| Toggle | `.pf-toggle` | On: Yes · No<br>Locked: Yes · No | 55 x 25 | 13 | 13px |

<details><summary>Notes on these components</summary>

- **Checkbox/Radio item** — box + label, 10px gap. 18 variants. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Radio`, `Filled`
- **Checkbox/Radio list** — 5px between items. 4 variants. per-variant sizes: `State=Error` 194 x 101
- **Control** — the checkbox/radio box itself, 20x20 r4. 2 variants. per-variant sizes: `Radio=Yes` 20 x 20
- **Date picker period** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Type`
- **Document previewer** — 3 variants. per-variant sizes: `Device=Tablet` 801 x 1049, `Device=Desktop` 960 x 1433
- **Image picker** — not auto-layout
- **Radio card** — 4 variants
- **Radio tile** — 2 variants
- **Toggle** — **binds a primitive** — Base colours/Grey Dolphin (border), Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. PILL; knob inset. per-variant sizes: `On=No, Locked=Yes` 55 x 25, `On=Yes, Locked=No` 55 x 25, `On=Yes, Locked=Yes` 55 x 25

</details>

## Tables

13 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| AG field | `.pf-ag-field` | State: Selected · Unselected | 140 x 43 | 8 | 12px |
| AG Filter menus | `.pf-ag-filter-menus` | Variant: Multi & search · Date · Sort<br>State: Default | 208 x 252 | 4 | 12px |
| AG sort item | `.pf-ag-sort-item` | State: Default · Hover · Active | 199 x 52 | 0 | 13px |
| Footer (AG) | `.pf-footer-ag` | Mobile: False · True | 1560 x 48 | 0 | 13px |
| Manage columns | `.pf-manage-columns` | Mobile: False · True<br>Darkmode: False | 520 x 1078 | 0 | 20px |
| Multi-select checkbox | `.pf-multi-select-checkbox` | State: Default · Selected · Mixed selection · Hover<br>Darkmode: False | 20 x 20 | 4 | — |
| Selected action banner | `.pf-selected-action-banner` | Darkmode: False<br>Mobile: False · True | 1560 x 48 | 8 | 16px |
| Table (AG) | `.pf-table-ag` | Mobile: False · True | 1705 x 856 | 8 | 13px SemiBold |
| Table action bar | `.pf-table-action-bar` | Mobile: False · True | 1654 x 98 | 0 | 16px SemiBold |
| Table card (AG) | `.pf-table-card-ag` | Mobile: False · True | 1600 x 1014 | 8 | 16px SemiBold |
| Table cell (AG) | `.pf-table-cell-ag` | Type: Default · Checkbox<br>Style: Default · Hover · Stripe | 300 x 58 | 0 | 13px |
| Table header (AG) | `.pf-table-header-ag` | Alignment: Left · Right · Checkbox | 300 x 54 | 0 | 13px SemiBold |
| Table header icons | `.pf-table-header-icons` | Variant: Sort · Filter · Context menu<br>State: Default · Hover · Ascending · Descending · Filtered · Active | 24 x 24 | 4 | — |

<details><summary>Notes on these components</summary>

- **AG field** — per-variant sizes: `State=Unselected` 140 x 36
- **AG Filter menus** — per-variant sizes: `Variant=Date, State=Default` auto x 260, `Variant=Sort, State=Default` 208 x 176
- **Footer (AG)** — per-variant sizes: `Mobile=True` 355 x 48
- **Manage columns** — per-variant sizes: `Mobile=True, Darkmode=False` 375 x 726
- **Multi-select checkbox** — per-variant sizes: `State=Selected, Darkmode=False` 20 x 20, `State=Mixed selection, Darkmode=False` 20 x 20
- **Selected action banner** — per-variant sizes: `Darkmode=False, Mobile=True` 335 x 48
- **Table (AG)** — per-variant sizes: `Mobile=True` 370 x 576
- **Table action bar** — per-variant sizes: `Mobile=True` 335 x 90
- **Table card (AG)** — per-variant sizes: `Mobile=True` 370 x 726
- **Table cell (AG)** — rows are TALL. per-variant sizes: `Type=Default, Style=Hover` 300 x 58, `Type=Checkbox, Style=Default` auto x 58, `Type=Checkbox, Style=Stripe` auto x 58, `Type=Checkbox, Style=Hover` auto x 58
- **Table header (AG)** — per-variant sizes: `Alignment=Checkbox` auto x 54

</details>

## Cards and panels

31 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] Attachment | `.pf-s-attachment` | — | 440 x 56 | 8 | 13px SemiBold |
| 50/50 layout container | `.pf-50-50-layout-container` | Row colour: false · true<br>Mobile: false · true | 1600 x 368 | 0 | 20px |
| Accordion | `.pf-accordion` | Expanded: False · True<br>Mobile: False · True | 1200 x 84 | 8 | 20px |
| Attachment with person | `.pf-attachment-with-person` | Property 1: Default | 440 x 112 | 8 | 13px |
| Attachments | `.pf-attachments` | Actions: Remove · Context menu | 440 x 56 | 0 | 13px SemiBold |
| Card | `.pf-card` | Property 1: Default | 520 x 358 | 8 | 20px |
| Component 1 | `.pf-component-1` | Property 1: Frame 6270951 · Frame 6270952 | 432 x 48 | 8 | 20px |
| Configuration panel | `.pf-configuration-panel` | Property 1: Default | 1600 x 189 | 8 8 0 0 | 20px |
| Configuration tile | `.pf-configuration-tile` | Device: Desktop · Mobile | auto x 260 | 8 | 24px |
| Content | `.pf-content` | — | 375 x 74 | 0 | 13px |
| Content cards | `.pf-content-cards` | Mobile: false · true | auto x 366 | 8 | 16px |
| Detail item | `.pf-detail-item` | — | 162 x 18 | 0 | 13px |
| Details | `.pf-details` | Layout: Horizontal · Vertical | 355 x 102 | 0 | 13px |
| Draggable card | `.pf-draggable-card` | State: Default · Hover · Drag · Click · Drop | 480 x 50 | 8 | 16px |
| Editable list card | `.pf-editable-list-card` | Property 1: Default | auto x 82 | 4 | 13px |
| Floaters | `.pf-floaters` | — | auto x 40 | 0 | — |
| Footer | `.pf-footer` | — | 375 x 28 | 0 | 13px Regular |
| Horizontal scroll | `.pf-horizontal-scroll` | Page: First · Last | 1160 x 32 | 0 | — |
| Layout container (magazine style) | `.pf-layout-container-magazine-style` | Row colour: True · False<br>Mobile: False · True | 1600 x 667 | 0 | 20px |
| Layout container tabs | `.pf-layout-container-tabs` | Property 1: Default | 1160 x 36 | 0 | 16px SemiBold |
| Layout container title | `.pf-layout-container-title` | Property 1: Default | 1160 x 44 | 0 | 20px |
| Note | `.pf-note` | Property 1: Default | 440 x 130 | 8 | 13px |
| Settings card | `.pf-settings-card` | Property 1: Default | 300 x 255 | 8 | 13px SemiBold |
| Side filter | `.pf-side-filter` | Mobile: False · True | 400 x 885 | 8 0 0 0 | 20px |
| Side panel | `.pf-side-panel` | Mobile: No · Yes<br>Size: Small · Medium · Large | 375 x 726 | 15 15 0 0 | 20px |
| Side panel header | `.pf-side-panel-header` | Size: Default | 449 x 60 | 0 | 20px |
| single layout card | `.pf-single-layout-card` | Mobile: false · true | 800 x 368 | 0 | 20px |
| Spotlight Card | `.pf-spotlight-card` | Horizontal: False · True<br>Mobile: False · True | 375 x 302 | 8 | 13px |
| Sticky footer | `.pf-sticky-footer` | Default: Default · Stepper | 446 x 52 | 0 | 13px SemiBold |
| Switcher | `.pf-switcher` | Property 1: Default | auto x 28 | 0 | 16px |
| Title panel | `.pf-title-panel` | Mobile: false · true | 375 x 135 | 0 | 18px |

<details><summary>Notes on these components</summary>

- **50/50 layout container** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Row colour`, `Mobile`. per-variant sizes: `Row colour=false, Mobile=true` auto x 774, `Row colour=true, Mobile=true` 355 x 774
- **Accordion** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Expanded=False, Mobile=True` 355 x 56, `Expanded=True, Mobile=False` 1200 x 428, `Expanded=True, Mobile=True` 355 x 428
- **Attachments** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Actions`
- **Card** — shadow 0 0 4px
- **Component 1** — UNNAMED IN FIGMA. It is the row inside Editable list card: a label with a trailing add or remove action. Property 1=Frame 6270951 is the ADD state (no fill, green Plus circle icon); Frame 6270952 is the ADDED state (Background/Tertiary fill, grey Remove icon). The component and both variant values carry Figma default names — raise with design.
- **Configuration tile** — shadow 0 0 4px. per-variant sizes: `Device=Mobile` auto x 230
- **Content cards** — per-variant sizes: `Mobile=true` auto x 333
- **Details** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Layout`. per-variant sizes: `Layout=Vertical` 355 x 102
- **Draggable card** — per-variant sizes: `State=Drop` 480 x 50
- **Floaters** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. Single component. No colour variable bound in Figma.
- **Horizontal scroll** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Page). Figma draws it 1160px wide — the artboard, not a rule. No colour variable bound.
- **Layout container (magazine style)** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Row colour=False, Mobile=True` 375 x 646, `Row colour=True, Mobile=True` 375 x 646
- **Settings card** — shadow 0 1 3px
- **Side filter** — per-variant sizes: `Mobile=True` 375 x 667
- **Side panel** — shadow 0 0 4px. per-variant sizes: `Mobile=No, Size=Small` 520 x 1080, `Mobile=No, Size=Medium` 960 x 1080, `Mobile=No, Size=Large` 1500 x 1080
- **single layout card** — per-variant sizes: `Mobile=true` 355 x 347
- **Spotlight Card** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Horizontal=True, Mobile=False` 585 x 218, `Horizontal=True, Mobile=True` 375 x 168
- **Sticky footer** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. per-variant sizes: `Default=Stepper` 446 x 52
- **Title panel** — per-variant sizes: `Mobile=false` 1130 x 135

</details>

## Navigation

33 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] Config child menu | `.pf-s-config-child-menu` | — | auto x 42 | 0 | 16px |
| Clock in | `.pf-clock-in` | Type: Hover · Standard<br>Darkmode: False | 107 x 32 | 20 | 16px |
| Config child menu | `.pf-config-child-menu` | Type: Child · Child + sub · Selected | auto x 42 | 0 | 16px |
| Config menu items | `.pf-config-menu-items` | Kind: Child | auto x 74 | 0 | 16px |
| Config parent menu | `.pf-config-parent-menu` | open: false · true | auto x 32 | 0 | 16px |
| Config side menu | `.pf-config-side-menu` | — | 325 x 980 | 8 | 16px |
| Default header background | `.pf-default-header-background` | Breakpoint: Tablet · Desktop · Mobile<br>Darkmode: False · True | auto x 86 | 0 | — |
| Filter tab single | `.pf-filter-tab-single` | Selected: True · False<br>Breakpoint: Desktop · Tablet · Mobile<br>State: Default · Hover | 224 x 100 | 0 | 24px Regular |
| Filter tabs | `.pf-filter-tabs` | Breakpoints: Desktop · Tablet · Mobile | 1600 x 100 | 0 | 24px SemiBold |
| Full page | `.pf-full-page` | Darkmode: False · True<br>Breakpoint: Desktop · Tablet · Mobile | 1920 x 1080 | 0 | 13px |
| Full page/Header navigation/Yes/No | `.pf-full-page-header-navigation-yes-no` | — | 375 x 138 | 0 | 13px |
| Header | `.pf-header` | — | 1830 x 86 | 0 | 24px |
| Header navigation | `.pf-header-navigation` | Darkmode: True · False<br>Levels of navigation: 0 · 1 · 2<br>Breakpoint: Desktop · Mobile · Tablet | 1830 x 130 | 0 | 16px |
| Menu | `.pf-menu` | Size: Large · Small | 50 x 73 | 0 | 13px |
| Mobile bottom navigation | `.pf-mobile-bottom-navigation` | Darkmode: False · True<br>Breakpoint: Tablet · Mobile | 375 x 76 | 0 | 11px |
| Nav tabs | `.pf-nav-tabs` | Status: Selected · Unselected · Hover<br>Mobile: True · False | auto x 40 | 8 8 0 0 | 16px |
| Navigation item | `.pf-navigation-item` | State: Hover · Selected · Unselected<br>Device: Desktop · Mobile · Tablet | 90 x 86 | 0 | 13px SemiBold |
| Navigation tabs | `.pf-navigation-tabs` | Mobile: No · Yes | 202 x 36 | 0 | 16px SemiBold |
| Notification categories | `.pf-notification-categories` | Mobile: No · Yes | 300 x 1020 | 0 | 16px |
| Notification list | `.pf-notification-list` | Mobile: No · Yes | 1117 x 730 | 0 | 16px |
| Notification panel | `.pf-notification-panel` | Mobile: Yes · No | 1500 x 1080 | 0 | 20px |
| Notification tabs | `.pf-notification-tabs` | State: Default · Hover · Selected<br>Selected: No · Yes | 279 x 65 | 0 | 16px |
| Pagination buttons | `.pf-pagination-buttons` | — | 358 x 32 | 0 | 13px SemiBold |
| Search navigation | `.pf-search-navigation` | Mobile: True · False · Mobile3 · Mobile4<br>Darkmode: False | 150 x 32 | 50 | 16px |
| Secondary nav | `.pf-secondary-nav` | Mobile: False · True | 562 x 44 | 0 | 16px SemiBold |
| Side navigation | `.pf-side-navigation` | Darkmode: True · False<br>Variant: Default · Finance | auto x 1080 | 0 | 13px |
| Side navigation tab | `.pf-side-navigation-tab` | Selected: false · true | 268 x 48 | 8 | 16px |
| Stepper | `.pf-stepper` | System: People First · Configr | auto x 160 | 0 | 13px |
| Steps | `.pf-steps` | System: People First · Configr<br>State: Hover · Completed · Selected · Default enabled · Default disabled<br>Position: Middle · First · Last<br>Current step: No · Yes<br>Completed step: No · Yes | 110 x 48 | 0 | 13px |
| Tab | `.pf-tab` | State: Default · Selected · Hover | auto x 34 | 0 | 16px |
| Tertiary nav | `.pf-tertiary-nav` | Mobile: True · False<br>Navigation type: Chips · Page | 562 x 55 | 0 | 16px SemiBold |
| Top bar app context | `.pf-top-bar-app-context` | Area: Administration · Insights · Recruitment · Goals · Payroll · Audit · Available jobs · Learning · Onboarding · HRM · General ledger · Accounts payable · Accounts receivable · Taxes · News · Data explorer · Case Management · Absence<br>Mobile: False · True | auto x 66 | 0 | 24px |
| Waffle | `.pf-waffle` | Theme: Dark mode · Default - Cranberry red · Classic · Fern green · Teal ocean · Cool grey · Blue lagoon · Cobalt blue · Orange flame · Striking red · Velvet red · Royal purple · Purple iris · Berry pink · Purple orchid | 90 x 86 | 0 | — |

<details><summary>Notes on these components</summary>

- **Clock in** — PILL. CLIP — fixed 107 wide with clipsContent on. Icon 22 at x=6, label 58 at x=33, so the label overruns the right padding by 4px and Figma cuts it off.
- **Config child menu** — **binds a primitive** — Base colours/Blue Ocean (background) — so this will not adapt between light and dark until Figma binds a semantic token. per-variant sizes: `Type=Selected` 352 x 42
- **Config parent menu** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `open`
- **Default header background** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. node 13658:7639 exists in Figma and reads fine — 6 variants across Breakpoint x Darkmode — but it is not among the Navigation page's components, so which page it lives on is unconfirmed. Kept: a live node is not a gap.. Full-bleed header bar; height varies by Breakpoint (see size rows). Fill is a raw colour in Figma, not a variable.. per-variant sizes: `Breakpoint=Desktop` auto x 86, `Breakpoint=Tablet` auto x 74, `Breakpoint=Mobile` auto x 62
- **Filter tab single** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`. per-variant sizes: `Selected=False, Breakpoint=Tablet, State=Default` 224 x 74, `Selected=False, Breakpoint=Tablet, State=Hover` 224 x 74, `Selected=False, Breakpoint=Mobile, State=Default` 172 x 70, `Selected=False, Breakpoint=Mobile, State=Hover` 172 x 70, `Selected=True, Breakpoint=Desktop, State=Default` 224 x 100, `Selected=True, Breakpoint=Tablet, State=Default` 224 x 74, `Selected=True, Breakpoint=Mobile, State=Default` 172 x 70
- **Filter tabs** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoints`. per-variant sizes: `Breakpoints=Tablet` 761 x 74, `Breakpoints=Mobile` 375 x 70
- **Full page** — Figma renamed this from `Full page navigation`. **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. 7 variants. Figma draws it 1920x1080 — a whole page frame, not a component box.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`. per-variant sizes: `System=People First, Tablet=No, Mobile=Yes, Darkmode=Yes` 375 x 667, `System=People First, Tablet=No, Mobile=Yes, Darkmode=No` 375 x 667, `System=People First, Tablet=Yes, Mobile=No, Darkmode=No` 768 x 1057, `System=People First, Tablet=Yes, Mobile=No, Darkmode=Yes` 768 x 1057
- **Full page/Header navigation/Yes/No** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. Single component, mobile width.
- **Header** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. per-variant sizes: `Theme=Configr, Mobile=Yes` 390 x 62, `Theme=Default - Cranberry red, Mobile=No` 1830 x 86, `Theme=Default - Cranberry red, Mobile=Yes` 390 x 62, `Theme=Dark mode, Mobile=No` 1830 x 86, `Theme=Dark mode, Mobile=Yes` 390 x 62, `Theme=Purple orchid, Mobile=No` 1830 x 86, `Theme=Purple orchid, Mobile=Yes` 390 x 62, `Theme=Berry pink, Mobile=No` 1830 x 86, `Theme=Berry pink, Mobile=Yes` 390 x 62, `Theme=Purple iris, Mobile=No` 1830 x 86, `Theme=Purple iris, Mobile=Yes` 390 x 62, `Theme=Royal purple, Mobile=No` 1830 x 86, `Theme=Royal purple, Mobile=Yes` 390 x 62, `Theme=Velvet red, Mobile=No` 1830 x 86, `Theme=Velvet red, Mobile=Yes` 390 x 62, `Theme=Striking red, Mobile=No` 1830 x 86, `Theme=Striking red, Mobile=Yes` 390 x 62, `Theme=Orange flame, Mobile=No` 1830 x 86, `Theme=Orange flame, Mobile=Yes` 390 x 62, `Theme=Cobalt blue, Mobile=No` 1830 x 86, `Theme=Cobalt blue, Mobile=Yes` 390 x 62, `Theme=Blue lagoon, Mobile=No` 1830 x 86, `Theme=Blue lagoon, Mobile=Yes` 390 x 62, `Theme=Cool grey, Mobile=No` 1830 x 86, `Theme=Cool grey, Mobile=Yes` 390 x 62, `Theme=Teal ocean, Mobile=No` 1830 x 86, `Theme=Teal ocean, Mobile=Yes` 390 x 62, `Theme=Fern green, Mobile=No` 1830 x 86, `Theme=Fern green, Mobile=Yes` 390 x 62, `Theme=Classic, Mobile=No` 1830 x 86, `Theme=Classic, Mobile=Yes` 390 x 62, `System=People First` 20 x 20, `System=Configr` 20 x 20
- **Header navigation** — Figma renamed this from `Header top navigation`. **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. 3 variants (Mobile x Tablet). Figma draws it 1830x130 — the artboard, not a rule.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Darkmode`, `Levels of navigation`, `Breakpoint`. per-variant sizes: `Mobile=Yes, Tablet=No` 390 x 106, `Mobile=No, Tablet=Yes` 768 x 118
- **Menu** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Size). No colour variable bound in Figma.. per-variant sizes: `Size=Small` 317 x 26
- **Mobile bottom navigation** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Darkmode`, `Breakpoint`. per-variant sizes: `Tablet=Yes` 768 x 56
- **Nav tabs** — Figma renamed this from `[S] Navigation/main tabs`. 6 variants (Status x Mobile); Mobile does not change the colours.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Status=Unselected, Mobile=True` auto x 42, `Status=Hover, Mobile=True` auto x 42, `Status=Selected, Mobile=False` auto x 40, `Status=Selected, Mobile=True` auto x 42
- **Navigation item** — the selected rail item: no side padding, wider gap, and the only SemiBold state. per-variant sizes: `System=People First, State=Default, Device=Desktop, Selected=No` 90 x 86, `System=Configr, State=Default, Device=Desktop, Selected=No` 90 x 86, `System=People First, State=Default, Device=Mobile, Selected=No` 86 x 76, `System=People First, State=Default, Device=Tablet, Selected=No` 86 x 56, `System=People First, State=Hover, Device=Desktop, Selected=No` 90 x 86, `System=Configr, State=Hover, Device=Desktop, Selected=No` 90 x 86, `System=People First, State=Selected, Device=Mobile, Selected=No` 86 x 76, `System=People First, State=Selected, Device=Tablet, Selected=No` 86 x 56
- **Navigation tabs** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `System=People First, Mobile=Yes` 202 x 32, `System=Configr, Mobile=Yes` 202 x 32
- **Notification categories** — 2 variants (Mobile). Figma draws it 1020px tall — the artboard, not a rule.. per-variant sizes: `Mobile=Yes` 390 x 824
- **Notification list** — 2 variants (Mobile). Figma draws it 1117x730 — the artboard, not a rule.. per-variant sizes: `Mobile=Yes` 390 x 779
- **Notification panel** — 2 variants (Mobile). Figma draws it 1500x1080 — the artboard, not a rule.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=Yes` 390 x 824
- **Notification tabs** — 3 variants (State x Selected). Node 22973:20747, which this extract previously held as "Side navigation tab" with a different variant structure.
- **Pagination buttons** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. Single component. Binds a primitive for its text — see source issues.
- **Search navigation** — Figma renamed this from `Search home button`. 2 variants (Mobile). PILL.. per-variant sizes: `Mobile=True` 32 x 32
- **Secondary nav** — Figma renamed this from `[S] Main nav context`. 2 variants (Mobile); both bind the same colours. Mobile=True sets 13px text.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=True` 375 x 40
- **Side navigation** — collapsed rail. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Darkmode`
- **Side navigation tab** — node 22973:20747 is called "Notification tabs" in Figma today and has a different variant structure (State x Selected, not Selected). These rows are a legacy snapshot kept because three prototypes use .pf-side-navigation-tab; the current component is captured separately as Notification tabs.
- **Stepper** — 2 variants (System); both bind the same colours.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `System`
- **Steps** — 26 variants across System x State x Position; 6 distinct colour bindings, keyed on State.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Position`, `Current step`, `Completed step`. per-variant sizes: `System=People First, State=Selected, Position=Middle, Current step=Yes, Completed step=No` 110 x 48, `System=People First, State=Selected, Position=First, Current step=Yes, Completed step=No` 110 x 48, `System=People First, State=Selected, Position=Last, Current step=Yes, Completed step=No` 110 x 48, `System=Configr, State=Selected, Position=Middle, Current step=Yes, Completed step=No` 110 x 48, `System=Configr, State=Selected, Position=First, Current step=Yes, Completed step=No` 110 x 48, `System=Configr, State=Selected, Position=Last, Current step=Yes, Completed step=No` 110 x 48, `System=People First, State=Hover, Position=Middle, Current step=No, Completed step=No` 110 x 48, `System=People First, State=Hover, Position=First, Current step=No, Completed step=No` 110 x 48, `System=People First, State=Hover, Position=Last, Current step=No, Completed step=No` 110 x 48, `System=Configr, State=Hover, Position=Middle, Current step=No, Completed step=No` 110 x 48, `System=Configr, State=Hover, Position=First, Current step=No, Completed step=No` 110 x 48, `System=Configr, State=Hover, Position=Last, Current step=No, Completed step=No` 110 x 48
- **Tab** — per-variant sizes: `System=People First, State=Default, Mobile=Yes, Selected=No` auto x 30, `System=Configr, State=Default, Mobile=Yes, Selected=No` auto x 30, `System=People First, State=Hover, Mobile=Yes, Selected=No` auto x 30, `System=Configr, State=Hover, Mobile=Yes, Selected=No` auto x 30, `System=People First, State=Selected, Mobile=No, Selected=Yes` auto x 36, `System=People First, State=Selected, Mobile=Yes, Selected=Yes` auto x 32, `System=Configr, State=Selected, Mobile=No, Selected=Yes` auto x 36, `System=Configr, State=Selected, Mobile=Yes, Selected=Yes` auto x 32
- **Tertiary nav** — Figma renamed this from `Secondary nav`. 4 variants (Mobile x Page); Mobile does not change the colours.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`, `Navigation type`. per-variant sizes: `Mobile=Yes, Page=No` 375 x 39, `Mobile=No, Page=Yes` 562 x 45, `Mobile=Yes, Page=Yes` 375 x 41
- **Top bar app context** — **binds a primitive** — Base colours/White (text) — so this will not adapt between light and dark until Figma binds a semantic token. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Area`, `Mobile`. per-variant sizes: `Area=Administration, Mobile=True` auto x 40, `Area=Payroll, Mobile=True` auto x 40, `Area=Audit, Mobile=True` auto x 40, `Area=Onboarding, Mobile=True` auto x 40, `Area=Learning, Mobile=True` auto x 40, `Area=Available jobs, Mobile=True` auto x 40, `Area=HRM, Mobile=True` auto x 40, `Area=General ledger, Mobile=True` auto x 40, `Area=Accounts payable, Mobile=True` auto x 40, `Area=Accounts receivable, Mobile=True` auto x 40, `Area=Taxes, Mobile=True` auto x 40, `Area=News, Mobile=True` auto x 40, `Area=Data explorer, Mobile=True` auto x 40, `Area=Case Management, Mobile=True` auto x 40, `Area=Absence, Mobile=True` auto x 40, `Area=Goals, Mobile=True` auto x 40, `Area=Insights, Mobile=True` auto x 40, `Area=Recruitment, Mobile=True` auto x 40
- **Waffle** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 15 variants (Theme). No colour variable bound in Figma.

</details>

## Tags and ratings

4 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Empty section | `.pf-empty-section` | Mobile: False · True | auto x 212 | 0 | 20px SemiBold |
| Star rating | `.pf-star-rating` | Rating: 0 · 1 · 2 · 3 · 4 · 5<br>State: Default · Hover<br>Read only: No · Yes | auto x 24 | 0 | 13px |
| Stars | `.pf-stars` | Active: No · Yes | 25 x 24 | 0 | — |
| Tags | `.pf-tags` | Type: Neutral · Expired · Positive · Warning · Negative · Theme · Other<br>Small: No · Yes | auto x 28 | 4 | 13px Regular |

<details><summary>Notes on these components</summary>

- **Empty section** — per-variant sizes: `Mobile=True` auto x 351
- **Star rating** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Read only`
- **Stars** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. 2 variants (Active). No colour variable bound in Figma.
- **Tags** — SENTENCE CASE, not uppercase. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Small`. per-variant sizes: `Type=Neutral, Small=Yes` auto x 22, `Type=Expired, Small=Yes` auto x 22, `Type=Positive, Small=Yes` auto x 22, `Type=Warning, Small=Yes` auto x 22, `Type=Negative, Small=Yes` auto x 22, `Type=Other, Small=Yes` auto x 22, `Type=Theme, Small=Yes` auto x 22

</details>

## System messages

7 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Confirmation modal | `.pf-confirmation-modal` | Mobile: false · True<br>Type: Confirmation · Success · Information<br>Dark mode: False | 400 x 413 | 8 | 24px Regular |
| Information box | `.pf-information-box` | Type: Success · Information · Warning · Error | 440 x 56 | 0 | 13px |
| Next actions modal | `.pf-next-actions-modal` | Mobile: false<br>Type: Success · Warning | 400 x 565 | 8 | 24px Regular |
| Notification card | `.pf-notification-card` | Mobile: False · True | 1160 x 117 | 8 | 16px SemiBold |
| Notification image | `.pf-notification-image` | Type: Person · Custom<br>With status?: False · True<br>Mobile: False · True<br>Status position: High · Low | 44 x 44 | 0 | — |
| Status | `.pf-status` | Status type: Like · Recognition · Comment · New social group · Custom · Absence | 22 x 22 | 100 | — |
| Toast message | `.pf-toast-message` | Message type: Success · Info · Warning · Error | 350 x 114 | 4 | 13px |

<details><summary>Notes on these components</summary>

- **Confirmation modal** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=false, Type=Success, Dark mode=False` 400 x 413, `Mobile=false, Type=Information, Dark mode=False` 400 x 550, `Mobile=True, Type=Confirmation, Dark mode=False` 375 x 695, `Mobile=True, Type=Success, Dark mode=False` 375 x 695, `Mobile=True, Type=Information, Dark mode=False` 375 x 695
- **Information box** — per-variant sizes: `Type=Warning` auto x 74, `Type=Error` 440 x 74, `Type=Success` 440 x 74
- **Notification card** — per-variant sizes: `Mobile=Yes` 355 x 153
- **Notification image** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. per-variant sizes: `Type=Person, With status?=False, Mobile=True, Status position=High` 36 x 36, `Type=Custom, With status?=False, Mobile=True, Status position=High` 36 x 36, `Type=Custom, With status?=True, Mobile=True, Status position=High` 36 x 36, `Type=Custom, With status?=True, Mobile=True, Status position=Low` 36 x 36, `Type=Person, With status?=True, Mobile=True, Status position=High` 36 x 36, `Type=Person, With status?=True, Mobile=True, Status position=Low` 36 x 36
- **Status** — **binds a primitive** — Base colours/Light Purple (background) — so this will not adapt between light and dark until Figma binds a semantic token. per-variant sizes: `Status type=Custom` 22 x 22
- **Toast message** — **binds a primitive** — Base colours/White (background), Base colours/Grey Slate (text) — so this will not adapt between light and dark until Figma binds a semantic token. fixed light surface — see dark-mode note

</details>

## Analytics and charts

13 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Bar | `.pf-bar` | Label: Horizontal · Vertical | 29 x 90 | 0 | 13px |
| Bar chart with axis | `.pf-bar-chart-with-axis` | Breakpoint: Desktop · Mobile<br>Darkmode: False | 326 x 221 | 0 | 13px Regular |
| Data variance | `.pf-data-variance` | Data change: Up · Down · No change<br>Mobile: False | auto x 45 | 0 | 13px |
| Data variance alternative | `.pf-data-variance-alternative` | Property 1: Default | auto x 27 | 0 | 20px |
| Donut chart with ledger | `.pf-donut-chart-with-ledger` | Darkmode: False<br>Mobile: True · False | auto x 200 | 0 | 60px |
| Donut pie chart | `.pf-donut-pie-chart` | Segments: 2 · 1 · 3 · 4<br>Icon: False · True | 200 x 200 | 0 | 60px Medium |
| Graph axis | `.pf-graph-axis` | Breakpoint: Mobile · Desktop | 492 x 232 | 0 | 13px |
| Graph legend | `.pf-graph-legend` | Mobile: True · False<br>Key type: Donut graph · Line graph | auto x 33 | 0 | 24px Regular |
| Hemisphere chart | `.pf-hemisphere-chart` | Status: None · Negative · Warning · Neutral · Positive | auto x 146 | 0 | 13px |
| Metric card | `.pf-metric-card` | Mobile: True · False | 392 x 89 | 8 | 36px |
| Percentage bar | `.pf-percentage-bar` | Percentage: 0 · 25 · 50 · 75 · 100 | 343 x 37 | 0 | 13px |
| Square progress bar | `.pf-square-progress-bar` | Variant: Default · Inline · Bottom label<br>Progress: 0% · 25% · 50% · 75% · 100% | auto x 34 | 0 | 13px |
| Table progress bar | `.pf-table-progress-bar` | Completion: 0% · 25% · 50% · 75% · 100%<br>Dark cell background: No · Yes | 246 x 14 | 0 | 13px |

<details><summary>Notes on these components</summary>

- **Bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Label`. per-variant sizes: `Label=Vertical` 29 x 137
- **Bar chart with axis** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`. per-variant sizes: `Breakpoint=Desktop, Darkmode=False` 492 x 250
- **Data variance** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Data change`
- **Donut chart with ledger** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Darkmode=False, Mobile=True` auto x 388
- **Donut pie chart** — centre figure is 60px. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Segments`, `Icon`. per-variant sizes: `Segments=2, Icon=True` 200 x 200, `Segments=4, Icon=False` 200 x 200, `Segments=4, Icon=True` 200 x 200, `Segments=1, Icon=False` 200 x 200, `Segments=1, Icon=True` 200 x 200, `Segments=3, Icon=False` 200 x 200, `Segments=3, Icon=True` 200 x 200
- **Graph axis** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`. per-variant sizes: `Breakpoint=Mobile` 326 x 179
- **Graph legend** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`, `Key type`. per-variant sizes: `Mobile=False, Key type=Line graph` auto x 18, `Mobile=True, Key type=Donut graph` auto x 27
- **Hemisphere chart** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Status`
- **Metric card** — big-number tile. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=True` 392 x 65
- **Percentage bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Percentage`
- **Square progress bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Variant`, `Progress`. per-variant sizes: `Variant=Inline, Progress=0%` auto x 18, `Variant=Inline, Progress=25%` auto x 18, `Variant=Inline, Progress=50%` auto x 18, `Variant=Inline, Progress=100%` auto x 18, `Variant=Bottom label, Progress=0%` auto x 38, `Variant=Bottom label, Progress=25%` auto x 38, `Variant=Bottom label, Progress=50%` auto x 38, `Variant=Bottom label, Progress=100%` auto x 38, `Variant=Inline, Progress=75%` auto x 18, `Variant=Bottom label, Progress=75%` auto x 38
- **Table progress bar** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Completion`, `Dark cell background`

</details>

## People

3 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| [S] People | `.pf-s-people` | Property 1: Header · Inline · Large card · Small card · Table<br>Mobile: False · True | 380 x 40 | 0 | 16px |
| People | `.pf-people` | Who?: CEO - Nolan George · D - Chance Siphron · D - Marilyn Workman · M -  Corey Franci · M -  Cristofer Saris · M -  Davina Jones · M -  Jaylon Stanton · M -  Livia Franci · M -  Rayna Calzoni · S -  Abram Carder · S -  Rose Carson · S -  Alice Robinson · S -  Ashlynn Oldfield · S -  Aspen Press · S -  Cooper Passaquindici Arcand · S -  Adison Magley · S -  Erin Schleifer · S -  Hanna Philips · S -  Kaiya Culhane · S -  Kianna Herwitz · S -  Marcus Farrell · S -  Marley Westervelt · S -  Nicholas Smudge · S -  Roger Bothman · S -  Samantha Stevens · S -  Unten Wilson · Organisation · Department · Job · Initials | 91 x 91 | 0 | — |
| Profile image | `.pf-profile-image` | Size: Extra large · Large · Medium plus · Medium · Small · Extra small | 93 x 93 | 47 | — |

<details><summary>Notes on these components</summary>

- **[S] People** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Property 1=Header, Mobile=False` auto x 64, `Property 1=Header, Mobile=True` auto x 58, `Property 1=Small card, Mobile=False` auto x 36, `Property 1=Small card, Mobile=True` auto x 36, `Property 1=Large card, Mobile=False` auto x 54, `Property 1=Large card, Mobile=True` auto x 43, `Property 1=Table, Mobile=False` auto x 54, `Property 1=Table, Mobile=True` auto x 91
- **People** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. per-variant sizes: `Who?=D - Chance Siphron` 91 x 91, `Who?=Department` 64 x 64, `Item=Nolan George, Type=Table, Mobile=True` auto x 91, `Item=Corey Franci, Type=Table, Mobile=True` auto x 109, `Item=Organisation, Type=Table, Mobile=True` 156 x 73, `Item=Nolan George, Type=Card large, Mobile=True` auto x 43, `Item=Nolan George, Type=Card small, Mobile=True` auto x 36, `Item=Nolan George, Type=Inline search, Mobile=True` auto x 40, `Item=Nolan George, Type=Header, Mobile=True` auto x 58, `Item=Organisation, Type=Header, Mobile=True` auto x 40, `Item=Nolan George, Type=Table, Mobile=False` auto x 54, `Item=Organisation, Type=Table, Mobile=False` auto x 36, `Item=Nolan George, Type=Card large, Mobile=False` auto x 54, `Item=Nolan George, Type=Card small, Mobile=False` auto x 36, `Item=Nolan George, Type=Header, Mobile=False` auto x 64, `Item=Organisation, Type=Header, Mobile=False` auto x 64, `Item=Nolan George, Type=Inline search, Mobile=False` auto x 40, `Who?=Organisation` 64 x 64, `Who?=Job` 64 x 64, `Who?=Initials` 64 x 64
- **Profile image** — **shape only** — no variant of this binds a colour variable in Figma, so the class carries its measured geometry and leaves colour to the page. CIRCLE. Six sizes; Medium is the default. The base row used to carry Extra large's 93px, so every avatar rendered at the largest size. The picture itself is a raster fill bound to no colour variable — see assets/component-art/.. per-variant sizes: `Size=Large` 76 x 76, `Size=Medium plus` 54 x 54, `Size=Medium` 43 x 43, `Size=Small` 28 x 28, `Size=Extra small` 22 x 22

</details>

## Pages and Layouts

3 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Configuration | `.pf-configuration` | — | 1600 x 809 | 8 | 24px |
| Form | `.pf-form` | Mobile: False · True | 355 x 1046 | 8 | 18px |
| Menu-search-settings | `.pf-menu-search-settings` | Page: Menu · Search · Settings<br>Darkmode: False | 1920 x 1080 | 0 | 24px |

<details><summary>Notes on these components</summary>

- **Configuration** — per-variant sizes: `Mobile=True` 355 x 809
- **Form** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=False` 1200 x 1004

</details>

## AI

8 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Adaptive card | `.pf-adaptive-card` | Mobile: False · True | 478 x 389 | 0 | 12px |
| AI Assistant | `.pf-ai-assistant` | Mobile: True · False<br>Darkmode: False<br>Type: Default · Expanded · Active chat | 1628 x 1080 | 0 | 20px |
| AI banner | `.pf-ai-banner` | Darkmode: False · True<br>mobile: True · False | 1315 x 94 | 8 | 20px |
| AI button | `.pf-ai-button` | Style: Light mode · Inverted<br>Hover: False · True<br>Mobile: False · True | auto x 32 | 55 | 13px Regular |
| AI card modal | `.pf-ai-card-modal` | Property 1: Default | 440 x 505 | 8 | 20px |
| AI Gradient component | `.pf-ai-gradient-component` | Property 1: Frame 62710147 · Frame 62710148 · Variant3 | 408 x 408 | 0 | 24px SemiBold |
| AI message bubble | `.pf-ai-message-bubble` | Type: AI chat · User chat | 455 x 149 | 0 | 12px |
| Clickable AI element | `.pf-clickable-ai-element` | State: default · Hover | 382 x 38 | 8 | 13px |

<details><summary>Notes on these components</summary>

- **Adaptive card** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=True` 355 x 374
- **AI Assistant** — **binds a primitive** — Base colours/Default Pink (text) — so this will not adapt between light and dark until Figma binds a semantic token. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Mobile=True, Darkmode=False, Type=Expanded` 376 x 770, `Mobile=False, Darkmode=False, Type=Default` 520 x 1080, `Mobile=False, Darkmode=False, Type=Active chat` 520 x 1080, `Mobile=True, Darkmode=False, Type=Default` 375 x 770, `Mobile=True, Darkmode=False, Type=Active chat` 375 x 770
- **AI banner** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `mobile`. per-variant sizes: `Darkmode=False, mobile=True` 385 x 159
- **AI button** — **binds a primitive** — Base colours/White (text), Base colours/Default Pink (text), Base colours/White (border) — so this will not adapt between light and dark until Figma binds a semantic token. PILL. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Mobile`. per-variant sizes: `Style=Light mode, Hover=False, Mobile=True` auto x 32, `Style=Inverted, Hover=False, Mobile=False` auto x 32, `Style=Inverted, Hover=False, Mobile=True` auto x 32, `Style=Inverted, Hover=True, Mobile=False` auto x 32, `Style=Inverted, Hover=True, Mobile=True` auto x 32, `Style=Light mode, Hover=True, Mobile=False` auto x 32, `Style=Light mode, Hover=True, Mobile=True` auto x 32
- **AI Gradient component** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Property 1`
- **AI message bubble** — per-variant sizes: `Type=User chat` 328 x 62
- **Clickable AI element** — **binds a primitive** — Base colours/Default Pink (text) — so this will not adapt between light and dark until Figma binds a semantic token

</details>

## Icons

4 components.

| Component | Class | Variants in Figma | Size | Radius | Type |
|---|---|---|---|---|---|
| Bar chart | `.pf-bar-chart` | Breakpoint: Desktop · Mobile<br>Darkmode: False | 415 x 193 | 0 | 13px |
| Circle icons | `.pf-circle-icons` | Size: XS - 28px · S - 36px · M - 44px · L - 52px | auto x auto | 999 | — |
| Org chart | `.pf-org-chart` | Type: Org · Manager · Reportee | 293 x 48 | 8 | 16px |
| Signature | `.pf-signature` | Mandatory: False<br>State: Default | auto x 384 | 0 | 16px |

<details><summary>Notes on these components</summary>

- **Bar chart** — axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Breakpoint`. per-variant sizes: `Breakpoint=Mobile, Darkmode=False` 283 x 222
- **Circle icons** — CIRCLE. Four sizes as Size variants; each size row below carries its own box.. axes Figma defines that bind no new colours, so they carry as geometry or content rather than CSS: `Size`. per-variant sizes: `Size=XS - 28px` 28 x 28, `Size=S - 36px` 36 x 36, `Size=M - 44px` 44 x 44, `Size=L - 52px` 52 x 52
- **Org chart** — per-variant sizes: `Type=Manager` 293 x 97, `Type=Reportee` 293 x 55

</details>

## Not in the library

These exist in the Figma file but have no rules, each for a stated reason. Listed
so nobody has to guess whether one is an oversight — none of them is.

**23 — on a documentation page — describes the design system rather than being part of it**

`AI link` · `Avatar` · `Description` · `Document label spec` · `Document order spec` · `Dos and don'ts` · `Header` · `Logos` · `Project info - Files and Resources` · `Project info - Meeting notes` · `Project info - Stakeholders and Team` · `Project info - Timeframe and schedule` · `Project info - UX PRD summary` · `Prototype context screen` · `Prototype cover page` · `Skeleton state` · `Storybook link` · `Team member` · `Thumbnail` · `Thumbnail/Brand logo` · `Wiki menu` · `Work item` · `design system header`

**13 — a measured sub-part, not a component set Figma publishes — its geometry is recorded so a prototype can build the piece, and it will never appear in components.json**

`Checkbox / radio box` · `Checkbox/Radio item (row)` · `Field (second component)` · `Information box (row)` · `Layout container` · `Option (dropdown row)` · `Org chart node` · `People (avatar)` · `People (card)` · `People (row)` · `Radio card / Radio tile` · `Status dot` · `Table (AG) container`

**8 — no variant binds a colour variable in Figma — nothing to put in a stylesheet**

`Field icons` · `Floaters` · `Horizontal scroll` · `Map` · `Menu` · `Notification image` · `Profile image` · `Stars`

**8 — pending: newly published in Figma, first seen in the 2026-09-11 inventory refresh. Not yet captured because the Navigation re-read is blocked on a token re-extract — components on this page bind Navigation/Nav bg top and Border/Default full, which Figma uses today and this repo has never extracted into semantic.tsv, so their colours cannot be recorded without inventing a token name**

`Full page/Header navigation/Yes/No` · `Notification categories` · `Notification list` · `Notification panel` · `Pagination buttons` · `Stepper` · `Steps` · `Waffle`

**1 — carries a Figma default name — an unnamed component, not part of the system**

`Component 1`

**1 — no variant binds a colour variable in Figma — nothing to put in a stylesheet. CONFIRMED by re-read 2026-09-11 (1536:44461): raw white, five raw rgba() tints and the DEPRECATED COLOURS/White style, plus Open Sans Medium (500) text**

`Mobile key actions`

**1 — its variants are sample content (one per fictional employee), not design**

`People`

**1 — no variant binds a colour variable in Figma — nothing to put in a stylesheet. CONFIRMED by re-read 2026-09-11 (18235:41129): a 28x28 icon, both variants pure SVG, the only colour is the DEPRECATED COLOURS/Grey style #868686**

`Tooltip`

**1 — DETACHED from the document tree — the Plugin API resolves node 13658:7639 by id but reports parent=null and page=null, so page.findAllWithCriteria() never reaches it and no page walk could ever measure it. It is the header swoosh artwork, and this is a second reason the artwork went missing on top of binding no colour variable. Now measured by node id directly: 1920x86 desktop, 768x74 tablet, 390x62 mobile, light and dark.**

`Default header background`

**1 — RENAMED in Figma to `Notification tabs` (node 22973:20747, unchanged). components.json still lists the old name, so it reads as an unmeasured component; it is measured, under its current name.**

`Side navigation tab`

**1 — DETACHED ICON. Node 7619:70907, 36x36. `Tick` IS in icons.tsv — a second, orphaned copy.**

`Tick`

**1 — DETACHED. Node 27313:7362, 4 variants. `AI Assistant` is captured from its live node on the AI page; this is an older panel of the same thing.**

`AI Assistant side panel`

**1 — DETACHED ICON. Node 348:1429, 36x36. Not in icons.tsv under any spelling.**

`Close x`

**1 — DETACHED and UNNAMED. Node 641:3788, 9 variants, never given a name — the same problem as `Component 1`, which is already recorded in FIGMA-ISSUES.md section 2.**

`Component 7`

**1 — DETACHED ICON. Node 101:414, 36x36. One of eight icon components that sit on no page. The 293 icons in assets/icons/ come from the Icons page; these are not on it.**

`Context`

**1 — DETACHED. Node 16274:24802, a 65x90 pair used as the scroll control inside Horizontal scroll and the table toolbar. On no page.**

`Control button`

**1 — DETACHED. Node 5322:65002, the wide variant of the same toolbar as above.**

`Correspondence template tool`

**1 — DETACHED ICON. Node 976:715, 36x36. Not in icons.tsv.**

`Dropdown_chevron`

**1 — DETACHED ICON. Node 14334:1444, 36x36. Not in icons.tsv.**

`General ledger notebook`

**1 — DETACHED. Node 13658:8004, the icon group inside the Header component, which is captured. A child of a captured component rather than a component a page would use on its own.**

`Header icon`

**1 — DETACHED. Node 101:500, the 36x36 frame every icon is drawn inside — a template, not an icon.**

`Icon viewport/Icon_Template`

**1 — DETACHED ICON. Node 6237:66109, 36x36. Not in icons.tsv.**

`List`

**1 — DETACHED. Node 30643:30526, 4 variants, used inside the AI Assistant.**

`List component`

**1 — DETACHED. Node 803:1125, a row inside Menu-search-settings, which is captured.**

`Search result`

**1 — DETACHED. Node 13909:5262. `Side panel header` is captured from its live node; the footer exists only as this orphan.**

`Side panel footer`

**1 — DETACHED and SUPERSEDED. Node 781:10884 is a real People First component set with 8 variants (Active x Mobile x Darkmode), used by `Menu-search-settings`, but it sits on no page so no walk can reach it. Its instances measure 52x36 active with an underline and 59x34 inactive, which is exactly what the live `Tab` component is — and it binds `Base colours/Default Pink`, a raw primitive, so it predates the semantic layer and cannot do dark mode. `Tab` is its replacement. Not captured, deliberately.**

`Tabs navigation`

**1 — DETACHED. Node 5322:65179, with its five children — Text styling formatting, Text alignment, Bullet points, Font colour, Insert link — all on no page. They are the toolbar inside `Text template format editor`, which IS captured; these are its contents, which the outer-box extract could not reach anyway (see the composite-component limit).**

`Text template tool bar`

**1 — DETACHED ICON. Node 8070:78145, 36x36. Not in icons.tsv.**

`Tick in circle`

**1 — DETACHED ICON. Node 101:412, 36x36. `Up arrow` IS in icons.tsv from the Icons page — this is a second, orphaned copy.**

`Up_arrow`

**1 — DETACHED. Node 234:2281, a structure frame; `Button` is captured with 28 variants from its live node.**

`[S] Button X`

**1 — DETACHED. Node 607:73734. The `[S]` prefix marks a structure/spec frame rather than a shipped component; `Form field` itself is captured with all 40 of its variants.**

`[S] Form field`

**1 — DETACHED. Node 3435:66947, a structure frame documenting how icons are framed.**

`[S] Icon & imagery structure`

**1 — DETACHED. Node 1536:44305, a structure frame.**

`[S] Mobile top cards`

**1 — DETACHED. Node 2834:45888. As above — `Signature` is captured.**

`[S] Signature`

