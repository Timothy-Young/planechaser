# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin dashboard at `/admin` that lets owner/admin users view app stats, manage user roles, moderate custom planes, handle feedback with email replies, and enforce a 3-strike ban system.

**Architecture:** A `role` column on the `profiles` table controls access (owner > admin > mod > user). A server-side API route `/api/admin/[...action]` handles all admin mutations (role changes, bans, plane deletion, feedback replies) using the server Supabase client with RLS policies that check the caller's role. The frontend is a tabbed dashboard with 4 sections: Stats, Users, Planes, and Feedback. A `strike_count` column on profiles tracks warnings; at 3 strikes the user is banned. Feedback gets `admin_reply` and `admin_reply_at` columns; replying also triggers an email via Supabase Edge Function (or a simple `mailto:` link as MVP).

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + RLS, TanStack Query v5, Tailwind CSS, lucide-react icons, existing CSS variable theming system.

---

## File Structure

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/017_admin_roles_and_strikes.sql` | Add `role`, `strike_count`, `is_banned` to profiles; add `admin_reply`, `admin_reply_at`, `status` to feedback; update RLS |
| `src/lib/admin/types.ts` | TypeScript types for admin data (AdminUser, AdminFeedback, AdminCustomPlane, AppStats) |
| `src/lib/admin/queries.ts` | Server-side query functions for admin operations |
| `src/hooks/useAdmin.ts` | TanStack Query hooks for admin data + mutations |
| `src/lib/admin/guards.ts` | `isAdmin(role)` / `isMod(role)` helper functions + `useRequireAdmin` hook |
| `src/app/admin/page.tsx` | Admin dashboard page (tabbed: Stats, Users, Planes, Feedback) |
| `src/app/admin/layout.tsx` | Admin layout with auth/role guard |
| `src/app/api/admin/route.ts` | API route handling all admin mutations (POST with action dispatch) |

### Modified files
| File | Change |
|------|--------|
| `src/store/app-store.ts` | Add `userRole` field derived from profile |
| `src/components/bottom-nav.tsx` | Show admin link (Shield icon) for admin/owner/mod users |
| `src/app/profile/page.tsx` | Show role badge next to display name |

---

## Task 1: Database Migration — Roles, Strikes, Feedback Expansion

**Files:**
- Create: `supabase/migrations/017_admin_roles_and_strikes.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add role and moderation columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('owner', 'admin', 'mod', 'user'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strike_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Set Tim as owner
UPDATE profiles SET role = 'owner' WHERE id = '1db0fa5e-4e0e-47be-a9dc-65b7de5397a5';

-- Expand feedback table for admin replies and status tracking
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'read', 'replied', 'resolved'));
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_by UUID REFERENCES auth.users(id);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Backfill user_email from auth.users for existing feedback
UPDATE feedback f SET user_email = (
  SELECT u.email FROM auth.users u WHERE u.id = f.user_id
) WHERE f.user_email IS NULL AND f.user_id IS NOT NULL;

-- Also capture email on new feedback inserts (trigger)
CREATE OR REPLACE FUNCTION set_feedback_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO NEW.user_email FROM auth.users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_feedback_email ON feedback;
CREATE TRIGGER trg_set_feedback_email
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_feedback_email();

-- RLS: Admins/mods/owner can read ALL feedback
CREATE POLICY "Admins can view all feedback"
  ON feedback FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

-- RLS: Admins/owner can update feedback (reply, status)
CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- RLS: Admins can read ALL profiles (for user management)
-- The existing policy only lets users read their own profile.
-- We need admins to see all profiles.
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin', 'mod')
    )
  );

-- RLS: Owner/admin can update any profile (role changes, bans)
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('owner', 'admin')
    )
  );

-- RLS: Admins can delete any custom plane (moderation)
CREATE POLICY "Admins can delete custom planes"
  ON custom_planes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

-- RLS: Admins can view ALL custom planes (including private ones for moderation)
CREATE POLICY "Admins can view all custom planes"
  ON custom_planes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'mod')
    )
  );

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__supabase__execute_sql` with the SQL above (or `apply_migration`).

- [ ] **Step 3: Verify Tim's profile is set to owner**

Run: `mcp__supabase__execute_sql` with:
```sql
SELECT id, display_name, role, strike_count, is_banned FROM profiles WHERE id = '1db0fa5e-4e0e-47be-a9dc-65b7de5397a5';
```
Expected: `role = 'owner'`, `strike_count = 0`, `is_banned = false`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/017_admin_roles_and_strikes.sql
git commit -m "feat(admin): add roles, strikes, ban columns to profiles; expand feedback table"
```

---

## Task 2: Admin Types and Guard Utilities

**Files:**
- Create: `src/lib/admin/types.ts`
- Create: `src/lib/admin/guards.ts`

- [ ] **Step 1: Create admin types**

Create `src/lib/admin/types.ts`:
```typescript
export type UserRole = 'owner' | 'admin' | 'mod' | 'user'

export interface AdminUser {
  id: string
  display_name: string
  role: UserRole
  strike_count: number
  is_banned: boolean
  banned_at: string | null
  ban_reason: string | null
  created_at: string
  friend_code: string
  avatar_url: string | null
  // Aggregated stats
  games_hosted: number
  conquests: number
  custom_planes_count: number
  feedback_count: number
}

export interface AdminFeedback {
  id: string
  user_id: string | null
  user_email: string | null
  category: 'bug' | 'feature' | 'general' | 'other'
  message: string
  status: 'new' | 'read' | 'replied' | 'resolved'
  admin_reply: string | null
  admin_reply_at: string | null
  admin_reply_by: string | null
  created_at: string
  // Joined
  profiles: { display_name: string } | null
}

export interface AdminCustomPlane {
  id: string
  user_id: string
  name: string
  type_line: string
  oracle_text: string
  chaos_text: string
  is_public: boolean
  image_path: string | null
  created_at: string
  // Joined
  profiles: { display_name: string } | null
}

export interface AppStats {
  total_users: number
  total_games: number
  total_conquests: number
  total_custom_planes: number
  total_feedback: number
  new_feedback: number
  banned_users: number
  users_last_7_days: number
  games_last_7_days: number
}
```

- [ ] **Step 2: Create guard utilities**

Create `src/lib/admin/guards.ts`:
```typescript
import type { UserRole } from './types'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  mod: 2,
  user: 1,
}

/** Check if a role has at least the given minimum role level */
export function hasRole(userRole: UserRole | undefined, minRole: UserRole): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

/** Shorthand: is admin or owner */
export function isAdmin(role: UserRole | undefined): boolean {
  return hasRole(role, 'admin')
}

/** Shorthand: is at least mod */
export function isMod(role: UserRole | undefined): boolean {
  return hasRole(role, 'mod')
}

/** Shorthand: is owner */
export function isOwner(role: UserRole | undefined): boolean {
  return hasRole(role, 'owner')
}

/** Get display label for a role */
export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'owner': return 'Owner'
    case 'admin': return 'Admin'
    case 'mod': return 'Moderator'
    case 'user': return 'User'
  }
}

/** Get color CSS variable for a role badge */
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'owner': return 'var(--color-gold)'
    case 'admin': return 'var(--color-cta)'
    case 'mod': return 'var(--color-accent)'
    case 'user': return 'var(--color-text-muted)'
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/types.ts src/lib/admin/guards.ts
git commit -m "feat(admin): add admin types and role guard utilities"
```

---

## Task 3: Admin Server Queries

**Files:**
- Create: `src/lib/admin/queries.ts`

- [ ] **Step 1: Create server-side admin query functions**

Create `src/lib/admin/queries.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { AdminUser, AdminFeedback, AdminCustomPlane, AppStats, UserRole } from './types'

function supabase() {
  return createClient()
}

// ── Stats ──────────────────────────────────────────────────

export async function getAppStats(): Promise<AppStats> {
  const sb = supabase()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [users, games, conquests, customPlanes, feedback, newFeedback, banned, recentUsers, recentGames] =
    await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }),
      sb.from('game_sessions').select('id', { count: 'exact', head: true }),
      sb.from('conquered_planes').select('id', { count: 'exact', head: true }),
      sb.from('custom_planes').select('id', { count: 'exact', head: true }),
      sb.from('feedback').select('id', { count: 'exact', head: true }),
      sb.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      sb.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      sb.from('game_sessions').select('id', { count: 'exact', head: true }).gte('started_at', sevenDaysAgo),
    ])

  return {
    total_users: users.count ?? 0,
    total_games: games.count ?? 0,
    total_conquests: conquests.count ?? 0,
    total_custom_planes: customPlanes.count ?? 0,
    total_feedback: feedback.count ?? 0,
    new_feedback: newFeedback.count ?? 0,
    banned_users: banned.count ?? 0,
    users_last_7_days: recentUsers.count ?? 0,
    games_last_7_days: recentGames.count ?? 0,
  }
}

// ── Users ──────────────────────────────────────────────────

export async function getAdminUsers(): Promise<AdminUser[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as AdminUser[]
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
}

export async function addStrike(userId: string, currentStrikes: number): Promise<{ banned: boolean }> {
  const sb = supabase()
  const newCount = currentStrikes + 1
  const shouldBan = newCount >= 3

  const updates: Record<string, unknown> = { strike_count: newCount }
  if (shouldBan) {
    updates.is_banned = true
    updates.banned_at = new Date().toISOString()
    updates.ban_reason = 'Automatic ban: 3 strikes reached'
  }

  const { error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
  return { banned: shouldBan }
}

export async function banUser(userId: string, reason: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason,
    })
    .eq('id', userId)

  if (error) throw error
}

export async function unbanUser(userId: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({
      is_banned: false,
      banned_at: null,
      ban_reason: null,
      strike_count: 0,
    })
    .eq('id', userId)

  if (error) throw error
}

// ── Feedback ───────────────────────────────────────────────

export async function getAdminFeedback(): Promise<AdminFeedback[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('feedback')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AdminFeedback[]
}

export async function replyToFeedback(
  feedbackId: string,
  adminUserId: string,
  reply: string,
): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('feedback')
    .update({
      admin_reply: reply,
      admin_reply_at: new Date().toISOString(),
      admin_reply_by: adminUserId,
      status: 'replied',
    })
    .eq('id', feedbackId)

  if (error) throw error
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'read' | 'replied' | 'resolved',
): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('feedback')
    .update({ status })
    .eq('id', feedbackId)

  if (error) throw error
}

// ── Custom Planes (moderation) ─────────────────────────────

export async function getAdminCustomPlanes(): Promise<AdminCustomPlane[]> {
  const sb = supabase()
  const { data, error } = await sb
    .from('custom_planes')
    .select('id, user_id, name, type_line, oracle_text, chaos_text, is_public, image_path, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AdminCustomPlane[]
}

export async function adminDeleteCustomPlane(planeId: string): Promise<void> {
  const sb = supabase()
  const { error } = await sb
    .from('custom_planes')
    .delete()
    .eq('id', planeId)

  if (error) throw error
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/queries.ts
git commit -m "feat(admin): add server-side admin query functions"
```

---

## Task 4: TanStack Query Hooks for Admin

**Files:**
- Create: `src/hooks/useAdmin.ts`

- [ ] **Step 1: Create admin hooks**

Create `src/hooks/useAdmin.ts`:
```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppStats,
  getAdminUsers,
  updateUserRole,
  addStrike,
  banUser,
  unbanUser,
  getAdminFeedback,
  replyToFeedback,
  updateFeedbackStatus,
  getAdminCustomPlanes,
  adminDeleteCustomPlane,
} from '@/lib/admin/queries'
import type { UserRole } from '@/lib/admin/types'

const ADMIN_STALE = 30_000 // 30s

export function useAppStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAppStats,
    staleTime: ADMIN_STALE,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAdminUsers,
    staleTime: ADMIN_STALE,
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; role: UserRole }) =>
      updateUserRole(params.userId, params.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAddStrike() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; currentStrikes: number }) =>
      addStrike(params.userId, params.currentStrikes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; reason: string }) =>
      banUser(params.userId, params.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useUnbanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAdminFeedback() {
  return useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: getAdminFeedback,
    staleTime: ADMIN_STALE,
  })
}

export function useReplyToFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { feedbackId: string; adminUserId: string; reply: string }) =>
      replyToFeedback(params.feedbackId, params.adminUserId, params.reply),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { feedbackId: string; status: 'new' | 'read' | 'replied' | 'resolved' }) =>
      updateFeedbackStatus(params.feedbackId, params.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'feedback'] }),
  })
}

export function useAdminCustomPlanes() {
  return useQuery({
    queryKey: ['admin', 'custom-planes'],
    queryFn: getAdminCustomPlanes,
    staleTime: ADMIN_STALE,
  })
}

export function useAdminDeleteCustomPlane() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planeId: string) => adminDeleteCustomPlane(planeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'custom-planes'] })
      qc.invalidateQueries({ queryKey: ['full-plane-corpus'] })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAdmin.ts
git commit -m "feat(admin): add TanStack Query hooks for admin operations"
```

---

## Task 5: Admin Layout with Role Guard

**Files:**
- Create: `src/app/admin/layout.tsx`
- Modify: `src/store/app-store.ts`

- [ ] **Step 1: Add userRole to app store**

In `src/store/app-store.ts`, add `userRole` and `setUserRole` to the interface and implementation:

```typescript
// Add to AppState interface:
  userRole: UserRole | null
  setUserRole: (role: UserRole | null) => void

// Add import at top:
import type { UserRole } from '@/lib/admin/types'

// Add to store implementation:
  userRole: null,
  setUserRole: (userRole) => set({ userRole }),
```

Note: `userRole` is NOT persisted — it's set on profile fetch and cleared on logout. Do not add it to the persist whitelist.

- [ ] **Step 2: Create admin layout with guard**

Create `src/app/admin/layout.tsx`:
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { isMod } from '@/lib/admin/guards'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const userRole = useAppStore((s) => s.userRole)

  useEffect(() => {
    if (!user) {
      router.replace('/auth')
      return
    }
    if (userRole && !isMod(userRole)) {
      router.replace('/profile')
    }
  }, [user, userRole, router])

  // Show nothing while checking auth
  if (!user || !userRole || !isMod(userRole)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
          Checking access...
        </div>
      </main>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 3: Wire userRole into profile fetch**

Find the hook that fetches the user profile (`useUserProfile` in `src/hooks/usePods.ts`) and add a side effect that sets `userRole` in the store when profile data arrives. Add this to the **profile page** or the **layout** — wherever the profile is first fetched. The simplest approach: in `src/app/profile/page.tsx` (or the root layout), add:

```typescript
// After the useUserProfile() call:
const setUserRole = useAppStore((s) => s.setUserRole)
useEffect(() => {
  if (profile?.role) {
    setUserRole(profile.role as UserRole)
  }
}, [profile?.role, setUserRole])
```

But since the profile page is not always visited first, a better location is the root layout or a provider. For MVP, add it to the `useUserProfile` hook's `onSuccess` or to the profile page with a fallback in the admin layout that fetches the role itself.

**Recommended approach:** In the admin layout, fetch the role directly if not already set:

Add to `src/app/admin/layout.tsx` after the existing hooks:
```typescript
import { useUserProfile } from '@/hooks/usePods'
import type { UserRole } from '@/lib/admin/types'

// Inside the component:
const { data: profile } = useUserProfile()
const setUserRole = useAppStore((s) => s.setUserRole)

useEffect(() => {
  if (profile && (profile as Record<string, unknown>).role) {
    setUserRole((profile as Record<string, unknown>).role as UserRole)
  }
}, [profile, setUserRole])
```

- [ ] **Step 4: Commit**

```bash
git add src/store/app-store.ts src/app/admin/layout.tsx
git commit -m "feat(admin): add admin layout with role guard and userRole in store"
```

---

## Task 6: Admin Dashboard Page — Stats Tab

**Files:**
- Create: `src/app/admin/page.tsx` (first section: stats + tab skeleton)

- [ ] **Step 1: Create the admin dashboard page**

Create `src/app/admin/page.tsx` with the full tabbed UI. This is the largest file. It has 4 tabs: Stats, Users, Planes, Feedback.

The page structure:
- Header with shield icon and "Admin Dashboard" title
- Tab bar: Stats | Users | Planes | Feedback (with badge count on Feedback for new items)
- Tab content area

**Stats tab** shows:
- Total users, games, conquests, custom planes, feedback, banned users
- "Last 7 days" section: new users, games played
- Each stat in a card grid (3 cols on mobile)

**Users tab** shows:
- Table/list of all users with: display name, role (dropdown to change), strike count, ban status
- Action buttons: Add Strike, Ban/Unban, Change Role
- Strike counter shows as filled circles (3 = auto-ban)
- Owner cannot be modified by anyone (including themselves changing away from owner)

**Planes tab** shows:
- Grid of all custom planes (including private ones)
- Each card shows: name, creator, public/private, created date
- "Delete" button with confirmation
- "Add Strike to Creator" button

**Feedback tab** shows:
- List of all feedback sorted by newest
- Each entry shows: user name, email, category badge, message, status badge
- Expandable reply area with textarea
- "Reply via Email" button that opens `mailto:` with pre-filled subject/body
- Status dropdown (new/read/replied/resolved)

This is a large component. Write it as a single file with inline sub-components for each tab to keep it self-contained (the admin page is a one-off, not reused).

```typescript
'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Users, Wand2, MessageSquare, BarChart3,
  AlertTriangle, Ban, Check, ChevronDown, Trash2,
  Mail, Globe, Lock, Search, X, UserCheck, Undo2,
} from 'lucide-react'
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
import { useAppStore } from '@/store/app-store'
import { getRoleLabel, getRoleColor, isOwner, isAdmin } from '@/lib/admin/guards'
import type { UserRole, AdminUser, AdminFeedback, AdminCustomPlane } from '@/lib/admin/types'

type AdminTab = 'stats' | 'users' | 'planes' | 'feedback'

const TABS: { key: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'stats', label: 'Stats', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'planes', label: 'Planes', icon: Wand2 },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
]

// ── Stats Tab ──────────────────────────────────────────────

function StatsTab() {
  const { data: stats, isLoading } = useAppStats()

  if (isLoading || !stats) {
    return <div className="animate-pulse text-[var(--color-text-muted)] text-center py-12">Loading stats...</div>
  }

  const statCards = [
    { label: 'Total Users', value: stats.total_users, color: 'var(--color-accent)' },
    { label: 'Total Games', value: stats.total_games, color: 'var(--color-accent)' },
    { label: 'Conquests', value: stats.total_conquests, color: 'var(--color-gold)' },
    { label: 'Custom Planes', value: stats.total_custom_planes, color: 'var(--color-accent)' },
    { label: 'Feedback', value: stats.total_feedback, color: 'var(--color-accent)' },
    { label: 'New Feedback', value: stats.new_feedback, color: 'var(--color-cta)' },
    { label: 'Banned Users', value: stats.banned_users, color: stats.banned_users > 0 ? 'var(--color-cta)' : 'var(--color-text-muted)' },
    { label: 'Users (7d)', value: stats.users_last_7_days, color: 'var(--color-accent)' },
    { label: 'Games (7d)', value: stats.games_last_7_days, color: 'var(--color-accent)' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl p-3 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="text-2xl font-bold" style={{ color: stat.color, fontFamily: 'var(--font-heading)' }}>
            {stat.value}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Users Tab ──────────────────────────────────────────────

function UsersTab() {
  const { data: users, isLoading } = useAdminUsers()
  const currentUser = useAppStore((s) => s.user)
  const currentRole = useAppStore((s) => s.userRole)
  const updateRole = useUpdateUserRole()
  const addStrikeMut = useAddStrike()
  const banMut = useBanUser()
  const unbanMut = useUnbanUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [banReason, setBanReason] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    if (!users) return []
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase()
    return users.filter((u) =>
      u.display_name.toLowerCase().includes(q) ||
      u.friend_code.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  if (isLoading) return <div className="animate-pulse text-[var(--color-text-muted)] text-center py-12">Loading users...</div>

  function canModify(target: AdminUser): boolean {
    if (target.role === 'owner') return false // can't modify owner
    if (target.id === currentUser?.id) return false // can't modify self
    if (!isAdmin(currentRole ?? undefined)) return false
    return true
  }

  function handleRoleChange(user: AdminUser, newRole: UserRole) {
    if (!canModify(user)) return
    // Mods can't promote to admin+
    if (currentRole === 'admin' && (newRole === 'admin' || newRole === 'owner')) return
    updateRole.mutate({ userId: user.id, role: newRole })
  }

  function handleStrike(user: AdminUser) {
    if (!canModify(user)) return
    if (!window.confirm(`Add a strike to ${user.display_name}? (${user.strike_count + 1}/3${user.strike_count + 1 >= 3 ? ' — AUTO BAN' : ''})`)) return
    addStrikeMut.mutate({ userId: user.id, currentStrikes: user.strike_count })
  }

  function handleBan(user: AdminUser) {
    if (!canModify(user)) return
    const reason = banReason[user.id] || 'Banned by admin'
    if (!window.confirm(`Ban ${user.display_name}? Reason: ${reason}`)) return
    banMut.mutate({ userId: user.id, reason })
  }

  function handleUnban(user: AdminUser) {
    if (!canModify(user)) return
    if (!window.confirm(`Unban ${user.display_name}? This also resets their strike count.`)) return
    unbanMut.mutate(user.id)
  }

  const roleOptions: UserRole[] = isOwner(currentRole ?? undefined)
    ? ['owner', 'admin', 'mod', 'user']
    : ['mod', 'user']

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-8 py-2 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            <X size={12} />
          </button>
        )}
      </div>

      {filtered.map((user) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 space-y-3"
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {user.display_name}
              </span>
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                style={{ color: getRoleColor(user.role), background: `color-mix(in srgb, ${getRoleColor(user.role)} 15%, transparent)`, fontFamily: 'var(--font-heading)' }}
              >
                {getRoleLabel(user.role)}
              </span>
              {user.is_banned && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400" style={{ fontFamily: 'var(--font-heading)' }}>
                  BANNED
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              {user.friend_code}
            </span>
          </div>

          {/* Strike indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>Strikes:</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2"
                  style={{
                    borderColor: i < user.strike_count ? 'var(--color-cta)' : 'var(--color-border)',
                    background: i < user.strike_count ? 'var(--color-cta)' : 'transparent',
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)]">({user.strike_count}/3)</span>
          </div>

          {/* Actions */}
          {canModify(user) && (
            <div className="flex flex-wrap gap-2 items-center">
              {/* Role selector */}
              <div className="relative">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1 pr-6 text-[11px] text-[var(--color-text)] appearance-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{getRoleLabel(r)}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              </div>

              <button
                onClick={() => handleStrike(user)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-cta)]/10 text-[var(--color-cta)] hover:bg-[var(--color-cta)]/20 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <AlertTriangle size={11} /> Strike
              </button>

              {user.is_banned ? (
                <button
                  onClick={() => handleUnban(user)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Undo2 size={11} /> Unban
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Ban reason..."
                    value={banReason[user.id] ?? ''}
                    onChange={(e) => setBanReason((prev) => ({ ...prev, [user.id]: e.target.value }))}
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-[11px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] w-32 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  <button
                    onClick={() => handleBan(user)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <Ban size={11} /> Ban
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ban reason if banned */}
          {user.is_banned && user.ban_reason && (
            <p className="text-[11px] text-red-400/80 italic" style={{ fontFamily: 'var(--font-body)' }}>
              Reason: {user.ban_reason}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ── Planes Tab ─────────────────────────────────────────────

function PlanesTab() {
  const { data: planes, isLoading } = useAdminCustomPlanes()
  const deleteMut = useAdminDeleteCustomPlane()
  const addStrikeMut = useAddStrike()
  const { data: users } = useAdminUsers()
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!planes) return []
    if (!searchQuery.trim()) return planes
    const q = searchQuery.toLowerCase()
    return planes.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.oracle_text.toLowerCase().includes(q) ||
      ((p.profiles as unknown as { display_name: string } | null)?.display_name ?? '').toLowerCase().includes(q)
    )
  }, [planes, searchQuery])

  if (isLoading) return <div className="animate-pulse text-[var(--color-text-muted)] text-center py-12">Loading planes...</div>

  function handleDelete(plane: AdminCustomPlane) {
    const creator = (plane.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
    if (!window.confirm(`Delete "${plane.name}" by ${creator}? This cannot be undone.`)) return
    deleteMut.mutate(plane.id)
  }

  function handleStrikeCreator(plane: AdminCustomPlane) {
    const user = users?.find((u) => u.id === plane.user_id)
    if (!user) return
    if (!window.confirm(`Add a strike to ${user.display_name} for offensive plane "${plane.name}"? (${user.strike_count + 1}/3)`)) return
    addStrikeMut.mutate({ userId: plane.user_id, currentStrikes: user.strike_count })
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search planes..."
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-8 py-2 text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            <X size={12} />
          </button>
        )}
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
        {filtered.length} custom plane{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.map((plane) => {
        const creator = (plane.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
        return (
          <motion.div
            key={plane.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {plane.name}
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                  by {creator} · {plane.type_line}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {plane.is_public ? (
                  <span className="flex items-center gap-0.5 text-[9px] text-[var(--color-accent)]"><Globe size={10} /> Public</span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[9px] text-[var(--color-text-muted)]"><Lock size={10} /> Private</span>
                )}
              </div>
            </div>

            {/* Oracle text preview */}
            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2" style={{ fontFamily: 'var(--font-body)' }}>
              {plane.oracle_text || '(no oracle text)'}
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleDelete(plane)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <Trash2 size={11} /> Delete
              </button>
              <button
                onClick={() => handleStrikeCreator(plane)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-cta)]/10 text-[var(--color-cta)] hover:bg-[var(--color-cta)]/20 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <AlertTriangle size={11} /> Strike Creator
              </button>
            </div>
          </motion.div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-[var(--color-text-muted)] py-8 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
          No custom planes found.
        </p>
      )}
    </div>
  )
}

// ── Feedback Tab ───────────────────────────────────────────

function FeedbackTab() {
  const { data: feedback, isLoading } = useAdminFeedback()
  const currentUser = useAppStore((s) => s.user)
  const replyMut = useReplyToFeedback()
  const statusMut = useUpdateFeedbackStatus()
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!feedback) return []
    if (filterStatus === 'all') return feedback
    return feedback.filter((f) => f.status === filterStatus)
  }, [feedback, filterStatus])

  if (isLoading) return <div className="animate-pulse text-[var(--color-text-muted)] text-center py-12">Loading feedback...</div>

  function handleReply(fb: AdminFeedback) {
    const reply = replyTexts[fb.id]
    if (!reply?.trim() || !currentUser) return
    replyMut.mutate(
      { feedbackId: fb.id, adminUserId: currentUser.id, reply: reply.trim() },
      { onSuccess: () => {
        setReplyTexts((prev) => ({ ...prev, [fb.id]: '' }))
        setExpandedId(null)
      }},
    )
  }

  function handleEmailReply(fb: AdminFeedback) {
    if (!fb.user_email) return
    const subject = encodeURIComponent(`Re: Your PlaneChaser ${fb.category} feedback`)
    const body = encodeURIComponent(
      `Hi${fb.profiles ? ` ${(fb.profiles as unknown as { display_name: string }).display_name}` : ''},\n\nThank you for your feedback:\n\n"${fb.message}"\n\n---\nReply here:\n\n`
    )
    window.open(`mailto:${fb.user_email}?subject=${subject}&body=${body}`, '_blank')
  }

  const statusColors: Record<string, string> = {
    new: 'var(--color-cta)',
    read: 'var(--color-accent)',
    replied: 'var(--color-gold)',
    resolved: 'var(--color-text-muted)',
  }

  const categoryEmoji: Record<string, string> = {
    bug: '🐛',
    feature: '💡',
    general: '💬',
    other: '📝',
  }

  return (
    <div className="space-y-3">
      {/* Status filter */}
      <div className="flex gap-1">
        {['all', 'new', 'read', 'replied', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              filterStatus === s
                ? 'bg-[var(--color-accent-deep)] text-white'
                : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
        {filtered.length} feedback item{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.map((fb) => {
        const userName = (fb.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Anonymous'
        const isExpanded = expandedId === fb.id
        const dateStr = new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

        return (
          <motion.div
            key={fb.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 space-y-2"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{categoryEmoji[fb.category] ?? '📝'}</span>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {userName}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {dateStr} · {fb.category}{fb.user_email ? ` · ${fb.user_email}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={fb.status}
                  onChange={(e) => statusMut.mutate({ feedbackId: fb.id, status: e.target.value as AdminFeedback['status'] })}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-1.5 py-0.5 text-[10px] text-[var(--color-text)] appearance-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-body)', color: statusColors[fb.status] }}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              {fb.message}
            </p>

            {/* Existing reply */}
            {fb.admin_reply && (
              <div className="rounded-lg bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/20 px-3 py-2">
                <p className="text-[10px] text-[var(--color-accent)] font-semibold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  Admin Reply
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-body)' }}>
                  {fb.admin_reply}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <MessageSquare size={11} /> {isExpanded ? 'Cancel' : 'Reply'}
              </button>
              {fb.user_email && (
                <button
                  onClick={() => handleEmailReply(fb)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Mail size={11} /> Email
                </button>
              )}
            </div>

            {/* Reply textarea */}
            {isExpanded && (
              <div className="space-y-2 pt-1">
                <textarea
                  value={replyTexts[fb.id] ?? ''}
                  onChange={(e) => setReplyTexts((prev) => ({ ...prev, [fb.id]: e.target.value }))}
                  placeholder="Type your reply..."
                  rows={3}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <button
                  onClick={() => handleReply(fb)}
                  disabled={!replyTexts[fb.id]?.trim() || replyMut.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--color-accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <Check size={11} /> {replyMut.isPending ? 'Saving...' : 'Save Reply'}
                </button>
              </div>
            )}
          </motion.div>
        )
      })}

      {filtered.length === 0 && (
        <p className="text-center text-[var(--color-text-muted)] py-8 text-[13px]" style={{ fontFamily: 'var(--font-body)' }}>
          No feedback found.
        </p>
      )}
    </div>
  )
}

// ── Main Dashboard Page ────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('stats')
  const { data: feedback } = useAdminFeedback()
  const newFeedbackCount = useMemo(
    () => (feedback ?? []).filter((f) => f.status === 'new').length,
    [feedback],
  )

  return (
    <main className="min-h-screen pb-nav" style={{ background: 'var(--color-bg)' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[var(--color-accent-deep)]/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[640px] mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[var(--color-cta)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Admin Dashboard
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl p-1 border border-[var(--color-border)]">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all relative ${
                tab === key
                  ? 'bg-[var(--color-accent-deep)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Icon size={14} />
              {label}
              {key === 'feedback' && newFeedbackCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-cta)] text-white text-[8px] font-bold flex items-center justify-center">
                  {newFeedbackCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === 'stats' && <StatsTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'planes' && <PlanesTab />}
          {tab === 'feedback' && <FeedbackTab />}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add admin dashboard page with stats, users, planes, and feedback tabs"
```

---

## Task 7: Wire Admin into Navigation

**Files:**
- Modify: `src/components/bottom-nav.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/hooks/usePods.ts` (to include role in profile fetch)

- [ ] **Step 1: Update profile query to include role**

In `src/hooks/usePods.ts`, find the `useUserProfile` hook. Ensure it selects `role` from the profiles table. The select should include `*` or explicitly include `role, strike_count, is_banned`. Since it likely already uses `select('*')`, no change may be needed — but verify. If the hook uses a specific column list, add `role`.

- [ ] **Step 2: Set userRole from profile in a central location**

The best place is `src/app/profile/page.tsx` since it's the most commonly visited page. But to ensure it works app-wide, also add it to the bottom nav (which renders on every page):

In `src/components/bottom-nav.tsx`:
```typescript
import { useUserProfile } from '@/hooks/usePods'
import { useAppStore } from '@/store/app-store'
import { isMod } from '@/lib/admin/guards'
import type { UserRole } from '@/lib/admin/types'
import { useEffect } from 'react'

// Inside BottomNav component, before the return:
const { data: profile } = useUserProfile()
const userRole = useAppStore((s) => s.userRole)
const setUserRole = useAppStore((s) => s.setUserRole)

useEffect(() => {
  const role = (profile as Record<string, unknown> | undefined)?.role as UserRole | undefined
  if (role && role !== userRole) {
    setUserRole(role)
  }
}, [profile, userRole, setUserRole])
```

Then conditionally add the admin nav item:

```typescript
// Replace the static NAV_ITEMS with a computed version:
const baseItems = [
  { path: '/setup', label: 'Play', icon: Swords },
  { path: '/decks', label: 'Decks', icon: Layers },
  { path: '/map', label: 'Map', icon: Globe },
  { path: '/pods', label: 'Pods', icon: Users },
  { path: '/friends', label: 'Friends', icon: UserPlus },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/support', label: 'Support', icon: Heart },
]

// Add Shield to imports, then in the component:
const navItems = useMemo(() => {
  if (isMod(userRole ?? undefined)) {
    return [...baseItems, { path: '/admin', label: 'Admin', icon: Shield }]
  }
  return baseItems
}, [userRole])
```

Use `navItems` instead of `NAV_ITEMS` in the JSX.

- [ ] **Step 3: Add role badge on profile page**

In `src/app/profile/page.tsx`, next to the display name, show the role badge if the user has a special role:

```typescript
import { getRoleLabel, getRoleColor } from '@/lib/admin/guards'

// After the display name rendering:
{profile?.role && profile.role !== 'user' && (
  <span
    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md"
    style={{
      color: getRoleColor(profile.role),
      background: `color-mix(in srgb, ${getRoleColor(profile.role)} 15%, transparent)`,
      fontFamily: 'var(--font-heading)',
    }}
  >
    {getRoleLabel(profile.role)}
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/bottom-nav.tsx src/app/profile/page.tsx src/hooks/usePods.ts
git commit -m "feat(admin): wire admin nav link for admin/mod users, show role badge on profile"
```

---

## Task 8: Build Verification

- [ ] **Step 1: Run the build**

```bash
cd planechaser && npx next build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 2: Verify migration was applied**

Run SQL to confirm:
```sql
SELECT id, display_name, role, strike_count, is_banned FROM profiles;
```

Expected: Tim has `role = 'owner'`, all others have `role = 'user'`.

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'feedback' AND column_name IN ('status', 'admin_reply', 'admin_reply_at', 'user_email') ORDER BY column_name;
```

Expected: All 4 columns exist.

- [ ] **Step 3: Commit any fixes and final push**

```bash
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] User/app stats: Task 3 (getAppStats) + Task 6 (StatsTab)
- [x] Delete offensive planes: Task 3 (adminDeleteCustomPlane) + Task 6 (PlanesTab)
- [x] Ban users: Task 3 (banUser/unbanUser) + Task 6 (UsersTab)
- [x] 3-strike system: Task 1 (strike_count column) + Task 3 (addStrike auto-bans at 3) + Task 6 (visual strike circles)
- [x] View/reply feedback: Task 3 (getAdminFeedback, replyToFeedback) + Task 6 (FeedbackTab with reply textarea)
- [x] Reply via email: Task 6 (mailto: link with pre-filled subject/body)
- [x] Assign/change roles: Task 3 (updateUserRole) + Task 6 (UsersTab role dropdown)
- [x] Owner protection: Task 6 (canModify checks role === 'owner')
- [x] Tim set as owner: Task 1 migration with direct UPDATE
- [x] Role hierarchy: Task 2 (guards.ts ROLE_HIERARCHY)
- [x] Admin nav visibility: Task 7 (conditional nav item)
- [x] Role badge on profile: Task 7

**Placeholder scan:** No TBDs, TODOs, or "implement later" found.

**Type consistency:** AdminUser, AdminFeedback, AdminCustomPlane, UserRole, AppStats — all consistently used across types.ts, queries.ts, hooks, and page components.
