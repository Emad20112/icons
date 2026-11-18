import { describe, it, expect } from 'vitest'
import { AuthService, verifyPassword } from '../../server/services/authService'
import { ConflictError, AuthenticationError } from '../../lib/errors/AppError'

describe('Unit Test: User Profiles & Authentication Boundary', () => {
  it('validates username uniqueness and format', async () => {
    const isTaken = await AuthService.isUsernameAvailable('creator')
    expect(isTaken).toBe(false)

    const isTooShort = await AuthService.isUsernameAvailable('ab')
    expect(isTooShort).toBe(false)

    const isUnique = await AuthService.isUsernameAvailable('unique_artist_2026')
    expect(isUnique).toBe(true)
  })

  it('registers user with username and hashed password without requiring email', async () => {
    const user = await AuthService.register(
      null,
      'New Artist',
      'new_artist',
      'password123'
    )

    expect(user).toBeDefined()
    expect(user.username).toBe('new_artist')
    expect(user.display_name).toBe('New Artist')
    expect(user.password_hash).toBeTruthy()
    expect(user.password_hash!.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('password123', user.password_hash!)).toBe(true)
    expect(verifyPassword('wrongpass', user.password_hash!)).toBe(false)
  })

  it('rejects duplicate username during registration', async () => {
    await expect(
      AuthService.register('other@example.com', 'Other', 'creator', 'secret123')
    ).rejects.toThrow(ConflictError)
  })

  it('allows logging in with username and password and rejects wrong password', async () => {
    const user = await AuthService.login('creator', 'creator123')
    expect(user).toBeDefined()
    expect(user.username).toBe('creator')

    await expect(
      AuthService.login('creator', 'invalid-password')
    ).rejects.toThrow(AuthenticationError)
  })

  it('rejects unknown usernames instead of auto-registering', async () => {
    await expect(
      AuthService.login('ghost@example.com', 'password123')
    ).rejects.toThrow(AuthenticationError)
  })

  it('retrieves user profile by username', async () => {
    const profile = await AuthService.getProfileByUsername('admin')
    expect(profile).toBeDefined()
    expect(profile?.email).toBe('admin@platform.example')
    expect(profile?.role).toBe('ADMIN')
  })
})
