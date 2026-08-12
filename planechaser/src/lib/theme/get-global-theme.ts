import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_THEME, isUiTheme, type UiTheme } from './themes'

/** Cache tag the admin server action busts after writing a new theme. */
export const APP_SETTINGS_TAG = 'app-settings'

/**
 * Deliberately a plain supabase-js client rather than the `@supabase/ssr`
 * server client: that one reads `cookies()`, and `unstable_cache` refuses to
 * wrap anything touching a dynamic request source. The theme is public data
 * behind an anon-readable policy, so there is nothing to authenticate.
 */
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

const readGlobalTheme = unstable_cache(
  async (): Promise<UiTheme> => {
    const supabase = anonClient()
    if (!supabase) return DEFAULT_THEME

    const { data, error } = await supabase
      .from('app_settings')
      .select('ui_theme')
      .eq('id', 1)
      .single()

    if (error || !isUiTheme(data?.ui_theme)) return DEFAULT_THEME
    return data.ui_theme
  },
  ['global-ui-theme'],
  { tags: [APP_SETTINGS_TAG], revalidate: 300 }
)

/**
 * The app-wide theme, for stamping onto `<html data-theme>` during server
 * render. Never throws — an unreachable database renders the app in the
 * default theme rather than unstyled, so an outage looks like the status quo
 * instead of a broken site.
 */
export async function getGlobalTheme(): Promise<UiTheme> {
  try {
    return await readGlobalTheme()
  } catch {
    return DEFAULT_THEME
  }
}
