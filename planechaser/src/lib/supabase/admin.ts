import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Server-only, and never to be imported from a Client Component. The key must
 * live in a non-public env var — a NEXT_PUBLIC_* name would ship it to the
 * browser and hand every visitor unrestricted database access.
 *
 * Supabase is renaming service_role to "secret key"; both names are accepted.
 */
let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. The custom plane moderation route ' +
        'cannot write without it.',
    )
  }

  cached = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
