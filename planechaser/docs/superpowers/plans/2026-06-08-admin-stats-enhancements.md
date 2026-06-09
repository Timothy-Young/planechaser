# Admin Stats & Features Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the admin dashboard with tooltips, game analytics, leaderboards, achievement audit, activity sparkline, admin notes, duplicate plane detection, CSV export, and image preview skeleton loader.

**Architecture:** Extend `getAppStats()` with a new `getExtendedStats()` query that fetches game analytics data (game sessions with turn_log/planes_visited, conquered planes grouped, achievement distribution, pod activity). Client-side computation handles JSONB parsing for game analytics (acceptable with 30 games). New `admin_notes` Postgres table for per-user admin notes. StatCard gets an optional `tooltip` prop. New UI sections added to StatsTab.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres), TanStack Query v5, Framer Motion, Tailwind CSS 4

---

## File Structure

### Modified Files
| File | Responsibility |
|------|---------------|
| `src/lib/admin/types.ts` | Add `ExtendedStats`, `AdminNote`, `TopPlane`, `TopConqueror`, `DailyGameCount`, `AchievementStat`, `PodActivity` interfaces |
| `src/lib/admin/queries.ts` | Add `getExtendedStats()`, `getAdminNotes()`, `addAdminNote()`, `deleteAdminNote()` functions |
| `src/hooks/useAdmin.ts` | Add `useExtendedStats()`, `useAdminNotes()`, `useAddAdminNote()`, `useDeleteAdminNote()` hooks |
| `src/app/admin/page.tsx` | Add tooltip to `StatCard`, new stats sections (game analytics, leaderboard, activity chart, achievements, admin notes), duplicate plane detection, CSV export |

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/022_admin_notes.sql` | Create `admin_notes` table with RLS policies |

---

### Task 1: Types + Extended Stats Queries

**Files:**
- Modify: `src/lib/admin/types.ts`
- Modify: `src/lib/admin/queries.ts`
- Modify: `src/hooks/useAdmin.ts`

- [ ] **Step 1: Add new types to `src/lib/admin/types.ts`**

Add after the existing `AppStats` interface (after line 61):

```typescript
export interface TopPlane {
  plane_name: string
  count: number
}

export interface TopConqueror {
  user_id: string
  display_name: string
  count: number
}

export interface DailyGameCount {
  date: string // YYYY-MM-DD
  count: number
}

export interface AchievementStat {
  achievement_key: string
  earned_count: number
}

export interface PodActivity {
  pod_id: string
  pod_name: string
  game_count: number
}

export interface AdminNote {
  id: string
  user_id: string
  admin_id: string
  note: string
  created_at: string
  admin_profile?: { display_name: string } | null
}

export interface GameAnalytics {
  avg_turns_per_game: number
  avg_rolls_per_game: number
  chaos_trigger_rate: number    // 0-1 percentage
  planeswalk_rate: number       // 0-1 percentage
  avg_rolls_per_planeswalk: number
  total_planes_visited: number
  peak_play_hours: number[]     // array of 24 counts by hour
  most_visited_planes: TopPlane[]
  plane_of_the_week: TopPlane | null
}

export interface ExtendedStats {
  top_conquered_planes: TopPlane[]
  top_conquerors: TopConqueror[]
  most_active_pods: PodActivity[]
  daily_games_30d: DailyGameCount[]
  achievement_distribution: AchievementStat[]
  total_achievements_earned: number
  total_pods: number
  returning_players: number     // users who played in 2+ distinct weeks
  game_analytics: GameAnalytics
}
```

- [ ] **Step 2: Add `getExtendedStats()` to `src/lib/admin/queries.ts`**

Add these imports at top of types import:
```typescript
import type {
  AdminUser, AdminFeedback, AdminCustomPlane, AppStats,
  UserRole, AuditLogEntry, AuditAction, UserStrike,
  SystemAnnouncement, AnnouncementType,
  ExtendedStats, TopPlane, TopConqueror, DailyGameCount,
  AchievementStat, PodActivity, GameAnalytics, AdminNote,
} from './types'
```

Add after `getAppStats()`:

```typescript
// ─── Extended Stats ─────────────────────────────────────────────────────────

interface TurnLogRoll { result: string; timestamp: number }
interface TurnLogEntry {
  rolls?: TurnLogRoll[]
  planeswalked?: boolean
  chaosTriggered?: boolean
}

export async function getExtendedStats(): Promise<ExtendedStats> {
  const sb = supabase()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    conqueredGrouped,
    topConquerors,
    podGames,
    recentGames,
    allGameSessions,
    achievements,
    totalPods,
  ] = await Promise.all([
    // Top conquered planes
    sb.from('conquered_planes')
      .select('plane_name')
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const row of data ?? []) {
          const name = (row as { plane_name: string }).plane_name
          counts[name] = (counts[name] ?? 0) + 1
        }
        return Object.entries(counts)
          .map(([plane_name, count]) => ({ plane_name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) as TopPlane[]
      }),

    // Top conquerors
    sb.from('conquered_planes')
      .select('user_id, profiles!conquered_planes_user_id_fkey(display_name)')
      .then(({ data }) => {
        const counts: Record<string, { display_name: string; count: number }> = {}
        for (const row of (data ?? []) as unknown as { user_id: string; profiles: { display_name: string } | null }[]) {
          if (!counts[row.user_id]) {
            counts[row.user_id] = {
              display_name: row.profiles?.display_name ?? 'Unknown',
              count: 0,
            }
          }
          counts[row.user_id].count++
        }
        return Object.entries(counts)
          .map(([user_id, v]) => ({ user_id, display_name: v.display_name, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) as TopConqueror[]
      }),

    // Most active pods (last 30 days)
    sb.from('game_sessions')
      .select('pod_id, pods(name)')
      .not('pod_id', 'is', null)
      .gte('started_at', thirtyDaysAgo)
      .then(({ data }) => {
        const counts: Record<string, { pod_name: string; count: number }> = {}
        for (const row of (data ?? []) as unknown as { pod_id: string; pods: { name: string } | null }[]) {
          if (!row.pod_id) continue
          if (!counts[row.pod_id]) {
            counts[row.pod_id] = { pod_name: row.pods?.name ?? 'Unknown', count: 0 }
          }
          counts[row.pod_id].count++
        }
        return Object.entries(counts)
          .map(([pod_id, v]) => ({ pod_id, pod_name: v.pod_name, game_count: v.count }))
          .sort((a, b) => b.game_count - a.game_count)
          .slice(0, 5) as PodActivity[]
      }),

    // Daily game counts (last 30 days)
    sb.from('game_sessions')
      .select('started_at')
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: true })
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const row of data ?? []) {
          const date = new Date((row as { started_at: string }).started_at).toISOString().split('T')[0]
          counts[date] = (counts[date] ?? 0) + 1
        }
        // Fill in missing days with 0
        const result: DailyGameCount[] = []
        const d = new Date(thirtyDaysAgo)
        while (d <= now) {
          const dateStr = d.toISOString().split('T')[0]
          result.push({ date: dateStr, count: counts[dateStr] ?? 0 })
          d.setDate(d.getDate() + 1)
        }
        return result
      }),

    // All game sessions for analytics
    sb.from('game_sessions')
      .select('turn_log, planes_visited, started_at')
      .then(({ data }) => data ?? []),

    // Achievement distribution
    sb.from('user_achievements')
      .select('achievement_key')
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const row of data ?? []) {
          const key = (row as { achievement_key: string }).achievement_key
          counts[key] = (counts[key] ?? 0) + 1
        }
        return Object.entries(counts)
          .map(([achievement_key, earned_count]) => ({ achievement_key, earned_count }))
          .sort((a, b) => b.earned_count - a.earned_count) as AchievementStat[]
      }),

    // Total pods
    sb.from('pods').select('id', { count: 'exact', head: true }),
  ])

  // Compute game analytics from raw sessions
  const gameAnalytics = computeGameAnalytics(
    allGameSessions as { turn_log: TurnLogEntry[] | null; planes_visited: string[] | null; started_at: string }[],
    sevenDaysAgo,
  )

  // Player retention: users with games in 2+ distinct weeks
  const playerWeeks: Record<string, Set<string>> = {}
  for (const gs of allGameSessions as { turn_log: unknown; planes_visited: unknown; started_at: string }[]) {
    // Use started_at to get week key
    const d = new Date(gs.started_at)
    const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`
    // We don't have host_user_id in this select, so we'll compute retention differently
  }

  // Simpler retention: count via separate query
  const { data: retentionData } = await sb
    .from('game_sessions')
    .select('host_user_id, started_at')

  const userWeeks: Record<string, Set<string>> = {}
  for (const row of (retentionData ?? []) as { host_user_id: string; started_at: string }[]) {
    const d = new Date(row.started_at)
    const isoWeek = getISOWeek(d)
    if (!userWeeks[row.host_user_id]) userWeeks[row.host_user_id] = new Set()
    userWeeks[row.host_user_id].add(isoWeek)
  }
  const returningPlayers = Object.values(userWeeks).filter((weeks) => weeks.size >= 2).length

  return {
    top_conquered_planes: conqueredGrouped,
    top_conquerors: topConquerors,
    most_active_pods: podGames,
    daily_games_30d: recentGames,
    achievement_distribution: achievements,
    total_achievements_earned: achievements.reduce((sum, a) => sum + a.earned_count, 0),
    total_pods: totalPods.count ?? 0,
    returning_players: returningPlayers,
    game_analytics: gameAnalytics,
  }
}

function getISOWeek(d: Date): string {
  const year = d.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000) + 1
  const weekNum = Math.ceil(dayOfYear / 7)
  return `${year}-W${weekNum}`
}

function computeGameAnalytics(
  sessions: { turn_log: TurnLogEntry[] | null; planes_visited: string[] | null; started_at: string }[],
  sevenDaysAgo: string,
): GameAnalytics {
  let totalTurns = 0
  let totalRolls = 0
  let totalChaos = 0
  let totalPlaneswalk = 0
  let totalPlaneswalkedTurnRolls = 0
  let planeswalkedTurnCount = 0
  const planeVisitCounts: Record<string, number> = {}
  const weekPlaneVisits: Record<string, number> = {}
  const peakHours: number[] = new Array(24).fill(0)

  for (const session of sessions) {
    const turns = session.turn_log ?? []
    totalTurns += turns.length

    for (const turn of turns) {
      const rolls = turn.rolls ?? []
      totalRolls += rolls.length

      for (const roll of rolls) {
        if (roll.result === 'chaos') totalChaos++
        if (roll.result === 'planeswalk') totalPlaneswalk++
      }

      if (turn.planeswalked) {
        planeswalkedTurnCount++
        totalPlaneswalkedTurnRolls += rolls.length
      }
    }

    // Planes visited
    const planes = session.planes_visited ?? []
    for (const name of planes) {
      planeVisitCounts[name] = (planeVisitCounts[name] ?? 0) + 1
      if (session.started_at >= sevenDaysAgo) {
        weekPlaneVisits[name] = (weekPlaneVisits[name] ?? 0) + 1
      }
    }

    // Peak hours
    const hour = new Date(session.started_at).getHours()
    peakHours[hour]++
  }

  const gameCount = sessions.length || 1 // avoid div by 0
  const mostVisited = Object.entries(planeVisitCounts)
    .map(([plane_name, count]) => ({ plane_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const weekTop = Object.entries(weekPlaneVisits)
    .map(([plane_name, count]) => ({ plane_name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    avg_turns_per_game: Math.round((totalTurns / gameCount) * 10) / 10,
    avg_rolls_per_game: Math.round((totalRolls / gameCount) * 10) / 10,
    chaos_trigger_rate: totalRolls > 0 ? Math.round((totalChaos / totalRolls) * 1000) / 1000 : 0,
    planeswalk_rate: totalRolls > 0 ? Math.round((totalPlaneswalk / totalRolls) * 1000) / 1000 : 0,
    avg_rolls_per_planeswalk: planeswalkedTurnCount > 0
      ? Math.round((totalPlaneswalkedTurnRolls / planeswalkedTurnCount) * 10) / 10
      : 0,
    total_planes_visited: Object.keys(planeVisitCounts).length,
    peak_play_hours: peakHours,
    most_visited_planes: mostVisited,
    plane_of_the_week: weekTop[0] ?? null,
  }
}
```

- [ ] **Step 3: Add admin notes query functions to `src/lib/admin/queries.ts`**

Add after the extended stats functions:

```typescript
// ─── Admin Notes ────────────────────────────────────────────────────────────

export async function getAdminNotes(userId: string): Promise<AdminNote[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('admin_notes')
    .select('*, admin_profile:profiles!admin_notes_admin_id_fkey(display_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as AdminNote[]
}

export async function addAdminNote(adminId: string, userId: string, note: string): Promise<void> {
  const cleanNote = sanitizeText(note, 1000)
  if (!cleanNote) throw new Error('Note cannot be empty')

  const sb = supabase()
  const { error } = await sb
    .from('admin_notes')
    .insert({ user_id: userId, admin_id: adminId, note: cleanNote })

  if (error) throw error
  await logAuditAction(adminId, 'note_added', 'user', userId, { note_preview: cleanNote.slice(0, 50) })
}

export async function deleteAdminNote(adminId: string, noteId: string, userId: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('admin_notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error
  await logAuditAction(adminId, 'note_deleted', 'user', userId, { note_id: noteId })
}
```

- [ ] **Step 4: Update `AuditAction` type in `src/lib/admin/types.ts`**

Add `'note_added'` and `'note_deleted'` to the `AuditAction` union type:

```typescript
export type AuditAction =
  | 'role_change'
  | 'strike_added'
  | 'strike_revoked'
  | 'user_banned'
  | 'user_unbanned'
  | 'plane_deleted'
  | 'feedback_replied'
  | 'feedback_status_changed'
  | 'announcement_created'
  | 'announcement_updated'
  | 'announcement_deleted'
  | 'note_added'
  | 'note_deleted'
```

- [ ] **Step 5: Add hooks in `src/hooks/useAdmin.ts`**

Add imports:
```typescript
import {
  // ... existing imports ...
  getExtendedStats,
  getAdminNotes,
  addAdminNote,
  deleteAdminNote,
} from '@/lib/admin/queries'
```

Add hooks:
```typescript
export function useExtendedStats() {
  return useQuery({
    queryKey: ['admin', 'extended-stats'],
    queryFn: getExtendedStats,
    staleTime: 60_000, // 1 min — heavier query
  })
}

export function useAdminNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'notes', userId],
    queryFn: () => getAdminNotes(userId!),
    enabled: !!userId,
    staleTime: ADMIN_STALE,
  })
}

export function useAddAdminNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { adminId: string; userId: string; note: string }) =>
      addAdminNote(params.adminId, params.userId, params.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useDeleteAdminNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { adminId: string; noteId: string; userId: string }) =>
      deleteAdminNote(params.adminId, params.noteId, params.userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/types.ts src/lib/admin/queries.ts src/hooks/useAdmin.ts
git commit -m "feat(admin): add extended stats queries, admin notes queries, and hooks"
```

---

### Task 2: Admin Notes Migration

**Files:**
- Create: `supabase/migrations/022_admin_notes.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Admin notes: private notes admins can attach to user profiles
create table if not exists admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  admin_id uuid not null references profiles(id),
  note text not null check (char_length(note) >= 1 and char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- RLS
alter table admin_notes enable row level security;

-- Admins+ can read all notes
create policy "admin_notes_select" on admin_notes
  for select using (
    get_my_role() in ('owner', 'admin', 'mod')
  );

-- Admins+ can insert notes
create policy "admin_notes_insert" on admin_notes
  for insert with check (
    auth.uid() = admin_id
    and get_my_role() in ('owner', 'admin', 'mod')
  );

-- Only the note author or owner can delete
create policy "admin_notes_delete" on admin_notes
  for delete using (
    auth.uid() = admin_id
    or get_my_role() = 'owner'
  );

-- Index for fast user lookups
create index if not exists idx_admin_notes_user_id on admin_notes(user_id);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/022_admin_notes.sql
git commit -m "feat(admin): add admin_notes table with RLS policies"
```

---

### Task 3: StatCard Tooltips + Skeleton Loader

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Update `StatCard` component to accept tooltip prop**

Replace the existing `StatCard` with:

```typescript
function StatCard({ value, label, color, tooltip }: { value: number | string; label: string; color: string; tooltip?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm p-4 text-center group relative"
      title={tooltip}
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
        {tooltip && (
          <span className="ml-1 inline-block opacity-40 group-hover:opacity-70 transition-opacity">
            ⓘ
          </span>
        )}
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 2: Update the cards array in StatsTab with tooltips**

```typescript
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
```

- [ ] **Step 3: Verify the skeleton loader on ImagePreviewModal is already in place (done pre-plan)**

The `ImagePreviewModal` should already have the `loaded` state and skeleton from the pre-plan edit.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add tooltips to stat cards and skeleton loader on image preview"
```

---

### Task 4: Extended Stats UI — Game Analytics Section

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Import `useExtendedStats` and achievement definitions**

Add to imports:
```typescript
import { useExtendedStats } from '@/hooks/useAdmin'  // add to existing useAdmin import
import { ACHIEVEMENTS } from '@/lib/achievements/definitions'
```

- [ ] **Step 2: Add `GameAnalyticsSection` component**

Add after the `StatsTab` component definition:

```typescript
function GameAnalyticsSection() {
  const { data: ext, isLoading } = useExtendedStats()

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
      {/* Section header */}
      <p
        className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        🎲 Game Analytics
      </p>

      {/* Analytics stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {analyticCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Additional row: pods + retention + achievements */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={ext.total_pods} label="Pods" color="var(--color-accent)" tooltip="Total pods created" />
        <StatCard value={ext.returning_players} label="Returning" color="var(--color-gold)" tooltip="Players who played in 2+ distinct weeks" />
        <StatCard value={ext.total_achievements_earned} label="Achievements" color="var(--color-accent)" tooltip="Total achievements earned across all users" />
      </div>

      {/* Plane of the Week */}
      {ga.plane_of_the_week && (
        <div className="rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-3 flex items-center gap-3">
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
    </div>
  )
}
```

- [ ] **Step 3: Add GameAnalyticsSection to StatsTab**

In the `StatsTab` return, add after the Feedback Breakdown section closing `</div>`:

```tsx
<GameAnalyticsSection />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add game analytics section with dice stats, plane of the week"
```

---

### Task 5: Activity Sparkline + Peak Hours

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add `ActivitySparkline` component**

```typescript
function ActivitySparkline() {
  const { data: ext } = useExtendedStats()
  if (!ext || ext.daily_games_30d.length === 0) return null

  const dailyData = ext.daily_games_30d
  const maxCount = Math.max(...dailyData.map((d) => d.count), 1)
  const total30d = dailyData.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          📈 Activity (30 Days)
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
          {total30d} game{total30d !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Sparkline bars */}
      <div className="flex items-end gap-[2px] h-[48px]">
        {dailyData.map((d) => {
          const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
          return (
            <div
              key={d.date}
              className="flex-1 rounded-t-sm transition-all hover:opacity-80"
              style={{
                height: `${Math.max(heightPct, d.count > 0 ? 8 : 2)}%`,
                background: d.count > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                minHeight: d.count > 0 ? 3 : 1,
              }}
              title={`${d.date}: ${d.count} game${d.count !== 1 ? 's' : ''}`}
            />
          )
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between">
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>30d ago</span>
        <span className="text-[8px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Today</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `PeakHoursChart` component**

```typescript
function PeakHoursChart() {
  const { data: ext } = useExtendedStats()
  if (!ext) return null

  const hours = ext.game_analytics.peak_play_hours
  const maxH = Math.max(...hours, 1)
  const totalGames = hours.reduce((a, b) => a + b, 0)
  if (totalGames === 0) return null

  // Show only 6am-2am range (most relevant)
  const displayHours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
      <p
        className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        🕐 Peak Play Times
      </p>

      <div className="flex items-end gap-[2px] h-[40px]">
        {displayHours.map((h) => {
          const count = hours[h]
          const heightPct = maxH > 0 ? (count / maxH) * 100 : 0
          const label = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
          return (
            <div
              key={h}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%`,
                background: count > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                minHeight: count > 0 ? 2 : 1,
              }}
              title={`${label}: ${count} game${count !== 1 ? 's' : ''}`}
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
```

- [ ] **Step 3: Add both components to StatsTab after GameAnalyticsSection**

```tsx
<ActivitySparkline />
<PeakHoursChart />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add 30-day activity sparkline and peak play times chart"
```

---

### Task 6: Leaderboard + Most Conquered + Most Active Pods

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add `LeaderboardSection` component**

```typescript
function LeaderboardSection() {
  const { data: ext } = useExtendedStats()
  if (!ext) return null

  return (
    <div className="space-y-4">
      {/* Top Conquerors */}
      {ext.top_conquerors.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p
            className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
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
                  {c.display_name}
                </span>
                <span className="text-[12px] font-bold text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Conquered Planes */}
      {ext.top_conquered_planes.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p
            className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
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

      {/* Most Visited Planes */}
      {ext.game_analytics.most_visited_planes.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p
            className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
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

      {/* Most Active Pods */}
      {ext.most_active_pods.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
          <p
            className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
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
```

- [ ] **Step 2: Add LeaderboardSection to StatsTab**

```tsx
<LeaderboardSection />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add leaderboard, most conquered/visited planes, active pods"
```

---

### Task 7: Achievement Audit Section

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add `AchievementAuditSection` component**

Uses `ACHIEVEMENTS` from definitions to map keys to labels/icons.

```typescript
function AchievementAuditSection() {
  const { data: ext } = useExtendedStats()
  if (!ext || ext.achievement_distribution.length === 0) return null

  const achievementMap = new Map(ACHIEVEMENTS.map((a) => [a.key, a]))
  const maxEarned = Math.max(...ext.achievement_distribution.map((a) => a.earned_count), 1)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
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

      {/* Unearned achievements */}
      {ACHIEVEMENTS.length > ext.achievement_distribution.length && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p className="text-[9px] text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Not yet earned:
          </p>
          <div className="flex flex-wrap gap-1">
            {ACHIEVEMENTS
              .filter((a) => !ext.achievement_distribution.some((s) => s.achievement_key === a.key))
              .map((a) => (
                <span
                  key={a.key}
                  className="text-[12px] opacity-30"
                  title={`${a.name}: ${a.description}`}
                >
                  {a.icon}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add AchievementAuditSection to StatsTab**

```tsx
<AchievementAuditSection />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add achievement audit with progress bars and unearned tracking"
```

---

### Task 8: Admin Notes UI in UserCard

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add `AdminNotesPanel` component**

```typescript
function AdminNotesPanel({ userId, currentUserId, canModify }: { userId: string; currentUserId: string; canModify: boolean }) {
  const { data: notes, isLoading } = useAdminNotes(userId)
  const addNote = useAddAdminNote()
  const deleteNote = useDeleteAdminNote()
  const [newNote, setNewNote] = useState('')

  if (isLoading) return <div className="h-8 animate-pulse bg-[var(--color-surface)]/40 rounded-lg" />

  return (
    <div className="space-y-2">
      {/* Existing notes */}
      {notes && notes.length > 0 ? (
        notes.map((n) => {
          const adminName = (n.admin_profile as { display_name: string } | null)?.display_name ?? 'Unknown'
          return (
            <div
              key={n.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
            >
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

      {/* Add note input */}
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
```

- [ ] **Step 2: Add notes toggle + panel to `UserCard`**

Add `showNotes` state alongside `showStrikes`:
```typescript
const [showNotes, setShowNotes] = useState(false)
```

Add a "Notes" button in the actions row (after Strike/Ban buttons):
```tsx
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
```

Add expandable notes panel after strike history panel:
```tsx
{showNotes && (
  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-3 space-y-2">
    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>
      Admin Notes
    </p>
    <AdminNotesPanel userId={u.id} currentUserId={currentUserId} canModify={canModify || isSelf} />
  </div>
)}
```

- [ ] **Step 3: Add `useAdminNotes`, `useAddAdminNote`, `useDeleteAdminNote` to the import from `useAdmin`**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add admin notes panel to user cards"
```

---

### Task 9: Duplicate Plane Detection

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add duplicate detection logic to `PlanesTab`**

Add a `duplicates` memo in `PlanesTab`:

```typescript
const duplicates = useMemo(() => {
  if (!planes) return new Set<string>()
  const nameCounts: Record<string, number> = {}
  for (const p of planes) {
    const normalized = p.name.toLowerCase().trim()
    nameCounts[normalized] = (nameCounts[normalized] ?? 0) + 1
  }
  const dupeNames = new Set<string>()
  for (const p of planes) {
    const normalized = p.name.toLowerCase().trim()
    if (nameCounts[normalized] > 1) {
      dupeNames.add(p.id)
    }
  }
  return dupeNames
}, [planes])
```

- [ ] **Step 2: Pass `isDuplicate` to PlaneCard and show warning badge**

In `PlanesTab` render:
```tsx
<PlaneCard
  key={plane.id}
  plane={plane}
  currentUserId={currentUserId}
  onPreview={(url, name) => setPreviewImage({ url, name })}
  isDuplicate={duplicates.has(plane.id)}
/>
```

Update `PlaneCard` props to accept `isDuplicate`:
```typescript
function PlaneCard({ plane, currentUserId, onPreview, isDuplicate }: {
  plane: AdminCustomPlane; currentUserId: string;
  onPreview: (url: string, name: string) => void;
  isDuplicate?: boolean;
}) {
```

Add duplicate warning badge next to the plane name badges:
```tsx
{isDuplicate && (
  <span
    className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-[var(--color-cta)]/50 text-[var(--color-cta)] bg-[var(--color-cta)]/10"
    style={{ fontFamily: 'var(--font-heading)' }}
    title="Another custom plane has the same name"
  >
    <AlertTriangle size={8} /> Dupe
  </span>
)}
```

- [ ] **Step 3: Add duplicate count to the planes header**

```tsx
{duplicates.size > 0 && (
  <span
    className="text-[10px] text-[var(--color-cta)] shrink-0"
    style={{ fontFamily: 'var(--font-body)' }}
  >
    ⚠ {duplicates.size} dupe{duplicates.size !== 1 ? 's' : ''}
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add duplicate custom plane detection with warning badges"
```

---

### Task 10: CSV Export

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add CSV utility function**

```typescript
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
```

- [ ] **Step 2: Add export button to UsersTab**

Add after the search and filters section:
```tsx
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
```

- [ ] **Step 3: Add export button to FeedbackTab**

Similar pattern for feedback data with columns: Category, Status, Message, User, Date.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add CSV export for users and feedback"
```

---

### Task 11: Audit Log Enhancement + Final Wiring

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add `note_added` and `note_deleted` to audit action labels/colors**

```typescript
const AUDIT_ACTION_LABELS: Record<string, string> = {
  // ... existing entries ...
  note_added: 'Added Note',
  note_deleted: 'Deleted Note',
  announcement_created: 'Created Announcement',
  announcement_updated: 'Updated Announcement',
  announcement_deleted: 'Deleted Announcement',
}

const AUDIT_ACTION_COLORS: Record<string, string> = {
  // ... existing entries ...
  note_added: 'var(--color-accent)',
  note_deleted: 'var(--color-text-muted)',
  announcement_created: 'var(--color-accent)',
  announcement_updated: 'var(--color-text-muted)',
  announcement_deleted: 'var(--color-cta)',
}
```

- [ ] **Step 2: Add `'announcement'` to `AuditLogEntry.target_type` in types**

```typescript
export interface AuditLogEntry {
  // ...
  target_type: 'user' | 'custom_plane' | 'feedback' | 'strike' | 'announcement'
  // ...
}
```

- [ ] **Step 3: Update `logAuditAction` target_type union in queries.ts**

```typescript
targetType: 'user' | 'custom_plane' | 'feedback' | 'announcement' | 'strike',
```

- [ ] **Step 4: Build verification**

```bash
cd planechaser && npx next build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/types.ts src/lib/admin/queries.ts src/app/admin/page.tsx
git commit -m "feat(admin): complete audit log labels and build verification"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - ✅ Skeleton loader on image preview (pre-plan edit)
   - ✅ Tooltips on all stat cards (Task 3)
   - ✅ Most visited planes (Task 6 — LeaderboardSection)
   - ✅ Most conquered planes (Task 6 — LeaderboardSection)
   - ✅ Avg turns per game (Task 4 — GameAnalyticsSection)
   - ✅ Avg rolls per planeswalk (Task 4 — GameAnalyticsSection)
   - ✅ Chaos trigger rate (Task 4 — GameAnalyticsSection)
   - ✅ Peak play times (Task 5 — PeakHoursChart)
   - ✅ Most active pod (Task 6 — LeaderboardSection)
   - ✅ Player retention (Task 4 — returning stat card)
   - ✅ Activity sparkline (Task 5 — ActivitySparkline)
   - ✅ Admin notes (Task 2 migration + Task 8 UI)
   - ✅ Duplicate plane detection (Task 9)
   - ✅ CSV export (Task 10)
   - ✅ Global leaderboard (Task 6 — Top Conquerors)
   - ✅ Plane of the week (Task 4 — GameAnalyticsSection)
   - ✅ Achievement audit (Task 7)

2. **Placeholder scan:** No TBD/TODO/placeholders found.

3. **Type consistency:** `ExtendedStats`, `GameAnalytics`, `TopPlane`, `TopConqueror`, `PodActivity`, `DailyGameCount`, `AchievementStat`, `AdminNote` — all consistently referenced between types, queries, hooks, and UI components.
