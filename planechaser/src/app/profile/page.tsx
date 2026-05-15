'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Trophy, History, Swords, Dice5, MapPin, Crown } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useUserStats, useUserConquests, useUserPods, usePlaneVisitHistory } from '@/hooks/usePods'
import { useUserAchievements } from '@/hooks/useAchievements'
import { AchievementBadge } from '@/components/achievement-badge'
import { ACHIEVEMENTS } from '@/lib/achievements/definitions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type ProfileTab = 'conquests' | 'history'

const STAT_CONFIG = [
  { key: 'planes_conquered', label: 'Conquered', icon: Crown, color: 'var(--color-accent)' },
  { key: 'games_played', label: 'Games', icon: Swords, color: 'var(--color-accent)' },
  { key: 'total_rolls', label: 'Die Rolls', icon: Dice5, color: 'var(--color-accent)' },
  { key: 'planeswalk_rolls', label: 'Planeswalks', icon: MapPin, color: 'var(--color-accent)' },
  { key: 'total_planes_visited', label: 'Visited', icon: MapPin, color: 'var(--color-accent)' },
  { key: 'archenemy_games', label: 'Archenemy', icon: Swords, color: 'var(--color-cta)' },
] as const

export default function ProfilePage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const activePodId = useAppStore((s) => s.activePodId)
  const { data: stats } = useUserStats()
  const { data: conquests } = useUserConquests()
  const { data: pods } = useUserPods()
  const { data: visitHistory } = usePlaneVisitHistory()
  const { data: achievements } = useUserAchievements()
  const [tab, setTab] = useState<ProfileTab>('conquests')

  const activePod = pods?.find((p) => p.id === activePodId)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/auth')
  }

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-bg)] pb-nav">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 px-4 py-6 max-w-[520px] mx-auto w-full space-y-6">
        {/* User info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-[var(--color-accent-deep)] to-[var(--color-accent)] flex items-center justify-center mx-auto glow-purple" style={{ width: 72, height: 72 }}>
            <span className="text-[28px] text-white font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Player'}
            </h1>
            <p className="text-[12px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              {user?.email}
            </p>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2"
        >
          {STAT_CONFIG.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-3 text-center">
              <Icon size={14} className="mx-auto mb-1 opacity-40" style={{ color }} />
              <p className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>
                {stats?.[key] ?? 0}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Active pod */}
        {activePod && (
          <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>Active Pod</p>
              <p className="text-[15px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>{activePod.name}</p>
            </div>
            <Trophy size={18} className="text-[var(--color-accent)] opacity-40" />
          </div>
        )}

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[var(--color-text)] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
              Achievements
            </h2>
            <span className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              {achievements?.length ?? 0} / {ACHIEVEMENTS.length}
            </span>
          </div>
          {achievements && achievements.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {achievements.map((a) => (
                <AchievementBadge key={a.id} achievementKey={a.achievement_key} earnedAt={a.earned_at} />
              ))}
            </div>
          ) : (
            <p className="text-center text-[12px] text-[var(--color-text-muted)] py-4 rounded-xl border border-dashed border-[var(--color-border)]" style={{ fontFamily: 'var(--font-body)' }}>
              No achievements yet. Play some games to earn badges!
            </p>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/40">
          <button
            onClick={() => setTab('conquests')}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'conquests'
                ? 'bg-[var(--color-accent-deep)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <Trophy size={14} /> Conquests
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'history'
                ? 'bg-[var(--color-accent-deep)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <History size={14} /> Visit History
          </button>
        </div>

        {/* Conquests tab */}
        {tab === 'conquests' && (
          <div className="space-y-3">
            {conquests && conquests.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {conquests.map((c) => (
                  <div key={c.id} className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/60 group">
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <img
                        src={c.plane_image_uri}
                        alt={c.plane_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-[11px] font-semibold text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {c.plane_name}
                      </p>
                      <p className="text-[9px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                        {new Date(c.conquered_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[12px] text-[var(--color-text-muted)] py-6" style={{ fontFamily: 'var(--font-body)' }}>
                No conquests yet. Win a game and claim a plane!
              </p>
            )}
          </div>
        )}

        {/* Visit history tab */}
        {tab === 'history' && (
          <div className="space-y-1">
            {visitHistory && visitHistory.length > 0 ? (
              visitHistory.map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--color-surface)]/60 px-4 py-3 border border-[var(--color-border-subtle)]">
                  <span className="text-[12px] text-[var(--color-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {v.planeName}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {new Date(v.sessionDate).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-[12px] text-[var(--color-text-muted)] py-6" style={{ fontFamily: 'var(--font-body)' }}>
                No visit history yet. Play a game to start tracking!
              </p>
            )}
          </div>
        )}

        {/* Sign out */}
        <div className="pt-2">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-11 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            <LogOut size={14} className="mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    </main>
  )
}
