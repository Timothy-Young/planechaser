'use client'

import type { ReactNode } from 'react'
import { PlaneCard } from '@/components/plane-card'
import { DualPlaneDisplay } from '@/components/dual-plane-display'
import { DieRoller } from '@/components/die-roller'
import { TurnIndicator } from '@/components/turn-indicator'
import { GameControlsToolbar } from '@/components/game-controls-toolbar'
import type { DieResult, GameState, PlaneCard as PlaneCardType } from '@/lib/game/types'

interface PlanechaseBoardProps {
  state: GameState
  slideDirection: 'left' | 'right'
  visitedBreadcrumb: string[]
  onRoll: (result: DieResult) => void
  onEndTurn: () => void
  onUndo: () => void
  onShuffle: () => void
  onResetRolls: () => void
  onAddRoll: () => void
  onRemoveRoll: () => void
  onManualPlaneswalk: () => void
  onManualChaos: () => void
  onShowPlayers?: () => void
  onPreviewPlane: (card: PlaneCardType) => void
  /** The scheme sheet, in a combined Planechase + Archenemy game. */
  schemeSlot?: ReactNode
}

/** The Planechase play area: breadcrumb, turn, plane card, die, and controls. */
export function PlanechaseBoard({
  state,
  slideDirection,
  visitedBreadcrumb,
  onRoll,
  onEndTurn,
  onUndo,
  onShuffle,
  onResetRolls,
  onAddRoll,
  onRemoveRoll,
  onManualPlaneswalk,
  onManualChaos,
  onShowPlayers,
  onPreviewPlane,
  schemeSlot,
}: PlanechaseBoardProps) {
  const currentPlane = state.deck[state.currentPlaneIndex]
  const secondPlane = state.secondPlaneIndex !== null ? state.deck[state.secondPlaneIndex] : null
  const currentPlayerName =
    state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex])?.display_name ?? 'Player'

  return (
    <>
      {visitedBreadcrumb.length > 1 && (
        <div className="relative z-10 px-4 py-2 overflow-x-auto">
          <div
            className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {visitedBreadcrumb.map((name, i) => (
              <span key={i} className="flex items-center whitespace-nowrap">
                {i > 0 && <span className="mx-1 opacity-60">←</span>}
                <button
                  onClick={() => {
                    const card = state.deck.find((c) => c.name === name)
                    if (card) onPreviewPlane(card)
                  }}
                  className={`hover:text-[var(--color-accent)] active:text-[var(--color-accent)] transition-colors underline decoration-dotted underline-offset-2 ${
                    i === 0 ? 'text-[var(--color-accent)] font-semibold' : 'opacity-60'
                  }`}
                >
                  {name}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-between py-4 px-4 gap-3 overflow-hidden">
        {schemeSlot}

        {state.players && state.players.length > 1 && (
          <TurnIndicator
            playerName={currentPlayerName}
            onNextTurn={onEndTurn}
            showNextTurn={!state.showChaosOverlay && !state.revealState && !state.phenomenonActive}
            eliminatedCount={(state.eliminatedPlayerIds ?? []).length}
          />
        )}

        <div className="flex-1 flex items-center justify-center w-full max-w-[440px]">
          {currentPlane && secondPlane ? (
            <DualPlaneDisplay
              primaryPlane={currentPlane}
              secondaryPlane={secondPlane}
              direction={slideDirection}
            />
          ) : currentPlane ? (
            <PlaneCard card={currentPlane} direction={slideDirection} />
          ) : null}
        </div>

        <div className="flex items-center gap-4 pb-2">
          <DieRoller
            rollCount={state.rollCountThisTurn}
            currentTurnRolls={state.currentTurnRolls}
            playerName={currentPlayerName}
            onRoll={onRoll}
            disabled={state.lastDieResult === 'planeswalk' || state.showChaosOverlay}
          />
        </div>

        <GameControlsToolbar
          onUndo={onUndo}
          onShuffle={onShuffle}
          onResetRolls={onResetRolls}
          onAddRoll={onAddRoll}
          onRemoveRoll={onRemoveRoll}
          onPlaneswalk={onManualPlaneswalk}
          onChaos={onManualChaos}
          onShowPlayers={onShowPlayers}
          canUndo={(state.stateHistory?.length ?? 0) > 0}
          rollCount={state.rollCountThisTurn ?? 0}
          eliminatedCount={(state.eliminatedPlayerIds ?? []).length}
          disabled={state.showChaosOverlay || !!state.revealState || state.phenomenonActive}
        />
      </div>
    </>
  )
}
