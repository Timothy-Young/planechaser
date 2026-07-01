'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Users,
  BarChart3,
  MessageSquare,
  Layers,
  Search,
  Globe,
  Lock,
  Trash2,
  Mail,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Ban,
  ClipboardList,
  Megaphone,
  Plus,
  Power,
  PowerOff,
  Info,
  Wrench,
  Sparkles,
  Undo2,
  Eye,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import {
  useAppStats,
  useExtendedStats,
  useAdminUsers,
  useUpdateUserRole,
  useUserStrikes,
  useAddStrike,
  useRevokeStrike,
  useBanUser,
  useUnbanUser,
  useAdminFeedback,
  useReplyToFeedback,
  useUpdateFeedbackStatus,
  useAdminCustomPlanes,
  useAdminDeleteCustomPlane,
  useAuditLog,
  useAllAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  useAdminNotes,
  useAddAdminNote,
  useDeleteAdminNote,
} from '@/hooks/useAdmin'
import { ACHIEVEMENTS } from '@/lib/achievements/definitions'
import { getRoleLabel, getRoleColor, isOwner, isAdmin } from '@/lib/admin/guards'
import { getImageUrl } from '@/lib/custom-planes/storage'
import type { UserRole, AdminUser, AdminFeedback, AdminCustomPlane, UserStrike, AuditLogEntry, SystemAnnouncement, AnnouncementType } from '@/lib/admin/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminTab = 'stats' | 'users' | 'planes' | 'feedback' | 'announce' | 'audit'

const FEEDBACK_CATEGORY_EMOJI: Record<string, string> = {
  bug: '🐛',
  feature: '💡',
  general: '💬',
  other: '📝',
}

const FEEDBACK_STATUSES = ['all', 'new', 'read', 'replied', 'resolved'] as const
type FeedbackStatusFilter = (typeof FEEDBACK_STATUSES)[number]

const USER_ROLE_FILTERS = ['all', 'owner', 'admin', 'mod', 'user'] as const
type UserRoleFilter = (typeof USER_ROLE_FILTERS)[number]

const USER_STATUS_FILTERS = ['all', 'active', 'banned'] as const
type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]

const AUDIT_ACTION_LABELS: Record<string, string> = {
  role_change: 'Changed Role',
  strike_added: 'Added Strike',
  strike_revoked: 'Revoked Strike',
  user_banned: 'Banned User',
  user_unbanned: 'Unbanned User',
  plane_deleted: 'Deleted Plane',
  feedback_replied: 'Replied to Feedback',
  feedback_status_changed: 'Changed Status',
  note_added: 'Added Note',
  note_deleted: 'Deleted Note',
  announcement_created: 'Created Announcement',
  announcement_updated: 'Updated Announcement',
  announcement_deleted: 'Deleted Announcement',
}

const AUDIT_ACTION_COLORS: Record<string, string> = {
  role_change: 'var(--color-accent)',
  strike_added: 'var(--color-cta)',
  strike_revoked: 'var(--color-gold)',
  user_banned: 'var(--color-cta)',
  user_unbanned: 'var(--color-accent)',
  plane_deleted: 'var(--color-cta)',
  feedback_replied: 'var(--color-accent)',
  feedback_status_changed: 'var(--color-text-muted)',
  note_added: 'var(--color-accent)',
  note_deleted: 'var(--color-text-muted)',
  announcement_created: 'var(--color-accent)',
  announcement_updated: 'var(--color-text-muted)',
  announcement_deleted: 'var(--color-cta)',
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, tooltip, onClick }: { value: number | string; label: string; color: string; tooltip?: string; onClick?: () => void }) {
  const [showPopover, setShowPopover] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPopover) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setShowPopover(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => { document.removeEventListener('mousedown', handleOutside); document.removeEventListener('touchstart', handleOutside) }
  }, [showPopover])

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-4 text-center ${tooltip || onClick ? 'cursor-pointer active:scale-[0.97] transition-transform' : ''}`}
      style={{ zIndex: showPopover ? 50 : undefined }}
      onClick={() => {
        if (onClick) { onClick(); return }
        if (tooltip) setShowPopover((p) => !p)
      }}
    >
      <p
        className="text-[28px] font-bold leading-none"
        style={{ fontFamily: 'var(--font-heading)', color }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p
        className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mt-1"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
      {/* Popover — renders below card */}
      <AnimatePresence>
        {showPopover && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-[180px] max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg px-3 py-2"
          >
            <p className="text-[11px] text-[var(--color-text)] leading-snug text-center" style={{ fontFamily: 'var(--font-body)' }}>
              {tooltip}
            </p>
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 border-l border-t border-[var(--color-border)] bg-[var(--color-surface)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ setTab }: { setTab: (t: AdminTab) => void }) {
  const { data: stats, isLoading } = useAppStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 h-[80px] animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { value: stats.total_users, label: 'Total Users', color: 'var(--color-accent)', tooltip: 'Total registered accounts' },
    { value: stats.users_last_7_days, label: 'New (7d)', color: 'var(--color-accent)', tooltip: 'Users who signed up in the last 7 days' },
    { value: stats.banned_users, label: 'Banned', color: 'var(--color-cta)', tooltip: 'Currently banned users' },
    { value: stats.total_games, label: 'Total Games', color: 'var(--color-accent)', tooltip: 'All completed game sessions' },
    { value: stats.games_last_7_days, label: 'Games (7d)', color: 'var(--color-accent)', tooltip: 'Games played in the last 7 days' },
    { value: stats.total_conquests, label: 'Conquests', color: 'var(--color-gold)', tooltip: 'Total planes conquered across all pods' },
    { value: stats.total_custom_planes, label: 'Custom Planes', color: 'var(--color-accent)', tooltip: 'User-created custom planes' },
    { value: stats.total_feedback, label: 'Feedback', color: 'var(--color-accent)', tooltip: 'Total feedback submissions' },
    { value: stats.new_feedback, label: 'Pending', color: 'var(--color-cta)', tooltip: 'Feedback awaiting admin review' },
  ]

  const categoryBreakdown = stats.feedback_by_category
  const totalFb = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0)

  const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
    bug: { emoji: '🐛', color: 'var(--color-cta)' },
    feature: { emoji: '💡', color: 'var(--color-gold)' },
    general: { emoji: '💬', color: 'var(--color-accent)' },
    other: { emoji: '📝', color: 'var(--color-text-muted)' },
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Feedback Category Breakdown — click to jump to feedback tab */}
      {totalFb > 0 && (
        <div
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3 cursor-pointer active:scale-[0.98] transition-transform hover:border-[var(--color-accent)]/40"
          onClick={() => setTab('feedback')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setTab('feedback') }}
        >
          <p
            className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Feedback Breakdown
          </p>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-[60px]">
            {Object.entries(categoryBreakdown).map(([cat, count]) => {
              const pct = totalFb > 0 ? (count / totalFb) * 100 : 0
              const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other
              return (
                <div key={cat} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 4)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-full rounded-t-md"
                    style={{ background: config.color, minHeight: count > 0 ? 4 : 0 }}
                  />
                </div>
              )
            })}
          </div>

          {/* Labels */}
          <div className="flex gap-1">
            {Object.entries(categoryBreakdown).map(([cat, count]) => {
              const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other
              return (
                <div key={cat} className="flex-1 text-center">
                  <span className="text-[14px]">{config.emoji}</span>
                  <p
                    className="text-[10px] font-bold mt-0.5"
                    style={{ color: config.color, fontFamily: 'var(--font-heading)' }}
                  >
                    {count}
                  </p>
                  <p
                    className="text-[9px] text-[var(--color-text-muted)] capitalize"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {cat === 'bug' ? 'Bugs' : cat === 'feature' ? 'Features' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <GameAnalyticsSection />
      <ActivitySparkline />
      <PeakHoursChart />
      <LeaderboardSection />
      <AchievementAuditSection />
    </div>
  )
}

// ─── Game Analytics Section ───────────────────────────────────────────────────
function GameAnalyticsSection() {
  const { data: ext, isLoading } = useExtendedStats()
  const [planePreview, setPlanePreview] = useState<{ url: string; name: string } | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-[80px] rounded-xl bg-[var(--color-surface)]/40 animate-pulse border border-[var(--color-border)]" />
        <div className="h-[120px] rounded-xl bg-[var(--color-surface)]/40 animate-pulse border border-[var(--color-border)]" />
      </div>
    )
  }

  if (!ext) return null
  const ga = ext.game_analytics

  const analyticCards = [
    { value: ga.avg_turns_per_game.toString(), label: 'Avg Turns', color: 'var(--color-accent)', tooltip: 'Average number of turns per game' },
    { value: ga.avg_rolls_per_game.toString(), label: 'Avg Rolls', color: 'var(--color-accent)', tooltip: 'Average die rolls per game' },
    { value: `${(ga.chaos_trigger_rate * 100).toFixed(1)}%`, label: 'Chaos Rate', color: 'var(--color-cta)', tooltip: 'Percentage of rolls that trigger chaos' },
    { value: `${(ga.planeswalk_rate * 100).toFixed(1)}%`, label: 'Walk Rate', color: 'var(--color-accent)', tooltip: 'Percentage of rolls that trigger planeswalk' },
    { value: ga.avg_rolls_per_planeswalk.toString(), label: 'Rolls/Walk', color: 'var(--color-gold)', tooltip: 'Average rolls before a planeswalk happens' },
    { value: ga.total_planes_visited, label: 'Unique Planes', color: 'var(--color-accent)', tooltip: 'Distinct planes visited across all games' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
        🎲 Game Analytics
      </p>
      <div className="grid grid-cols-3 gap-3">
        {analyticCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={ext.total_pods} label="Pods" color="var(--color-accent)" tooltip="Total pods created" />
        <StatCard value={ext.returning_players} label="Returning" color="var(--color-gold)" tooltip="Players who played in 2+ distinct weeks" />
        <StatCard value={ext.total_achievements_earned} label="Achievements" color="var(--color-accent)" tooltip="Total achievements earned across all users" />
      </div>
      {ga.plane_of_the_week && (
        <div
          className="rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform hover:border-[var(--color-gold)]/60"
          onClick={() => {
            const name = ga.plane_of_the_week!.plane_name
            const encoded = encodeURIComponent(name)
            setPlanePreview({ url: `https://api.scryfall.com/cards/named?fuzzy=${encoded}&format=image&version=border_crop`, name })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const name = ga.plane_of_the_week!.plane_name
              const encoded = encodeURIComponent(name)
              setPlanePreview({ url: `https://api.scryfall.com/cards/named?fuzzy=${encoded}&format=image&version=border_crop`, name })
            }
          }}
        >
          <span className="text-[20px]">🌟</span>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
              Plane of the Week
            </p>
            <p className="text-[13px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {ga.plane_of_the_week.plane_name}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              Visited {ga.plane_of_the_week.count} time{ga.plane_of_the_week.count !== 1 ? 's' : ''} this week
            </p>
          </div>
        </div>
      )}
      {planePreview && (
        <ImagePreviewModal url={planePreview.url} name={planePreview.name} onClose={() => setPlanePreview(null)} landscape />
      )}
    </div>
  )
}

// ─── Activity Sparkline ───────────────────────────────────────────────────────
function ActivitySparkline() {
  const { data: ext } = useExtendedStats()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  if (!ext || ext.daily_games_30d.length === 0) return null

  const dailyData = ext.daily_games_30d
  const maxCount = Math.max(...dailyData.map((d) => d.count), 1)
  const total30d = dailyData.reduce((sum, d) => sum + d.count, 0)
  const selected = selectedIdx !== null ? dailyData[selectedIdx] : null

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
          📈 Activity (30 Days)
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          {total30d} game{total30d !== 1 ? 's' : ''}
        </p>
      </div>
      {/* Selected day detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 px-3 py-1.5 flex items-center justify-between"
          >
            <span className="text-[11px] font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {new Date(selected.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="text-[12px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {selected.count} game{selected.count !== 1 ? 's' : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-end gap-[2px] h-[48px]">
        {dailyData.map((d, i) => {
          const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
          const isSelected = selectedIdx === i
          return (
            <div
              key={d.date}
              className="flex-1 rounded-t-sm transition-all cursor-pointer"
              style={{
                height: `${Math.max(heightPct, d.count > 0 ? 8 : 2)}%`,
                background: isSelected ? 'var(--color-gold)' : d.count > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                minHeight: d.count > 0 ? 3 : 1,
                opacity: selectedIdx !== null && !isSelected ? 0.5 : 1,
              }}
              onClick={() => setSelectedIdx(isSelected ? null : i)}
              title={`${d.date}: ${d.count} game${d.count !== 1 ? 's' : ''}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between">
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>30d ago</span>
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Today</span>
      </div>
    </div>
  )
}

// ─── Peak Hours Chart ─────────────────────────────────────────────────────────
function PeakHoursChart() {
  const { data: ext } = useExtendedStats()
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  if (!ext) return null

  const hours = ext.game_analytics.peak_play_hours
  const maxH = Math.max(...hours, 1)
  const totalGames = hours.reduce((a, b) => a + b, 0)
  if (totalGames === 0) return null

  const displayHours = Array.from({ length: 24 }, (_, i) => i)
  const formatHour = (h: number) => h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
      <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
        🕐 Peak Play Times
      </p>
      {/* Selected hour detail */}
      <AnimatePresence>
        {selectedHour !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 px-3 py-1.5 flex items-center justify-between"
          >
            <span className="text-[11px] font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {formatHour(selectedHour)}
            </span>
            <span className="text-[12px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {hours[selectedHour]} game{hours[selectedHour] !== 1 ? 's' : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-end gap-[2px] h-[40px]">
        {displayHours.map((h) => {
          const count = hours[h]
          const heightPct = maxH > 0 ? (count / maxH) * 100 : 0
          const isSelected = selectedHour === h
          return (
            <div
              key={h}
              className="flex-1 rounded-t-sm cursor-pointer transition-all"
              style={{
                height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%`,
                background: isSelected ? 'var(--color-gold)' : count > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                minHeight: count > 0 ? 2 : 1,
                opacity: selectedHour !== null && !isSelected ? 0.5 : 1,
              }}
              onClick={() => setSelectedHour(isSelected ? null : h)}
              title={`${formatHour(h)}: ${count} game${count !== 1 ? 's' : ''}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between">
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>12am</span>
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>12pm</span>
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>11pm</span>
      </div>
    </div>
  )
}

// ─── Leaderboard Section ──────────────────────────────────────────────────────
function LeaderboardSection() {
  const { data: ext } = useExtendedStats()
  const { data: allUsers } = useAdminUsers()

  // Build user_id → display_name map from admin users
  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const u of allUsers ?? []) {
      if (u.display_name) map[u.id] = u.display_name
    }
    return map
  }, [allUsers])

  if (!ext) return null

  return (
    <div className="space-y-4">
      {ext.top_conquerors.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
            👑 Top Conquerors
          </p>
          <div className="space-y-2">
            {ext.top_conquerors.slice(0, 5).map((c, i) => (
              <div key={c.user_id} className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    background: i === 0 ? 'var(--color-gold)' : i === 1 ? 'var(--color-text-muted)' : i === 2 ? '#CD7F32' : 'var(--color-border)',
                    color: i < 3 ? 'white' : 'var(--color-text-muted)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-[12px] text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {userNameMap[c.user_id] || c.display_name || c.user_id.slice(0, 8)}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ext.top_conquered_planes.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
            🏆 Most Conquered Planes
          </p>
          <div className="space-y-2">
            {ext.top_conquered_planes.slice(0, 5).map((p, i) => (
              <div key={p.plane_name} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-right shrink-0">{i + 1}</span>
                <span className="flex-1 text-[12px] text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {p.plane_name}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {p.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ext.game_analytics.most_visited_planes.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
            🗺️ Most Visited Planes
          </p>
          <div className="space-y-2">
            {ext.game_analytics.most_visited_planes.slice(0, 5).map((p, i) => (
              <div key={p.plane_name} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-right shrink-0">{i + 1}</span>
                <span className="flex-1 text-[12px] text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {p.plane_name}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {p.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ext.most_active_pods.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
            🛡️ Most Active Pods (30d)
          </p>
          <div className="space-y-2">
            {ext.most_active_pods.map((pod, i) => (
              <div key={pod.pod_id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-4 text-right shrink-0">{i + 1}</span>
                <span className="flex-1 text-[12px] text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                  {pod.pod_name}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {pod.game_count} game{pod.game_count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Achievement Audit Section ────────────────────────────────────────────────
function AchievementAuditSection() {
  const { data: ext } = useExtendedStats()
  if (!ext || ext.achievement_distribution.length === 0) return null

  const achievementMap = new Map(ACHIEVEMENTS.map((a) => [a.key, a]))
  const maxEarned = Math.max(...ext.achievement_distribution.map((a) => a.earned_count), 1)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
          🏅 Achievement Audit
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          {ext.achievement_distribution.length} / {ACHIEVEMENTS.length} unlocked
        </p>
      </div>
      <div className="space-y-1.5">
        {ext.achievement_distribution.map((stat) => {
          const def = achievementMap.get(stat.achievement_key)
          const widthPct = (stat.earned_count / maxEarned) * 100
          return (
            <div key={stat.achievement_key} className="flex items-center gap-2">
              <span className="text-[14px] shrink-0" title={def?.name ?? stat.achievement_key}>
                {def?.icon ?? '❓'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-[var(--color-text)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                    {def?.name ?? stat.achievement_key}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--color-accent)] shrink-0 ml-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {stat.earned_count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {ACHIEVEMENTS.length > ext.achievement_distribution.length && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p className="text-[9px] text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Not yet earned:
          </p>
          <div className="flex flex-wrap gap-1">
            {ACHIEVEMENTS
              .filter((a) => !ext.achievement_distribution.some((s) => s.achievement_key === a.key))
              .map((a) => (
                <span key={a.key} className="text-[12px] opacity-30" title={`${a.name}: ${a.description}`}>
                  {a.icon}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Strike History ──────────────────────────────────────────────────────────
function StrikeHistory({ userId, currentUserId, canModify }: { userId: string; currentUserId: string; canModify: boolean }) {
  const { data: strikes, isLoading } = useUserStrikes(userId)
  const revokeStrikeMut = useRevokeStrike()

  if (isLoading) return <div className="h-8 animate-pulse bg-[var(--color-surface)]/40 rounded-lg" />
  if (!strikes || strikes.length === 0) return (
    <p className="text-[10px] text-[var(--color-text-muted)] italic" style={{ fontFamily: 'var(--font-body)' }}>No strike history.</p>
  )

  return (
    <div className="space-y-2">
      {strikes.map((s) => {
        const isActive = !s.revoked_at
        const adminName = (s.admin_profile as { display_name: string } | null)?.display_name ?? 'Unknown'
        const revokerName = (s.revoker_profile as { display_name: string } | null)?.display_name
        return (
          <div
            key={s.id}
            className="rounded-lg border px-3 py-2 space-y-1"
            style={{
              borderColor: isActive ? 'color-mix(in srgb, var(--color-cta) 30%, transparent)' : 'var(--color-border)',
              background: isActive ? 'color-mix(in srgb, var(--color-cta) 5%, transparent)' : 'var(--color-surface)',
              opacity: isActive ? 1 : 0.6,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.reason}
                </p>
                <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  by {adminName} · {new Date(s.created_at).toLocaleDateString()}
                  {s.revoked_at && ` · Revoked by ${revokerName ?? 'Unknown'} on ${new Date(s.revoked_at).toLocaleDateString()}`}
                </p>
              </div>
              {isActive && canModify && (
                <button
                  onClick={() => {
                    if (!window.confirm('Revoke this strike?')) return
                    revokeStrikeMut.mutate({ adminId: currentUserId, strikeId: s.id, userId })
                  }}
                  disabled={revokeStrikeMut.isPending}
                  title="Revoke strike"
                  className="flex items-center gap-1 h-6 px-2 rounded-md border border-[var(--color-border)] text-[9px] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/40 hover:text-[var(--color-gold)] transition-colors disabled:opacity-50 shrink-0"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <Undo2 size={9} />
                  Revoke
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Admin Notes Panel ────────────────────────────────────────────────────────
function AdminNotesPanel({ userId, currentUserId, canModify }: { userId: string; currentUserId: string; canModify: boolean }) {
  const { data: notes, isLoading } = useAdminNotes(userId)
  const addNote = useAddAdminNote()
  const deleteNote = useDeleteAdminNote()
  const [newNote, setNewNote] = useState('')

  if (isLoading) return <div className="h-8 animate-pulse bg-[var(--color-surface)]/40 rounded-lg" />

  return (
    <div className="space-y-2">
      {notes && notes.length > 0 ? (
        notes.map((n) => {
          const adminName = (n.admin_profile as { display_name: string } | null)?.display_name ?? 'Unknown'
          return (
            <div key={n.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-[var(--color-text-secondary)] flex-1" style={{ fontFamily: 'var(--font-body)' }}>
                  {n.note}
                </p>
                {(n.admin_id === currentUserId || canModify) && (
                  <button
                    onClick={() => {
                      if (!window.confirm('Delete this note?')) return
                      deleteNote.mutate({ adminId: currentUserId, noteId: n.id, userId })
                    }}
                    disabled={deleteNote.isPending}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-cta)] transition-colors shrink-0"
                    title="Delete note"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
              <p className="text-[9px] text-[var(--color-text-muted)] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                {adminName} · {new Date(n.created_at).toLocaleDateString()}
              </p>
            </div>
          )
        })
      ) : (
        <p className="text-[10px] text-[var(--color-text-muted)] italic" style={{ fontFamily: 'var(--font-body)' }}>No notes yet.</p>
      )}

      {canModify && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value.slice(0, 1000))}
            placeholder="Add a note..."
            maxLength={1000}
            className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[11px] px-2 focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newNote.trim()) {
                addNote.mutate({ adminId: currentUserId, userId, note: newNote.trim() })
                setNewNote('')
              }
            }}
          />
          <button
            onClick={() => {
              if (!newNote.trim()) return
              addNote.mutate({ adminId: currentUserId, userId, note: newNote.trim() })
              setNewNote('')
            }}
            disabled={!newNote.trim() || addNote.isPending}
            className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors disabled:opacity-40"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({
  u,
  currentUserId,
  currentUserRole,
}: {
  u: AdminUser
  currentUserId: string
  currentUserRole: UserRole
}) {
  const updateRole = useUpdateUserRole()
  const addStrikeMut = useAddStrike()
  const banUserMut = useBanUser()
  const unbanUserMut = useUnbanUser()

  const [banReason, setBanReason] = useState('')
  const [showBanInput, setShowBanInput] = useState(false)
  const [strikeReason, setStrikeReason] = useState('')
  const [showStrikeInput, setShowStrikeInput] = useState(false)
  const [showStrikes, setShowStrikes] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const isSelf = u.id === currentUserId
  const targetIsOwner = u.role === 'owner'
  const canModify = !isSelf && !targetIsOwner && (
    isOwner(currentUserRole) || (!isAdmin(u.role) && isAdmin(currentUserRole))
  )

  const roleOptions: UserRole[] = isOwner(currentUserRole)
    ? ['owner', 'admin', 'mod', 'user']
    : ['mod', 'user']

  function handleRoleChange(role: UserRole) {
    if (!canModify) return
    updateRole.mutate({ adminId: currentUserId, userId: u.id, role, previousRole: u.role })
  }

  function handleStrike() {
    if (!canModify || !strikeReason.trim()) return
    if (!window.confirm(`Add a strike to ${u.display_name}?\nReason: "${strikeReason.trim()}"`)) return
    addStrikeMut.mutate({ adminId: currentUserId, userId: u.id, reason: strikeReason.trim() })
    setStrikeReason('')
    setShowStrikeInput(false)
  }

  function handleBan() {
    if (!canModify || !banReason.trim()) return
    if (!window.confirm(`Ban ${u.display_name}? Reason: "${banReason}"`)) return
    banUserMut.mutate({ adminId: currentUserId, userId: u.id, reason: banReason.trim() })
    setBanReason('')
    setShowBanInput(false)
  }

  function handleUnban() {
    if (!canModify) return
    if (!window.confirm(`Unban ${u.display_name}?`)) return
    unbanUserMut.mutate({ adminId: currentUserId, userId: u.id })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px] font-bold text-[var(--color-text)] truncate"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {u.display_name}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border"
              style={{
                color: getRoleColor(u.role),
                borderColor: getRoleColor(u.role),
                background: `color-mix(in srgb, ${getRoleColor(u.role)} 12%, transparent)`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {getRoleLabel(u.role)}
            </span>
            {u.is_banned && (
              <span
                className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-[var(--color-cta)]/60 text-[var(--color-cta)] bg-[var(--color-cta)]/10"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Banned
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            #{u.friend_code} · Joined {new Date(u.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Strike circles — clickable to toggle history */}
        <button
          onClick={() => setShowStrikes((p) => !p)}
          className="flex items-center gap-1 shrink-0 hover:opacity-80 transition-opacity"
          title="View strike history"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border"
              style={{
                borderColor: i < u.strike_count ? 'var(--color-cta)' : 'var(--color-border)',
                background: i < u.strike_count ? 'var(--color-cta)' : 'transparent',
              }}
            />
          ))}
          <span className="text-[10px] text-[var(--color-text-muted)] ml-1" style={{ fontFamily: 'var(--font-body)' }}>
            {u.strike_count}/3
          </span>
          {showStrikes ? <ChevronUp size={10} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={10} className="text-[var(--color-text-muted)]" />}
        </button>
      </div>

      {/* Ban reason */}
      {u.is_banned && u.ban_reason && (
        <div className="rounded-lg border border-[var(--color-cta)]/20 bg-[var(--color-cta)]/5 px-3 py-2">
          <p className="text-[11px] text-[var(--color-cta)]" style={{ fontFamily: 'var(--font-body)' }}>
            Ban reason: {u.ban_reason}
          </p>
        </div>
      )}

      {/* Strike history (expandable) */}
      {showStrikes && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Strike History
          </p>
          <StrikeHistory userId={u.id} currentUserId={currentUserId} canModify={canModify} />
        </div>
      )}

      {/* Admin notes (expandable) */}
      {showNotes && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Admin Notes
          </p>
          <AdminNotesPanel userId={u.id} currentUserId={currentUserId} canModify={canModify || isSelf} />
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
        <span>{u.games_hosted ?? 0} games</span>
        <span>{u.conquests ?? 0} conquests</span>
        <span>{u.custom_planes_count ?? 0} planes</span>
        <span>{u.feedback_count ?? 0} feedback</span>
      </div>

      {/* Actions */}
      {canModify && (
        <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role dropdown */}
            <div className="relative">
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                disabled={updateRole.isPending}
                className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[11px] pl-2 pr-6 appearance-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            </div>

            {/* Strike button */}
            <button
              onClick={() => setShowStrikeInput((p) => !p)}
              className={`flex items-center gap-1 h-8 px-3 rounded-lg border text-[11px] transition-colors ${
                showStrikeInput
                  ? 'border-[var(--color-cta)]/40 text-[var(--color-cta)] bg-[var(--color-cta)]/5'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)]'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <AlertTriangle size={11} />
              Strike
            </button>

            {/* Ban / Unban */}
            {u.is_banned ? (
              <button
                onClick={handleUnban}
                disabled={unbanUserMut.isPending}
                className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--color-accent)]/40 text-[11px] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Unban
              </button>
            ) : (
              <button
                onClick={() => setShowBanInput((p) => !p)}
                className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)] transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Ban size={11} />
                Ban
              </button>
            )}

            {/* Notes toggle */}
            <button
              onClick={() => setShowNotes((p) => !p)}
              className={`flex items-center gap-1 h-8 px-3 rounded-lg border text-[11px] transition-colors ${
                showNotes
                  ? 'border-[var(--color-accent)]/40 text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <MessageSquare size={11} />
              Notes
            </button>
          </div>

          {/* Strike reason input */}
          {showStrikeInput && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={strikeReason}
                onChange={(e) => setStrikeReason(e.target.value.slice(0, 500))}
                placeholder="Strike reason (required)..."
                maxLength={500}
                className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[11px] px-2 focus:outline-none focus:border-[var(--color-cta)]/60 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={handleStrike}
                disabled={!strikeReason.trim() || addStrikeMut.isPending}
                className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-[var(--color-cta)]/15 border border-[var(--color-cta)]/40 text-[var(--color-cta)] hover:bg-[var(--color-cta)]/25 transition-colors disabled:opacity-40"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Add Strike
              </button>
            </div>
          )}

          {/* Ban reason input */}
          {showBanInput && !u.is_banned && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ban reason..."
                className="flex-1 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[11px] px-2 focus:outline-none focus:border-[var(--color-cta)]/60 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || banUserMut.isPending}
                className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-[var(--color-cta)]/15 border border-[var(--color-cta)]/40 text-[var(--color-cta)] hover:bg-[var(--color-cta)]/25 transition-colors disabled:opacity-40"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Confirm Ban
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const { data: users, isLoading } = useAdminUsers()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all')
  const currentUserId = useAppStore((s) => s.user)?.id ?? ''
  const currentUserRole = useAppStore((s) => s.userRole) as UserRole

  const filtered = useMemo(() => {
    if (!users) return []
    let result = users

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter)
    }

    // Status filter
    if (statusFilter === 'banned') {
      result = result.filter((u) => u.is_banned)
    } else if (statusFilter === 'active') {
      result = result.filter((u) => !u.is_banned)
    }

    // Search
    const q = search.toLowerCase()
    if (q) {
      result = result.filter(
        (u) =>
          u.display_name.toLowerCase().includes(q) ||
          u.friend_code.toLowerCase().includes(q)
      )
    }

    return result
  }, [users, search, roleFilter, statusFilter])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or friend code..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Role filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRoleFilter)}
            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[11px] text-[var(--color-text)] pl-2 pr-6 appearance-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="mod">Moderator</option>
            <option value="user">User</option>
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatusFilter)}
            className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[11px] text-[var(--color-text)] pl-2 pr-6 appearance-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        </div>

        {/* CSV export */}
        <button
          onClick={() => {
            if (!users) return
            downloadCSV(
              `planechaser-users-${new Date().toISOString().split('T')[0]}.csv`,
              ['Name', 'Friend Code', 'Role', 'Strikes', 'Banned', 'Games Hosted', 'Conquests', 'Custom Planes', 'Joined'],
              users.map((u) => [
                u.display_name,
                u.friend_code,
                u.role,
                u.strike_count.toString(),
                u.is_banned ? 'Yes' : 'No',
                (u.games_hosted ?? 0).toString(),
                (u.conquests ?? 0).toString(),
                (u.custom_planes_count ?? 0).toString(),
                new Date(u.created_at).toLocaleDateString(),
              ])
            )
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
          title="Export users to CSV"
        >
          ↓ CSV
        </button>

        {/* Count */}
        {users && (
          <span
            className="ml-auto text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {filtered.length} / {users.length} users
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] h-[120px] animate-pulse bg-[var(--color-surface)]/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <UserCard
              key={u.id}
              u={u}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
          {filtered.length === 0 && (
            <p
              className="text-center text-[12px] text-[var(--color-text-muted)] py-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              No users found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Image Preview Modal ─────────────────────────────────────────────────────
function ImagePreviewModal({ url, name, onClose, landscape }: { url: string; name: string; onClose: () => void; landscape?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      {/* Close button — always visible at top-right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <X size={20} />
      </button>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {/* Skeleton loader */}
        {!loaded && (
          <div
            className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse flex items-center justify-center ${landscape ? 'w-[min(400px,85vw)] aspect-[7/5]' : 'w-[280px] h-[400px]'}`}
          >
            <ImageIcon size={48} className="text-[var(--color-text-muted)] opacity-30" />
          </div>
        )}

        {landscape ? (
          /* Plane cards: rotate portrait Scryfall image 90° to display landscape */
          <div className={`w-[min(400px,85vw)] aspect-[7/5] rounded-xl overflow-hidden border border-[var(--color-border)] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[140%] aspect-[5/7] rotate-90">
                <img
                  src={url}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoad={() => setLoaded(true)}
                />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={url}
            alt={name}
            className={`max-w-full max-h-[75vh] rounded-xl border border-[var(--color-border)] object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>

      <p
        className="text-center text-[12px] text-[var(--color-text-muted)] mt-3"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {name}
      </p>
    </div>
  )
}

// ─── Plane Card ───────────────────────────────────────────────────────────────
function PlaneCard({ plane, currentUserId, onPreview, isDuplicate }: { plane: AdminCustomPlane; currentUserId: string; onPreview: (url: string, name: string) => void; isDuplicate?: boolean }) {
  const deletePlane = useAdminDeleteCustomPlane()
  const [expanded, setExpanded] = useState(false)

  const creator = (plane.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
  const hasImage = !!plane.image_path
  const hasLongText = (plane.oracle_text?.length ?? 0) > 80 || (plane.chaos_text?.length ?? 0) > 60

  function handleDelete() {
    if (!window.confirm(`Delete custom plane "${plane.name}"? This cannot be undone.`)) return
    deletePlane.mutate({ adminId: currentUserId, planeId: plane.id, planeName: plane.name })
  }

  function handlePreview() {
    if (!plane.image_path) return
    const url = getImageUrl(plane.image_path)
    onPreview(url, plane.name)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px] font-bold text-[var(--color-text)] truncate"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {plane.name}
            </span>
            {plane.is_public ? (
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-[var(--color-accent)]/50 text-[var(--color-accent)] bg-[var(--color-accent)]/10" style={{ fontFamily: 'var(--font-heading)' }}>
                <Globe size={8} /> Public
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)]/40" style={{ fontFamily: 'var(--font-heading)' }}>
                <Lock size={8} /> Private
              </span>
            )}
            {hasImage && (
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-[var(--color-gold)]/50 text-[var(--color-gold)] bg-[var(--color-gold)]/10" style={{ fontFamily: 'var(--font-heading)' }}>
                <ImageIcon size={8} /> Art
              </span>
            )}
            {isDuplicate && (
              <span
                className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-[var(--color-cta)]/50 text-[var(--color-cta)] bg-[var(--color-cta)]/10"
                style={{ fontFamily: 'var(--font-heading)' }}
                title="Another custom plane has the same name"
              >
                <AlertTriangle size={8} /> Dupe
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            by {creator} · {plane.type_line}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasImage && (
            <button
              onClick={handlePreview}
              title="Preview image"
              className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <Eye size={10} />
              View
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deletePlane.isPending}
            title="Delete plane"
            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Card text — expandable */}
      {plane.oracle_text && (
        <p
          className={`text-[11px] text-[var(--color-text-secondary)] leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {plane.oracle_text}
        </p>
      )}
      {plane.chaos_text && (
        <p
          className={`text-[11px] text-[var(--color-gold)]/80 leading-relaxed ${!expanded ? 'line-clamp-1' : ''}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          🌀 {plane.chaos_text}
        </p>
      )}
      {hasLongText && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-[10px] text-[var(--color-accent)] hover:underline"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {expanded ? 'Show less' : 'Show more...'}
        </button>
      )}
    </motion.div>
  )
}

// ─── Planes Tab ───────────────────────────────────────────────────────────────
function PlanesTab() {
  const { data: planes, isLoading } = useAdminCustomPlanes()
  const [search, setSearch] = useState('')
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)
  const currentUserId = useAppStore((s) => s.user)?.id ?? ''

  const filtered = useMemo(() => {
    if (!planes) return []
    const q = search.toLowerCase()
    if (!q) return planes
    return planes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.profiles as unknown as { display_name: string } | null)?.display_name?.toLowerCase().includes(q)
    )
  }, [planes, search])

  const duplicates = useMemo(() => {
    if (!planes) return new Set<string>()
    const nameCounts: Record<string, number> = {}
    for (const p of planes) {
      const normalized = p.name.toLowerCase().trim()
      nameCounts[normalized] = (nameCounts[normalized] ?? 0) + 1
    }
    const dupeIds = new Set<string>()
    for (const p of planes) {
      if (nameCounts[p.name.toLowerCase().trim()] > 1) {
        dupeIds.add(p.id)
      }
    }
    return dupeIds
  }, [planes])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search planes or creators..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        {planes && (
          <span
            className="text-[12px] text-[var(--color-text-muted)] shrink-0"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {filtered.length} / {planes.length}
          </span>
        )}
        {duplicates.size > 0 && (
          <span className="text-[10px] text-[var(--color-cta)] shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
            ⚠ {duplicates.size} dupe{duplicates.size !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] h-[100px] animate-pulse bg-[var(--color-surface)]/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((plane) => (
            <PlaneCard
              key={plane.id}
              plane={plane}
              currentUserId={currentUserId}
              onPreview={(url, name) => setPreviewImage({ url, name })}
              isDuplicate={duplicates.has(plane.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[12px] text-[var(--color-text-muted)] py-8" style={{ fontFamily: 'var(--font-body)' }}>
              No custom planes found.
            </p>
          )}
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <ImagePreviewModal
          url={previewImage.url}
          name={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  )
}

// ─── Feedback Card ────────────────────────────────────────────────────────────
function FeedbackCard({ fb }: { fb: AdminFeedback }) {
  const currentUser = useAppStore((s) => s.user)
  const replyToFeedback = useReplyToFeedback()
  const updateStatus = useUpdateFeedbackStatus()

  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')

  const displayName = (fb.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Anonymous'
  const emoji = FEEDBACK_CATEGORY_EMOJI[fb.category] ?? '📝'
  const date = new Date(fb.created_at).toLocaleDateString()

  function handleSaveReply() {
    if (!replyText.trim() || !currentUser) return
    replyToFeedback.mutate({
      feedbackId: fb.id,
      adminUserId: currentUser.id,
      reply: replyText.trim(),
    })
    setShowReply(false)
    setReplyText('')
  }

  function handleMailto() {
    if (!fb.user_email) return
    const subject = encodeURIComponent(`Re: Your PlaneChaser Feedback (${fb.category})`)
    const body = encodeURIComponent(
      `Hi ${displayName},\n\nThank you for your feedback:\n\n"${fb.message}"\n\n`
    )
    window.open(`mailto:${fb.user_email}?subject=${subject}&body=${body}`, '_blank')
  }

  const statusColors: Record<string, string> = {
    new: 'var(--color-cta)',
    read: 'var(--color-text-muted)',
    replied: 'var(--color-accent)',
    resolved: 'var(--color-gold)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className="text-[18px] shrink-0">{emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[13px] font-bold text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {displayName}
              </span>
              <span
                className="text-[10px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {date}
              </span>
              {fb.user_email && (
                <span
                  className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[140px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {fb.user_email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status dropdown */}
        <div className="relative shrink-0">
          <select
            value={fb.status}
            onChange={(e) =>
              updateStatus.mutate({
                adminId: currentUser?.id ?? '',
                feedbackId: fb.id,
                status: e.target.value as AdminFeedback['status'],
              })
            }
            disabled={updateStatus.isPending}
            className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[10px] pl-2 pr-5 appearance-none focus:outline-none transition-colors disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-body)',
              color: statusColors[fb.status] ?? 'var(--color-text-muted)',
            }}
          >
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="resolved">Resolved</option>
          </select>
          <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        </div>
      </div>

      {/* Message */}
      <p
        className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {fb.message}
      </p>

      {/* Existing reply */}
      {fb.admin_reply && (
        <div className="rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-3 py-2">
          <p
            className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] mb-1"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Admin Reply
          </p>
          <p
            className="text-[11px] text-[var(--color-text-secondary)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {fb.admin_reply}
          </p>
        </div>
      )}

      {/* Reply textarea */}
      {showReply && (
        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
            placeholder="Write an admin reply..."
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] px-3 py-2 resize-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveReply}
              disabled={!replyText.trim() || replyToFeedback.isPending}
              className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Save Reply
            </button>
            <button
              onClick={() => { setShowReply(false); setReplyText('') }}
              className="h-8 px-3 rounded-lg text-[11px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
        <button
          onClick={() => setShowReply((p) => !p)}
          className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <MessageSquare size={10} />
          Reply
        </button>
        {fb.user_email && (
          <button
            onClick={handleMailto}
            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Mail size={10} />
            Email
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────
function FeedbackTab() {
  const { data: feedback, isLoading } = useAdminFeedback()
  const [statusFilter, setStatusFilter] = useState<FeedbackStatusFilter>('all')

  const filtered = useMemo(() => {
    if (!feedback) return []
    if (statusFilter === 'all') return feedback
    return feedback.filter((fb) => fb.status === statusFilter)
  }, [feedback, statusFilter])

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {FEEDBACK_STATUSES.map((s) => {
          const count = s === 'all' ? (feedback?.length ?? 0) : (feedback?.filter((fb) => fb.status === s).length ?? 0)
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all capitalize"
              style={{
                fontFamily: 'var(--font-heading)',
                borderColor: statusFilter === s ? 'var(--color-accent)' : 'var(--color-border)',
                background: statusFilter === s
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
                color: statusFilter === s ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              {s}
              {count > 0 && (
                <span
                  className="px-1 rounded-full text-[9px] font-bold"
                  style={{
                    background: statusFilter === s ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: statusFilter === s ? 'white' : 'var(--color-text-muted)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
        {/* CSV export */}
        <button
          onClick={() => {
            if (!feedback) return
            downloadCSV(
              `planechaser-feedback-${new Date().toISOString().split('T')[0]}.csv`,
              ['Category', 'Status', 'Message', 'User', 'Date', 'Admin Reply'],
              feedback.map((fb) => [
                fb.category,
                fb.status,
                fb.message,
                (fb.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Anonymous',
                new Date(fb.created_at).toLocaleDateString(),
                fb.admin_reply ?? '',
              ])
            )
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
          title="Export feedback to CSV"
        >
          ↓ CSV
        </button>

        {feedback && (
          <span
            className="ml-auto text-[11px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {filtered.length} items
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] h-[140px] animate-pulse bg-[var(--color-surface)]/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => (
            <FeedbackCard key={fb.id} fb={fb} />
          ))}
          {filtered.length === 0 && (
            <p
              className="text-center text-[12px] text-[var(--color-text-muted)] py-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              No feedback in this category.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Audit Log Entry ─────────────────────────────────────────────────────────
function AuditEntry({ entry }: { entry: AuditLogEntry }) {
  const adminName = (entry.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
  const actionLabel = AUDIT_ACTION_LABELS[entry.action] ?? entry.action
  const actionColor = AUDIT_ACTION_COLORS[entry.action] ?? 'var(--color-text-muted)'
  const date = new Date(entry.created_at)
  const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Build a human-readable details string
  const details = entry.details as Record<string, unknown>
  let detailStr = ''
  if (entry.action === 'role_change' && details.from && details.to) {
    detailStr = `${details.from} → ${details.to}`
  } else if (entry.action === 'strike_added' && details.reason) {
    detailStr = `"${details.reason}"${details.auto_banned ? ' (auto-banned)' : ''}`
  } else if (entry.action === 'strike_revoked' && details.new_active_count !== undefined) {
    detailStr = `Active strikes now: ${details.new_active_count}`
  } else if (entry.action === 'user_banned' && details.reason) {
    detailStr = `"${details.reason}"`
  } else if (entry.action === 'plane_deleted' && details.plane_name) {
    detailStr = `"${details.plane_name}"`
  } else if (entry.action === 'feedback_status_changed' && details.new_status) {
    detailStr = `→ ${details.new_status}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-3 border-b border-[var(--color-border)]/50 last:border-0"
    >
      <div
        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{ background: actionColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[12px] font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {adminName}
          </span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              color: actionColor,
              background: `color-mix(in srgb, ${actionColor} 12%, transparent)`,
              fontFamily: 'var(--font-heading)',
            }}
          >
            {actionLabel}
          </span>
        </div>
        {detailStr && (
          <p
            className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 truncate"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {detailStr}
          </p>
        )}
        <p
          className="text-[10px] text-[var(--color-text-muted)] mt-0.5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {timeStr}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────
function AuditTab() {
  const { data: entries, isLoading } = useAuditLog(100)

  return (
    <div className="space-y-2">
      <p
        className="text-[11px] text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Recent admin actions across the platform.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[60px] rounded-xl bg-[var(--color-surface)]/40 animate-pulse" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-1">
          {entries.map((entry) => (
            <AuditEntry key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 text-center">
          <ClipboardList size={24} className="mx-auto text-[var(--color-text-muted)] mb-2" />
          <p
            className="text-[12px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No admin actions recorded yet.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Announcement Type Icons ─────────────────────────────────────────────────
const ANNOUNCE_TYPE_CONFIG: Record<AnnouncementType, { icon: typeof Info; label: string; color: string }> = {
  info: { icon: Info, label: 'Info', color: 'var(--color-accent)' },
  warning: { icon: AlertTriangle, label: 'Warning', color: 'var(--color-gold)' },
  maintenance: { icon: Wrench, label: 'Maintenance', color: 'var(--color-cta)' },
  update: { icon: Sparkles, label: 'Update', color: 'var(--color-accent)' },
}

// ─── Announcement Card ───────────────────────────────────────────────────────
function AnnouncementCard({ a, currentUserId }: { a: SystemAnnouncement; currentUserId: string }) {
  const updateAnnouncement = useUpdateAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()

  const config = ANNOUNCE_TYPE_CONFIG[a.type] ?? ANNOUNCE_TYPE_CONFIG.info
  const TypeIcon = config.icon
  const isExpired = a.expires_at && new Date(a.expires_at) < new Date()

  function handleToggle() {
    updateAnnouncement.mutate({
      adminId: currentUserId,
      announcementId: a.id,
      updates: { is_active: !a.is_active },
    })
  }

  function handleDelete() {
    if (!window.confirm('Delete this announcement permanently?')) return
    deleteAnnouncement.mutate({ adminId: currentUserId, announcementId: a.id })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-[var(--color-surface)]/60 p-4 space-y-2"
      style={{
        borderColor: a.is_active && !isExpired ? config.color : 'var(--color-border)',
        opacity: a.is_active && !isExpired ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TypeIcon size={16} style={{ color: config.color }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border"
                style={{
                  color: config.color,
                  borderColor: config.color,
                  background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {config.label}
              </span>
              {a.is_active && !isExpired ? (
                <span
                  className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Live
                </span>
              ) : isExpired ? (
                <span
                  className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Expired
                </span>
              ) : (
                <span
                  className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Inactive
                </span>
              )}
            </div>
            <p
              className="text-[10px] text-[var(--color-text-muted)] mt-0.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {new Date(a.created_at).toLocaleDateString()}
              {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            disabled={updateAnnouncement.isPending}
            title={a.is_active ? 'Deactivate' : 'Activate'}
            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {a.is_active ? <PowerOff size={10} /> : <Power size={10} />}
            {a.is_active ? 'Off' : 'On'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteAnnouncement.isPending}
            title="Delete"
            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      <p
        className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {a.message}
      </p>
    </motion.div>
  )
}

// ─── Announcements Tab ───────────────────────────────────────────────────────
function AnnouncementsTab() {
  const { data: announcements, isLoading } = useAllAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const currentUserId = useAppStore((s) => s.user)?.id ?? ''

  const [showCreate, setShowCreate] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [newType, setNewType] = useState<AnnouncementType>('info')
  const [newExpiry, setNewExpiry] = useState('')

  function handleCreate() {
    if (!newMessage.trim()) return
    createAnnouncement.mutate({
      adminId: currentUserId,
      message: newMessage.trim(),
      type: newType,
      expiresAt: newExpiry ? new Date(newExpiry + 'T23:59:59').toISOString() : null,
    })
    setNewMessage('')
    setNewType('info')
    setNewExpiry('')
    setShowCreate(false)
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      <button
        onClick={() => setShowCreate((p) => !p)}
        className="flex items-center gap-2 h-10 px-4 rounded-xl text-[12px] font-semibold border transition-all"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: showCreate ? 'var(--color-accent)' : 'var(--color-border)',
          background: showCreate ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)',
          color: showCreate ? 'var(--color-accent)' : 'var(--color-text)',
        }}
      >
        <Plus size={14} />
        New Announcement
      </button>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-surface)]/60 p-4 space-y-3"
        >
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value.slice(0, 500))}
            placeholder="Write your announcement message..."
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] px-3 py-2 resize-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <p className="text-[10px] text-[var(--color-text-muted)] text-right" style={{ fontFamily: 'var(--font-body)' }}>
            {newMessage.length}/500
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Type select */}
            <div className="relative">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AnnouncementType)}
                className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[11px] text-[var(--color-text)] pl-2 pr-6 appearance-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="maintenance">🔧 Maintenance</option>
                <option value="update">✨ Update</option>
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            </div>

            {/* Expiry date */}
            <input
              type="date"
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[11px] text-[var(--color-text)] px-2 focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
              placeholder="Expires (optional)"
            />

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => { setShowCreate(false); setNewMessage('') }}
                className="h-8 px-3 rounded-lg text-[11px] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newMessage.trim() || createAnnouncement.isPending}
                className="h-8 px-4 rounded-lg text-[11px] font-semibold bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors disabled:opacity-40"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Publish
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] h-[100px] animate-pulse bg-[var(--color-surface)]/40" />
          ))}
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} a={a} currentUserId={currentUserId} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 text-center">
          <Megaphone size={24} className="mx-auto text-[var(--color-text-muted)] mb-2" />
          <p
            className="text-[12px] text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No announcements yet. Create one to notify all users.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('stats')
  const { data: stats } = useAppStats()
  const uiTheme = useAppStore((s) => s.uiTheme)
  const setUiTheme = useAppStore((s) => s.setUiTheme)

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'stats', label: 'Stats', icon: <BarChart3 size={14} /> },
    { key: 'users', label: 'Users', icon: <Users size={14} /> },
    { key: 'planes', label: 'Planes', icon: <Layers size={14} /> },
    {
      key: 'feedback',
      label: 'Feedback',
      icon: <MessageSquare size={14} />,
      badge: stats?.new_feedback && stats.new_feedback > 0 ? stats.new_feedback : undefined,
    },
    { key: 'announce', label: 'Announce', icon: <Megaphone size={14} /> },
    { key: 'audit', label: 'Log', icon: <ClipboardList size={14} /> },
  ]

  return (
    <main
      className="min-h-screen flex flex-col pb-nav"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Ambient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 z-[60] border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Shield className="w-5 h-5 text-[var(--color-accent)]" />
          <h1
            className="text-lg font-bold title-gradient"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Admin Dashboard
          </h1>
          <div className="relative ml-auto">
            <select
              value={uiTheme}
              onChange={(e) => setUiTheme(e.target.value as 'atlas' | 'eternities')}
              className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[11px] text-[var(--color-text)] pl-2 pr-6 appearance-none focus:outline-none focus:border-[var(--color-accent)]/60 transition-colors"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <option value="atlas">Planar Atlas</option>
              <option value="eternities">Blind Eternities</option>
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          </div>
        </div>

        {/* Tab bar — scrollable on mobile */}
        <div className="flex overflow-x-auto border-t border-[var(--color-border)] scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 min-w-[64px] text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                tab === t.key
                  ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && (
                <span
                  className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[8px] font-bold text-white bg-[var(--color-cta)]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 py-5 max-w-[680px] mx-auto w-full">
        {tab === 'stats' && <StatsTab setTab={setTab} />}
        {tab === 'users' && <UsersTab />}
        {tab === 'planes' && <PlanesTab />}
        {tab === 'feedback' && <FeedbackTab />}
        {tab === 'announce' && <AnnouncementsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </main>
  )
}
