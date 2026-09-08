# Run log

Append-only. Newest at the bottom.

---

## Pre-flight — 2026-09-08

**Scope fence:** `/home/user/ds`
**Starting save point:** `fe002ce`, clean tree, already pushed.

**Skill scan (fresh, this run):**

| Skill | Source | Modified |
|---|---|---|
| `people-first` | project (`.claude/skills/`) | 2026-09-08 11:50 |
| `skill-creator` | user (synced) | read at task time |
| `figma-use` | Figma MCP resource | read at task time |
| `artifact-design` | bundled | read at task time |

Full `SKILL.md` files are read immediately before the task they govern, not cached from
this scan — a stale read is how work gets built against superseded rules.

**Queue written:** 5 actionable tasks, 1 blocked pending a decision on icon scope.

**Assumption logged:** the geometry check (task 1) will assert against
`tokens/_raw/component-geometry.tsv` as the source of truth, matching how the colour
check asserts against `component-variants.tsv`. Cheap to change if the file moves.

**Not started.** Waiting for approval to begin.
