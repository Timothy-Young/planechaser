import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom Planes',
  openGraph: {
    title: 'Custom Planes | PlaneChaser',
    description: 'Create and manage your custom plane cards.',
  },
}

export default function CustomPlanesLayout({ children }: { children: React.ReactNode }) {
  return children
}
