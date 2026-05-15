'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
      </header>

      <div className="relative z-10 px-4 pb-24 max-w-[680px] mx-auto">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-6 sm:p-8 space-y-6 text-[14px] leading-relaxed text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
          <p className="text-[11px] text-[var(--color-text-muted)]">Last updated: May 15, 2025</p>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Overview</h2>
            <p>
              PlaneChaser is operated by WheresTim LLC (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). We respect your privacy and are committed to protecting your personal data. This policy explains what we collect, why, and how we use it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>What We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> email address and display name when you create an account (directly or via Google sign-in).</li>
              <li><strong>Game data:</strong> planes visited, die roll history, achievements earned, and pod membership. This data is tied to your account to provide persistent game features.</li>
              <li><strong>Usage data:</strong> basic analytics such as page views and session duration to help us improve the app. We do not use third-party tracking scripts.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>What We Don&apos;t Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not collect payment information (donations are handled entirely by third-party services like Ko-fi, PayPal, and Venmo).</li>
              <li>We do not sell, rent, or share your personal data with third parties.</li>
              <li>We do not send marketing emails.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Authentication</h2>
            <p>
              We use Supabase for authentication. When you sign in with Google, we receive only your email address and profile name. We do not access your Google contacts, calendar, or any other Google services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Data Storage</h2>
            <p>
              Your data is stored securely in a Supabase-hosted PostgreSQL database with row-level security enabled. Game session data (current plane, die rolls) is stored in your browser&apos;s session storage and is not transmitted to our servers until a game ends.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Cookies &amp; Local Storage</h2>
            <p>
              We use browser local storage to save your preferences (theme, audio settings) and authentication session. We do not use third-party cookies or tracking pixels.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Your Rights</h2>
            <p>
              You can request deletion of your account and all associated data at any time by contacting us at <a href="mailto:codetimcode@gmail.com" className="text-[var(--color-accent)] hover:underline">codetimcode@gmail.com</a>. We will process deletion requests within 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase:</strong> authentication and database hosting</li>
              <li><strong>Vercel:</strong> application hosting and CDN</li>
              <li><strong>Scryfall:</strong> Magic: The Gathering card data and images (subject to Scryfall&apos;s own privacy policy)</li>
              <li><strong>Freesound:</strong> audio assets</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Children</h2>
            <p>
              PlaneChaser is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us with personal data, please contact us and we will delete it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Changes</h2>
            <p>
              We may update this policy from time to time. Changes will be posted on this page with an updated date. Continued use of PlaneChaser after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-[16px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>Contact</h2>
            <p>
              Questions about this policy? Email us at <a href="mailto:codetimcode@gmail.com" className="text-[var(--color-accent)] hover:underline">codetimcode@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
