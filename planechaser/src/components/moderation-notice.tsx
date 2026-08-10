'use client'

import { AlertTriangle, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

import type { ModerationRejection } from '@/lib/moderation/contract'
import { formatCooldown } from '@/lib/moderation/decide'
import type { TextField } from '@/lib/moderation/types'

const FIELD_LABELS: Record<TextField, string> = {
  name: 'Name',
  type_line: 'Type Line',
  oracle_text: 'Oracle Text',
  chaos_text: 'Chaos Text',
  flavor_text: 'Flavor Text',
}

function listFields(fields: TextField[]): string {
  const labels = fields.map((field) => FIELD_LABELS[field])
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

export function ModerationNotice({ rejection }: { rejection: ModerationRejection }) {
  const violation = rejection.stage === 'violation'
  const tone = violation ? '239, 68, 68' : '245, 158, 11'
  const Icon = violation ? ShieldAlert : AlertTriangle

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border px-4 py-3"
      style={{
        borderColor: `rgba(${tone}, 0.35)`,
        background: `rgba(${tone}, 0.08)`,
      }}
    >
      <Icon size={16} style={{ color: `rgb(${tone})` }} className="shrink-0 mt-0.5" />

      <div className="space-y-1.5">
        <p
          className="text-[12px] font-semibold"
          style={{ color: `rgb(${tone})`, fontFamily: 'var(--font-heading)' }}
        >
          {violation ? 'Plane not created — flagged again' : 'Content blocked — plane not created'}
        </p>

        <div
          className="space-y-1 text-[11px] text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {rejection.image_flagged && (
            <p>Your card art was flagged as adult content and has been removed.</p>
          )}

          {rejection.text_fields.length > 0 && (
            <p>
              {rejection.text_fields.length === 1 ? 'This field was' : 'These fields were'} flagged
              and cleared: <strong>{listFields(rejection.text_fields)}</strong>.
            </p>
          )}

          {violation ? (
            <>
              {rejection.banned ? (
                <p>That was your third strike. Your account has been suspended.</p>
              ) : (
                <p>
                  You confirmed this plane was safe for work, but it was flagged anyway. A strike
                  has been added to your account
                  {rejection.strikes && (
                    <>
                      {' '}
                      (<strong>
                        {rejection.strikes.active} of {rejection.strikes.max}
                      </strong>)
                    </>
                  )}
                  .
                  {rejection.cooldown_until && (
                    <> You can create planes again in <strong>{formatCooldown(rejection.cooldown_until)}</strong>.</>
                  )}
                </p>
              )}
              <p>
                Think this is wrong?{' '}
                <Link href="/feedback" className="underline hover:text-[var(--color-text)]">
                  Send feedback
                </Link>
                .
              </p>
            </>
          ) : (
            <p>
              From now on you&rsquo;ll need to confirm each plane is safe for work before creating
              it.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
