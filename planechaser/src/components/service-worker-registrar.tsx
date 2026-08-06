'use client'

import { useEffect } from 'react'

/**
 * Registers public/sw.js. Production only — a service worker in front of the
 * dev server makes hot reload behave unpredictably.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    let cancelled = false

    // Wait for load so registration never competes with the first paint.
    const register = () => {
      if (cancelled) return
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[PlaneChaser] Service worker registration failed:', err)
      })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', register)
    }
  }, [])

  return null
}
