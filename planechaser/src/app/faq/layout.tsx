import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about PlaneChaser — getting started, gameplay, conquest, pods, decks, and game controls.',
  openGraph: {
    title: 'FAQ | PlaneChaser',
    description: 'Everything you need to know about PlaneChaser — tips, tricks, and answers.',
  },
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children
}
