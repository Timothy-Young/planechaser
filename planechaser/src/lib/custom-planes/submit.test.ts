// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()

// Relative specifier, not the '@/...' alias — vi.mock keys on the resolved
// module id, and an alias key is silently ignored here (see route.test.ts).
vi.mock('../supabase/client', () => ({
  createClient: () => ({ auth: { getUser: getUserMock } }),
}))

import { PlaneRequestError, requireUserId } from './submit'

beforeEach(() => {
  getUserMock.mockReset()
  getUserMock.mockResolvedValue({ data: { user: null } })
})

describe('requireUserId', () => {
  it('uses the store id without asking Supabase', async () => {
    await expect(requireUserId('user-1')).resolves.toBe('user-1')
    expect(getUserMock).not.toHaveBeenCalled()
  })

  // The store copy lives in localStorage. Clearing site storage empties it while
  // the session cookie stays valid, and it is empty for a beat on every cold
  // load — neither is a signed-out user.
  it('falls back to the live session when the store is empty', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-2' } } })
    await expect(requireUserId(undefined)).resolves.toBe('user-2')
  })

  it('reports a signed-out caller as a 401 rather than dereferencing null', async () => {
    const error = await requireUserId(undefined).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(PlaneRequestError)
    expect(error).not.toBeInstanceOf(TypeError)
    expect((error as PlaneRequestError).status).toBe(401)
    expect((error as PlaneRequestError).response.error).toBe('unauthenticated')
    expect((error as PlaneRequestError).message).toMatch(/signed in/i)
  })
})
