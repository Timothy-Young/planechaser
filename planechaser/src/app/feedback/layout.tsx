import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Send Feedback',
  openGraph: {
    title: 'Send Feedback | PlaneChaser',
    description: 'Report bugs, request features, or share your thoughts.',
  },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
