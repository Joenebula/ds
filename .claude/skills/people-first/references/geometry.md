# Component geometry

Measured from the Figma components — sizes, padding, radii, gaps and type. These are
**not** derivable from the spacing/radius tokens: component geometry and the token
scale are separate systems in People First.

The most common way a People First build goes wrong is inferring shape from the token
scale. Buttons do not use the radius tokens at all (they are pills), tags are sentence
case, and table rows are far taller than a default table. Look values up here.

| Component | Size (w × h) | Padding | Radius | Gap | Type | Notes |
|---|---|---|---|---|---|---|
| **Button** | auto x 32 | 0 20 | 20 | 10 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Button (icon only)** | 32 x 32 | 0 20 | 20 | 10 | — |  |
| **Links (primary)** | auto x 22 | 0 | 0 | 5 | 16px, ls -1% |  |
| **Links (secondary)** | auto x 18 | 0 | 0 | 5 | 13px |  |
| **Filter chip** | auto x 42 | 10 20 | 76 | 5 | 16px, ls -1% | HORIZONTAL CENTER CENTER |
| **Filter chip (mobile)** | auto x 34 | 8 15 | 76 | 5 | 13px |  |
| **Tags** | auto x 28 | 5 10 | 4 | 5 | 13px Regular | HORIZONTAL CENTER CENTER |
| **Field** | 300 x 42 | 10 10 10 20 | 8 | 10 | 16px | HORIZONTAL CENTER MAX |
| **Primary search** | auto x 38 | 0 10 | 20 | 10 | 13px | HORIZONTAL CENTER MIN |
| **Option (dropdown row)** | auto x 26 | 2 10 2 20 | 4 | 5 | 16px |  |
| **Text area** | auto x 213 | — | 8 | 5 | 16px | VERTICAL MIN MIN |
| **Message box** | auto x 138 | 15 | 8 | 10 | 16px | VERTICAL MIN MIN |
| **Toggle** | 55 x 25 | 0 7 0 2 | 13 | 0 | 13px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Checkbox / radio box** | 20 x 20 | — | 4 | — | — |  |
| **Checkbox/Radio item (row)** | auto x 22 | 0 | 0 | 10 | 16px |  |
| **Radio card / Radio tile** | 235 x 152 | 25 0 | 4 | 10 | 16px SemiBold |  |
| **Table header (AG)** | auto x 54 | 15 | 0 | 47 | 13px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **Table cell (AG)** | auto x 58 | 10 15 | 0 | 10 | 13px | HORIZONTAL CENTER MIN |
| **Table (AG) container** | — | 0 | 8 | 0 | 13px SemiBold |  |
| **Table card (AG)** | — | 20 | 8 | 20 | 16px SemiBold | VERTICAL CENTER MIN |
| **Multi-select checkbox** | 20 x 20 | 0 | 4 | 0 | — | NONE |
| **Table header icons** | 24 x 24 | 10 | 4 | 10 | — | HORIZONTAL CENTER CENTER |
| **Selected action banner** | auto x 48 | 8 20 | 8 | — | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **AG sort item** | auto x 52 | 16 20 | 0 | 20 | 13px | HORIZONTAL CENTER MIN |
| **AG Filter menus** | 208 x 252 | 16 | 4 | 20 | 12px | VERTICAL CENTER MIN |
| **Card** | auto | 20 | 8 | 20 | 20px title | VERTICAL CENTER MIN |
| **Content cards** | auto | 20 | 8 | 20 | 16px | VERTICAL MIN MIN |
| **Settings card** | auto | 20 | 8 | 10 | 13px SemiBold | VERTICAL MIN MIN |
| **Configuration tile** | auto x 260 | 40 20 | 8 | 10 | 24px | VERTICAL CENTER CENTER |
| **Draggable card** | auto x 50 | 10 15 | 8 | 20 | 16px | HORIZONTAL CENTER MIN |
| **Accordion** | auto x 84 | 20 | 8 | — | 20px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Side panel** | 375 wide | 0 | mixed | 0 | 20px | VERTICAL MIN MIN |
| **Side panel header** | auto x 60 | 10 15 | 0 | 10 | 20px | HORIZONTAL CENTER MAX |
| **Sticky footer** | auto x 52 | 10 15 | 0 | 20 | 13px SemiBold | HORIZONTAL CENTER MIN |
| **Org chart node** | 293 x 48 | 0 | 8 | 0 | 16px |  |
| **Layout container** | auto | 30 | 0 | 20 | 20px |  |
| **Title panel** | auto x 135 | 40 20 | 0 | 10 | 18px | VERTICAL CENTER CENTER |
| **Empty section** | auto x 212 | 0 | 0 | 35 | 20px SemiBold | HORIZONTAL CENTER MIN |
| **Notification card** | auto x 113 | 15 20 | 8 | 15 | 13px SemiBold | HORIZONTAL CENTER MIN |
| **Toast message** | 350 x 114 | 30 0 30 25 | 4 | 15 | 13px | HORIZONTAL CENTER MIN |
| **Information box (row)** | auto x 56 | 0 | 0 | 0 | 13px |  |
| **Confirmation modal** | 400 x 413 | 60 10 | 8 | 36 | 24px Regular | VERTICAL CENTER MIN |
| **Next actions modal** | 400 x 565 | 0 0 30 0 | 8 | 30 | 24px Regular | VERTICAL CENTER MIN |
| **Status dot** | 22 x 22 | 0 | 100 | 0 | — |  |
| **Notification image** | 44 x 44 | 0 | 0 | 0 | — | NONE |
| **Navigation item** | 90 x 86 | 0 | 0 | 22 | 13px SemiBold | HORIZONTAL CENTER CENTER |
| **Side navigation** | 90 wide | 0 | 0 | 0 | 13px | VERTICAL MIN MIN |
| **Side navigation tab** | 268 x 48 | 10 15 | 8 | 20 | 16px | HORIZONTAL CENTER MIN |
| **Tab** | 40 x 34 | 6 0 | 0 | 10 | 16px | VERTICAL CENTER MIN |
| **Navigation tabs** | auto x 36 | 0 | 0 | 40 | 16px SemiBold | HORIZONTAL CENTER MIN |
| **Header** | auto x 86 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Mobile bottom navigation** | 375 x 76 | 0 | 0 | 0 | 11px | HORIZONTAL MIN MIN |
| **Clock in** | 107 x 32 | 7 20 7 10 | 20 | 5 | 16px | HORIZONTAL CENTER CENTER |
| **Filter tab single** | 224 x 100 | 20 | 0 | 5 | 24px Regular | VERTICAL MIN CENTER |
| **Top bar app context** | 242 x 66 | 0 | 0 | 0 | 24px | HORIZONTAL MIN MIN |
| **Metric card** | 392 x 89 | 20 | 8 | 165 | 36px |  |
| **Bar chart** | 415 x 193 | 0 | 0 | 10 | 13px |  |
| **Bar chart with axis** | 326 x 221 | 0 | 0 | 0 | 13px Regular |  |
| **Donut pie chart** | 200 x 200 | 0 | 0 | 0 | 60px Medium |  |
| **Donut chart with ledger** | 329 x 200 | 0 | 0 | 21 | 60px |  |
| **Hemisphere chart** | 200 x 146 | 0 | 0 | 5 | 13px |  |
| **Graph legend** | auto x 33 | 0 | 0 | 5 | 24px Regular |  |
| **Graph axis** | 492 x 232 | 0 | 0 | 10 | 13px |  |
| **Square progress bar** | 177 x 34 | 0 | 0 | 10 | 13px |  |
| **Table progress bar** | 246 x 14 | 0 | 0 | 5 | 13px |  |
| **Percentage bar** | 343 x 37 | 0 | 0 | 5 | 13px |  |
| **Data variance** | 41 x 45 | 0 | 0 | 0 | 13px |  |
| **Profile image** | 93 x 93 | 0 | 47 | 0 | — |  |
| **People (avatar)** | 91 x 91 | 0 | 0 | 0 | — |  |
| **People (row)** | 380 x 40 | 0 | 0 | 10 | 16px |  |
| **People (card)** | 166 x 91 | 0 | 0 | 0 | 13px |  |
| **AI card modal** | 440 x 505 | 20 | 8 | 10 | 20px | VERTICAL MIN MIN |
| **AI button** | 146 x 32 | 3 15 3 10 | 55 | 10 | 13px Regular | HORIZONTAL CENTER CENTER |
| **AI banner** | auto x 94 | 20 | 8 | 10 | 20px | HORIZONTAL MIN MIN |
| **Clickable AI element** | 382 x 38 | 10 10 10 20 | 8 | 10 | 13px | HORIZONTAL CENTER MIN |
| **AI message bubble** | 455 x 149 | 0 | 0 | 5 | 12px | VERTICAL MIN MIN |
| **Form field** | 564 x auto | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Required field** | auto x auto | 0 | 0 | 8 | 16px | HORIZONTAL CENTER MIN |
| **Field label** | 152 x auto | 0 | 0 | 42 | 16px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Field icons** | auto x auto | 0 | 0 | 5 | — | HORIZONTAL CENTER MIN |
| **Option** | 250 x auto | 2 10 2 20 | 4 | 5 | 16px | HORIZONTAL CENTER MIN |
| **Browser drop down** | 440 x auto | 5 | 8 | 5 | 16px | VERTICAL MIN MIN |
| **Inline search** | 400 x auto | 0 | 0 | 6 | 16px | VERTICAL MIN MIN |
| **People and department drop down** | 440 x auto | 10 5 10 10 | 0 | 10 | 16px | HORIZONTAL MIN CENTER |
| **Multiselect tag** | auto x auto | 0 | 4 | 0 | 13px | HORIZONTAL CENTER MIN |
| **[S] Text area** | 300 x 240 | 0 | 8 | 5 | 16px | VERTICAL MIN MIN |
| **Signature** | auto x auto | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Text template format editor** | 440 x auto | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **[S] Post content** | 520 x auto | 0 20 10 73 | 0 | 2 | 20px | VERTICAL MIN MIN |
| **Map** | 480 x 200 | — | 8 | — | — | NONE |
| **Calendar picker** | auto x auto | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Time picker** | auto x auto | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Field (second component)** | auto x auto | 0 | 0 | 2 | 13px | VERTICAL MIN MIN |
| **Radio tile** | 235 x auto | 25 0 | 4 | 10 | 16px SemiBold | VERTICAL CENTER MIN |
| **Radio card** | 235 x 152 | 25 0 | 4 | 10 | 16px SemiBold | VERTICAL CENTER MIN |
| **Control** | 20 x 20 | 10 | 4 | 10 | — | VERTICAL CENTER CENTER |
| **Checkbox/Radio item** | auto x 22 | 0 | 0 | 10 | 16px | HORIZONTAL CENTER MIN |
| **Checkbox/Radio list** | 194 x auto | 0 | 0 | 5 | 16px | VERTICAL MIN MIN |
| **Date picker period** | auto x auto | 0 | 0 | 10 | 20px | HORIZONTAL CENTER CENTER |
| **Date range visual** | 371 x auto | 0 | 0 | 20 | 16px | HORIZONTAL CENTER MIN |
| **Image picker** | 440 x 220 | — | 0 | — | — | NONE |
| **Slider** | 600 x auto | 0 | 0 | 20 | 13px | VERTICAL MIN CENTER |
| **Document previewer** | 375 x 642 | 0 | 0 | 0 | 16px | VERTICAL MIN MIN |
| **Attachments** | 440 x auto | — | — | — | 13px SemiBold | HORIZONTAL MIN MIN |
| **Attachment with person** | 440 x auto | — | 8 | — | 13px | VERTICAL CENTER MIN |
| **Note** | 440 x auto | — | 8 | — | 13px | VERTICAL CENTER MIN |
| **Editable list card** | auto x auto | — | 4 | — | 13px | HORIZONTAL MIN MIN |
| **Org chart** | 293 x auto | — | 8 | — | 16px | HORIZONTAL CENTER MIN |
| **Configuration panel** | 1600 x auto | — | mixed | — | 20px | VERTICAL CENTER MIN |
| **Side filter** | 400 x 885 | — | mixed | — | 20px | VERTICAL CENTER MIN |
| **Spotlight Card** | 375 x auto | 0 0 10 0 | 8 | 10 | 13px | VERTICAL MIN MIN |
| **Details** | 355 x auto | — | — | 10 | 13px | HORIZONTAL MIN MIN |
| **Switcher** | auto x auto | — | — | 10 | 16px | HORIZONTAL CENTER MIN |
| **Layout container (magazine style)** | 1600 x auto | 30 | — | 20 | 20px | VERTICAL MIN MIN |
| **Layout container title** | 1160 x auto | — | — | 464 | 20px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Layout container tabs** | 1160 x auto | — | — | 204 | 16px SemiBold | HORIZONTAL CENTER SPACE_BETWEEN |
| **single layout card** | 800 x auto | 30 | — | 20 | 20px | VERTICAL CENTER MIN |
| **50/50 layout container** | 1600 x auto | — | — | — | 20px | HORIZONTAL MIN MIN |
| **[S] Attachment** | 440 x auto | 10 20 | 8 | — | 13px SemiBold | HORIZONTAL CENTER MIN |
| **Footer** | 375 x auto | 0 10 | — | 10 | 13px Regular | VERTICAL MIN MIN |
| **Content** | 375 x auto | — | — | 10 | 13px | VERTICAL MIN MIN |
| **Detail item** | 162 x auto | — | — | 5 | 13px | HORIZONTAL MIN MIN |
| **Config child menu** | auto x auto | — | — | — | 16px | VERTICAL MIN MIN |
| **Config menu items** | auto x auto | — | — | — | 16px | VERTICAL MIN MIN |
| **Config parent menu** | auto x auto | 5 20 5 0 | — | 5 | 16px | HORIZONTAL CENTER MIN |
| **Filter tabs** | 1600 x auto | — | — | — | 24px SemiBold | HORIZONTAL MIN MIN |
| **Config side menu** | 325 x 980 | — | 8 | — | 16px | VERTICAL MIN MIN |
| **[S] Config child menu** | auto x auto | 10 0 0 11 | — | 10 | 16px | VERTICAL MIN MIN |
| **Links** | auto x auto | — | — | 5 | 16px | HORIZONTAL CENTER MIN |
| **Add attachment** | 440 x auto | — | — | 20 | 13px SemiBold | VERTICAL CENTER MIN |
| **Action menu button** | auto x auto | — | — | — | 16px | HORIZONTAL CENTER CENTER |
| **Tool tip** | auto x auto | 10 | 4 | — | 13px | VERTICAL MIN MIN |
| **Drop down button** | 192 x auto | 7 10 7 20 | 48 | — | 13px Regular | HORIZONTAL CENTER MIN |
| **Repeating group** | auto x auto | — | — | 20 | 16px Italic | VERTICAL MIN MIN |
| **Action menu** | 199 x auto | 4 5 | 4 | — | 13px | VERTICAL MIN MIN |
| **Manage columns** | 520 x auto | — | — | — | 20px | VERTICAL MIN MIN |
| **Footer (AG)** | 1560 x auto | — | — | — | 13px | VERTICAL MIN MIN |
| **Table action bar** | 1654 x auto | — | — | 20 | 16px SemiBold | VERTICAL MIN CENTER |
| **AG field** | 140 x 43 | 2 4 | 8 | 10 | 12px | VERTICAL CENTER CENTER |
| **Table (AG)** | 1705 x auto | — | 8 | — | 13px SemiBold | VERTICAL MIN MIN |
| **Status** | 22 x 22 | — | 100 | — | — |  |
| **Information box** | 440 x 56 | — | — | — | 13px | HORIZONTAL MIN MIN |
| **Star rating** | auto x auto | — | — | — | 13px | VERTICAL CENTER CENTER |
| **AI Assistant** | 1628 x auto | — | — | — | 20px | HORIZONTAL CENTER SPACE_BETWEEN |
| **Adaptive card** | 478 x auto | — | — | 5 | 12px | VERTICAL MIN MIN |
| **AI Gradient component** | 408 x 408 | — | — | — | 24px SemiBold |  |
| **Configuration** | 1600 x 809 | — | 8 | — | 24px |  |
| **Form** | 355 x auto | 20 10 | 8 | 30 | 18px | VERTICAL CENTER MIN |
| **Menu-search-settings** | 1920 x 1080 | 20 | — | 30 | 24px | VERTICAL CENTER MIN |
| **Bar** | 29 x 90 | — | — | 5 | 13px | VERTICAL CENTER MIN |
| **Data variance alternative** | auto x auto | — | — | 5 | 20px | HORIZONTAL CENTER MIN |
| **[S] People** | 380 x auto | — | — | 10 | 16px | HORIZONTAL CENTER CENTER |
| **Text template format editor ** | 440 x auto | — | — | 5 | 16px | VERTICAL MIN MIN |
| **Circle icons** | auto x auto | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=XS - 28px** | 28 x 28 | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=S - 36px** | 36 x 36 | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=M - 44px** | 44 x 44 | 0 | 999 | 0 | — | NONE |
| **Circle icons|Size=L - 52px** | 52 x 52 | 0 | 999 | 0 | — | NONE |
| **Tooltip** | 28 x 28 | 0 | 0 | 0 | — | NONE |
| **Menu** | 50 x 73 | 0 | 0 | 5 | — | VERTICAL MIN CENTER |
| **Stars** | 25 x 24 | 0 | 0 | 0 | — | NONE |
| **Floaters** | 85 x 40 | 0 | 0 | 5 | — | HORIZONTAL MIN CENTER |
| **Horizontal scroll** | auto x 32 | 0 | 0 | 390 | — | HORIZONTAL CENTER CENTER |
| **Mobile key actions** | 126 x 103 | 0 | 0 | 0 | — | NONE |
| **Default header background** | auto x 86 | 0 | 0 | 0 | — | NONE |
| **Default header background|Breakpoint=Desktop** | auto x 86 | 0 | 0 | 0 | — | NONE |
| **Default header background|Breakpoint=Tablet** | auto x 74 | 0 | 0 | 0 | — | NONE |
| **Default header background|Breakpoint=Mobile** | auto x 62 | 0 | 0 | 0 | — | NONE |
| **Notification panel** | auto x auto | 0 | 0 | 0 | — | VERTICAL MIN MIN |
| **Notification list** | auto x auto | 0 | 0 | 0 | — | VERTICAL MIN MIN |
| **Notification categories** | 300 x auto | 5 10 | 0 | 0 | — | VERTICAL MIN MIN |
| **Pagination buttons** | auto x 32 | 0 | 0 | 30 | — | HORIZONTAL SPACE_BETWEEN CENTER |
| **Steps** | 110 x 48 | 0 | 0 | 5 | — | VERTICAL MIN CENTER |
| **Stepper** | 330 x 160 | 0 | 0 | 0 | — | VERTICAL CENTER CENTER |
| **Waffle** | 90 x 86 | 0 | 0 | 0 | — | NONE |
| **Full page/Header navigation/Yes/No** | 375 x 138 | 0 | 0 | 0 | — | VERTICAL MIN MIN |
| **Component 1** | 432 x 48 | 10 | 8 | 10 | 20px | HORIZONTAL CENTER MIN |
| **Header navigation** | auto x auto | 0 | 0 | 0 | — | VERTICAL MIN MIN |
| **Nav tabs** | auto x 40 | 0 20 | 0 | 10 | — | VERTICAL CENTER CENTER |
| **Secondary nav** | auto x 44 | 0 | 0 | 0 | 16px | HORIZONTAL MAX CENTER |
| **Tertiary nav** | auto x 55 | 0 20 | 0 | 40 | — | HORIZONTAL CENTER CENTER |
| **Search navigation** | 150 x 32 | 0 | 50 | 0 | — | NONE |
| **Full page** | auto x auto | 0 | 0 | 0 | — | NONE |
| **Notification tabs** | auto x 65 | 18.5 15 | 0 | 20 | — | HORIZONTAL CENTER MIN |

## Reading these numbers

- **Padding** is CSS order: `top right bottom left`, collapsed where symmetric.
  `10 10 10 20` on inputs means the asymmetric left inset is deliberate.
- **Radius 20 / 76 / 999** all mean *pill*. Figma stores a literal large radius;
  in CSS use `border-radius: 999px` so it stays a pill at any height.
- **`auto x N`** means the width hugs content and the height is fixed. Set the
  height explicitly — letting padding decide it produces a slightly-wrong control.
- **`mixed`** means the corners differ on that node; check the specific component
  before implementing.

## The five that matter most

If you only carry five numbers, carry these — they account for most of the
difference between a page that reads as People First and one that doesn't:

1. Buttons: pill, **32px** tall, **13px SemiBold**, leading icon, 10px gap
2. Filter chips: pill, **42px** tall, **16px**
3. Tags: **sentence case**, 4px radius, 28px tall, 13px Regular
4. Inputs: **42px** tall, **8px** radius, `padding: 10px 10px 10px 20px`
5. Table rows **58px**, headers **54px**, both at **13px**
