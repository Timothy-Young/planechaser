import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/setup'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const displayName = user.user_metadata?.full_name
          ?? user.user_metadata?.name
          ?? user.email?.split('@')[0]
          ?? 'Player'

        await supabase.from('profiles').upsert(
          {
            id: user.id,
            display_name: displayName,
          },
          { onConflict: 'id' }
        )
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`)
}
