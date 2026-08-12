import { createClient } from '@/lib/supabase/client'
import {
  isModerationRejection,
  type CreatePlaneRequest,
  type ModerationRejection,
  type PlaneErrorResponse,
  type UpdatePlaneRequest,
} from '@/lib/moderation/contract'
import type { CustomPlane } from './types'

const PENDING_BUCKET = 'custom-plane-images-pending'
const ENDPOINT = '/api/custom-planes'

/**
 * Thrown when the server blocked the submission on content.
 *
 * Distinct from PlaneRequestError so callers can branch on it without string
 * matching — this one drives the warning UI, the acknowledgment checkbox, and
 * clearing the offending fields.
 */
export class ModerationError extends Error {
  constructor(public readonly rejection: ModerationRejection) {
    super('Content was flagged.')
    this.name = 'ModerationError'
  }
}

/** Any other non-2xx from the route: cooldown, ban, cap, validation. */
export class PlaneRequestError extends Error {
  constructor(
    public readonly response: PlaneErrorResponse,
    public readonly status: number,
  ) {
    super(response.message)
    this.name = 'PlaneRequestError'
  }
}

/**
 * Resolves the id a submission belongs to.
 *
 * The client store's copy of the user is persisted in localStorage, so it is
 * empty on the first render after that is cleared — and briefly on every cold
 * load — while the session cookie is still perfectly valid. Ask Supabase before
 * concluding the caller is signed out. Without this the upload dereferenced a
 * null user and the form showed a raw
 * "Cannot read properties of null (reading 'id')".
 */
export async function requireUserId(storeUserId: string | undefined): Promise<string> {
  if (storeUserId) return storeUserId

  const {
    data: { user },
  } = await createClient().auth.getUser()
  if (user) return user.id

  throw new PlaneRequestError(
    { error: 'unauthenticated', message: 'You must be signed in to save a plane.' },
    401,
  )
}

/**
 * Uploads to the private quarantine bucket.
 *
 * The image goes to storage first and the route fetches it server-side, rather
 * than being POSTed inline, because the form accepts 5MB files and Vercel caps
 * serverless request bodies at 4.5MB. It also means flagged bytes never touch
 * the public bucket.
 */
export async function uploadPendingImage(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(PENDING_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error(`Failed to upload image: ${error.message}`)
  return path
}

async function send(
  method: 'POST' | 'PATCH',
  body: CreatePlaneRequest | UpdatePlaneRequest,
): Promise<CustomPlane> {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (response.ok) return payload as CustomPlane
  if (isModerationRejection(payload)) throw new ModerationError(payload)

  throw new PlaneRequestError(
    (payload as PlaneErrorResponse) ?? {
      error: 'server_error',
      message: 'Something went wrong.',
    },
    response.status,
  )
}

export function submitNewPlane(body: CreatePlaneRequest): Promise<CustomPlane> {
  return send('POST', body)
}

export function submitPlaneUpdate(body: UpdatePlaneRequest): Promise<CustomPlane> {
  return send('PATCH', body)
}
