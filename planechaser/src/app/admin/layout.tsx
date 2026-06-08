'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, useHydrated } from '@/store/app-store'
import { useUserProfile } from '@/hooks/usePods'
import { isMod } from '@/lib/admin/guards'
import type { UserRole } from '@/lib/admin/types'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const user = useAppStore((s) => s.user)
  const userRole = useAppStore((s) => s.userRole)
  const setUserRole = useAppStore((s) => s.setUserRole)
  const setUser = useAppStore((s) => s.setUser)
  const { data: profile, isLoading: profileLoading } = useUserProfile()

  // On mount, ensure auth state is resolved (handles direct navigation)
  const [authChecked, setAuthChecked] = useState(false)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser(authUser)
      }
      setAuthChecked(true)
    })
  }, [setUser])

  // Sync role from profile into store
  useEffect(() => {
    const role = profile?.role as UserRole | undefined
    if (role && role !== userRole) {
      setUserRole(role)
    }
  }, [profile, userRole, setUserRole])

  // Don't redirect until we've checked auth AND profile has loaded
  const isLoading = !hydrated || !authChecked || (!!user && profileLoading)

  useEffect(() => {
    if (isLoading) return // Wait for everything to resolve

    if (!user) {
      router.replace('/auth')
      return
    }
    if (userRole && !isMod(userRole)) {
      router.replace('/profile')
    }
  }, [user, userRole, isLoading, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
          Checking access...
        </div>
      </main>
    )
  }

  // After loading, if no user or no elevated role, show nothing (redirect is happening)
  if (!user || !userRole || !isMod(userRole)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
          Redirecting...
        </div>
      </main>
    )
  }

  return <>{children}</>
}
