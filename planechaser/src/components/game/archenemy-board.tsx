'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SchemeBoard } from '@/components/game/scheme-board'
import { LifeTracker } from '@/components/game/life-tracker'
import type { ArchenemyState, Player } from '@/lib/game/types'

interface ArchenemyBoardProps {
  archenemy: ArchenemyState
  players: Player[]
  life: Record<string, number>
  eliminatedPlayerIds: string[]
  onSetSchemeInMotion: () => void
  onDismissScheme: (instanceId: string) => void
  onEndArchenemyTurn: () => void
  onAdjustLife: (playerId: string, delta: number) => void
  onSetLife: (playerId: string, value: number) => void
  onEliminatePlayer: (playerId: string) => void
  onRestorePlayer: (playerId: string) => void
}

/**
 * The standalone Archenemy screen: no planar deck, no die, no planeswalking.
 *
 * Turns alternate between the archenemy and the team as a single side, which is
 * how the format actually plays — the team takes its turns simultaneously.
 * Passing back to the archenemy sets the top scheme in motion, matching "at the
 * start of their first main phase, they reveal the top card of their scheme
 * deck".
 */
export function ArchenemyBoard({
  archenemy,
  players,
  life,
  eliminatedPlayerIds,
  onSetSchemeInMotion,
  onDismissScheme,
  onEndArchenemyTurn,
  onAdjustLife,
  onSetLife,
  onEliminatePlayer,
  onRestorePlayer,
}: ArchenemyBoardProps) {
  const isArchenemyTurn = archenemy.side === 'archenemy'
  const deckEmpty = archenemy.schemeDeck.length === 0

  const heroes = players.filter((p) => p.id !== archenemy.archenemyId)
  const heroesRemaining = heroes.filter((p) => !eliminatedPlayerIds.includes(p.id))
  const archenemyDown =
    eliminatedPlayerIds.includes(archenemy.archenemyId) ||
    (life[archenemy.archenemyId] ?? 1) <= 0

  // Advisory only: the host decides when a game is over.
  const outcome = heroes.length > 0 && heroesRemaining.length === 0
    ? `${archenemy.archenemyName} wins — every hero is eliminated.`
    : archenemyDown
      ? 'The heroes win — the archenemy is down.'
      : null

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center w-full gap-4 px-4 py-4 overflow-y-auto">
      <div className="w-full max-w-[440px] space-y-4">
        {/* Turn state */}
        <motion.div
          key={`${archenemy.side}-${archenemy.turnNumber}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`rounded-xl border p-3 text-center ${
            isArchenemyTurn
              ? 'border-[var(--color-cta)]/50 bg-[var(--color-cta)]/10'
              : 'border-[var(--color-border)] bg-white/5'
          }`}
        >
          <p
            className={`text-[16px] font-bold ${
              isArchenemyTurn ? 'text-[var(--color-cta)]' : 'text-[var(--color-accent)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isArchenemyTurn ? `${archenemy.archenemyName}'s Turn` : "Heroes' Turn"}
          </p>
          <p
            className="text-[11px] text-[var(--color-text-muted)] mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Turn {archenemy.turnNumber} · {archenemy.schemeDeck.length} scheme
            {archenemy.schemeDeck.length === 1 ? '' : 's'} left · {archenemy.schemesPlayed} set in motion
          </p>
        </motion.div>

        {outcome && (
          <p
            className="text-[12px] text-[var(--color-gold)] text-center"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {outcome} End the game when you are ready.
          </p>
        )}

        {/* Schemes in motion */}
        <section className="space-y-2">
          <p
            className="text-[10px] text-[var(--color-cta)] uppercase tracking-widest font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Schemes in Motion
          </p>
          <SchemeBoard
            schemesInMotion={archenemy.schemesInMotion}
            onDismiss={onDismissScheme}
            featureNewest
          />
        </section>

        {/* Life */}
        <section className="space-y-2">
          <p
            className="text-[10px] text-[var(--color-accent)] uppercase tracking-widest font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Life
          </p>
          <LifeTracker
            players={players}
            archenemyId={archenemy.archenemyId}
            life={life}
            eliminatedPlayerIds={eliminatedPlayerIds}
            onAdjust={onAdjustLife}
            onSet={onSetLife}
            onEliminate={onEliminatePlayer}
            onRestore={onRestorePlayer}
          />
        </section>

        {/* Controls */}
        <div className="space-y-2 pb-2">
          <Button
            onClick={onEndArchenemyTurn}
            className="w-full h-12 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white glow-red"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '13px' }}
          >
            {isArchenemyTurn ? 'End Archenemy Turn' : "End Heroes' Turn"}
          </Button>
          <Button
            onClick={onSetSchemeInMotion}
            disabled={deckEmpty}
            variant="outline"
            className="w-full h-11 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            Set Scheme in Motion
          </Button>
          {deckEmpty && (
            <p
              className="text-[11px] text-[var(--color-text-muted)] text-center"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              All schemes are in motion. Clear one to return it to the deck.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
