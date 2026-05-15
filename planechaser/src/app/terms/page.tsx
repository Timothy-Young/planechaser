'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[150px]" />
      </div>

      <header className="relative z-10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--color-text-muted)]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-[18px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
          Terms of Service
        </h1>
      </header>

      <div className="relative z-10 px-4 pb-24 max-w-[680px] mx-auto">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 sm:p-8 space-y-6 text-[14px] leading-relaxed text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
          <p className="text-[11px] text-[var(--color-text-muted)]">Last updated: May 15, 2025</p>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>1. Acceptance</h2>
            <p>
              By using PlaneChaser (&quot;the app&quot;), you agree to these Terms of Service. PlaneChaser is operated by WheresTim LLC. If you do not agree with these terms, please do not use the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>2. Description of Service</h2>
            <p>
              PlaneChaser is a free companion web app for Magic: The Gathering Planechase and Archenemy game formats. It provides plane card display, die rolling, game tracking, achievement systems, and playgroup (pod) management. The app is provided &quot;as is&quot; and &quot;as available.&quot;
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide a valid email address or sign in via Google to create an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You may not create accounts for the purpose of abusing the service or other users.</li>
              <li>We reserve the right to suspend or delete accounts that violate these terms.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the app for any unlawful purpose</li>
              <li>Attempt to access other users&apos; accounts or data</li>
              <li>Abuse, harass, or send inappropriate content to other users via pod features</li>
              <li>Attempt to reverse-engineer, exploit, or overload the service</li>
              <li>Use automated tools to scrape data from the app</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>5. Intellectual Property</h2>
            <p>
              Magic: The Gathering, Planechase, and Archenemy are trademarks of Wizards of the Coast LLC. Card images and data are sourced from Scryfall and used under their terms of service. PlaneChaser is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy.
            </p>
            <p>
              The PlaneChaser name, logo, and original code are the property of WheresTim LLC.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>6. Donations</h2>
            <p>
              PlaneChaser is free to use. Donations made through third-party services (Ko-fi, PayPal, Venmo, Patreon) are voluntary, non-refundable, and do not entitle the donor to any additional features or services beyond what is freely available.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>7. Availability &amp; Changes</h2>
            <p>
              We strive to keep PlaneChaser available, but we do not guarantee uptime. We may modify, suspend, or discontinue any part of the service at any time without notice. Game data, achievements, and pod history may be lost in the event of service changes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, WheresTim LLC shall not be liable for any indirect, incidental, or consequential damages arising from your use of PlaneChaser. The app is provided without warranties of any kind, express or implied.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>9. Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Arizona, United States, without regard to conflict of law principles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>10. Contact</h2>
            <p>
              Questions about these terms? Email us at <a href="mailto:codetimcode@gmail.com" className="text-[var(--color-accent)] hover:underline">codetimcode@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
