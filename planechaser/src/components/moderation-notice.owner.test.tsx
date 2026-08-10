import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ModerationNotice } from './moderation-notice'
import type { ModerationRejection } from '@/lib/moderation/contract'

const simulated: ModerationRejection = {
  error: 'nsfw_detected',
  stage: 'violation',
  image_flagged: true,
  text_fields: ['name'],
  ack_required: true,
  simulated: true,
}

describe('ModerationNotice — owner test mode', () => {
  it('says plainly that nothing was recorded', () => {
    render(<ModerationNotice rejection={simulated} />)
    expect(screen.getByText(/no strike, cooldown, or ban was recorded/i)).toBeTruthy()
  })

  it('still reports what tripped, so the test is meaningful', () => {
    render(<ModerationNotice rejection={simulated} />)
    expect(screen.getByText(/card art was flagged/i)).toBeTruthy()
    expect(screen.getByText('Name')).toBeTruthy()
  })

  it('shows no strike count, since none was issued', () => {
    render(<ModerationNotice rejection={simulated} />)
    expect(screen.queryByText(/of 3/)).toBeNull()
  })

  it('hides the feedback link, which would be nonsense with no penalty to appeal', () => {
    render(<ModerationNotice rejection={simulated} />)
    expect(screen.queryByRole('link', { name: /send feedback/i })).toBeNull()
  })

  it('leaves the real violation notice unchanged', () => {
    render(
      <ModerationNotice
        rejection={{ ...simulated, simulated: undefined, strikes: { active: 2, max: 3 } }}
      />,
    )
    expect(screen.getByText('2 of 3')).toBeTruthy()
    expect(screen.getByRole('link', { name: /send feedback/i })).toBeTruthy()
    expect(screen.queryByText(/no strike, cooldown, or ban/i)).toBeNull()
  })
})
