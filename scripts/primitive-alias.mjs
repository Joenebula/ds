// The one table saying which raw Figma primitive stands in for which semantic token.
//
// Figma binds a PRIMITIVE directly in 25 places — `Base colours/White` as a text colour,
// `Grey-slate` on Repeating group, `Base colours/Grey Dolphin` as the Toggle's border.
// A primitive has one value in both modes, so emitting it ships something that cannot do
// dark mode; emitting nothing at all ships a component with no colour. Where a SEMANTIC
// token exists that means the same thing and resolves to the same value, it is substituted
// and the binding is reported as a Figma source issue.
//
// This lives in its own file because TWO generators need it and they had drifted:
// `build-components-css.mjs` applied it to a component's own fill, stroke and text, while
// `build-templates.mjs` applied it to a child's fill and stroke but NOT to a child's text.
// So `Calendar picker`'s month header shipped `color: var(--pf-base-white)` over a
// background the same generator had correctly refused to paint — white on nothing, the
// same fault already written up as FIGMA-ISSUES.md section 9 for `Option`. One rule
// applied in three places and missed in the fourth is the shape of most of this project's
// bugs; one table, two readers, is the fix.
export const PRIMITIVE_ALIAS = {
  'Grey-slate': {
    'color': '--pf-text-always-grey-slate',
    'background': '--pf-base-grey-slate',
    'border-color': '--pf-base-grey-slate',
  },
  'Base colours/Grey Slate': {
    'color': '--pf-text-always-grey-slate',
  },
  'Base colours/White': {
    // Bound as text on Pagination buttons, Header navigation and Full page. The semantic
    // token that means exactly "white text, in both modes" is Text/Always White, and it
    // resolves to the same value.
    'color': '--pf-text-always-white',
    // Deliberately NOT mapped for background or border-color. The only semantic tokens
    // holding White in both modes are Tags/Fills/Info (a tag fill) and Icons/Icon - Always
    // white (an icon colour). Borrowing either for a toast background or a button border
    // would put the right hex behind the wrong meaning, and the next person to change the
    // tag palette would silently change the toast. Those stay flagged for design.
  },
  'Base colours/Grey Dolphin': {
    // Border/Secondary IS Grey Dolphin in both modes, is scoped STROKE_COLOR in Figma, and
    // means exactly what the Toggle's border means. A real equivalent, not a near one.
    'border-color': '--pf-border-secondary',
  },
};
