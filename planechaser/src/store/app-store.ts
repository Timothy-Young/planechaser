import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface AppState {
  user: User | null
  setUser: (user: User | null) => void
  activePodId: string | null
  setActivePodId: (podId: string | null) => void
  theme: Theme
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      activePodId: null,
      setActivePodId: (activePodId) => set({ activePodId }),
      theme: 'dark' as Theme,
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'planechaser-app' }
  )
)

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
