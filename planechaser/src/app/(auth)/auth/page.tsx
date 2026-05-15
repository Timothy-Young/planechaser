'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const DISCLAIMER =
  'PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.'
const DISCLAIMER_KEY = 'planechaser_disclaimer_shown'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

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
        options: {
          data: { display_name: email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      if (data.user && !data.session) {
        setSuccess('Check your email for a confirmation link, then sign in.')
        setLoading(false)
        setMode('signin')
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[var(--color-accent-deep)]/10 blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[var(--color-gold)]/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-[400px] space-y-6"
      >
        {/* Wordmark */}
        <div className="text-center space-y-2">
          <h1
            className="text-[36px] font-bold text-[var(--color-accent)] text-glow-purple tracking-wider"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PlaneChaser
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)] tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
            The multiplanar conquest companion
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-6 space-y-4"
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            autoFocus
            required
            className="h-12 text-[15px] rounded-xl border-[var(--color-border)] focus:border-[var(--color-accent)] bg-[var(--color-bg)]/80 text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            required
            className="h-12 text-[15px] rounded-xl border-[var(--color-border)] focus:border-[var(--color-accent)] bg-[var(--color-bg)]/80 text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-[var(--color-accent-deep)] to-[var(--color-accent)] hover:opacity-90 text-white rounded-xl"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', boxShadow: '0 4px 30px rgba(124, 58, 237, 0.3)' }}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {mode === 'signin' ? 'Signing in...' : 'Creating...'}</>
            ) : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>

          {error && <p className="text-[13px] text-[var(--color-destructive)]" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>}
          {success && <p className="text-[13px] text-green-400" style={{ fontFamily: 'var(--font-body)' }}>{success}</p>}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>OR</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="w-full h-12 border-[var(--color-border)] bg-white/5 text-[var(--color-text)] hover:bg-white/10 rounded-xl"
            style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500 }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
        </form>

        {/* Mode toggle */}
        <p className="text-center text-[13px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          {mode === 'signin' ? (
            <>New here? <button type="button" onClick={() => setMode('signup')} className="text-[var(--color-accent)] hover:underline font-medium">Create account</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => setMode('signin')} className="text-[var(--color-accent)] hover:underline font-medium">Sign in</button></>
          )}
        </p>
      </motion.div>

      {/* WotC disclaimer */}
      {showDisclaimer && (
        <div
          role="status"
          onClick={dismissDisclaimer}
          className="fixed bottom-0 left-0 right-0 cursor-pointer glass-strong px-4 py-4 z-50"
        >
          <p className="text-[11px] text-[var(--color-text-muted)] text-center max-w-[500px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            {DISCLAIMER}
          </p>
        </div>
      )}
    </main>
  )
}
