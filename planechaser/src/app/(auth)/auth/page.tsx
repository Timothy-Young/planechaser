'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const DISCLAIMER =
  'PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.'
const DISCLAIMER_KEY = 'planechaser_disclaimer_shown'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(DISCLAIMER_KEY)) {
      setShowDisclaimer(true)
      const timer = setTimeout(() => dismissDisclaimer(), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  function dismissDisclaimer() {
    sessionStorage.setItem(DISCLAIMER_KEY, 'true')
    setShowDisclaimer(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('Sign in failed. Check your email and password, then try again.')
        setLoading(false)
        return
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: email.split('@')[0] } },
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: email.split('@')[0],
        })
      }
    }

    router.push('/setup')
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--color-bg)]">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Wordmark */}
        <div className="text-center space-y-1">
          <h1
            className="text-[28px] font-bold text-[var(--color-accent)]"
            style={{
              fontFamily: 'var(--font-heading)',
              textShadow: '0 0 12px #7C3AED',
            }}
          >
            PlaneChaser
          </h1>
          <p
            className="text-[14px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The multiplanar conquest companion
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4"
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            autoFocus
            required
            className="h-12 text-[16px] border-[var(--color-border)] focus:border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            required
            className="h-12 text-[16px] border-[var(--color-border)] focus:border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] text-white"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '16px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>

          {error && (
            <p
              className="text-[14px] text-[var(--color-destructive)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {error}
            </p>
          )}

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span
              className="text-[14px] text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              OR
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="w-full h-12 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)]"
            style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600 }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </form>

        {/* Mode toggle */}
        <p
          className="text-center text-[14px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-[var(--color-accent)] hover:underline"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-[var(--color-accent)] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      {/* WotC disclaimer — AUTH-05 */}
      {showDisclaimer && (
        <div
          role="status"
          onClick={dismissDisclaimer}
          className="fixed bottom-0 left-0 right-0 cursor-pointer border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
        >
          <p
            className="text-[14px] text-[var(--color-text-muted)] text-center"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {DISCLAIMER}
          </p>
        </div>
      )}
    </main>
  )
}
