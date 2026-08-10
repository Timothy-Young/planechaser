import { migrateArchenemyState, migrateGameConfig } from './legacy'
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
    const saved = JSON.parse(raw) as GameState
    if (!saved.stateHistory) saved.stateHistory = []
    if (saved.showChaosOverlay === undefined) saved.showChaosOverlay = false
    if (saved.revealState === undefined) saved.revealState = null
    if (saved.phenomenonActive === undefined) saved.phenomenonActive = false
    if (!saved.eliminatedPlayerIds) saved.eliminatedPlayerIds = []
    // A game saved before standalone Archenemy has no `config.mode` and stores
    // schemes as `activeSchemes`. Translate rather than drop it — the tab may
    // be resuming a game that is mid-session at a table.
    saved.config = migrateGameConfig(saved.config)
    saved.archenemy = migrateArchenemyState(saved.archenemy)
    return saved
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
