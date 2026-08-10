import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ModerationNotice } from './moderation-notice'
import type { ModerationRejection } from '@/lib/moderation/contract'

function rejection(overrides: Partial<ModerationRejection> = {}): ModerationRejection {
  return {
    error: 'nsfw_detected',
    stage: 'warning',
    image_flagged: false,
    text_fields: [],
    ack_required: true,
    ...overrides,
  }
}

describe('ModerationNotice — warning', () => {
  it('announces itself to assistive tech', () => {
    render(<ModerationNotice rejection={rejection({ image_flagged: true })} />)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('says the art was removed when the image tripped', () => {
    render(<ModerationNotice rejection={rejection({ image_flagged: true })} />)
    expect(screen.getByText(/card art was flagged/i)).toBeTruthy()
    expect(screen.getByText(/Content blocked/i)).toBeTruthy()
  })

  it('names a single flagged field with its label', () => {
    render(<ModerationNotice rejection={rejection({ text_fields: ['flavor_text'] })} />)
    expect(screen.getByText(/This field was/i)).toBeTruthy()
    expect(screen.getByText('Flavor Text')).toBeTruthy()
  })

  it('lists several flagged fields readably', () => {
    render(
      <ModerationNotice
        rejection={rejection({ text_fields: ['name', 'oracle_text', 'flavor_text'] })}
      />,
    )
    expect(screen.getByText(/These fields were/i)).toBeTruthy()
    expect(screen.getByText('Name, Oracle Text and Flavor Text')).toBeTruthy()
  })

  it('explains that the acknowledgment is now required', () => {
    render(<ModerationNotice rejection={rejection({ image_flagged: true })} />)
    expect(screen.getByText(/confirm each plane is safe for work/i)).toBeTruthy()
  })

  it('does not mention strikes on a first offence', () => {
    render(<ModerationNotice rejection={rejection({ image_flagged: true })} />)
    expect(screen.queryByText(/strike/i)).toBeNull()
  })
})

describe('ModerationNotice — violation', () => {
  const violation = rejection({
    stage: 'violation',
    image_flagged: true,
    cooldown_until: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    strikes: { active: 2, max: 3 },
    banned: false,
  })

  it('reports the strike count', () => {
    render(<ModerationNotice rejection={violation} />)
    expect(screen.getByText('2 of 3')).toBeTruthy()
  })

  it('reports the remaining cooldown', () => {
    render(<ModerationNotice rejection={violation} />)
    expect(screen.getByText(/^5h$/)).toBeTruthy()
  })

  it('links to feedback, the only remediation path a false positive has', () => {
    render(<ModerationNotice rejection={violation} />)
    const link = screen.getByRole('link', { name: /send feedback/i })
    expect(link.getAttribute('href')).toBe('/feedback')
  })

  it('reports suspension on the third strike instead of a cooldown', () => {
    render(
      <ModerationNotice
        rejection={{ ...violation, banned: true, strikes: { active: 3, max: 3 } }}
      />,
    )
    expect(screen.getByText(/third strike/i)).toBeTruthy()
    expect(screen.getByText(/suspended/i)).toBeTruthy()
    expect(screen.queryByText(/create planes again/i)).toBeNull()
  })
})
