'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { BannedGuard } from '@/components/banned-guard'
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'

function AuthSync() {
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser])

  return null
}

/**
 * Syncs the light/dark class only. `data-theme` is owned by the server render
 * (see getGlobalTheme in the root layout) — writing it here too would flip the
 * app to a stale localStorage value on every hydration.
 */
function ThemeSync() {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <ThemeSync />
      <ServiceWorkerRegistrar />
      <BannedGuard>
        <AnnouncementBanner />
        {children}
      </BannedGuard>
    </QueryClientProvider>
  )
}
