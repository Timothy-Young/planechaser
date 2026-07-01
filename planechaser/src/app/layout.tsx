import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { BottomNav } from '@/components/bottom-nav'
import { NavigationLoader } from '@/components/navigation-loader'

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
}

export const viewport: Viewport = {
  themeColor: '#080810',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark h-full" data-theme="eternities">
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
