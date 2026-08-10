import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Messages',
  openGraph: {
    title: 'Messages | PlaneChaser',
    description: 'Messages from the PlaneChaser team.',
  },
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
