import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

interface AppState {
  user: User | null
  setUser: (user: User | null) => void
  activePodId: string | null
  setActivePodId: (podId: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      activePodId: null,
      setActivePodId: (activePodId) => set({ activePodId }),
    }),
    { name: 'planechaser-app' }
  )
)

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
