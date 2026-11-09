import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { ValidationError, AuthenticationError, AuthorizationError, ConflictError } from '../../lib/errors/AppError'
import { AuditService } from './auditService'
import type { Profile, UserRole } from '../../types/database'

export class AuthService {
  public static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const clean = username.trim().toLowerCase()
    if (!/^[a-z0-9_-]{3,30}$/.test(clean)) {
      return false
    }
    const match = Array.from(dbStore.profiles.values()).find(
      p => p.username?.toLowerCase() === clean && p.id !== excludeUserId
    )
    return !match
  }

  public static async register(
    email: string,
    displayName?: string,
    username?: string,
    password?: string
  ): Promise<Profile> {
    const existing = Array.from(dbStore.profiles.values()).find(p => p.email.toLowerCase() === email.toLowerCase().trim())
    if (existing) {
      throw new ConflictError('A user with this email address already exists')
    }

    let finalUsername = username ? username.trim().toLowerCase() : ''
    if (finalUsername) {
      const isAvailable = await this.isUsernameAvailable(finalUsername)
      if (!isAvailable) {
        throw new ConflictError('Username is already taken or invalid')
      }
    } else {
      // Generate a default available username from email prefix
      const base = email.split('@')[0].replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'user'
      let candidate = base
      let counter = 1
      while (!(await this.isUsernameAvailable(candidate))) {
        candidate = `${base}${counter}`
        counter++
      }
      finalUsername = candidate
    }

    const userId = `u${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date().toISOString()

    const newProfile: Profile = {
      id: userId,
      email: email.toLowerCase().trim(),
      username: finalUsername,
      display_name: displayName || finalUsername,
      avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalUsername)}`,
      password_hash: password ? `hash_${password}` : null,
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
      metadata: { email: newProfile.email, username: finalUsername }
    })

    return newProfile
  }

  public static async login(emailOrUsername: string, password?: string): Promise<Profile> {
    const clean = emailOrUsername.trim().toLowerCase()
    const user = Array.from(dbStore.profiles.values()).find(
      p => p.email.toLowerCase() === clean || p.username?.toLowerCase() === clean
    )

    if (!user) {
      if (clean.includes('@')) {
        // Auto-register convenience for email logins if not found
        return this.register(clean)
      }
      throw new AuthenticationError('Invalid username/email or password')
    }

    // Verify password if user has password_hash and a password was supplied
    if (user.password_hash && password) {
      const isMatch = user.password_hash === `hash_${password}` || user.password_hash === password
      if (!isMatch) {
        throw new AuthenticationError('Invalid credentials')
      }
    }

    await AuditService.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'PROFILE',
      entityId: user.id,
      metadata: { email: user.email, username: user.username }
    })

    return user
  }

  public static async loginWithGoogle(payload: { email: string; name?: string; picture?: string; googleId?: string }): Promise<Profile> {
    const cleanEmail = payload.email.trim().toLowerCase()
    let user = Array.from(dbStore.profiles.values()).find(p => p.email.toLowerCase() === cleanEmail)

    if (!user) {
      const base = cleanEmail.split('@')[0].replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'user'
      let candidate = base
      let counter = 1
      while (!(await this.isUsernameAvailable(candidate))) {
        candidate = `${base}${counter}`
        counter++
      }

      user = await this.register(cleanEmail, payload.name, candidate)
      if (payload.picture) {
        user.avatar_url = payload.picture
        dbStore.profiles.set(user.id, user)
      }
    }

    await AuditService.log({
      actorId: user.id,
      action: 'GOOGLE_LOGIN',
      entityType: 'PROFILE',
      entityId: user.id,
      metadata: { email: user.email, googleId: payload.googleId }
    })

    return user
  }

  public static async getProfileByUsername(username: string): Promise<Profile | null> {
    const clean = username.trim().toLowerCase()
    const user = Array.from(dbStore.profiles.values()).find(p => p.username?.toLowerCase() === clean)
    return user || null
  }

  public static async updateProfile(
    userId: string,
    updates: {
      display_name?: string
      avatar_url?: string
      username?: string
      bio?: string
      password?: string
      role?: UserRole
    },
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

    // If username is changing, verify availability
    if (updates.username && updates.username.toLowerCase() !== profile.username?.toLowerCase()) {
      const available = await this.isUsernameAvailable(updates.username, userId)
      if (!available) {
        throw new ConflictError('The requested username is already taken or invalid (3-30 chars, alphanumeric, - and _)')
      }
    }

    const updated: Profile = {
      ...profile,
      display_name: updates.display_name !== undefined ? updates.display_name : profile.display_name,
      avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : profile.avatar_url,
      username: updates.username !== undefined ? updates.username.trim().toLowerCase() : profile.username,
      bio: updates.bio !== undefined ? updates.bio : profile.bio,
      password_hash: updates.password ? `hash_${updates.password}` : profile.password_hash,
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
