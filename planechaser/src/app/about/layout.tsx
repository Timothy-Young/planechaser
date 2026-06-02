import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'PlaneChaser is the multiplanar conquest companion for Magic: The Gathering. Built by WheresTim LLC — a one-person studio that plays way too much Commander.',
  openGraph: {
    title: 'About | PlaneChaser',
    description: 'The story behind PlaneChaser — built by a player, for players.',
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
