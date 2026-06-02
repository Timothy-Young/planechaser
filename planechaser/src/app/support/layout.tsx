import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Support PlaneChaser development. Tip via Venmo, Ko-fi, Patreon, or PayPal. Free app, no ads — built with love.',
  openGraph: {
    title: 'Support PlaneChaser',
    description: 'Support PlaneChaser development — tips, donations, and monthly support options.',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
