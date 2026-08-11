import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  applyVerdict,
  checkPreconditions,
  thresholdsFromLimits,
  type ModeratorState,
} from '@/lib/moderation/decide'
import { moderate } from '@/lib/moderation'
import {
  ModerationScanError,
  STRIKE_BAN_THRESHOLD,
  type ModerationVerdict,
} from '@/lib/moderation/types'
import type {
  CreatePlaneRequest,
  ModerationRejection,
  PlaneErrorResponse,
  UpdatePlaneRequest,
} from '@/lib/moderation/contract'
import { AdminClientNotConfiguredError, createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// TensorFlow and sharp both need Node; neither runs on the edge runtime.
export const runtime = 'nodejs'
// Cold start loads the WASM backend and model (~330ms) before classifying.
export const maxDuration = 30

const PENDING_BUCKET = 'custom-plane-images-pending'
const PUBLIC_BUCKET = 'custom-plane-images'
const DEFAULT_TYPE_LINE = 'Plane — Custom'
const DEFAULT_PLANE_MAX = 25
/** Exempt from the plane cap only. Moderation applies to all of them. */
const STAFF_ROLES = ['owner', 'admin', 'mod']

function fail(status: number, body: PlaneErrorResponse) {
  return NextResponse.json(body, { status })
}

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * Pending objects are stored at `<user_id>/<file>`. The admin client bypasses
 * RLS, so ownership has to be checked here — without this a caller could pass
 * another user's pending path and have us publish their image under their own
 * plane, or probe for its existence.
 */
function isOwnedPendingPath(path: string, userId: string): boolean {
  if (path.includes('..') || path.startsWith('/')) return false
  const [folder, ...rest] = path.split('/')
  return folder === userId && rest.length > 0 && rest.every((part) => part.length > 0)
}

async function readLimits(admin: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await admin.from('app_limits').select('key, value')
  const limits: Record<string, number> = {}
  for (const row of data ?? []) limits[row.key as string] = row.value as number
  return limits
}

async function loadState(
  admin: SupabaseClient,
  userId: string,
  countsAgainstLimit: boolean,
  limits: Record<string, number>,
): Promise<{ state: ModeratorState; isStaff: boolean; isOwner: boolean } | null> {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('role, is_banned, nsfw_ack_required, custom_plane_cooldown_until')
    .eq('id', userId)
    .single()

  if (error || !profile) return null

  const isStaff = STAFF_ROLES.includes(profile.role as string)
  const isOwner = profile.role === 'owner'

  let planeCount = 0
  if (countsAgainstLimit && !isStaff) {
    const { count } = await admin
      .from('custom_planes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    planeCount = count ?? 0
  }

  return {
    isStaff,
    isOwner,
    state: {
      // The owner is never gated by a moderation penalty, even if one somehow
      // landed on their row. BannedGuard swaps out the entire app for a banned
      // user, so a self-inflicted ban would cost the owner the admin dashboard
      // and the ability to undo it.
      isBanned: isOwner ? false : Boolean(profile.is_banned),
      ackRequired: Boolean(profile.nsfw_ack_required),
      cooldownUntil: isOwner
        ? null
        : ((profile.custom_plane_cooldown_until as string | null) ?? null),
      planeCount,
      planeMax: isStaff
        ? Number.POSITIVE_INFINITY
        : (limits.custom_planes_max ?? DEFAULT_PLANE_MAX),
    },
  }
}

async function discardPending(admin: SupabaseClient, path: string | null) {
  if (!path) return
  await admin.storage.from(PENDING_BUCKET).remove([path])
}

function rejection(
  stage: 'warning' | 'violation',
  verdict: ModerationVerdict,
  extra: Partial<ModerationRejection> = {},
): NextResponse {
  const body: ModerationRejection = {
    error: 'nsfw_detected',
    stage,
    image_flagged: verdict.imageFlagged,
    text_fields: verdict.textFields,
    ack_required: true,
    ...extra,
  }
  return NextResponse.json(body, { status: 422 })
}

async function handle(request: Request, mode: 'create' | 'update') {
  let body: CreatePlaneRequest & Partial<UpdatePlaneRequest>
  try {
    body = await request.json()
  } catch {
    return fail(400, { error: 'invalid_request', message: 'Body must be JSON.' })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail(401, { error: 'unauthenticated', message: 'You must be signed in.' })
  }

  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch (error) {
    if (error instanceof AdminClientNotConfiguredError) {
      // Log the specific variable, return a generic message. A misconfigured
      // deploy should be obvious in the logs without broadcasting internals to
      // every authenticated caller.
      console.error(`[custom-planes] ${error.message}`)
      return fail(503, {
        error: 'not_configured',
        message:
          'Custom plane creation is temporarily unavailable — the server is missing ' +
          'its moderation credentials. This is a deployment problem, not a problem ' +
          'with your plane.',
      })
    }
    throw error
  }

  const pendingPath =
    typeof body.pending_image_path === 'string' && body.pending_image_path
      ? body.pending_image_path
      : null

  if (pendingPath && !isOwnedPendingPath(pendingPath, user.id)) {
    return fail(400, { error: 'invalid_request', message: 'Invalid image reference.' })
  }

  const name = trimmed(body.name, 100)
  if (!name) {
    await discardPending(admin, pendingPath)
    return fail(400, { error: 'invalid_request', message: 'Name is required.' })
  }
  if (mode === 'update' && typeof body.id !== 'string') {
    await discardPending(admin, pendingPath)
    return fail(400, { error: 'invalid_request', message: 'Plane id is required.' })
  }

  const limits = await readLimits(admin)
  const loaded = await loadState(admin, user.id, mode === 'create', limits)
  if (!loaded) {
    await discardPending(admin, pendingPath)
    return fail(500, { error: 'server_error', message: 'Could not load your profile.' })
  }
  const { state, isOwner } = loaded

  const input = {
    acknowledged: body.acknowledged === true,
    countsAgainstLimit: mode === 'create',
  }

  // Preconditions run before any scan: a banned or cooling-down user must not
  // cost an inference, and must not be able to earn a second strike from a
  // request that was never going to be accepted.
  const blocked = checkPreconditions(state, input)
  if (blocked) {
    await discardPending(admin, pendingPath)
    switch (blocked.kind) {
      case 'banned':
        return fail(403, { error: 'banned', message: 'Your account is suspended.' })
      case 'cooldown':
        return fail(429, {
          error: 'cooldown',
          message: 'Plane creation is paused after a content violation.',
          cooldown_until: blocked.until,
        })
      case 'ack_missing':
        return fail(400, {
          error: 'ack_required',
          message: 'You must confirm this plane is safe for work.',
        })
      case 'at_limit':
        return fail(409, {
          error: 'at_limit',
          message: `Custom plane limit reached (${blocked.count} of ${blocked.max}).`,
          count: blocked.count,
          max: blocked.max,
        })
    }
  }

  // The existing plane row supplies the fields an edit leaves untouched, so a
  // user cannot dodge the scan by omitting a field they previously set.
  let existing: Record<string, unknown> | null = null
  if (mode === 'update') {
    const { data } = await admin
      .from('custom_planes')
      .select('*')
      .eq('id', body.id!)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data) {
      await discardPending(admin, pendingPath)
      return fail(404, { error: 'not_found', message: 'Plane not found.' })
    }
    existing = data
  }

  const fields = {
    name,
    type_line: trimmed(body.type_line, 100) || (existing?.type_line as string) || DEFAULT_TYPE_LINE,
    oracle_text: trimmed(body.oracle_text, 2000),
    chaos_text: trimmed(body.chaos_text, 2000),
    flavor_text: trimmed(body.flavor_text, 1000),
  }

  let imageBytes: Buffer | null = null
  let imageContentType = 'image/jpeg'
  if (pendingPath) {
    const { data, error } = await admin.storage.from(PENDING_BUCKET).download(pendingPath)
    if (error || !data) {
      return fail(400, { error: 'invalid_image', message: 'Uploaded image could not be read.' })
    }
    imageBytes = Buffer.from(await data.arrayBuffer())
    if (data.type) imageContentType = data.type
  }

  let verdict: ModerationVerdict
  try {
    const result = await moderate({
      imageBytes,
      fields,
      thresholds: thresholdsFromLimits(limits),
    })
    verdict = { imageFlagged: result.imageFlagged, textFields: result.textFields }
  } catch (error) {
    await discardPending(admin, pendingPath)

    // Log unconditionally. This branch used to return 400 silently, which is
    // why a production outage here left no evidence at all. The error object
    // only — never the submitted fields or image bytes.
    console.error('[custom-planes] moderation scan failed', error)

    // A decode failure says nothing about content, so it is an invalid upload
    // rather than a violation — that keeps a truncated file from costing a
    // strike. Blame the image only when the image scan is what threw; a text
    // scan or a model-init crash is a server fault, and reporting either as a
    // bad file sends the user off replacing art that was never the problem.
    if (error instanceof ModerationScanError && error.stage === 'image') {
      return fail(400, {
        error: 'invalid_image',
        message: 'That image could not be processed. Try a different file.',
      })
    }

    return fail(500, {
      error: 'server_error',
      message: 'Content check failed. Please try again.',
    })
  }

  const outcome = applyVerdict(state, verdict)

  if (outcome.kind === 'warn') {
    await discardPending(admin, pendingPath)

    // Must go through the RPC, not a direct UPDATE. protect_role_changes
    // guards nsfw_ack_required and silently reverts writes whose caller has no
    // JWT — which is every service-role write. A plain UPDATE here looked like
    // it worked, never persisted, and left the whole penalty ladder inert.
    const { error: ackError } = await admin.rpc('set_nsfw_ack_required', {
      p_user_id: user.id,
    })
    if (ackError) {
      console.error('[custom-planes] failed to persist nsfw_ack_required', ackError)
    }

    return rejection('warning', verdict)
  }

  if (outcome.kind === 'violation') {
    await discardPending(admin, pendingPath)

    // Owner: detection still runs and the plane is still refused, so the scan
    // and every message can be exercised, but nothing is written to the
    // penalty ledger. Admins and mods are deliberately not exempt — an admin
    // who trips this can be unbanned from the dashboard, whereas a banned
    // owner loses the dashboard itself.
    if (isOwner) {
      return rejection('violation', verdict, { simulated: true })
    }

    const detail = [
      verdict.imageFlagged ? 'image' : null,
      verdict.textFields.length ? `text (${verdict.textFields.join(', ')})` : null,
    ]
      .filter(Boolean)
      .join(' and ')

    const { data: penalty } = await admin.rpc('record_nsfw_violation', {
      p_user_id: user.id,
      p_detail: detail,
    })

    return rejection('violation', verdict, {
      cooldown_until: penalty?.cooldown_until,
      strikes: { active: penalty?.active_count ?? 0, max: STRIKE_BAN_THRESHOLD },
      banned: Boolean(penalty?.banned),
    })
  }

  // Clean. Publish the image only now, so flagged bytes never reach a public URL.
  let imagePath: string | null = (existing?.image_path as string | null) ?? null

  if (pendingPath && imageBytes) {
    const publicPath = `${user.id}/${Date.now()}-${pendingPath.split('/').pop()}`
    const { error: uploadError } = await admin.storage
      .from(PUBLIC_BUCKET)
      .upload(publicPath, imageBytes, { contentType: imageContentType, upsert: false })

    if (uploadError) {
      await discardPending(admin, pendingPath)
      return fail(500, { error: 'server_error', message: 'Could not save the image.' })
    }

    if (mode === 'update' && existing?.image_path) {
      await admin.storage.from(PUBLIC_BUCKET).remove([existing.image_path as string])
    }
    imagePath = publicPath
  } else if (mode === 'update' && body.remove_image) {
    if (existing?.image_path) {
      await admin.storage.from(PUBLIC_BUCKET).remove([existing.image_path as string])
    }
    imagePath = null
  }

  await discardPending(admin, pendingPath)

  const row = {
    name: fields.name,
    type_line: fields.type_line,
    oracle_text: fields.oracle_text,
    chaos_text: fields.chaos_text,
    flavor_text: fields.flavor_text || null,
    image_path: imagePath,
    is_public: body.is_public === true,
  }

  if (mode === 'create') {
    const { data, error } = await admin
      .from('custom_planes')
      .insert({ ...row, user_id: user.id })
      .select()
      .single()

    if (error) {
      return fail(500, { error: 'server_error', message: 'Could not create the plane.' })
    }
    return NextResponse.json(data, { status: 201 })
  }

  const { data, error } = await admin
    .from('custom_planes')
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq('id', body.id!)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return fail(500, { error: 'server_error', message: 'Could not update the plane.' })
  }
  return NextResponse.json(data, { status: 200 })
}

/**
 * Catch-all so an unexpected throw returns a structured body the client can
 * render, rather than the framework's bare 500 whose cause is only visible in
 * the server log.
 */
async function guarded(request: Request, mode: 'create' | 'update') {
  try {
    return await handle(request, mode)
  } catch (error) {
    console.error(`[custom-planes] unhandled ${mode} failure`, error)
    return fail(500, {
      error: 'server_error',
      message: 'Something went wrong saving your plane. Please try again.',
    })
  }
}

export async function POST(request: Request) {
  return guarded(request, 'create')
}

export async function PATCH(request: Request) {
  return guarded(request, 'update')
}
