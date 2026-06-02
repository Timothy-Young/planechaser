import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Play',
  description: 'Learn how to play Planechase, Archenemy, and the Conquest meta-game with PlaneChaser. Rules, die mechanics, and pod management explained.',
  openGraph: {
    title: 'How to Play | PlaneChaser',
    description: 'Learn how to play Planechase, Archenemy, and the Conquest meta-game with PlaneChaser.',
  },
}

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
