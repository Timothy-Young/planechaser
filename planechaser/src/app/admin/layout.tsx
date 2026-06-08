'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { useUserProfile } from '@/hooks/usePods'
import { isMod } from '@/lib/admin/guards'
import type { UserRole } from '@/lib/admin/types'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const userRole = useAppStore((s) => s.userRole)
  const setUserRole = useAppStore((s) => s.setUserRole)
  const { data: profile } = useUserProfile()

  // Sync role from profile into store
  useEffect(() => {
    const role = profile?.role as UserRole | undefined
    if (role && role !== userRole) {
      setUserRole(role)
    }
  }, [profile, userRole, setUserRole])

  useEffect(() => {
    if (!user) {
      router.replace('/auth')
      return
    }
    if (userRole && !isMod(userRole)) {
      router.replace('/profile')
    }
  }, [user, userRole, router])

  // Show nothing while checking auth
  if (!user || !userRole || !isMod(userRole)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
          Checking access...
        </div>
      </main>
    )
  }

  return <>{children}</>
}
