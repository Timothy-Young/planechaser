'use client'

import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

const FOOTER_LINKS = [
  { label: 'About', path: '/about' },
  { label: 'How to Play', path: '/rules' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Support', path: '/support' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
] as const

export function Footer() {
  const router = useRouter()

  return (
    <footer className="relative z-10 border-t border-[var(--color-border)] px-4 py-8">
      <div className="max-w-[600px] mx-auto space-y-5">
        <div className="flex items-center justify-center">
          <button
            onClick={() => router.push('/support')}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-accent)] hover:opacity-80 transition-opacity cursor-pointer"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Heart size={12} /> Support PlaneChaser
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.path} className="flex items-center gap-4">
              {i > 0 && <span className="text-[var(--color-border)]">·</span>}
              <button onClick={() => router.push(link.path)} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer">
                {link.label}
              </button>
            </span>
          ))}
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] max-w-[500px] mx-auto leading-relaxed text-center" style={{ fontFamily: 'var(--font-body)' }}>
          PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </p>
        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 text-center" style={{ fontFamily: 'var(--font-body)' }}>
          Built by WheresTim LLC · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
