---
phase: quick-260701-dok
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [planechaser/src/app/globals.css]
autonomous: true
requirements: [A11Y-CONTRAST]
must_haves:
  truths:
    - "Atlas (:root) border/input/input tokens use the new higher-contrast hex values"
    - "Eternities theme border/input/border-subtle tokens use the new higher-contrast hex values"
    - "Light theme border/input/border-subtle tokens use the new higher-contrast hex values"
    - "html.light[data-theme=eternities], .glass rgba borders, and all non-border tokens are untouched"
  artifacts:
    - path: "planechaser/src/app/globals.css"
      provides: "Theme token definitions with WCAG ~3.2:1 border/input contrast"
      contains: "--border: #6a5c80;"
  key_links:
    - from: "planechaser/src/app/globals.css :root"
      to: "border/input/border-subtle tokens"
      via: "CSS custom property definitions"
      pattern: "--border:\\s*#6a5c80"
---

<objective>
Replace the intermediate border/input/border-subtle hex values from quick task 260701-d85 (which undershot WCAG 3:1 at ~2.2:1) with pre-verified final values that land at ~3.2:1 contrast against each theme's own background.

Purpose: Meet the WCAG 3:1 non-text contrast target for form borders and inputs across all three theme blocks.
Output: Updated `planechaser/src/app/globals.css` with corrected token values.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@planechaser/src/app/globals.css

<occurrence_reference>
Confirmed by reading globals.css (do NOT assume — these counts were verified against the file, since 260701-d85 noted the plan's assumed counts differed from reality):

Each theme block defines these tokens as follows:
- `--border` — appears TWICE per block (once in custom PlaneChaser vars, once in shadcn semantic vars)
- `--input` — appears ONCE per block (shadcn semantic vars only; there is NO `--input` in the custom-vars section)
- `--border-subtle` — appears ONCE per block (custom PlaneChaser vars only)

Because `--border` and `--input` share the same hex within a block, the border/input hex string appears 3× per block (border×2 + input×1). The border-subtle hex appears 1× per block.

Exact current lines:
- Atlas (:root): `--border: #544766;` at lines 79 & 107; `--input: #544766;` at line 108; `--border-subtle: #3a3145;` at line 80.
- Eternities: `--border: #4a3f7a;` at lines 135 & 163; `--input: #4a3f7a;` at line 164; `--border-subtle: #2f2758;` at line 136.
- Light (html.light): `--border: #a99bc4;` at lines 191 & 219; `--input: #a99bc4;` at line 220; `--border-subtle: #cfc5df;` at line 192.

DO NOT touch `html.light[data-theme="eternities"]` (lines 225-244 — it has no `--border`/`--input` of its own and correctly inherits from html.light).
DO NOT touch the `.glass` / `.glass-strong` hardcoded rgba borders.
DO NOT touch any other CSS variable.
</occurrence_reference>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace border/input/border-subtle hex values in all three theme blocks</name>
  <files>planechaser/src/app/globals.css</files>
  <action>
Perform exact find-and-replace of the six token-value pairs below. Use the specific hex strings so each replacement is unambiguous.

Atlas (:root) — replace both `--border: #544766;`, the `--input: #544766;`, and `--border-subtle: #3a3145;`:
  - `#544766` -> `#6a5c80` (affects `--border` lines 79 & 107 and `--input` line 108 = 3 replacements)
  - `--border-subtle: #3a3145;` -> `--border-subtle: #4d4159;` (line 80 = 1 replacement)

Eternities (html[data-theme="eternities"]):
  - `#4a3f7a` -> `#675a99` (affects `--border` lines 135 & 163 and `--input` line 164 = 3 replacements)
  - `--border-subtle: #2f2758;` -> `--border-subtle: #453a70;` (line 136 = 1 replacement)

Light (html.light):
  - `#a99bc4` -> `#8f7fb0` (affects `--border` lines 191 & 219 and `--input` line 220 = 3 replacements)
  - `--border-subtle: #cfc5df;` -> `--border-subtle: #d6cbe6;` (line 192 = 1 replacement)

Use these EXACT hex values — do not recompute or adjust; they were pre-verified to land at ~3.2:1 WCAG contrast against each theme's `--bg`. Leave `html.light[data-theme="eternities"]`, the `.glass` rgba borders, and every other token unchanged.
  </action>
  <verify>
    <automated>cd planechaser && grep -c -- '#6a5c80' src/app/globals.css | grep -qx 3 && grep -c -- '--border-subtle: #4d4159;' src/app/globals.css | grep -qx 1 && grep -c -- '#675a99' src/app/globals.css | grep -qx 3 && grep -c -- '--border-subtle: #453a70;' src/app/globals.css | grep -qx 1 && grep -c -- '#8f7fb0' src/app/globals.css | grep -qx 3 && grep -c -- '--border-subtle: #d6cbe6;' src/app/globals.css | grep -qx 1 && ! grep -q -- '#544766\|#4a3f7a\|#a99bc4\|#3a3145\|#2f2758\|#cfc5df' src/app/globals.css && echo ALL_OK</automated>
  </verify>
  <done>New border/input hex appears exactly 3× per theme block; new border-subtle hex appears exactly 1× per block; none of the six old hex values remain anywhere in the file; verify command prints ALL_OK.</done>
</task>

</tasks>

<verification>
- All six old hex values (`#544766`, `#4a3f7a`, `#a99bc4`, `#3a3145`, `#2f2758`, `#cfc5df`) are fully absent from globals.css.
- Each new border/input hex (`#6a5c80`, `#675a99`, `#8f7fb0`) appears exactly 3 times.
- Each new border-subtle hex (`#4d4159`, `#453a70`, `#d6cbe6`) appears exactly 1 time.
- `html.light[data-theme="eternities"]` block and `.glass` rgba borders are unchanged.
</verification>

<success_criteria>
Border and input tokens across all three theme blocks use the pre-verified ~3.2:1 contrast hex values; the intermediate 260701-d85 values are gone; no unrelated tokens or rules were modified.
</success_criteria>

<output>
After completion, create `.planning/quick/260701-dok-bump-border-input-contrast-to-3-1-in-all/260701-dok-SUMMARY.md`
</output>
