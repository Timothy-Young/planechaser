import { createClient } from '@/lib/supabase/client'
import { toLimitError } from '@/lib/limits/errors'

export interface FeedbackSubmission {
  category: 'bug' | 'feature' | 'general' | 'other'
  message: string
}

export async function submitFeedback(
  userId: string,
  submission: FeedbackSubmission
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('feedback')
    .insert({
      user_id: userId,
      category: submission.category,
      message: submission.message,
    })

  // Rate-limit violations (PC001/PC002) come back as LimitError so callers can
  // branch on the code instead of parsing the message.
  if (error) throw toLimitError(error, 'Failed to submit feedback')
}
