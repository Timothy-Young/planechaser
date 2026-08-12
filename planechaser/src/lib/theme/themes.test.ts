import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { THEMES, THEME_IDS, DEFAULT_THEME, isUiTheme, getTheme } from './themes'

const ROOT = join(__dirname, '..', '..', '..')
const CSS = readFileSync(join(ROOT, 'src', 'app', 'globals.css'), 'utf8')

const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')
const MIGRATION_FILES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()

/**
 * The highest-numbered migration that redefines the function — i.e. the
 * definition actually live in the database. Resolving it rather than naming a
 * file means a later `CREATE OR REPLACE` is what gets checked, instead of the
 * superseded original.
 */
const THEME_FN_MIGRATION = [...MIGRATION_FILES]
  .reverse()
  .find((f) =>
    readFileSync(join(MIGRATIONS_DIR, f), 'utf8').includes('FUNCTION public.set_global_ui_theme')
  )

if (!THEME_FN_MIGRATION) throw new Error('No migration defines set_global_ui_theme')

/**
 * Comments stripped: 035's header quotes the broken `<>` comparison it exists
 * to fix, and assertions about what the function *does* should not read prose
 * about what it used to do.
 */
const MIGRATION = readFileSync(join(MIGRATIONS_DIR, THEME_FN_MIGRATION), 'utf8').replace(
  /^[ \t]*--.*$/gm,
  ''
)

/** Theme ids that ship a full palette of their own (Atlas lives on `:root`). */
const GUILD_IDS = THEMES.filter((t) => t.colors.length > 0).map((t) => t.id)

// ─── Colour maths ────────────────────────────────────────────────────────────

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const h = hex.trim().replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// ─── CSS parsing ─────────────────────────────────────────────────────────────

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[name] = value.trim()
  }
  return out
}

/**
 * `\s*\{` is load-bearing: it keeps this from matching the hero-gradient rules,
 * whose selectors start with the same `html[data-theme="x"]` but continue with
 * a descendant class.
 */
function themeBlock(id: string): Record<string, string> {
  const match = CSS.match(new RegExp(`^html\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`, 'm'))
  if (!match) throw new Error(`No dark palette block for theme "${id}" in globals.css`)
  return declarations(match[1])
}

function lightThemeBlock(id: string): Record<string, string> {
  const match = CSS.match(new RegExp(`^html\\.light\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`, 'm'))
  if (!match) throw new Error(`No light palette block for theme "${id}" in globals.css`)
  return declarations(match[1])
}

const SHARED_LIGHT = (() => {
  const match = CSS.match(/^html\.light\s*\{([^}]*)\}/m)
  if (!match) throw new Error('No shared html.light block in globals.css')
  return declarations(match[1])
})()

// ─── Registry ────────────────────────────────────────────────────────────────

describe('theme registry', () => {
  it('has unique ids', () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length)
  })

  it('accepts every registered id and rejects anything else', () => {
    for (const id of THEME_IDS) expect(isUiTheme(id)).toBe(true)
    expect(isUiTheme('rakdos-but-worse')).toBe(false)
    expect(isUiTheme('')).toBe(false)
    expect(isUiTheme(undefined)).toBe(false)
  })

  it('has a default that is itself a registered theme', () => {
    expect(isUiTheme(DEFAULT_THEME)).toBe(true)
  })

  it('resolves every id to its definition', () => {
    for (const t of THEMES) expect(getTheme(t.id).label).toBe(t.label)
  })
})

// ─── SQL / TS parity ─────────────────────────────────────────────────────────

describe('set_global_ui_theme', () => {
  it('has an allowlist matching the TypeScript registry exactly', () => {
    const clause = MIGRATION.match(/p_theme NOT IN \(([^)]*)\)/)
    expect(clause, 'set_global_ui_theme has no theme allowlist').not.toBeNull()

    const sqlIds = [...clause![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort()
    expect(sqlIds).toEqual([...THEME_IDS].sort())
  })

  it('guards on the owner role with a NULL-safe comparison', () => {
    // Regression: 034 shipped `get_my_role() <> 'owner'`. get_my_role() returns
    // NULL for a caller with no profiles row, `NULL <> 'owner'` is NULL, and
    // `IF NULL THEN` does not run — so the guard passed silently and any
    // authenticated caller could restyle the app for every user. Fixed in 035.
    expect(MIGRATION).toMatch(/get_my_role\(\)\s+IS DISTINCT FROM\s+'owner'/)
    expect(MIGRATION).not.toMatch(/get_my_role\(\)\s*(<>|!=)/)
  })

  it('is executable by authenticated callers only', () => {
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.set_global_ui_theme\(text\) FROM PUBLIC, anon/)
    expect(MIGRATION).toMatch(/GRANT EXECUTE ON FUNCTION public\.set_global_ui_theme\(text\) TO authenticated/)
  })
})

// ─── Palettes ────────────────────────────────────────────────────────────────

describe('guild palettes', () => {
  it.each(GUILD_IDS)('%s meets contrast targets in dark mode', (id) => {
    const v = themeBlock(id)

    // Body and heading text.
    expect(contrast(v['--text'], v['--bg'])).toBeGreaterThanOrEqual(7)
    expect(contrast(v['--text'], v['--surface-raised'])).toBeGreaterThanOrEqual(7)

    // Secondary and helper text, which the app renders on both bg and cards.
    for (const token of ['--text-secondary', '--text-muted', '--accent', '--gold', '--cta']) {
      expect(contrast(v[token], v['--bg']), `${token} on --bg`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(v[token], v['--surface']), `${token} on --surface`).toBeGreaterThanOrEqual(4.5)
    }

    // Non-text UI boundaries (WCAG 1.4.11).
    expect(contrast(v['--border'], v['--surface'])).toBeGreaterThanOrEqual(3)
    expect(contrast(v['--border'], v['--bg'])).toBeGreaterThanOrEqual(3)
    expect(contrast(v['--input'], v['--surface'])).toBeGreaterThanOrEqual(3)

    // Label on the primary CTA, checked against the lighter gradient stop.
    expect(contrast(v['--color-cta-text'], v['--gradient-cta-to'])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(GUILD_IDS)('%s meets contrast targets in light mode', (id) => {
    const v = lightThemeBlock(id)
    const surfaces = [SHARED_LIGHT['--bg'], SHARED_LIGHT['--surface'], SHARED_LIGHT['--surface-raised']]

    for (const token of ['--accent', '--accent-deep', '--accent-muted', '--gold', '--gold-deep']) {
      for (const surface of surfaces) {
        expect(contrast(v[token], surface), `${token} on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
    }

    expect(contrast(v['--color-cta-text'], v['--gradient-cta-to'])).toBeGreaterThanOrEqual(4.5)
  })

  it.each(GUILD_IDS)('%s declares --accent once so the bright value survives', (id) => {
    const match = CSS.match(new RegExp(`^html\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`, 'm'))!
    const declared = [...match[1].matchAll(/--accent\s*:/g)]
    expect(declared).toHaveLength(1)
  })
})

// ─── Registry / CSS agreement ────────────────────────────────────────────────

describe('registry matches globals.css', () => {
  it.each(THEMES.filter((t) => t.id !== 'atlas'))(
    '$id has a palette block',
    ({ id }) => {
      expect(() => themeBlock(id)).not.toThrow()
    }
  )

  it.each(GUILD_IDS)('%s chrome colour matches its --bg', (id) => {
    expect(getTheme(id).chrome).toBe(themeBlock(id)['--bg'])
  })

  it.each(THEMES)('$id is listed under its declared ambient family', ({ id, ambient }) => {
    const wanted = ambient === 'rings' ? '.ambient-rings' : '.ambient-void'
    const unwanted = ambient === 'rings' ? '.ambient-void' : '.ambient-rings'

    const visibility = CSS.slice(CSS.indexOf('AMBIENT BACKDROP VISIBILITY'))
    expect(visibility).toContain(`html[data-theme="${id}"] ${wanted}`)
    expect(visibility).not.toContain(`html[data-theme="${id}"] ${unwanted}`)
  })
})
