import { ref, computed } from 'vue'
import type { Profile, UserRole } from '../types/database'

const currentUser = ref<Profile | null>(null)
// The authoritative role is always the one the server resolved for this session.
// It is never asserted by the client.
const currentRole = ref<UserRole | null>(null)
const availableProfiles = ref<Profile[]>([])
const isLoading = ref<boolean>(false)

export function useAuth() {
  const isAdmin = computed(() => currentRole.value === 'ADMIN')
  const isAuthenticated = computed(() => currentUser.value !== null)

  async function fetchUser() {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Profile | null; role: UserRole; availableProfiles: Profile[] }>('/api/v1/auth/user')
      if (res.success) {
        currentUser.value = res.data
        currentRole.value = res.role ?? res.data?.role ?? null
        availableProfiles.value = res.availableProfiles || []
      }
    } catch (err) {
      console.error('Failed to fetch session user:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function login(email: string) {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Profile }>('/api/v1/auth/login', {
        method: 'POST',
        body: { email }
      })
      if (res.success) {
        currentUser.value = res.data
        currentRole.value = res.data.role
        await fetchUser()
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function register(email: string, displayName?: string) {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Profile }>('/api/v1/auth/register', {
        method: 'POST',
        body: { email, displayName }
      })
      if (res.success) {
        currentUser.value = res.data
        currentRole.value = res.data.role
        await fetchUser()
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Switches the active session profile. Real role changes require an admin to
   * update the profile row; the UI can never elevate itself.
   */
  async function switchRole(role: UserRole) {
    const target = availableProfiles.value.find(p => p.role === role)
    if (target) {
      await selectProfile(target.id)
    }
  }

  async function selectProfile(profileId: string) {
    const target = availableProfiles.value.find(p => p.id === profileId)
    if (target) {
      // Re-authenticate as the target profile; the server resolves the role.
      await login(target.email)
    }
  }

  async function logout() {
    await $fetch('/api/v1/auth/logout', { method: 'POST' })
    currentUser.value = null
    currentRole.value = null
  }

  return {
    user: currentUser,
    role: currentRole,
    availableProfiles,
    isAdmin,
    isAuthenticated,
    isLoading,
    fetchUser,
    login,
    register,
    logout,
    switchRole,
    selectProfile
  }
}
