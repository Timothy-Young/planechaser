'use client'

import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Dice5, Zap, Navigation, Crown, Shield } from 'lucide-react'
import { useGameSession } from '@/hooks/usePods'
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
import { PlaneCarousel } from '@/components/plane-carousel'
import { CardZoomModal } from '@/components/card-zoom-modal'
import type { PlaneSlide } from '@/components/plane-carousel'

interface TurnLogEntry {
  playerId: string
  playerName: string
  rolls: { result: string; timestamp: number }[]
  planeswalked: boolean
  chaosTriggered: boolean
  planeAtStart?: string
  planeAtStartId?: string
  newPlane?: string
  newPlaneId?: string
  chaosEffects?: string[]
  conquests?: { planeName: string; conqueredBy: string }[]
  schemeRevealed?: string
  endedAt: number
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session, isLoading } = useGameSession(id)
  const { data: corpus } = usePlaneCorpus()
  const [previewPlane, setPreviewPlane] = useState<string | null>(null)
  const [previewPlaneName, setPreviewPlaneName] = useState('')

  const turnLog: TurnLogEntry[] = session?.turn_log || []
  const planesVisited: string[] = session?.planes_visited || []
  const playersSnapshot: { id: string; display_name: string }[] = session?.players_snapshot || []
  const isArchenemy = session?.game_type === 'archenemy'

  const totalRolls = turnLog.reduce((sum, turn) => sum + (turn.rolls?.length || 0), 0)

  const cardByName = useMemo(() => {
    if (!corpus) return new Map()
    return new Map(corpus.map((c) => [c.name, c]))
  }, [corpus])

  const planeSlides: PlaneSlide[] = useMemo(() => {
    return planesVisited
      .map((name) => {
        const card = cardByName.get(name)
        return {
          name,
          imageUrl: card?.image_uris?.border_crop ?? '',
        }
      })
      .filter((s) => s.imageUrl)
  }, [planesVisited, cardByName])

  function openPlanePreview(planeName: string) {
    const card = cardByName.get(planeName)
    if (card) {
      setPreviewPlane(card.image_uris.normal)
      setPreviewPlaneName(planeName)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen pb-nav flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen pb-nav flex flex-col items-center justify-center gap-4" style={{ background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Game not found</p>
        <button onClick={() => router.back()} style={{ color: 'var(--color-accent)' }}>Go back</button>
      </main>
    )
  }

  const gameDate = new Date(session.started_at)
  const dateStr = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  function getTurnColor(turn: TurnLogEntry): string {
    if (turn.planeswalked) return 'var(--color-accent)'
    if (turn.chaosTriggered) return 'var(--color-cta)'
    return 'var(--color-border)'
  }

  function getRollIcon(result: string) {
    switch (result) {
      case 'chaos': return <span title="Chaos"><Zap size={14} style={{ color: 'var(--color-cta)' }} /></span>
      case 'planeswalk': return <span title="Planeswalk"><Navigation size={14} style={{ color: 'var(--color-accent)' }} /></span>
      default: return <span title="Blank"><Dice5 size={14} style={{ color: 'var(--color-text-muted)' }} /></span>
    }
  }

  return (
    <main className="min-h-screen pb-nav" style={{ background: 'var(--color-bg)' }}>
      <CardZoomModal
        src={previewPlane}
        alt={previewPlaneName}
        onClose={() => setPreviewPlane(null)}
        rotate={true}
      />

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text)', background: 'var(--color-surface)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>
            {isArchenemy ? 'Archenemy Game' : 'Planechase Game'}
          </h1>
        </div>
        <div className="ml-12 text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <span>{dateStr} at {timeStr}</span>
          {(() => {
            const pod = (session as Record<string, unknown>).pods as { name: string } | null
            return pod?.name ? (
              <>
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                  <Shield size={12} />
                  {pod.name}
                </span>
              </>
            ) : null
          })()}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>
              {planesVisited.length}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Planes</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>
              {totalRolls}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Rolls</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>
              {turnLog.length}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Turns</div>
          </div>
        </div>
      </div>

      {/* Players */}
      {playersSnapshot.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)' }}>
            Players
          </h2>
          <div className="flex flex-wrap gap-2">
            {playersSnapshot.map((player) => (
              <span
                key={player.id}
                className="px-3 py-1 rounded-full text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              >
                {player.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Turn Timeline or Fallback */}
      <div className="px-4">
        {turnLog.length > 0 ? (
          <>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)' }}>
              Turn Timeline
            </h2>
            <div className="relative">
              {turnLog.map((turn, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-3 mb-4 last:mb-0"
                >
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: getTurnColor(turn), color: 'var(--color-bg)' }}
                    >
                      {index + 1}
                    </div>
                    {index < turnLog.length - 1 && (
                      <div className="w-0.5 flex-1 mt-1" style={{ background: 'var(--color-border)' }} />
                    )}
                  </div>

                  {/* Turn content */}
                  <div className="flex-1 pb-4">
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {turn.playerName}
                    </div>
                    {turn.planeAtStart && (
                      <button
                        onClick={() => openPlanePreview(turn.planeAtStart!)}
                        className="text-xs mb-1 hover:underline transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        on <span style={{ color: 'var(--color-accent)' }}>{turn.planeAtStart}</span>
                      </button>
                    )}

                    {/* Roll icons */}
                    {turn.rolls && turn.rolls.length > 0 && (
                      <div className="flex gap-1 my-1">
                        {turn.rolls.map((roll, ri) => (
                          <span key={ri} className="p-1 rounded" style={{ background: 'var(--color-surface)' }}>
                            {getRollIcon(roll.result)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Events */}
                    {turn.chaosTriggered && (
                      <div className="text-xs font-medium mt-1" style={{ color: 'var(--color-cta)' }}>
                        ⚡ Chaos triggered
                      </div>
                    )}
                    {turn.planeswalked && (
                      <div
                        className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--color-accent)', color: 'white' }}
                      >
                        <Navigation size={14} />
                        <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                          Planeswalked{turn.newPlane && ' to '}
                        </span>
                        {turn.newPlane && (
                          <button
                            onClick={() => openPlanePreview(turn.newPlane!)}
                            className="text-xs font-bold hover:underline underline-offset-2"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {turn.newPlane}
                          </button>
                        )}
                      </div>
                    )}
                    {turn.conquests && turn.conquests.length > 0 && (
                      <div className="text-xs font-medium mt-1" style={{ color: 'var(--color-gold)' }}>
                        <Crown size={12} className="inline mr-1" />
                        {turn.conquests.map((c, ci) => (
                          <span key={ci}>{c.conqueredBy} conquered {c.planeName}{ci < turn.conquests!.length - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                    )}
                    {turn.schemeRevealed && (
                      <div className="text-xs font-medium mt-1" style={{ color: 'var(--color-cta)' }}>
                        <Shield size={12} className="inline mr-1" />
                        Scheme: {turn.schemeRevealed}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)' }}>
              Planes Visited
            </h2>
            <PlaneCarousel slides={planeSlides} emptyMessage="No plane data recorded for this game." />
          </>
        )}
      </div>
    </main>
  )
}
