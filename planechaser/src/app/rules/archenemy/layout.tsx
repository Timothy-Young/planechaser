import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Archenemy Rules',
  description: 'Official Archenemy rules: the scheme deck, team play, and the Supervillain Rumble variant — as used in PlaneChaser.',
  openGraph: {
    title: 'Archenemy Rules | PlaneChaser',
    description: 'Official Archenemy rules: the scheme deck, team play, and the Supervillain Rumble variant.',
  },
}

export default function ArchenemyRulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
