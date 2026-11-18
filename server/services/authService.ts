import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { dbStore } from '../utils/mockStore'
import { ValidationError, AuthenticationError, AuthorizationError, ConflictError } from '../../lib/errors/AppError'
import { AuditService } from './auditService'
import type { Profile, UserRole } from '../../types/database'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$')
    if (parts.length !== 3) return false
    const [, salt, keyHex] = parts
    const keyBuf = Buffer.from(keyHex, 'hex')
    const derivedBuf = scryptSync(password, salt, 64)
    if (keyBuf.length !== derivedBuf.length) return false
    return timingSafeEqual(keyBuf, derivedBuf)
  }
  return storedHash === `hash_${password}` || storedHash === password
}

export function sanitizeProfile(profile: Profile | null): Omit<Profile, 'password_hash'> | null {
  if (!profile) return null
  const { password_hash: _removed, ...safe } = profile
  return safe
}

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
    email?: string | null,
    displayName?: string,
    username?: string,
    password?: string
  ): Promise<Profile> {
    const cleanEmailInput = email ? email.trim().toLowerCase() : ''

    if (cleanEmailInput) {
      const existing = Array.from(dbStore.profiles.values()).find(
        p => p.email.toLowerCase() === cleanEmailInput
      )
      if (existing) {
        throw new ConflictError('A user with this email address already exists')
      }
    }

    let finalUsername = username ? username.trim().toLowerCase() : ''
    if (finalUsername) {
      if (!/^[a-z0-9_-]{3,30}$/.test(finalUsername)) {
        throw new ValidationError('Username must be 3-30 characters (letters, numbers, - or _)')
      }
      const isAvailable = await this.isUsernameAvailable(finalUsername)
      if (!isAvailable) {
        throw new ConflictError('Username is already taken')
      }
    } else if (cleanEmailInput) {
      const base = cleanEmailInput.split('@')[0].replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'user'
      let candidate = base
      let counter = 1
      while (!(await this.isUsernameAvailable(candidate))) {
        candidate = `${base}${counter}`
        counter++
      }
      finalUsername = candidate
    } else {
      throw new ValidationError('Username is required')
    }

    const finalEmail = cleanEmailInput || `${finalUsername}@users.local`
    const userId = `u${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const now = new Date().toISOString()

    const newProfile: Profile = {
      id: userId,
      email: finalEmail,
      username: finalUsername,
      display_name: displayName?.trim() || finalUsername,
      avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalUsername)}`,
      password_hash: password ? hashPassword(password) : null,
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
      throw new AuthenticationError('Invalid username or password')
    }

    if (user.password_hash) {
      if (!password || !verifyPassword(password, user.password_hash)) {
        throw new AuthenticationError('Invalid username or password')
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

    if (updates.role && updates.role !== profile.role && !isAdmin) {
      throw new AuthorizationError('Only Administrators can modify user roles')
    }

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
      password_hash: updates.password ? hashPassword(updates.password) : profile.password_hash,
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
