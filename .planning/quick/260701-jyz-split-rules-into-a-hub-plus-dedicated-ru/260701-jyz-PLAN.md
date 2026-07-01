---
phase: quick-260701-jyz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - planechaser/src/lib/rules/content.ts
  - planechaser/src/app/rules/page.tsx
  - planechaser/src/app/rules/layout.tsx
  - planechaser/src/app/rules/planechase/page.tsx
  - planechaser/src/app/rules/planechase/layout.tsx
  - planechaser/src/app/rules/archenemy/page.tsx
  - planechaser/src/app/rules/archenemy/layout.tsx
autonomous: true
requirements: [CP-03, CP-04]

must_haves:
  truths:
    - "Visiting /rules shows a hub with two nav cards linking to /rules/planechase and /rules/archenemy, plus the Conquest System and Pods & Playgroups sections"
    - "Visiting /rules/planechase renders an accordion with Planechase Basics, The Planar Die, Phenomena, Spatial Merging, Deck Building Rules, and an Individual Deck 'Coming Soon' callout"
    - "Visiting /rules/archenemy renders an accordion with the expanded Archenemy ruleset and a Supervillain Rumble Variant section"
    - "The Conquest System copy names real achievements (First Conquest, Conqueror, Planar Dominion — conquer all 185), not the removed 'First Blood' / 'conquer 10+' text"
    - "Both new pages have working titles/OG metadata that come from a server layout.tsx sibling, not from the 'use client' page"
  artifacts:
    - path: "planechaser/src/lib/rules/content.ts"
      provides: "PLANECHASE_SECTIONS and ARCHENEMY_SECTIONS exports plus a hub sections subset; fixed Conquest achievement copy"
      contains: "PLANECHASE_SECTIONS"
    - path: "planechaser/src/app/rules/planechase/page.tsx"
      provides: "Client accordion for Planechase rules"
      contains: "'use client'"
    - path: "planechaser/src/app/rules/planechase/layout.tsx"
      provides: "Server metadata for Planechase Rules page"
      contains: "export const metadata"
    - path: "planechaser/src/app/rules/archenemy/page.tsx"
      provides: "Client accordion for Archenemy rules"
      contains: "'use client'"
    - path: "planechaser/src/app/rules/archenemy/layout.tsx"
      provides: "Server metadata for Archenemy Rules page"
      contains: "export const metadata"
    - path: "planechaser/src/app/rules/page.tsx"
      provides: "Hub page with two nav cards + app-specific sections"
      contains: "/rules/planechase"
  key_links:
    - from: "planechaser/src/app/rules/page.tsx"
      to: "/rules/planechase and /rules/archenemy"
      via: "next/link Link href"
      pattern: "href=\"/rules/(planechase|archenemy)\""
    - from: "planechaser/src/app/rules/planechase/page.tsx"
      to: "PLANECHASE_SECTIONS"
      via: "import from @/lib/rules/content"
      pattern: "PLANECHASE_SECTIONS"
    - from: "planechaser/src/app/rules/archenemy/page.tsx"
      to: "ARCHENEMY_SECTIONS"
      via: "import from @/lib/rules/content"
      pattern: "ARCHENEMY_SECTIONS"
---

<objective>
Split the single `/rules` accordion page into a hub (`/rules`) plus two dedicated pages (`/rules/planechase`, `/rules/archenemy`), satisfying design-spec CP-03 and CP-04. Restructure the rules content data into per-page section exports, publish the verified official rules text from RESEARCH.md as new sections (Deck Building Rules on planechase; expanded Archenemy ruleset + Supervillain Rumble on archenemy), and fix the Conquest System achievement-name bug.

Purpose: The rules content currently lives on one long accordion. CP-03/CP-04 call for dedicated, discoverable, SEO-addressable format pages. The verified rules text is ready to publish as-is.
Output: Restructured `content.ts`, a hub `page.tsx`, and two new page+layout pairs under `/rules/planechase` and `/rules/archenemy`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260701-jyz-split-rules-into-a-hub-plus-dedicated-ru/260701-jyz-RESEARCH.md

IMPORTANT — Next.js in this repo: read `planechaser/AGENTS.md`. This is a modified Next.js; consult `planechaser/node_modules/next/dist/docs/` before writing routing/metadata code if anything is unfamiliar. The existing `layout.tsx` / `'use client' page.tsx` split (see below) is the confirmed working pattern — mirror it exactly.

<interfaces>
<!-- Data shape the pages consume. Extend this interface; do not change it. -->
From planechaser/src/lib/rules/content.ts:
```typescript
export interface RulesStep { text: string }
export interface RulesSection {
  title: string
  icon: string
  intro: string
  steps: RulesStep[]
}
export const RULES_SECTIONS: RulesSection[]  // currently 8 sections — will be reorganized
```

Metadata pattern (server layout, mirror exactly) — from planechaser/src/app/faq/layout.tsx:
```typescript
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'FAQ',
  description: '...',
  openGraph: { title: 'FAQ | PlaneChaser', description: '...' },
}
export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

Accordion machinery lives in planechaser/src/app/rules/page.tsx (client): sticky back-header via `router.back()`, ambient bg blur, intro card, `useState<Set<string>>` open-tracking, `AnimatePresence` height animation, numbered `<ol>` steps, `<Footer />`, container `max-w-[520px] mx-auto pb-nav`. Copy this machinery verbatim into each dedicated page. CSS-var tokens to reuse: `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-accent`, `--color-accent-deep`, plus utility classes `title-gradient`, `pb-nav`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restructure content.ts into per-page section exports + publish verified rules + fix achievement bug</name>
  <files>planechaser/src/lib/rules/content.ts</files>
  <action>
Keep the `RulesStep` and `RulesSection` interfaces unchanged. Replace the single `RULES_SECTIONS` export with three named exports (you MAY keep `RULES_SECTIONS` as a deprecated alias or remove it — remove it, since the only consumer is being rewritten in Task 3):

1. `PLANECHASE_SECTIONS: RulesSection[]` (CP-03) — in order:
   - Planechase Basics (🌍), The Planar Die (🎲), Phenomena (✨), Spatial Merging (Two Planes) (🔀) — copied verbatim from the current RULES_SECTIONS entries.
   - NEW section "Deck Building Rules" (📚). Use the verified Planechase deck rules from RESEARCH.md "VERIFIED RULES TEXT" as steps: (a) Shared planar deck must contain at least 40 cards OR at least 10 × the number of players, whichever is SMALLER (2 players → 20; 4 players → 40). (b) The shared deck cannot contain more phenomenon cards than 2 × the number of players. (c) No two plane or phenomenon cards in a planar deck may share a name. (d) Keep the existing plane-deck app bullets from the current "Building Decks" section that apply to Planechase: choosing which planes appear (use all 86+ or a curated set), decks saved to your account and selectable at setup, the "Random" setup option, preset decks, and the chaos-effect top-of-deck rearrange bullet.
   - NEW section "Individual Deck Planechase — Coming Soon" (🚧 or similar). Single step / intro noting per-player plane decks are a planned future variant not yet available in PlaneChaser (shared-deck play is what the app supports today). This is a callout, not full rules.

2. `ARCHENEMY_SECTIONS: RulesSection[]` (CP-04) — in order:
   - "Archenemy Mode" (⚔️) EXPANDED. Start from the current app-flavored Archenemy Mode intro (conquest threshold triggers Archenemy; team steal-a-plane reward on defeat) but expand the steps with the verified full ruleset from RESEARCH.md: 1 Archenemy vs a team of the other players (3+ total); team members use standard 60+ decks at 20 life each (separate life totals); the Archenemy uses a standard 60+ deck PLUS a scheme deck of 20+ oversized scheme cards (max 2 copies of any one scheme); the Archenemy starts at 40 life, always goes first, and still draws on the first draw step; at the start of the Archenemy's first main phase each turn they reveal the top scheme and set it in motion; one-shot schemes trigger immediately then go to the bottom of the scheme deck; ongoing schemes stay face-up and active until an ability says "abandon" them, then go to the bottom; the team takes a simultaneous turn (like Two-Headed Giant) with shared phases; the Archenemy declares attackers choosing targets, the team declares blockers together and may block for allies; a team member at 0 life is removed, play continues until the Archenemy loses or all team members have lost. Retain the PlaneChaser conquest-integration bullets (threshold, steal-a-plane reward, meta-game continues).
   - NEW section "Supervillain Rumble Variant" (🦹 or similar). Use the verified variant text: 3+ players, free-for-all, every player is an archenemy with their own scheme deck; each player starts at 40 life; the starting player is determined randomly; at the start of each player's first main phase, that player sets a scheme in motion from their own deck.

3. `HUB_SECTIONS: RulesSection[]` (or reuse individual exports) — the app-specific sections that stay on the hub:
   - "Conquest System" (👑) with the achievement bug FIXED. Replace the final step text `Earn achievements like "First Blood" (first conquest) and "Planar Dominion" (conquer 10+ planes).` with the corrected copy: `Earn conquest achievements like First Conquest (your first plane), Conqueror (5 planes), and Planar Dominion (conquer all 185).` Keep the other Conquest steps unchanged.
   - "Pods & Playgroups" (👥) — copied verbatim.

Do NOT invent new rule content beyond what RESEARCH.md verifies. Do NOT reduce any verified rule to a "simplified" version.
  </action>
  <verify>
    <automated>cd planechaser && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v '^#' | grep -c "content.ts" | grep -q "^0$" && echo TYPECHECK_OK</automated>
    <automated>cd planechaser && grep -c "PLANECHASE_SECTIONS\|ARCHENEMY_SECTIONS" src/lib/rules/content.ts</automated>
  </verify>
  <done>content.ts exports PLANECHASE_SECTIONS, ARCHENEMY_SECTIONS, and the hub sections; the "First Blood"/"conquer 10+" strings are gone; verified deck rules, expanded Archenemy ruleset, and Supervillain Rumble are present as sections; typechecks clean.</done>
</task>

<task type="auto">
  <name>Task 2: Create /rules/planechase and /rules/archenemy pages + metadata layouts</name>
  <files>planechaser/src/app/rules/planechase/page.tsx, planechaser/src/app/rules/planechase/layout.tsx, planechaser/src/app/rules/archenemy/page.tsx, planechaser/src/app/rules/archenemy/layout.tsx</files>
  <action>
Create two new route folders, each with a `page.tsx` (client accordion) and a `layout.tsx` (server metadata). Mirror the existing accordion machinery from `src/app/rules/page.tsx` verbatim — same sticky header, ambient bg, intro card, `useState<Set<string>>` open-tracking, `AnimatePresence` accordion, numbered `<ol>`, `<Footer />`, container classes. Do NOT extract a shared component (mirroring is acceptable per the constraints).

`src/app/rules/planechase/page.tsx`:
- `'use client'`. Import `PLANECHASE_SECTIONS` from `@/lib/rules/content` and map over it (replace `RULES_SECTIONS`).
- Header title "Planechase Rules"; subtitle e.g. "Planar deck, the die, phenomena & merging".
- Default the first accordion section open (e.g. `new Set(['Planechase Basics'])`).
- Intro card copy tailored to Planechase (planar deck + die + phenomena on a shared device).

`src/app/rules/archenemy/page.tsx`:
- `'use client'`. Import `ARCHENEMY_SECTIONS` and map over it.
- Header title "Archenemy Rules"; subtitle e.g. "Schemes, teams & Supervillain Rumble".
- Default first section open (e.g. `new Set(['Archenemy Mode'])`).
- Intro card copy tailored to Archenemy.

`src/app/rules/planechase/layout.tsx` and `src/app/rules/archenemy/layout.tsx`:
- Mirror the shape of `src/app/faq/layout.tsx` / `src/app/rules/layout.tsx` EXACTLY (server component, `export const metadata: Metadata`, returns `children`). NEVER put metadata in the client page — confirmed anti-pattern.
- Planechase metadata: title `'Planechase Rules'`, description covering planar deck construction, the planar die, phenomena, and spatial merging; openGraph title `'Planechase Rules | PlaneChaser'`.
- Archenemy metadata: title `'Archenemy Rules'`, description covering the scheme deck, team play, and the Supervillain Rumble variant; openGraph title `'Archenemy Rules | PlaneChaser'`.

If any Next.js routing/metadata detail is unfamiliar, consult `planechaser/node_modules/next/dist/docs/01-app/` before writing.
  </action>
  <verify>
    <automated>cd planechaser && test -f src/app/rules/planechase/page.tsx && test -f src/app/rules/planechase/layout.tsx && test -f src/app/rules/archenemy/page.tsx && test -f src/app/rules/archenemy/layout.tsx && echo FILES_OK</automated>
    <automated>cd planechaser && grep -l "export const metadata" src/app/rules/planechase/layout.tsx src/app/rules/archenemy/layout.tsx && grep -L "export const metadata" src/app/rules/planechase/page.tsx src/app/rules/archenemy/page.tsx && echo METADATA_SPLIT_OK</automated>
    <automated>cd planechaser && npx tsc --noEmit 2>&1 | grep -v '^#' | grep -c "rules/planechase\|rules/archenemy" | grep -q "^0$" && echo TYPECHECK_OK</automated>
  </verify>
  <done>Both dedicated routes exist with client pages importing their respective section exports and server layouts exporting metadata; no `metadata` export appears in either page.tsx; typechecks clean.</done>
</task>

<task type="auto">
  <name>Task 3: Convert /rules into a hub with two nav cards + app-specific sections</name>
  <files>planechaser/src/app/rules/page.tsx</files>
  <action>
Rewrite `src/app/rules/page.tsx` as the hub. Keep it `'use client'` (it retains the accordion for the app-specific sections and uses `router.back()`). Keep the sticky "How to Play" header, ambient bg, and intro card.

Add TWO large navigation cards immediately below the intro card, before any accordion:
- Card 1: "Planechase Rules" → links to `/rules/planechase`. Include the 🌍 icon and a one-line description ("Planar deck, the die, phenomena & spatial merging").
- Card 2: "Archenemy Rules" → links to `/rules/archenemy`. Include the ⚔️ icon and a one-line description ("Schemes, team play & Supervillain Rumble").
- Use `next/link` `<Link href="/rules/planechase">` / `<Link href="/rules/archenemy">`. Style with the existing token classes (rounded card, `--color-surface`, `--color-border`, hover state, `title-gradient` for card titles is optional). Include a right-chevron affordance to signal navigation.

Below the nav cards, keep the accordion but feed it ONLY the app-specific hub sections (Conquest System + Pods & Playgroups) from the restructured `content.ts` — import the hub sections export (e.g. `HUB_SECTIONS`) instead of `RULES_SECTIONS`. Default the first hub section closed or open per taste; keep consistent with existing behavior.

Remove the import of the now-deleted `RULES_SECTIONS`. Ensure no dangling references remain.
  </action>
  <verify>
    <automated>cd planechaser && grep -c 'href="/rules/planechase"' src/app/rules/page.tsx | grep -q "^1$" && grep -c 'href="/rules/archenemy"' src/app/rules/page.tsx | grep -q "^1$" && echo NAV_CARDS_OK</automated>
    <automated>cd planechaser && grep -c "RULES_SECTIONS" src/app/rules/page.tsx | grep -q "^0$" && echo NO_STALE_IMPORT</automated>
    <automated>cd planechaser && npx tsc --noEmit 2>&1 | grep -v '^#' | grep -c "error TS" | grep -q "^0$" && echo TYPECHECK_OK</automated>
    <automated>cd planechaser && npx next build 2>&1 | tail -20 | grep -q "rules/archenemy\|Compiled successfully\|Generating static" && echo BUILD_ROUTES_OK</automated>
  </verify>
  <done>/rules renders two working nav-card links to the dedicated pages plus the Conquest + Pods accordion; no reference to the removed RULES_SECTIONS remains; full project typechecks and builds, and the new routes appear in the build output.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user → static content pages | Read-only marketing/rules content. No user input accepted, no data mutation, no auth-gated data. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-jyz-01 | Information disclosure | Rules copy (Scryfall/WotC content) | accept | Content is verified official rules text summarized in the app's own words; no card art or Scryfall data added here. Complies with existing fan-content posture. |
| T-jyz-02 | Tampering | Static route content | accept | Pages are static server/client components with no external input; nothing to tamper with at runtime. |
</threat_model>

<verification>
- `/rules` shows two nav cards linking to `/rules/planechase` and `/rules/archenemy`, plus Conquest System and Pods & Playgroups.
- `/rules/planechase` shows Planechase Basics, The Planar Die, Phenomena, Spatial Merging, Deck Building Rules (with verified deck-size/phenomena/no-duplicate rules), and the Individual Deck coming-soon callout.
- `/rules/archenemy` shows the expanded Archenemy ruleset and the Supervillain Rumble Variant.
- The strings "First Blood" and "conquer 10+" no longer appear anywhere in the rules content.
- No `export const metadata` appears in any `'use client'` page.tsx; each new page has a server `layout.tsx` sibling.
- `npx tsc --noEmit` and `npx next build` both succeed; new routes appear in build output.
</verification>

<success_criteria>
- CP-03 satisfied: `/rules/planechase` exists with the verified Planechase rules + deck building section + coming-soon callout.
- CP-04 satisfied: `/rules/archenemy` exists with the expanded Archenemy ruleset + Supervillain Rumble variant.
- `/rules` is a hub with two nav cards and the retained app-specific sections.
- Conquest achievement bug fixed to reference real achievements.
- Metadata lives in server layouts; accordion/framer-motion/Footer/token pattern reused.
- Project typechecks and builds cleanly.
</success_criteria>

<output>
After completion, create `.planning/quick/260701-jyz-split-rules-into-a-hub-plus-dedicated-ru/260701-jyz-SUMMARY.md`
</output>
