import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { ValidationError, AuthenticationError, AuthorizationError, ConflictError } from '../../lib/errors/AppError'
import { AuditService } from './auditService'
import type { Profile, UserRole } from '../../types/database'

export class AuthService {
  public static async register(email: string, displayName?: string): Promise<Profile> {
    const existing = Array.from(dbStore.profiles.values()).find(p => p.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      throw new ConflictError('A user with this email address already exists')
    }

    const userId = `u${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date().toISOString()

    const newProfile: Profile = {
      id: userId,
      email: email.toLowerCase().trim(),
      display_name: displayName || email.split('@')[0],
      avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
      role: 'USER',
      created_at: now,
      updated_at: now
    }

    dbStore.profiles.set(userId, newProfile)

    await AuditService.log({
      actorId: userId,
      action: 'USER_REGISTER',
      entityType: 'PROFILE',
      entityId: userId,
      metadata: { email: newProfile.email }
    })

    return newProfile
  }

  public static async login(email: string): Promise<Profile> {
    const user = Array.from(dbStore.profiles.values()).find(p => p.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      // Auto-register if non-existent for painless test exploration
      return this.register(email)
    }

    await AuditService.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'PROFILE',
      entityId: user.id,
      metadata: { email: user.email }
    })

    return user
  }

  public static async updateProfile(
    userId: string,
    updates: { display_name?: string; avatar_url?: string; role?: UserRole },
    actorId: string,
    actorRole: UserRole
  ): Promise<Profile> {
    const profile = dbStore.profiles.get(userId)
    if (!profile) {
      throw new ValidationError('Profile not found')
    }

    const isSelf = userId === actorId
    const isAdmin = actorRole === 'ADMIN'

    if (!isSelf && !isAdmin) {
      throw new AuthorizationError('You cannot edit other users profiles')
    }

    // Role changes require Admin privileges
    if (updates.role && updates.role !== profile.role && !isAdmin) {
      throw new AuthorizationError('Only Administrators can modify user roles')
    }

    const updated: Profile = {
      ...profile,
      display_name: updates.display_name !== undefined ? updates.display_name : profile.display_name,
      avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : profile.avatar_url,
      role: (isAdmin && updates.role) ? updates.role : profile.role,
      updated_at: new Date().toISOString()
    }

    dbStore.profiles.set(userId, updated)

    await AuditService.log({
      actorId,
      action: 'UPDATE_PROFILE',
      entityType: 'PROFILE',
      entityId: userId,
      metadata: { changes: Object.keys(updates) }
    })

    return updated
  }
}
