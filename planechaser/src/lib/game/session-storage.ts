import type { GameState } from './types'

const STORAGE_KEY = 'planechaser_active_game'

export function saveGameState(state: GameState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — game continues without persistence
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function clearGameState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function hasActiveGame(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

const SESSION_ID_KEY = 'planechaser_active_session_id'

export function saveActiveSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  } catch {
    // Ignore
  }
}

export function loadActiveSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ID_KEY)
  } catch {
    return null
  }
}

export function clearActiveSessionId(): void {
  try {
    sessionStorage.removeItem(SESSION_ID_KEY)
  } catch {
    // Ignore
  }
}
