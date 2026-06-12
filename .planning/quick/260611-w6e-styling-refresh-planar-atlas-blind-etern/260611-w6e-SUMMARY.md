---
phase: quick-260611-w6e
plan: "01"
subsystem: styling/theming
tags: [themes, css-tokens, tailwind-v4, zustand, home-hero, admin]
dependency_graph:
  requires: []
  provides: [atlas-theme, eternities-theme, cta-button-variant, hero-svgs, uiTheme-store]
  affects: [globals.css, app-store, providers, button, page, admin/page, layout]
tech_stack:
  added: []
  patterns: [data-theme-attribute, css-custom-properties, tailwind-v4-theme-inline, zustand-persist]
key_files:
  created: []
  modified:
    - planechaser/src/app/globals.css
    - planechaser/src/store/app-store.ts
    - planechaser/src/components/providers.tsx
    - planechaser/src/components/ui/button.tsx
    - planechaser/src/app/layout.tsx
    - planechaser/src/app/page.tsx
    - planechaser/src/app/admin/page.tsx
decisions:
  - "@theme inline custom tokens now use var() references to raw vars so data-theme cascade can override them"
  - "Atlas is the default theme in :root; Eternities is an html[data-theme=\"eternities\"] override"
  - "html.light[data-theme=\"eternities\"] overrides accent to #6d28d9, gold darkened to #9a742c — both legible"
  - "cta button variant drives all color via CSS vars (no hardcoded colors) so it's theme-aware by construction"
  - "Bottom CTA in page.tsx switched to variant=cta for consistency (trivial, same pattern)"
  - "Static data-theme=\"atlas\" on <html> in layout.tsx prevents first-paint flash for default theme"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-12T07:00:51Z"
  tasks_completed: 3
  files_modified: 7
---

# Quick Task 260611-w6e: Styling Refresh — Planar Atlas + Blind Eternities Themes

**One-liner:** Two-theme token system (Atlas gold-forward / Eternities purple-forward) via html[data-theme], persisted Zustand uiTheme, theme-aware cta button variant, and home hero refresh with SVG portal/hedron geometry, gold-ruled badge, and gradient H1.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Two-theme token system in globals.css | ff10d92 | globals.css |
| 2 | uiTheme store, data-theme providers, cta button | 7c46bae | app-store.ts, providers.tsx, button.tsx, layout.tsx |
| 3 | Admin theme toggle + home hero refresh | ddec074 | admin/page.tsx, page.tsx |

## What Was Built

### Task 1 — globals.css token system
- Converted all `@theme inline` custom color tokens from literal hex to `var()` references (`--color-bg: var(--bg)` etc.), enabling runtime theme-switching via CSS cascade
- Defined raw vars in `:root` for Atlas (gold-forward): deep purple-black bg, gold accent, parchment text
- Added `html[data-theme="eternities"]` block for Eternities (purple-forward): indigo bg, purple accent, white text
- `html.light` override: shared light surfaces + darkened gold (`#9a742c`) for contrast on both themes
- `html.light[data-theme="eternities"]`: purple accent (`#6d28d9`) + darkened gold
- Both custom (`--color-*`) and shadcn semantic (`--primary`, `--ring`, `--card`, `--background`, etc.) tokens re-theme
- CTA gradient tokens per theme: atlas = dark-text-on-gold; eternities = white-text-on-purple
- `.hero-h1-gradient` utility + `html[data-theme="eternities"] .hero-h1-gradient` override
- `h1, h2, h3, h4 { font-family: var(--font-heading); }` in `@layer base`

### Task 2 — Store, providers, button
- `app-store.ts`: `UiTheme = 'atlas' | 'eternities'` type, `uiTheme: 'atlas'` initial state, `setUiTheme` setter — persisted automatically by existing `persist` middleware (name `planechaser-app`)
- `providers.tsx` ThemeSync: reads `uiTheme`, calls `document.documentElement.setAttribute('data-theme', uiTheme)` in the existing effect, added to dependency array
- `layout.tsx`: `data-theme="atlas"` added to `<html>` for no-flash default (atlas→atlas is invisible; eternities gets one corrected paint, identical to existing light/dark hydration behavior)
- `button.tsx`: `cta` variant added using all CSS vars (`--gradient-cta-from`, `--gradient-cta-to`, `--color-cta-text`, `--cta-border`); default h-8→h-11, lg h-9→h-12, icon size-8→size-11 for better mobile touch targets

### Task 3 — Admin toggle + home hero
- `admin/page.tsx`: `uiTheme`/`setUiTheme` from store; styled `<select>` in sticky header flex row (after "Admin Dashboard" h1, `ml-auto`); options "Planar Atlas" / "Blind Eternities"; matches existing admin select styling
- `page.tsx`: removed `Sparkles` import (no longer used)
- Hero ambient background: replaced three blurred orb divs with theme-conditional inline SVG — portal rings (atlas) or hedron constellation (eternities); gradient IDs renamed to `emberGlowHero`/`voidGlowHero`/`hedronHero` to avoid collision
- Hero badge: replaced Sparkles pill with gold-ruled badge (`border border-[var(--color-gold)]/40`, `rounded-sm`, `tracking-[0.25em]`)
- Hero H1: `hero-h1-gradient` utility class; removed `text-glow-purple` and `text-[var(--color-accent)]`
- Hero CTA: `variant="cta" size="lg"` replacing inline gradient; bottom-page CTA also switched for consistency

## Deviations from Plan

### Auto-applied enhancements

**1. [Enhancement] Bottom-page CTA also switched to variant="cta"**
- Plan noted this as optional ("only if trivial")
- Applied since it was a direct copy of the hero CTA pattern — no additional logic needed
- Consistent theme-awareness across both hero CTAs

**2. [Rule 2 - Security] T-w6e-01 mitigation verified**
- `setUiTheme` is typed to `'atlas' | 'eternities'`; the `data-theme` attribute is only set to those values
- Unknown localStorage values fall through to atlas default (no CSS selector match = `:root` atlas styles apply)

None — plan executed as specified with minor optional enhancements applied.

## Known Stubs

None. All token values are real design system values from the approved Sketch 001 Variant C palette; SVG geometry is verbatim from the sketch; no placeholder/TODO patterns introduced.

## Threat Flags

No new trust boundaries introduced. `uiTheme` from localStorage controls only a CSS `data-theme` attribute on `<html>` — cannot affect auth, data access, or server-side behavior.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| Commit ff10d92 exists | FOUND |
| Commit 7c46bae exists | FOUND |
| Commit ddec074 exists | FOUND |
| SUMMARY.md created | FOUND |
| globals.css defines data-theme="eternities" | FOUND |
| button.tsx has cta variant | FOUND |
| app-store.ts has uiTheme | FOUND |
| providers.tsx has data-theme attribute | FOUND |
| page.tsx has hero-h1-gradient | FOUND |
| page.tsx has variant="cta" | FOUND |
| admin/page.tsx has setUiTheme | FOUND |
| TypeScript: no errors in app code | PASSED |
