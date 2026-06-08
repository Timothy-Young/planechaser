'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
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
  AlertTriangle,
  Ban,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import {
  useAppStats,
  useAdminUsers,
  useUpdateUserRole,
  useAddStrike,
  useBanUser,
  useUnbanUser,
  useAdminFeedback,
  useReplyToFeedback,
  useUpdateFeedbackStatus,
  useAdminCustomPlanes,
  useAdminDeleteCustomPlane,
} from '@/hooks/useAdmin'
import { getRoleLabel, getRoleColor, isOwner, isAdmin } from '@/lib/admin/guards'
import type { UserRole, AdminUser, AdminFeedback, AdminCustomPlane } from '@/lib/admin/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminTab = 'stats' | 'users' | 'planes' | 'feedback'

const FEEDBACK_CATEGORY_EMOJI: Record<string, string> = {
  bug: '🐛',
  feature: '💡',
  general: '💬',
  other: '📝',
}

const FEEDBACK_STATUSES = ['all', 'new', 'read', 'replied', 'resolved'] as const
type FeedbackStatusFilter = (typeof FEEDBACK_STATUSES)[number]

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-4 text-center"
    >
      <p
        className="text-[28px] font-bold leading-none"
        style={{ fontFamily: 'var(--font-heading)', color }}
      >
        {value.toLocaleString()}
      </p>
      <p
        className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mt-1"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
    </motion.div>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab() {
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
    { value: stats.total_users, label: 'Total Users', color: 'var(--color-accent)' },
    { value: stats.users_last_7_days, label: 'New (7d)', color: 'var(--color-accent)' },
    { value: stats.banned_users, label: 'Banned', color: 'var(--color-cta)' },
    { value: stats.total_games, label: 'Total Games', color: 'var(--color-accent)' },
    { value: stats.games_last_7_days, label: 'Games (7d)', color: 'var(--color-accent)' },
    { value: stats.total_conquests, label: 'Conquests', color: 'var(--color-gold)' },
    { value: stats.total_custom_planes, label: 'Custom Planes', color: 'var(--color-accent)' },
    { value: stats.total_feedback, label: 'Feedback', color: 'var(--color-accent)' },
    { value: stats.new_feedback, label: 'Pending', color: 'var(--color-cta)' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
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
  const addStrike = useAddStrike()
  const banUser = useBanUser()
  const unbanUser = useUnbanUser()

  const [banReason, setBanReason] = useState('')
  const [showBanInput, setShowBanInput] = useState(false)

  const isSelf = u.id === currentUserId
  const targetIsOwner = u.role === 'owner'
  // Only owner can modify admins; admin can only modify mods/users
  const canModify = !isSelf && !targetIsOwner && (
    isOwner(currentUserRole) || (!isAdmin(u.role) && isAdmin(currentUserRole))
  )

  const roleOptions: UserRole[] = isOwner(currentUserRole)
    ? ['owner', 'admin', 'mod', 'user']
    : ['mod', 'user']

  function handleRoleChange(role: UserRole) {
    if (!canModify) return
    updateRole.mutate({ userId: u.id, role })
  }

  function handleStrike() {
    if (!canModify) return
    if (!window.confirm(`Add a strike to ${u.display_name}? They have ${u.strike_count}/3 strikes.`)) return
    addStrike.mutate({ userId: u.id, currentStrikes: u.strike_count })
  }

  function handleBan() {
    if (!canModify) return
    if (!banReason.trim()) return
    if (!window.confirm(`Ban ${u.display_name}? Reason: "${banReason}"`)) return
    banUser.mutate({ userId: u.id, reason: banReason.trim() })
    setBanReason('')
    setShowBanInput(false)
  }

  function handleUnban() {
    if (!canModify) return
    if (!window.confirm(`Unban ${u.display_name}?`)) return
    unbanUser.mutate(u.id)
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
            {/* Role badge */}
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
          <p
            className="text-[11px] text-[var(--color-text-muted)] mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            #{u.friend_code}
          </p>
        </div>

        {/* Strike circles */}
        <div className="flex items-center gap-1 shrink-0">
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
          <span
            className="text-[10px] text-[var(--color-text-muted)] ml-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {u.strike_count}/3
          </span>
        </div>
      </div>

      {/* Ban reason */}
      {u.is_banned && u.ban_reason && (
        <div className="rounded-lg border border-[var(--color-cta)]/20 bg-[var(--color-cta)]/5 px-3 py-2">
          <p
            className="text-[11px] text-[var(--color-cta)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Ban reason: {u.ban_reason}
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
        <span>{u.games_hosted} games</span>
        <span>{u.conquests} conquests</span>
        <span>{u.custom_planes_count} planes</span>
        <span>{u.feedback_count} feedback</span>
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
            {u.strike_count < 3 && (
              <button
                onClick={handleStrike}
                disabled={addStrike.isPending}
                className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)] transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <AlertTriangle size={11} />
                Strike
              </button>
            )}

            {/* Ban / Unban */}
            {u.is_banned ? (
              <button
                onClick={handleUnban}
                disabled={unbanUser.isPending}
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
          </div>

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
                disabled={!banReason.trim() || banUser.isPending}
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
  const currentUserId = useAppStore((s) => s.user)?.id ?? ''
  const currentUserRole = useAppStore((s) => s.userRole) as UserRole

  const filtered = useMemo(() => {
    if (!users) return []
    const q = search.toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.friend_code.toLowerCase().includes(q)
    )
  }, [users, search])

  return (
    <div className="space-y-4">
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

// ─── Plane Card ───────────────────────────────────────────────────────────────
function PlaneCard({ plane, users }: { plane: AdminCustomPlane; users: AdminUser[] }) {
  const deletePlane = useAdminDeleteCustomPlane()
  const addStrike = useAddStrike()

  const creator = (plane.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'

  function handleDelete() {
    if (!window.confirm(`Delete custom plane "${plane.name}"? This cannot be undone.`)) return
    deletePlane.mutate(plane.id)
  }

  function handleStrikeCreator() {
    const u = users.find((usr) => usr.id === plane.user_id)
    if (!u) return
    if (!window.confirm(`Add a strike to ${creator} for this plane?`)) return
    addStrike.mutate({ userId: plane.user_id, currentStrikes: u.strike_count })
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
          </div>
          <p
            className="text-[11px] text-[var(--color-text-muted)] mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            by {creator} · {plane.type_line}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleStrikeCreator}
            disabled={addStrike.isPending}
            title="Strike creator"
            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <AlertTriangle size={10} />
            Strike
          </button>
          <button
            onClick={handleDelete}
            disabled={deletePlane.isPending}
            title="Delete plane"
            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-cta)]/40 hover:text-[var(--color-cta)] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Trash2 size={10} />
            Delete
          </button>
        </div>
      </div>

      {plane.oracle_text && (
        <p
          className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {plane.oracle_text}
        </p>
      )}
    </motion.div>
  )
}

// ─── Planes Tab ───────────────────────────────────────────────────────────────
function PlanesTab() {
  const { data: planes, isLoading } = useAdminCustomPlanes()
  const { data: users } = useAdminUsers()
  const [search, setSearch] = useState('')

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
            <PlaneCard key={plane.id} plane={plane} users={users ?? []} />
          ))}
          {filtered.length === 0 && (
            <p
              className="text-center text-[12px] text-[var(--color-text-muted)] py-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              No custom planes found.
            </p>
          )}
        </div>
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
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write an admin reply..."
            rows={3}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('stats')
  const { data: stats } = useAppStats()

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
      <div className="sticky top-0 z-10 border-b border-[var(--color-border)] glass-strong">
        <div className="flex items-center gap-3 px-4 py-3">
          <Shield className="w-5 h-5 text-[var(--color-accent)]" />
          <h1
            className="text-lg font-bold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Admin Dashboard
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-[var(--color-border)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all ${
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
                  className="absolute top-1.5 right-[calc(50%-24px)] w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-bold text-white bg-[var(--color-cta)]"
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
        {tab === 'stats' && <StatsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'planes' && <PlanesTab />}
        {tab === 'feedback' && <FeedbackTab />}
      </div>
    </main>
  )
}
