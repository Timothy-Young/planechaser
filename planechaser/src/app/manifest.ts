import type { MetadataRoute } from 'next'
import { getGlobalTheme } from '@/lib/theme/get-global-theme'
import { getTheme } from '@/lib/theme/themes'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Installed PWAs read these once at install time, so an existing install
  // keeps the colours it was installed with until the OS refreshes it.
  const chrome = getTheme(await getGlobalTheme()).chrome

  return {
    name: 'PlaneChaser — MTG Planechase Companion',
    short_name: 'PlaneChaser',
    description:
      'Track planes, roll the planar die, conquer worlds. The conquest companion for Magic: The Gathering Planechase and Archenemy.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: chrome,
    theme_color: chrome,
    categories: ['games', 'entertainment', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
