# People First — issues to fix in the Figma file

For the design team. Everything here is a change to the Figma file itself; none of it can
be fixed in code without inventing a value, which this design system does not do.

Found by extracting all 159 components and checking every colour binding against the
`Colours Semantic` collection. Contrast figures are measured, not estimated.

---

## 1. Twenty components bind a raw colour instead of a semantic token

A **primitive** (`Base colours/White`, `Base colours/Default Pink`) is a fixed hex. A
**semantic token** (`Text/Primary`, `Background/Theme`) resolves to a different value in
light and dark mode. A component bound to a primitive cannot adapt, because there is
nothing to adapt to.

**25 bindings across 20 components.** Seventeen have a semantic token of identical value,
so the stylesheet substitutes one and the rendered colour is unchanged — those are tidy-up.
**Eight have no equivalent, and two of those fail WCAG AA in dark mode.**

### 1a. The two that fail accessibility — please fix these first

**`AI Assistant` and `Clickable AI element` — pink text that fails in dark mode**

Both bind `Base colours/Default Pink` (`#cd2359`) for text on a `Background/Primary`
surface. The surface adapts; the text does not.

| | text | on surface | contrast | AA (4.5:1) |
|---|---|---|---|---|
| Light | `#cd2359` | `#ffffff` | **5.28:1** | passes |
| Dark | `#cd2359` | `#2c313c` | **2.47:1** | **fails** |

**Fix:** bind `Text/Theme`. It is Default Pink in light — identical to today — and Blue
Turquoise `#5cc4ea` in dark, which measures **6.54:1**. Light mode does not change at all.

`AI button` `Style=Inverted, Hover=False` binds the same primitive and should change with it.

**`Config child menu` `Type=Selected` — a fixed surface under adapting text**

The fill is `Base colours/Blue Ocean` (`#0075be`, fixed). The text is
`Text/Inverted primary`, which **does** adapt — White in light, Grey Slate in dark. So the
two drift apart: the surface stays blue while the text turns dark.

| | text | on fill | contrast | AA |
|---|---|---|---|---|
| Light | `#ffffff` | `#0075be` | **4.9:1** | passes |
| Dark | `#3e3e3e` | `#0075be` | **2.18:1** | **fails** |

**Fix:** either bind the fill to a semantic background token that darkens with the theme,
or bind the text to `Text/Always White` so both halves stay fixed together. The first is
better; the second is a one-click stopgap.

### 1b. The rest — consistent, but frozen

These are readable in both modes because **both** halves of the pair are fixed, so nothing
drifts. They simply stay the same colour while everything around them changes.

| Component | Binding | Behaviour |
|---|---|---|
| `Toast message` | `Base colours/White` fill + `Base colours/Grey Slate` text | Stays a white card with dark text in dark mode. Internally 10.7:1, so legible — it just does not belong to the dark UI. |
| `Multiselect tag` | `Base colours/Blue Ocean` fill + `Base colours/White` text | 4.9:1 in both modes. Fixed, but consistent. |
| `Status` `Recognition` | `Base colours/Light Purple` | A status colour with no semantic equivalent. There is no purple in the semantic set other than chart colours. |
| `AI button` `Inverted` | `Base colours/White` border and text | Correct in context — an inverted button sits on a dark or brand surface. Still worth a semantic token so it follows if that surface ever changes. |

**Why we did not "fix" these in code.** The only semantic tokens holding White in both
modes are `Tags/Fills/Info` (a tag fill) and `Icons/Icon - Always white` (an icon colour).
Using either for a toast background would put the right hex behind the wrong meaning, and
the next person to change the tag palette would silently change the toast. The same applies
to `Charts/Chart 1` for Blue Ocean and `Charts/Chart 6` for Light Purple. **These need new
semantic tokens, or a decision that the colour really is meant to be fixed.**

### 1c. Already handled — no action needed

Seventeen bindings had an exact semantic equivalent and are substituted automatically:
`Base colours/White` → `Text/Always White` for text, `Base colours/Grey Slate` →
`Text/Always grey slate`, `Base colours/Grey Dolphin` → `Border/Secondary`. Rendered colour
is identical. Listed here only so nobody re-reports them. Binding the semantic token in
Figma would let us delete the substitution.

---

## 2. `Component 1` has never been named

A real component on **Cards and panels**, used five times. It is the row inside
`Editable list card`: a label with a trailing add or remove action.

- The component is called **`Component 1`**
- Its variant property is called **`Property 1`**
- Its two values are called **`Frame 6270951`** and **`Frame 6270952`**

Every one of those is a Figma default nobody renamed, so the class a developer has to write
is `.pf-component-1[data-property-1="Frame 6270951"]` — accurate, and unusable.

**Fix:** name the component and both values for what they do. From the design: `Frame 6270951`
is the **add** state (no fill, green Plus circle icon) and `Frame 6270952` is the **added**
state (`Background/Tertiary` fill, grey Remove icon). We deliberately did not invent names —
renaming is yours, and we will re-extract the moment it is done.

---

## 3. `Tags` `Type=Theme` binds a border token for its text

Its six sibling variants all bind a `Tags/Content/*` token for text. This one binds
`Tags/Borders/Info` instead. It looks like a mis-binding rather than a decision, and the
stylesheet currently reproduces it faithfully.

**Fix:** bind `Tags/Content/Info`, unless the difference is deliberate — in which case
please say so and we will note it.

---

## 4. Seven navigation components were renamed, and one restructured

Not a fault — just a heads-up that our extract had to catch up, and a request.

| Our extract held | Figma now calls it |
|---|---|
| `Header top navigation` | `Header navigation` |
| `[S] Navigation/main tabs` | `Nav tabs` |
| `[S] Main nav context` | `Secondary nav` |
| `Secondary nav` | `Tertiary nav` |
| `Search home button` | `Search navigation` |
| `Full page navigation` | `Full page` |
| `Side navigation tab` | `Notification tabs` (and its variants changed from `Selected` to `State × Selected`) |

The same happened to a token: **`Border/Default` is now `Border/Default full`**, and 19
components bind it.

**Request:** when a component or token is renamed, a note to us means we re-extract instead
of discovering it later. We found these by comparing Figma node IDs, which is reliable but
after the fact.

---

## 5. Two components in our extract no longer exist as components

- **`Side navigation panel`** — the node is gone from Figma. We have removed it.
- **`Counter`** — the node is a variant child of the `Header` set, named
  `System=People First`. It was never a component; an earlier extract recorded it as one.
  Removed.

Listed so the count moving from 149 to 147 has an explanation.

---

## 6. `Clock in` is unreadable in dark mode — 1.05:1

`Clock in` binds **`Text/Inverted primary`** for its label. That token resolves to White in
light mode and **Grey Slate `#3e3e3e`** in dark mode.

The component sits on the header band, which in dark mode is the charcoal artwork. Measured
against the band's own range:

| Mode | Label colour | Band | Contrast |
|---|---|---|---|
| Light | White | crimson `#c8102e` | **5.88:1** — passes AA |
| Dark | Grey Slate `#3e3e3e` | `#2c313c` | **1.22:1** |
| Dark | Grey Slate `#3e3e3e` | `#343a47` | **1.07:1** |
| Dark | Grey Slate `#3e3e3e` | `#3a4150` | **1.05:1** |

1.05:1 is not "low contrast", it is invisible. The button renders as an empty outline.

**Why it happens:** "inverted" means *the opposite of the page*, and it does that correctly.
But this label does not sit on the page — it sits on artwork that is dark in BOTH modes. A
token that flips with the theme is the wrong kind of token for a surface that does not flip.

**Suggested fix:** bind **`Text/Always white`**, which is White in both modes and gives
**13.03:1** on `#2c313c` and **11.40:1** on `#343a47`, while leaving light mode unchanged.
The same question applies to anything else sitting on the header band.

This is the same shape of fault as the two in §3: a token that adapts, paired with a surface
that does not.

---

## 7. Component type and the text-style ramp

The library now COMPOSES the Figma text styles rather than transcribing their values, so a
component and the type ramp can no longer disagree. Reading the `textStyleId` on every
component label to do that turned up three things worth a designer's attention.

**181 of 208 labels resolve to exactly one style. 155 are bound in Figma; 26 are not.**

### 7a. Twenty-six labels are not bound to the style they are already using

These carry local type that matches a text style *exactly* — same size, weight, tracking
and case — but no style is applied. `Button` is the clearest: every one of its 18 variants
is 13px SemiBold, which is precisely `Desktop text/Label text (semi bold, 600)`. Binding
the style changes nothing visually and makes the intent explicit.

Thirteen of the twenty-six DO bind a style, but one living in another library file, so this
file cannot name it — `Tags`, `Search navigation`, `Calendar picker`, `Time picker`, the
desktop `Header`, `Notification tabs`, `Notification list`, `Notification categories`,
`Footer`, `Repeating group`, `Secondary nav` and `Tertiary nav` on mobile. They behave
correctly; they are listed so nobody is surprised that the local style list does not
account for them.

### 7b. Four labels cannot be told apart from their values alone

More than one style has the same size, weight, tracking and case, so nothing in the file
says which one is meant. These keep their measured values rather than being assigned a
style by guesswork:

| Component | Type | Could be |
|---|---|---|
| `Header` (desktop), `Top bar app context` (desktop) | 24px Regular | `Large heading` or `Large heading (light)` |
| `Graph legend`, `Data variance alternative` | 20px Regular | `Sub heading`, `Mobile/Large heading`, or `Mobile/Large heading (light)` |

Note that `Large heading` and `Large heading (light)` are recorded in Figma with the SAME
weight — which is the underlying problem. A "(light)" style that is not lighter cannot be
distinguished from the one it is meant to contrast with.

### 7c. Twenty-two labels use type the ramp does not contain

Not a naming problem — these sizes and weights do not exist as styles at all. The desktop
ramp is 13 / 16 / 20 / 24 / 36, and the mobile ramp is 18 / 20 / 30 / 50.

| Type | Components |
|---|---|
| **11px** | `Navigation item` (mobile and tablet), `Mobile bottom navigation`, `Header` counter (11px SemiBold) |
| **12px** | `AG field`, `AG Filter menus`, `AI message bubble`, `Adaptive card` |
| **15px** | `Mobile key actions` |
| **60px** | `Donut pie chart`, `Donut chart with ledger` — one of them in a Medium weight the system does not ship |
| **24px SemiBold** | `AI Assistant`, `AI Gradient component`, `Filter tab single`, `Filter tabs` — 24px exists, but only as Regular |
| **16px UPPER** | `Config side menu`, `Config menu items`, `Config parent menu` |
| **Right size, wrong tracking** | `Option` and `Browser drop down` are 16px at **-2%** where `Body text` is -1%; `Drop down button` is 13px at **-1%** where `Label text` is 0%; `Status` likewise |

The last row is the one most likely to be accidental: a component that is one notch of
letter-spacing away from a style it otherwise matches.

**Nothing here is broken on our side.** Each keeps the values Figma actually has, and
`npm run verify` fails if the count grows, so a new one gets noticed rather than absorbed.

---

## 8. Fifty-five components are used by the file but sit on no page

Every extractor here finds components with Figma's page walk — `findAllWithCriteria()` on
each page. A component can be **used by the file and still have no page**: the API resolves
it by id, reports `parent: null` and `page: null`, and no walk will ever see it.

We went looking because of one component, `Tabs navigation`, and found **55**. They were
found by walking every instance on every page and following it to its main component.

This already cost the design system once. **`Default header background` — the header swoosh
— is one of them.** It had a second reason to go missing (it binds no colour variable), so
the page problem stayed hidden behind the colour problem for the whole life of the project.

### What they are

| | |
|---|---|
| **22** | a single pinned variant (`Button/Action/True/False/Normal`), not a set in its own right |
| **5** | an older copy of a component we DO capture — `Button` (28 variants), `Information box`, `Text area`, `Menu`, `People` |
| **28** | not captured at all |

Of the 28: **eight are icon components** (`Context`, `Close x`, `Tick in circle`,
`General ledger notebook`, `Dropdown_chevron`, `List`, plus orphaned second copies of
`Up arrow` and `Tick`). The 293 icons we ship come from the Icons page; these are not on
it. **Five are `[S]` structure frames.** The rest are children of components we already
capture — the `Text template tool bar` and its five buttons, `Control button`,
`Header icon`, `Search result`, `Side panel footer`.

### `Tabs navigation` specifically

An 8-variant set (Active × Mobile × Darkmode) used by `Menu-search-settings`. Its instances
measure 52×36 active with an underline and 59×34 inactive — which is exactly what the live
`Tab` component is. And it binds **`Base colours/Default Pink`**, a raw primitive, so it
predates the semantic layer and cannot adapt to dark mode.

**It is superseded by `Tab`.** We have deliberately not captured it. The instances of it
still sitting in `Menu-search-settings` will not go dark-mode-correct until they are
swapped.

### What we would ask

Nothing here is broken on our side — every one is now recorded with a reason, and
`npm run verify` fails if the count grows or if a new one appears without one. But two
questions are worth a designer's eye:

1. **Are the five superseded copies still wanted?** If `Button` (28 variants, off-page) is
   dead, deleting it removes the ambiguity permanently.
2. **Should the eight orphaned icons be on the Icons page?** Two of them duplicate icons
   that are already there, which means two versions of the same glyph exist.

---

## 9. `Option` selected is white text on nothing

`Option` binds two colours and only two:

| Variant | Fill | Stroke | Text |
|---|---|---|---|
| `Selected=No` | — | — | `Text/Primary` |
| `Selected=Yes` | — | — | **`Text/Inverted primary`** |

"Inverted" means *the opposite of the page*, so on a light page it is white. And the
selected option binds **no background at all** — so `.pf-option[data-selected="Yes"]` is
white text on whatever is behind it. In `Browser drop down`, which is `Background/Secondary`,
that is white on near-white.

The highlight does exist in Figma: the instance inside `Browser drop down` carries a fill.
But it is a **raw unbound paint** on the instance, not a variable on the component, so
there is nothing for the extract to bind and nothing that changes between modes.

This is the same shape as §6 (Clock in): a colour that flips with the theme, paired with a
surface that does not — except here the surface is missing entirely rather than merely
fixed. It only became visible when the component templates were generated and the selected
option rendered as a blank line.

**Suggested fix:** bind a background variable on `Option` `Selected=Yes` — the same token
the instance is painted with — so the component carries its own highlight.

---

## 10. Four components, two names

The Forms page has two component sets called **`Field`**, and the People page has two
called **`People`**. Nothing in the Figma file distinguishes them but the node id.

| Name | What it is |
|---|---|
| `Field` | the 300x42 input box, variants `Right aligned` x `Filled` |
| `Field` | a 95x42 label-above-value pair, variant `Property 1` |
| `People` | the avatar, variants `Who?` — one per person |
| `People` | a 166x91 table entry, variants `Item` x `Type` x `Mobile` |

Every extract here keys a component by name, so the second of each pair landed on the
first's rows and the result described neither. The pipeline now keeps them apart as
`Field (second component)` and `People (second component)` — accurate, and unusable as a
class name, so only the first of each pair ships as a class at all.

This is the third name collision in the file. `Header` is the other: the 1830x86 app header
and a 20x20 counter badge, which has now cost three separate extracts a fix each.

**Suggested fix:** give each of the four a name that says what it is. The second `Field`
looks like a read-only detail row and the second `People` like a table entry; whatever they
are called, two components with one name cannot both be addressed.

---

## 11. One label's colour recorded as the whole component's

Figma records one text colour per component. For a component that is a single box that is
right. For a composite one it is whichever label the component-level binding names, and
applying it paints every descendant.

Three components were shipping a class that made their own contents invisible:

| Component | Recorded text colour | What its labels actually bind |
|---|---|---|
| `Calendar picker` | `Base colours/White` | white, `Text/Secondary`, `Text/Disabled`, `Text/Primary` |
| `Time picker` | `Base colours/White` | white, `Text/Primary` |
| `Repeating group` | `Grey-slate` | grey-slate, `Text/Primary`, `Text/Link`, `Text/Negative` |

In each case the white is the month/hour header's label, and that header's own background
is a raw primitive (`Base colours/Blue Charade`) — so the surface cannot be carried into a
system that has to work in both modes, and the white text was left over it. `Calendar
picker` rendered white on white.

The pipeline now drops a component-level text colour when the child tree shows more than
one label colour, and the template gives each label its own. Note that `Top bar app
context` looks identical in the colour extract — white text, no background — and is
correct, because it sits on the header band. Only the child tree tells the two apart.

**Suggested fix:** bind `Base colours/Blue Charade` to a semantic token so the picker
headers can keep their surface, and the white text with it. This is the same shape as §9.

---

## 12. Eighteen shadows the design system has no token for

`Elevation` in the design system is two tokens and nothing else:

| Token | Value |
|---|---|
| `--pf-shadow-drop-shadow` | `0 0 4px #c1c1c1` |
| `--pf-shadow-modal-header-shadow` | `0 4px 4px rgba(0,0,0,.1)` |

Figma casts a drop shadow on **47 component variants**. Twenty-nine match one of those two
exactly and are emitted as `box-shadow: var(--pf-shadow-*)`. The other **eighteen do not
match either token**, and the pipeline deliberately emits nothing for them rather than
writing Figma's rgba into the stylesheet — that would put a raw colour in generated CSS and
freeze it across both modes.

| Component | Shadow in Figma |
|---|---|
| `Toast message` (4 variants) | `0 0 25px rgba(0,0,0,.2)` |
| `Side navigation` (3) | `0 0 4px rgba(0,0,0,.2)` |
| `Org chart` (3) | `2 2 4px rgba(0,0,0,.3)` |
| `Configuration` (2), `Configuration tile` (2) | `0 0 4px rgba(0,0,0,.2)` |
| `Notification categories`, `Notification list` | `2 0 4px rgba(0,0,0,.1)` |
| `Browser drop down` | `0 2 4px rgba(0,0,0,.3)` |
| `Settings card` | `0 1 3px rgba(0,0,0,.25)` |

Four shapes account for all eighteen: a soft black at .2, .25 and .3, and two directional
ones. `0 0 4px rgba(0,0,0,.2)` alone covers seven variants across three components and is
plainly meant to be the same shadow each time.

**Suggested fix:** publish these as effect styles bound to variables, the way the two
existing ones are, and the pipeline picks them up on the next extract with no code change.
Naming the `0 0 4px rgba(0,0,0,.2)` one would clear seven of the eighteen on its own.

**Second, separate problem: neither existing shadow token changes between modes.** Both are
defined once in `:root`. `--pf-shadow-drop-shadow` is `#c1c1c1` — a light grey glow, which
is correct on a white page and wrong on a dark one, where a shadow should be darker than its
surface rather than lighter. The file already has a mode-aware colour for exactly this:
`Border/Border - Drop shadow`, which is Grey Dolphin in light and Grey Slate in dark. The
shadow tokens do not use it. The pipeline emits the tokens as published rather than
recomposing them, because composing a shadow the design system has not stated would be
inventing an elevation ramp — which the skill explicitly forbids.

---

## 13. Three components have a mobile variant for only some values of an axis

A component's breakpoint variants are what let the stylesheet make it responsive. Where every
variant at a width agrees on a value, that value is carried to the class and the component
follows the viewport on its own. Three components cannot be carried, because Figma draws their
mobile or tablet variant for only **part** of another axis:

| Component | Axis | Drawn at desktop | Drawn at mobile / tablet | What is missing |
|---|---|---|---|---|
| `Navigation item` | `System` | People First, Configr | People First only | A **Configr** nav item at Device=Mobile (86x76) and Device=Tablet (86x56) |
| `Graph legend` | `Key type` | Line graph only | Donut graph only | A **Line graph** legend at Mobile=True, and a **Donut graph** one at Mobile=False |
| `Spotlight Card` | `Horizontal` | True (585x218), False | True only (375x168) | A **vertical** Spotlight Card at Mobile=True |

`Graph legend` is the clearest: it has exactly two variants and they differ on **both** axes at
once, so neither breakpoint covers both key types and neither key type covers both breakpoints.

**Why the pipeline will not guess.** Applying the donut legend's 27px to a bare `pf-graph-legend`
would state a mobile height for the line legend that Figma has never drawn, and it would look
right — a component that is confidently the wrong size is worse than one that does not respond,
because nothing downstream can tell. `check-responsive.mjs` reports each of them by name against
Figma's own number instead.

**Fix:** draw the missing variant. Each is one variant in an existing component set, and the
pipeline picks it up on the next extract with no code change — the count in
`check-responsive.mjs` rises on its own.

---

## 14. Button is the same weight in every state

**Raised by the design owner, three times.** The `Button` label does not change weight between
Default, Hover and Disabled, and they want it to.

**It is not a pipeline fault.** Read straight out of Figma — not out of this repo's extract —
`Type=Action, State=Hover, Label=Yes` (node `10732:112867`) is `Open Sans SemiBold, 13px`, the
same as `Type=Action, State=Default, Label=Yes` (node `10730:115188`). All 24 labelled variants
of the component set (`1656:44983`) measure `13px SemiBold`. The stylesheet renders exactly that,
and `check-variant-type.mjs` asserts it on every variant.

**Figma's own written rule for the hover state is about the background and says nothing about
type.** The `Button rules` section (`8472:86313`) reads:

> Based on the above, as a general rule of thumb we will increase contrast ratio on hovers that
> have a darker background, and minimally decrease the ones that have a lighter background.

with two worked examples — *"Hover with dark background and light text → 20% darker background"*
and *"Hover with light background and dark text → 10% lighter background"*.

**What would clear it.** The weight has to change in the Figma component, not here. Set the label
of each `State=Hover` variant to a heavier text style — the ramp already has the pair, e.g.
`Desktop text/Label text` and `Desktop text/Label text (semi bold, 600)` — and re-extract. The
pipeline carries a per-state weight today: `Filter chip`, `Nav tabs`, `Tab`, `Steps` and
`Filter tab single` all change weight between states, and all of them render it.

**Worth knowing before deciding**: Open Sans SemiBold is wider than Regular, so a weight change on
hover moves the button's width, and `Button` hugs its label. Every button in a row would shift
under the pointer. That is probably why the rules page chose a background change.

### 14a. Two things the rules page says that the component does not

Found while reading the same section, and recorded rather than acted on — the component is the
source this pipeline extracts, so where the two disagree the annotation is the thing to fix.

- The rules page annotates the button **`Min-width: 100px`** (`4994:63623`). The component
  measures `min-w-[32px]`. This repo's geometry extract records size, not minimum size, so the
  stylesheet states neither — `.pf-button` has `height: 32px` and no `min-width` at all. A
  two-character label renders narrower than Figma would draw it.
- The rules page annotates **`Font-style: uppercase`** (`4994:63624`). The component records
  `textCase = ORIGINAL`, and the stylesheet is therefore mixed case. Nothing in the library is
  uppercase.

## 15. Three status colours miss AA on the recessed surface

`Background/Tertiary` is what `Metric card` and `Title panel` paint, and three text tokens
land on it below 4.5:1 in **light mode**:

| Pairing | Light | Where it happens |
|---|---|---|
| `Text/Link` on `Background/Tertiary` | **4.37:1** | `Metric card`'s own generated template — the "More details" child |
| `Text/Positive` on `Background/Tertiary` | **4.48:1** | `Data variance`, which sits inside `Metric card` |
| `Text/Warning` on `Background/Tertiary` | **4.22:1** | any warning text on a metric tile or title panel |

Dark mode is fine on all three (7.18, 4.87, 5.32).

**This is the library failing AA, not a page.** `dist/templates/pf-metric-card.html` ships
`color: var(--pf-text-link)` on a card the class paints `--pf-bg-tertiary`, so pasting the
template as generated puts a 4.37:1 label on the page — `pf-audit` then fails the screen for
something the page did not write. `prototypes/recruitment-pipeline` leaves that child out for
exactly this reason, and states so where it does it.

`Text/Positive` at 4.48 is the same near-miss §11 describes in dark mode, one surface over: at
20px Regular it fails, at 20px SemiBold it is WCAG large text and passes at 3:1, which is what
that prototype's `Data variance` does.

**Nothing could see any of this until now.** `check-contrast.mjs` paired every status token
with `Background/Primary` and nothing else, and paired `Background/Tertiary` with
`Text/Primary` alone — so "27 of 28 pass AA" was true of a set that left out the surface these
components actually sit on. The five tertiary pairings are in the table now (33 pairs), which
is what turned three invisible failures into three listed ones. A pairing the library creates
is a pairing the check has to test.

**What would clear it:** darken the three tokens for light mode, or give `Background/Tertiary`
a lighter value than `#f2f2f2`. Either is a Figma decision — the pipeline will not substitute
a colour, for the reason §1c gives.

## What happens after you fix any of this

Re-extract and rebuild, and the stylesheet, the component list and the example screens all
update together. The substitutions in §1c disappear on their own once Figma binds the
semantic token. Nothing here needs a code change on our side.
