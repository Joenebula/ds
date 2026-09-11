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

## What happens after you fix any of this

Re-extract and rebuild, and the stylesheet, the component list and the example screens all
update together. The substitutions in §1c disappear on their own once Figma binds the
semantic token. Nothing here needs a code change on our side.
