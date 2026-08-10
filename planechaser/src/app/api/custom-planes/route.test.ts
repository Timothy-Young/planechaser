// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const moderateMock = vi.fn()
const getUserMock = vi.fn()

// Mocks use relative specifiers, not the '@/...' alias. vi.mock keys on the
// resolved module id, and an alias specifier in vi.mock does not resolve to the
// same id as the route's own alias import under vite-tsconfig-paths, so an
// alias mock is silently ignored and the real module loads.
vi.mock('../../../lib/moderation', () => ({ moderate: moderateMock }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: getUserMock } }),
}))

/**
 * Minimal stand-in for the service-role client, recording the calls the route
 * makes so each assertion can check both the response and the side effects
 * (pending object removed, no row written, penalty recorded).
 */
interface FakeState {
  profile: Record<string, unknown>
  planeCount: number
  limits: Record<string, number>
  existingPlane: Record<string, unknown> | null
  rpcResult: Record<string, unknown>
}

const calls = {
  removedPending: [] as string[],
  inserted: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
  profileUpdates: [] as Record<string, unknown>[],
  rpc: [] as { name: string; args: Record<string, unknown> }[],
  publicUploads: [] as string[],
}

let fake: FakeState

function resetFake() {
  fake = {
    profile: {
      role: 'user',
      is_banned: false,
      nsfw_ack_required: false,
      custom_plane_cooldown_until: null,
    },
    planeCount: 3,
    limits: { custom_planes_max: 25 },
    existingPlane: null,
    rpcResult: {
      active_count: 2,
      banned: false,
      cooldown_until: '2026-08-10T17:00:00.000Z',
    },
  }
  calls.removedPending = []
  calls.inserted = []
  calls.updated = []
  calls.profileUpdates = []
  calls.rpc = []
  calls.publicUploads = []
}

function adminStub() {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {}
      const chain = () => builder

      Object.assign(builder, {
        select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
          if (table === 'app_limits') {
            return Promise.resolve({
              data: Object.entries(fake.limits).map(([key, value]) => ({ key, value })),
            })
          }
          if (opts?.head) {
            return { eq: () => Promise.resolve({ count: fake.planeCount }) }
          }
          return chain()
        },
        eq: chain,
        insert: (row: Record<string, unknown>) => {
          calls.inserted.push(row)
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'new-id', ...row } }) }),
          }
        },
        update: (row: Record<string, unknown>) => {
          if (table === 'profiles') {
            calls.profileUpdates.push(row)
            return { eq: () => Promise.resolve({ data: null, error: null }) }
          }
          calls.updated.push(row)
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({ single: () => Promise.resolve({ data: { id: 'p1', ...row } }) }),
              }),
            }),
          }
        },
        single: () =>
          Promise.resolve(
            table === 'profiles' ? { data: fake.profile, error: null } : { data: null, error: null },
          ),
        maybeSingle: () => Promise.resolve({ data: fake.existingPlane }),
      })

      return builder
    },
    storage: {
      from(bucket: string) {
        return {
          remove: (paths: string[]) => {
            if (bucket === 'custom-plane-images-pending') calls.removedPending.push(...paths)
            return Promise.resolve({ error: null })
          },
          download: () =>
            Promise.resolve({
              data: {
                arrayBuffer: async () => new ArrayBuffer(8),
                type: 'image/png',
              },
              error: null,
            }),
          upload: (path: string) => {
            calls.publicUploads.push(path)
            return Promise.resolve({ error: null })
          },
        }
      },
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      calls.rpc.push({ name, args })
      return Promise.resolve({ data: fake.rpcResult })
    },
  }
}

class FakeNotConfigured extends Error {
  constructor(missing: string) {
    super(`${missing} is not set. The custom plane moderation route cannot write without it.`)
    this.name = 'AdminClientNotConfiguredError'
  }
}

/** Set to throw, to simulate a deploy missing SUPABASE_SERVICE_ROLE_KEY. */
let adminUnconfigured = false

vi.mock('../../../lib/supabase/admin', () => ({
  AdminClientNotConfiguredError: FakeNotConfigured,
  createAdminClient: () => {
    if (adminUnconfigured) throw new FakeNotConfigured('SUPABASE_SERVICE_ROLE_KEY')
    return adminStub()
  },
}))

const { POST } = await import('./route')

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost/api/custom-planes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )
}

const VALID = { name: 'The Shattered Vale', oracle_text: 'Something happens.' }

beforeEach(() => {
  resetFake()
  adminUnconfigured = false
  // Clear call history, not implementations — several tests assert that the
  // scan was never reached, which leaks across tests without this.
  vi.clearAllMocks()
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  moderateMock.mockResolvedValue({ imageFlagged: false, textFields: [], scores: null })
})

describe('POST /api/custom-planes — failure reporting', () => {
  it('reports a missing service-role key as a diagnosable 503, not a bare 500', async () => {
    adminUnconfigured = true

    const res = await post(VALID)

    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ error: 'not_configured' })
  })

  it('does not leak the env var name to the caller', async () => {
    adminUnconfigured = true

    const body = JSON.stringify(await (await post(VALID)).json())

    expect(body).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('does not blame the image when a text-only submission fails the scan', async () => {
    moderateMock.mockRejectedValue(new Error('matcher exploded'))

    const res = await post(VALID)

    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'server_error' })
  })

  it('returns a structured body rather than a bare 500 on an unexpected throw', async () => {
    getUserMock.mockRejectedValue(new Error('auth service down'))

    const res = await post(VALID)

    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'server_error' })
  })
})

describe('POST /api/custom-planes — auth and preconditions', () => {
  it('401s an anonymous caller', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const res = await post(VALID)
    expect(res.status).toBe(401)
    expect(calls.inserted).toHaveLength(0)
  })

  it('403s a banned user without scanning', async () => {
    fake.profile.is_banned = true
    const res = await post(VALID)
    expect(res.status).toBe(403)
    expect(moderateMock).not.toHaveBeenCalled()
  })

  it('429s an active cooldown without scanning or re-striking', async () => {
    fake.profile.custom_plane_cooldown_until = '2999-01-01T00:00:00.000Z'
    const res = await post(VALID)
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ error: 'cooldown' })
    expect(moderateMock).not.toHaveBeenCalled()
    expect(calls.rpc).toHaveLength(0)
  })

  it('400s when acknowledgment is required but absent', async () => {
    fake.profile.nsfw_ack_required = true
    const res = await post(VALID)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'ack_required' })
    expect(moderateMock).not.toHaveBeenCalled()
  })

  it('409s at the plane cap', async () => {
    fake.planeCount = 25
    const res = await post(VALID)
    expect(res.status).toBe(409)
    expect(calls.inserted).toHaveLength(0)
  })

  it('rejects a pending path belonging to another user', async () => {
    const res = await post({ ...VALID, pending_image_path: 'someone-else/art.png' })
    expect(res.status).toBe(400)
    expect(calls.inserted).toHaveLength(0)
  })

  it('rejects a traversal path', async () => {
    const res = await post({ ...VALID, pending_image_path: 'user-1/../other/art.png' })
    expect(res.status).toBe(400)
  })

  it('400s a missing name', async () => {
    const res = await post({ name: '   ' })
    expect(res.status).toBe(400)
    expect(calls.inserted).toHaveLength(0)
  })
})

describe('POST /api/custom-planes — moderation outcomes', () => {
  it('creates a clean plane and clears the pending object', async () => {
    const res = await post({ ...VALID, pending_image_path: 'user-1/art.png' })
    expect(res.status).toBe(201)
    expect(calls.inserted).toHaveLength(1)
    expect(calls.publicUploads).toHaveLength(1)
    expect(calls.removedPending).toContain('user-1/art.png')
  })

  it('warns on a first offence, writes no row, and makes acknowledgment sticky', async () => {
    moderateMock.mockResolvedValue({ imageFlagged: true, textFields: [], scores: {} })

    const res = await post({ ...VALID, pending_image_path: 'user-1/art.png' })

    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({
      error: 'nsfw_detected',
      stage: 'warning',
      image_flagged: true,
      ack_required: true,
    })
    expect(calls.inserted).toHaveLength(0)
    expect(calls.publicUploads).toHaveLength(0)
    expect(calls.removedPending).toContain('user-1/art.png')
    expect(calls.profileUpdates).toEqual([{ nsfw_ack_required: true }])
    expect(calls.rpc).toHaveLength(0)
  })

  it('escalates to a violation once acknowledgment is on file', async () => {
    fake.profile.nsfw_ack_required = true
    moderateMock.mockResolvedValue({
      imageFlagged: false,
      textFields: ['flavor_text'],
      scores: null,
    })

    const res = await post({ ...VALID, acknowledged: true })

    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({
      stage: 'violation',
      text_fields: ['flavor_text'],
      cooldown_until: '2026-08-10T17:00:00.000Z',
      strikes: { active: 2, max: 3 },
      banned: false,
    })
    expect(calls.inserted).toHaveLength(0)
    expect(calls.rpc).toEqual([
      { name: 'record_nsfw_violation', args: { p_user_id: 'user-1', p_detail: 'text (flavor_text)' } },
    ])
  })

  it('never leaks the matched word or the model scores', async () => {
    moderateMock.mockResolvedValue({
      imageFlagged: true,
      textFields: ['name'],
      scores: { Porn: 0.98, Neutral: 0.01 },
    })

    const body = await (await post(VALID)).json()

    expect(JSON.stringify(body)).not.toContain('0.98')
    expect(body).not.toHaveProperty('scores')
    expect(body).not.toHaveProperty('matched')
  })

  it('rejects an undecodable image as invalid rather than as a violation', async () => {
    moderateMock.mockRejectedValue(new Error('unsupported image format'))

    const res = await post({ ...VALID, pending_image_path: 'user-1/art.png' })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'invalid_image' })
    expect(calls.rpc).toHaveLength(0)
    expect(calls.profileUpdates).toHaveLength(0)
    expect(calls.removedPending).toContain('user-1/art.png')
  })

  it('allows a clean submission from a user who already has the flag', async () => {
    fake.profile.nsfw_ack_required = true
    const res = await post({ ...VALID, acknowledged: true })
    expect(res.status).toBe(201)
    expect(calls.rpc).toHaveLength(0)
  })
})

describe('POST /api/custom-planes — owner exemption', () => {
  beforeEach(() => {
    moderateMock.mockResolvedValue({ imageFlagged: true, textFields: ['name'], scores: {} })
  })

  it('still refuses the owner a flagged plane, so detection stays testable', async () => {
    fake.profile.role = 'owner'
    fake.profile.nsfw_ack_required = true

    const res = await post({ ...VALID, acknowledged: true })

    expect(res.status).toBe(422)
    expect(calls.inserted).toHaveLength(0)
    expect(calls.publicUploads).toHaveLength(0)
  })

  it('records no strike, cooldown, or ban for the owner', async () => {
    fake.profile.role = 'owner'
    fake.profile.nsfw_ack_required = true

    const body = await (await post({ ...VALID, acknowledged: true })).json()

    expect(body).toMatchObject({ stage: 'violation', simulated: true })
    expect(body.strikes).toBeUndefined()
    expect(body.cooldown_until).toBeUndefined()
    expect(calls.rpc).toHaveLength(0)
  })

  it('still sets the sticky flag for the owner, so the second rung is testable', async () => {
    fake.profile.role = 'owner'

    const body = await (await post(VALID)).json()

    expect(body.stage).toBe('warning')
    expect(calls.profileUpdates).toEqual([{ nsfw_ack_required: true }])
  })

  it('ignores a stale ban or cooldown on the owner rather than locking them out', async () => {
    fake.profile.role = 'owner'
    fake.profile.is_banned = true
    fake.profile.custom_plane_cooldown_until = '2999-01-01T00:00:00.000Z'
    moderateMock.mockResolvedValue({ imageFlagged: false, textFields: [], scores: null })

    const res = await post(VALID)

    expect(res.status).toBe(201)
  })

  it.each(['admin', 'mod'])('does NOT exempt %s — they take the full penalty', async (role) => {
    fake.profile.role = role
    fake.profile.nsfw_ack_required = true

    const body = await (await post({ ...VALID, acknowledged: true })).json()

    expect(body.simulated).toBeUndefined()
    expect(body.strikes).toEqual({ active: 2, max: 3 })
    expect(calls.rpc).toHaveLength(1)
  })

  it.each(['admin', 'mod'])('still bans %s at three strikes', async (role) => {
    fake.profile.role = role
    fake.profile.nsfw_ack_required = true
    fake.rpcResult = { active_count: 3, banned: true, cooldown_until: '2026-08-10T17:00:00.000Z' }

    const body = await (await post({ ...VALID, acknowledged: true })).json()

    expect(body.banned).toBe(true)
  })
})
