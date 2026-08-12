/**
 * The app-wide UI theme registry.
 *
 * A theme is chosen once, globally, by the owner from the admin dashboard —
 * there is no per-user theme. The value lives in the `app_settings` table and
 * is stamped onto `<html data-theme="...">` during server render, so the colours
 * are correct on first paint with no flash.
 *
 * Colours for each theme live in `globals.css` as `html[data-theme="<id>"]`
 * blocks. This file holds only the metadata the UI and the type system need.
 *
 * IMPORTANT: `set_global_ui_theme()` in migration 034 carries its own copy of
 * this id list as the security boundary. Adding a theme means editing both, and
 * `themes.test.ts` fails the build if the two lists drift apart.
 */

/** Which ambient SVG backdrop the landing page shows for a theme. */
export type AmbientFamily = 'rings' | 'void'

export interface ThemeDef {
  id: string
  /** Shown in the admin picker. */
  label: string
  /** MTG colour identity, rendered as mana pips in the picker. Empty for the two original themes. */
  colors: readonly ManaColor[]
  ambient: AmbientFamily
  /** `theme-color` for browser chrome and the PWA splash — matches each theme's `--bg`. */
  chrome: string
}

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G'

export const THEMES = [
  { id: 'atlas', label: 'Planar Atlas', colors: [], ambient: 'rings', chrome: '#0d0a10' },
  { id: 'eternities', label: 'Blind Eternities', colors: [], ambient: 'void', chrome: '#0a0813' },
  { id: 'azorius', label: 'Azorius', colors: ['W', 'U'], ambient: 'void', chrome: '#070c15' },
  { id: 'dimir', label: 'Dimir', colors: ['U', 'B'], ambient: 'void', chrome: '#060810' },
  { id: 'rakdos', label: 'Rakdos', colors: ['B', 'R'], ambient: 'rings', chrome: '#100608' },
  { id: 'gruul', label: 'Gruul', colors: ['R', 'G'], ambient: 'rings', chrome: '#0d0c07' },
  { id: 'selesnya', label: 'Selesnya', colors: ['G', 'W'], ambient: 'rings', chrome: '#070f0a' },
] as const satisfies readonly ThemeDef[]

export type UiTheme = (typeof THEMES)[number]['id']

export const THEME_IDS = THEMES.map((t) => t.id) as readonly UiTheme[]

/**
 * Used when the theme cannot be read — a failed Supabase call, a cold cache
 * during an outage. Matches the value the app shipped with before the global
 * theme existed, so a failure looks like the status quo rather than a bug.
 */
export const DEFAULT_THEME: UiTheme = 'eternities'

export function isUiTheme(value: unknown): value is UiTheme {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

export function getTheme(id: UiTheme): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[1]
}

/** Hex swatches for the mana pips in the admin picker. */
export const MANA_PIP: Record<ManaColor, string> = {
  W: '#f4efe0',
  U: '#4a8fd4',
  B: '#4a4453',
  R: '#d4534a',
  G: '#4a9c5e',
}
