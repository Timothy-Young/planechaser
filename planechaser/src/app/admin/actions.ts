'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { APP_SETTINGS_TAG } from '@/lib/theme/get-global-theme'
import { isUiTheme } from '@/lib/theme/themes'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Sets the app-wide UI theme for every user.
 *
 * Authorisation lives in `set_global_ui_theme()` (migration 034), which raises
 * unless the caller is the owner. The check here only exists to give a clean
 * message for a value that could never be valid; it is not the security
 * boundary. Uses the cookie-backed server client so `auth.uid()` inside the
 * function resolves to the real caller.
 */
export async function setGlobalUiTheme(theme: string): Promise<ActionResult> {
  if (!isUiTheme(theme)) {
    return { ok: false, error: `Unknown theme: ${theme}` }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('set_global_ui_theme', { p_theme: theme })

  if (error) {
    return { ok: false, error: error.message }
  }

  // updateTag rather than revalidateTag: this is a read-your-own-writes case,
  // and revalidateTag's recommended "max" profile is stale-while-revalidate, so
  // the owner would be shown the previous theme on the very request that was
  // supposed to prove the change worked. updateTag expires immediately, and is
  // Server-Action-only — which this is.
  //
  // The path revalidation is separate and also required: the tag drops the
  // cached read, while this drops the rendered HTML with the old data-theme
  // baked into the <html> element.
  updateTag(APP_SETTINGS_TAG)
  revalidatePath('/', 'layout')

  return { ok: true }
}
