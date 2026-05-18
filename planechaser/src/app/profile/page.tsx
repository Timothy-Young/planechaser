'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Trophy, History, Swords, Dice5, MapPin, Crown, Pencil, Check, X, Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useUserStats, useUserConquests, useUserPods, usePlaneVisitHistory, useUserProfile, useUpdateProfile } from '@/hooks/usePods'
import { useUserAchievements } from '@/hooks/useAchievements'
import { AchievementBadge } from '@/components/achievement-badge'
import { ACHIEVEMENTS } from '@/lib/achievements/definitions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { usePlaneCorpus } from '@/hooks/useCardCorpus'
import { PlaneCarousel } from '@/components/plane-carousel'
import type { PlaneSlide } from '@/components/plane-carousel'

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
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const { data: stats } = useUserStats()
  const { data: conquests } = useUserConquests()
  const { data: pods } = useUserPods()
  const { data: visitHistory } = usePlaneVisitHistory()
  const { data: achievements } = useUserAchievements()
  const { data: profile } = useUserProfile()
  const updateProfile = useUpdateProfile()
  const [tab, setTab] = useState<ProfileTab>('conquests')
  const { data: corpus } = usePlaneCorpus()
  const cardByName = useMemo(() => {
    if (!corpus) return new Map()
    return new Map(corpus.map((c) => [c.name, c]))
  }, [corpus])
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const activePod = pods?.find((p) => p.id === activePodId)
  const displayName = profile?.display_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Player'
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url

  const conquestSlides: PlaneSlide[] = useMemo(() => {
    if (!conquests || !corpus) return []
    return conquests.map((c) => {
      const card = corpus.find((cr) => cr.id === c.plane_scryfall_id)
      return {
        name: c.plane_name,
        imageUrl: card?.image_uris?.border_crop ?? c.plane_image_uri,
        subtitle: `Conquered on ${new Date(c.conquered_at).toLocaleDateString()}`,
      }
    })
  }, [conquests, corpus])

  const historySlides: PlaneSlide[] = useMemo(() => {
    if (!visitHistory) return []
    return visitHistory.map((v) => {
      const card = cardByName.get(v.planeName)
      return {
        name: v.planeName,
        imageUrl: card?.image_uris?.border_crop ?? '',
        subtitle: new Date(v.sessionDate).toLocaleDateString(),
      }
    }).filter((s) => s.imageUrl)
  }, [visitHistory, cardByName])

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
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-[72px] h-[72px] rounded-full mx-auto ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[var(--color-accent-deep)] to-[var(--color-accent)] flex items-center justify-center mx-auto glow-purple">
              <span className="text-[28px] text-white font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                {displayName[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <div>
            {editingName ? (
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[16px] text-[var(--color-text)] text-center w-[200px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                  autoFocus
                  maxLength={30}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameInput.trim()) {
                      updateProfile.mutate({ display_name: nameInput.trim() })
                      setEditingName(false)
                    }
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button
                  onClick={() => {
                    if (nameInput.trim()) {
                      updateProfile.mutate({ display_name: nameInput.trim() })
                      setEditingName(false)
                    }
                  }}
                  className="p-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-80"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:opacity-80 border border-[var(--color-border)]"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-[22px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {displayName}
                </h1>
                <button
                  onClick={() => {
                    setNameInput(displayName)
                    setEditingName(true)
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
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
          {STAT_CONFIG.map(({ key, label, icon: Icon, color }) => {
            const isClickable = key === 'games_played'
            const Wrapper = isClickable ? 'button' : 'div'
            return (
              <Wrapper
                key={key}
                {...(isClickable ? { onClick: () => router.push('/games') } : {})}
                className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-3 text-center ${isClickable ? 'cursor-pointer hover:border-[var(--color-accent)]/50 transition-colors' : ''}`}
              >
                <Icon size={14} className="mx-auto mb-1 opacity-40" style={{ color }} />
                <p className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>
                  {stats?.[key] ?? 0}
                </p>
                <p className={`text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mt-0.5 ${isClickable ? 'underline decoration-dotted underline-offset-2' : ''}`} style={{ fontFamily: 'var(--font-body)' }}>
                  {label}
                </p>
              </Wrapper>
            )
          })}
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
          <PlaneCarousel slides={conquestSlides} emptyMessage="No conquests yet. Win a game and claim a plane!" />
        )}

        {/* Visit history tab */}
        {tab === 'history' && (
          <PlaneCarousel slides={historySlides} emptyMessage="No visit history yet. Play a game to start tracking!" />
        )}

        {/* Theme + Sign out */}
        <div className="pt-2 space-y-3">
          <Button
            onClick={toggleTheme}
            variant="outline"
            className="w-full h-11 border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10"
            style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}
          >
            {theme === 'dark' ? <Sun size={14} className="mr-2" /> : <Moon size={14} className="mr-2" />}
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Button>
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
