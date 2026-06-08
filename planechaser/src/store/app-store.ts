import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { UserRole } from '@/lib/admin/types'

type Theme = 'dark' | 'light'

interface AppState {
  user: User | null
  setUser: (user: User | null) => void
  activePodId: string | null
  setActivePodId: (podId: string | null) => void
  activeSessionId: string | null
  setActiveSessionId: (sessionId: string | null) => void
  isHost: boolean
  setIsHost: (isHost: boolean) => void
  theme: Theme
  toggleTheme: () => void
  includeGoldBorder: boolean
  setIncludeGoldBorder: (include: boolean) => void
  userRole: UserRole | null
  setUserRole: (role: UserRole | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      activePodId: null,
      setActivePodId: (activePodId) => set({ activePodId }),
      activeSessionId: null,
      setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
      isHost: false,
      setIsHost: (isHost) => set({ isHost }),
      theme: 'dark' as Theme,
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      includeGoldBorder: false,
      setIncludeGoldBorder: (includeGoldBorder) => set({ includeGoldBorder }),
      userRole: null,
      setUserRole: (userRole) => set({ userRole }),
    }),
    { name: 'planechaser-app' }
  )
)

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
