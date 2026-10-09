import { ref, computed } from 'vue'
import type { Profile, UserRole } from '../types/database'

const currentUser = ref<Profile | null>(null)
const currentRole = ref<UserRole>('ADMIN')
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
        currentRole.value = res.role || (res.data?.role ?? 'USER')
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

  async function switchRole(role: UserRole) {
    // Allows toggling role in Phase 0 UI to immediately verify RLS enforcement
    currentRole.value = role
    if (currentUser.value) {
      currentUser.value.role = role
    }
  }

  async function selectProfile(profileId: string) {
    const target = availableProfiles.value.find(p => p.id === profileId)
    if (target) {
      currentUser.value = target
      currentRole.value = target.role
      // Set session cookie
      await login(target.email)
    }
  }

  async function logout() {
    await $fetch('/api/v1/auth/logout', { method: 'POST' })
    currentUser.value = null
    currentRole.value = 'USER'
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
