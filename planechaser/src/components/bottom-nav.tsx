'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Swords, Users, User, Settings2 } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/setup', label: 'Play', icon: Swords },
  { path: '/pods', label: 'Pods', icon: Users },
  { path: '/profile', label: 'Profile', icon: User },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/game' || pathname === '/auth' || pathname === '/') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-[var(--color-border)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around max-w-[600px] mx-auto h-[56px]">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = pathname.startsWith(path)
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[var(--color-accent)]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
