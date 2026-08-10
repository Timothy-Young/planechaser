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

/**
 * Thrown when the server is missing the credentials this client needs.
 *
 * A distinct type so callers can turn a deployment misconfiguration into a
 * clear, diagnosable response instead of an opaque 500 whose only explanation
 * lives in the server log.
 */
export class AdminClientNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`${missing} is not set. The custom plane moderation route cannot write without it.`)
    this.name = 'AdminClientNotConfiguredError'
  }
}

export function createAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url) throw new AdminClientNotConfiguredError('NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw new AdminClientNotConfiguredError('SUPABASE_SERVICE_ROLE_KEY')

  cached = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
