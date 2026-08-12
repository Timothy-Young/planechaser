import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { BottomNav } from '@/components/bottom-nav'
import { NavigationLoader } from '@/components/navigation-loader'
import { getGlobalTheme } from '@/lib/theme/get-global-theme'
import { getTheme } from '@/lib/theme/themes'

export const metadata: Metadata = {
  title: {
    default: 'PlaneChaser | MTG Planechase Companion',
    template: '%s | PlaneChaser',
  },
  description: 'The multiplanar conquest companion for Magic: The Gathering. Track planes, roll dice, conquer worlds. Turn every Commander game into a campaign.',
  keywords: ['MTG', 'Magic: The Gathering', 'Planechase', 'Archenemy', 'Commander', 'companion app', 'planar die', 'conquest'],
  authors: [{ name: 'WheresTim LLC' }],
  creator: 'WheresTim LLC',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'PlaneChaser',
    title: 'PlaneChaser | MTG Planechase Companion',
    description: 'Track planes, roll dice, conquer worlds. The conquest companion for Magic: The Gathering Planechase and Archenemy formats.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlaneChaser | MTG Planechase Companion',
    description: 'Track planes, roll dice, conquer worlds. The conquest companion for Magic: The Gathering.',
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'PlaneChaser',
  appleWebApp: {
    capable: true,
    title: 'PlaneChaser',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

// Async so browser chrome follows the global theme — a purple address bar over
// a Gruul-red app reads as a rendering bug.
export async function generateViewport(): Promise<Viewport> {
  const uiTheme = await getGlobalTheme()

  return {
    themeColor: getTheme(uiTheme).chrome,
    width: 'device-width',
    initialScale: 1,
    // No maximumScale/userScalable lock — players need to pinch-zoom card rules
    // text on a 375px screen (WCAG 1.4.4 Resize Text).
    viewportFit: 'cover',
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Stamped server-side so the first paint is already the right theme. The
  // client never writes this attribute.
  const uiTheme = await getGlobalTheme()

  return (
    <html lang="en" className="dark h-full" data-theme={uiTheme}>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <Providers>
          <NavigationLoader />
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
