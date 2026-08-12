import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// unstable_cache only works inside a Next request scope; the caching itself is
// Next's concern, so it is stubbed out to run the wrapped function directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

const createClient = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}))

/** Minimal stand-in for the `.from().select().eq().single()` chain. */
function supabaseReturning(result: { data?: unknown; error?: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => result,
        }),
      }),
    }),
  }
}

const ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  createClient.mockReset()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
})

afterEach(() => {
  process.env = { ...ENV }
})

async function subject() {
  return import('./get-global-theme')
}

describe('getGlobalTheme', () => {
  it('returns the stored theme', async () => {
    createClient.mockReturnValue(supabaseReturning({ data: { ui_theme: 'rakdos' }, error: null }))
    const { getGlobalTheme } = await subject()
    await expect(getGlobalTheme()).resolves.toBe('rakdos')
  })

  it('falls back to the default when the query errors', async () => {
    createClient.mockReturnValue(
      supabaseReturning({ data: null, error: { message: 'connection refused' } })
    )
    const { getGlobalTheme } = await subject()
    await expect(getGlobalTheme()).resolves.toBe('eternities')
  })

  it('falls back when the stored value is not a known theme', async () => {
    // A row edited straight in the SQL console could otherwise put every user
    // on a data-theme with no CSS behind it.
    createClient.mockReturnValue(supabaseReturning({ data: { ui_theme: 'boros' }, error: null }))
    const { getGlobalTheme } = await subject()
    await expect(getGlobalTheme()).resolves.toBe('eternities')
  })

  it('falls back when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const { getGlobalTheme } = await subject()
    await expect(getGlobalTheme()).resolves.toBe('eternities')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('never propagates a thrown error', async () => {
    createClient.mockImplementation(() => {
      throw new Error('boom')
    })
    const { getGlobalTheme } = await subject()
    await expect(getGlobalTheme()).resolves.toBe('eternities')
  })
})
