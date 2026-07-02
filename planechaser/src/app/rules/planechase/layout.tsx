import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planechase Rules',
  description: 'Official Planechase rules: planar deck construction, the planar die, phenomena, and spatial merging — as used in PlaneChaser.',
  openGraph: {
    title: 'Planechase Rules | PlaneChaser',
    description: 'Official Planechase rules: planar deck construction, the planar die, phenomena, and spatial merging.',
  },
}

export default function PlanechaseRulesLayout({ children }: { children: React.ReactNode }) {
  return children
}
