import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planar Map',
  openGraph: {
    title: 'Planar Map | PlaneChaser',
    description: 'See the multiverse — every plane, color-coded by who conquered it.',
  },
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children
}
