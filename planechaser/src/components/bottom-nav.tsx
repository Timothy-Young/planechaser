'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Swords, Users, User, Heart, UserPlus, Layers, Globe, Shield } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useUserProfile } from '@/hooks/usePods'
import { isMod } from '@/lib/admin/guards'
import type { UserRole } from '@/lib/admin/types'

const BASE_NAV_ITEMS = [
  { path: '/setup', label: 'Play', icon: Swords },
  { path: '/decks', label: 'Decks', icon: Layers },
  { path: '/map', label: 'Map', icon: Globe },
  { path: '/pods', label: 'Pods', icon: Users },
  { path: '/friends', label: 'Friends', icon: UserPlus },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/support', label: 'Support', icon: Heart },
] as const

const ADMIN_NAV_ITEM = { path: '/admin', label: 'Admin', icon: Shield } as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const userRole = useAppStore((s) => s.userRole)
  const setUserRole = useAppStore((s) => s.setUserRole)

  // Sync role from profile into store
  useEffect(() => {
    const role = profile?.role as UserRole | undefined
    if (role && role !== userRole) {
      setUserRole(role)
    }
  }, [profile, userRole, setUserRole])

  const navItems = useMemo(() => {
    if (isMod(userRole ?? undefined)) {
      return [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    }
    return BASE_NAV_ITEMS
  }, [userRole])

  if (pathname === '/game' || pathname === '/auth' || pathname === '/') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-[var(--color-border)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around max-w-[600px] mx-auto h-[56px]">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = pathname.startsWith(path)
          const isAdmin = path === '/admin'
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? isAdmin ? 'text-[var(--color-cta)]' : 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                {label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: isAdmin ? 'var(--color-cta)' : 'var(--color-accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
