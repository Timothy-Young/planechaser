import type { UserRole } from './types'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  mod: 2,
  user: 1,
}

export function hasRole(userRole: UserRole | undefined, minRole: UserRole): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

export function isAdmin(role: UserRole | undefined): boolean {
  return hasRole(role, 'admin')
}

export function isMod(role: UserRole | undefined): boolean {
  return hasRole(role, 'mod')
}

export function isOwner(role: UserRole | undefined): boolean {
  return hasRole(role, 'owner')
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'owner': return 'Owner'
    case 'admin': return 'Admin'
    case 'mod': return 'Moderator'
    case 'user': return 'User'
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'owner': return 'var(--color-gold)'
    case 'admin': return 'var(--color-cta)'
    case 'mod': return 'var(--color-accent)'
    case 'user': return 'var(--color-text-muted)'
  }
}
