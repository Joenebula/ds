# Component geometry

Measured from the Figma components — sizes, padding, radii, gaps and type. These are
**not** derivable from the spacing/radius tokens: component geometry and the token
scale are separate systems in People First.

The most common way a People First build goes wrong is inferring shape from the token
scale. Buttons do not use the radius tokens at all (they are pills), tags are sentence
case, and table rows are far taller than a default table. Look values up here.

| Component | Size (w × h) | Padding | Radius | Gap | Type | Notes |
|---|---|---|---|---|---|---|
| **Button** | auto x 32 | 0 20 | 20 | 10 | 13px SemiBold | PILL. Leading icon on every variant. Icon-only variant is 32x32 circle. |
| **Button (icon only)** | 32 x 32 | 0 20 | 20 | 10 | — | perfect circle |
| **Links (primary)** | auto x 22 | 0 | 0 | 5 | 16px, ls -1% | underline on hover |
| **Links (secondary)** | auto x 18 | 0 | 0 | 5 | 13px |  |
| **Filter chip** | auto x 42 | 10 20 | 76 | 5 | 16px, ls -1% | PILL. Selected uses SemiBold, gap 10. |
| **Filter chip (mobile)** | auto x 34 | 8 15 | 76 | 5 | 13px | PILL |
| **Tags** | auto x 28 | 5 10 | 4 | 5 | 13px Regular | SENTENCE CASE, not uppercase |
| **Form field (input)** | auto x 42 | 10 10 10 20 | 8 | 10 | 16px | label above, 5px gap |
| **Primary search** | auto x 38 | 0 10 | 20 | 10 | 13px | PILL |
| **Option (dropdown row)** | auto x 26 | 2 10 2 20 | 4 | 5 | 16px | tick icon 14x14 |
| **Text area** | auto x 213 | — | 8 | 5 | 16px | inner frame r8 |
| **Message box** | auto x 138 | 15 | 8 | 10 | 16px |  |
| **Toggle** | 55 x 25 | 0 7 0 2 | 13 | 0 | 13px | PILL; knob inset |
| **Checkbox / radio box** | 20 x 20 | — | 4 | — | — | r4 even for radio in this system |
| **Checkbox/Radio item (row)** | auto x 22 | 0 | 0 | 10 | 16px |  |
| **Radio card / Radio tile** | 235 x 152 | 25 0 | 4 | 10 | 16px SemiBold |  |
| **Table header (AG)** | auto x 54 | 15 | 0 | 47 | 13px SemiBold |  |
| **Table cell (AG)** | auto x 58 | 10 15 | 0 | 10 | 13px | rows are TALL |
| **Table (AG) container** | — | 0 | 8 | 0 | 13px SemiBold |  |
| **Table card (AG)** | — | 20 | 8 | 20 | 16px SemiBold |  |
| **Multi-select checkbox** | 20 x 20 | 0 | 4 | 0 | — |  |
| **Table header icons** | 24 x 24 | 10 | 4 | 10 | — |  |
| **Selected action banner** | auto x 48 | 8 20 | 8 | — | 16px |  |
| **AG sort item** | auto x 52 | 16 20 | 0 | 20 | 13px |  |
| **AG Filter menus** | 208 x 252 | 16 | 4 | 20 | 12px |  |
| **Card** | auto | 20 | 8 | 20 | 20px title | shadow 0 0 4px |
| **Content cards** | auto | 20 | 8 | 20 | 16px |  |
| **Settings card** | auto | 20 | 8 | 10 | 13px SemiBold | shadow 0 1 3px |
| **Configuration tile** | auto x 260 | 40 20 | 8 | 10 | 24px | shadow 0 0 4px |
| **Draggable card** | auto x 50 | 10 15 | 8 | 20 | 16px |  |
| **Accordion** | auto x 84 | 20 | 8 | — | 20px |  |
| **Side panel** | 375 wide | 0 | mixed | 0 | 20px | shadow 0 0 4px |
| **Side panel header** | auto x 60 | 10 15 | 0 | 10 | 20px |  |
| **Sticky footer** | auto x 52 | 10 15 | 0 | 20 | 13px SemiBold |  |
| **Org chart node** | 293 x 48 | 0 | 8 | 0 | 16px | shadow 2 2 4px |
| **Layout container** | auto | 30 | 0 | 20 | 20px |  |
| **Title panel** | auto x 135 | 40 20 | 0 | 10 | 18px |  |
| **Empty section** | auto x 212 | 0 | 0 | 35 | 20px SemiBold |  |

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
