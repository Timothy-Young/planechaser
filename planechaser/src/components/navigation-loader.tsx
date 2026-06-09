'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Thin animated bar at the top of the viewport during page transitions.
 * Shows a planeswalk-purple progress bar when navigating between routes.
 */
export function NavigationLoader() {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  useEffect(() => {
    if (pathname !== prevPathname) {
      // Route changed — show briefly then hide
      setIsNavigating(true)
      setPrevPathname(pathname)
      const timer = setTimeout(() => setIsNavigating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, prevPathname])

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ scaleX: 0.2, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[100] h-[2px] origin-left"
          style={{ background: 'linear-gradient(90deg, var(--color-accent), #c084fc)' }}
        />
      )}
    </AnimatePresence>
  )
}
