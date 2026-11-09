import { describe, it, expect } from 'vitest'
import { AuthService } from '../../server/services/authService'
import { dbStore } from '../../server/utils/mockStore'
import { ConflictError, AuthenticationError } from '../../lib/errors/AppError'

describe('Unit Test: User Profiles & Authentication Boundary', () => {
  it('validates username uniqueness and format', async () => {
    // Existing creator username
    const isTaken = await AuthService.isUsernameAvailable('creator')
    expect(isTaken).toBe(false)

    // Invalid format: too short
    const isTooShort = await AuthService.isUsernameAvailable('ab')
    expect(isTooShort).toBe(false)

    // Available username
    const isUnique = await AuthService.isUsernameAvailable('unique_artist_2026')
    expect(isUnique).toBe(true)
  })

  it('registers user with unique username', async () => {
    const user = await AuthService.register(
      'newuser@platform.example',
      'New Artist',
      'new_artist',
      'password123'
    )

    expect(user).toBeDefined()
    expect(user.username).toBe('new_artist')
    expect(user.display_name).toBe('New Artist')
    expect(user.password_hash).toBe('hash_password123')
  })

  it('rejects duplicate username during registration', async () => {
    await expect(
      AuthService.register('other@example.com', 'Other', 'creator')
    ).rejects.toThrow(ConflictError)
  })

  it('allows logging in with username and password', async () => {
    const user = await AuthService.login('creator', 'creator123')
    expect(user).toBeDefined()
    expect(user.username).toBe('creator')
  })

  it('supports Google authentication flow with automatic unique username assignment', async () => {
    const googleUser = await AuthService.loginWithGoogle({
      email: 'sundar@google.example',
      name: 'Sundar P',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
      googleId: 'g-12345678'
    })

    expect(googleUser).toBeDefined()
    expect(googleUser.email).toBe('sundar@google.example')
    expect(googleUser.username).toBeDefined()
    expect(googleUser.avatar_url).toBe('https://lh3.googleusercontent.com/photo.jpg')
  })

  it('retrieves user profile by username', async () => {
    const profile = await AuthService.getProfileByUsername('admin')
    expect(profile).toBeDefined()
    expect(profile?.email).toBe('admin@platform.example')
    expect(profile?.role).toBe('ADMIN')
  })
})
