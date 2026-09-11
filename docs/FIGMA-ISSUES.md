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

## What happens after you fix any of this

Re-extract and rebuild, and the stylesheet, the component list and the example screens all
update together. The substitutions in §1c disappear on their own once Figma binds the
semantic token. Nothing here needs a code change on our side.
