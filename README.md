# People First Design System

Design tokens and usage guidance extracted from the People First Figma library,
packaged so Claude Design (and any HTML/CSS output) generates on-brand UI.

## Layout

| Path | What it is |
|---|---|
| `tokens/design-tokens.json` | Source of truth. W3C Design Tokens (DTCG) format. |
| `dist/tokens.css` | Generated CSS custom properties, one scope per Figma mode. |
| `.claude/skills/people-first/SKILL.md` | Teaches Claude the system: token names, component recipes, rules. |
| `reference/index.html` | Visual proof sheet — every token and component rendered. |
| `scripts/` | Build: tokens JSON -> CSS. |

## Source

Figma: People First Design System (`aRWjBnTvdLiG50xtwodGwH`)

`tokens/design-tokens.json` is generated from Figma. Edit Figma, re-extract —
do not hand-edit the JSON, or the next extraction will silently overwrite you.

## Build

```
node scripts/build-css.mjs
```
