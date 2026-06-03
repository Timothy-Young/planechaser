import { createClient } from '@/lib/supabase/client'

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

  if (error) throw new Error(`Failed to submit feedback: ${error.message}`)
}
