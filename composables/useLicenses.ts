import { ref } from 'vue'
import type { License } from '../types/database'
import { useAuth } from './useAuth'

export function useLicenses() {
  const licenses = ref<License[]>([])
  const isLoading = ref<boolean>(false)
  const { role } = useAuth()

  async function fetchLicenses() {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: License[] }>('/api/v1/licenses')
      if (res.success) {
        licenses.value = res.data
      }
    } catch (err) {
      console.error('Failed fetching licenses:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLicense(payload: {
    name: string
    url?: string
    commercial_use: boolean
    redistribution: boolean
    modification: boolean
    attribution_required: boolean
  }) {
    const res = await $fetch<{ success: boolean; data: License }>('/api/v1/licenses', {
      method: 'POST',
      body: payload,
      headers: { 'x-user-role': role.value }
    })
    if (res.success) {
      licenses.value.push(res.data)
    }
    return res.data
  }

  return {
    licenses,
    isLoading,
    fetchLicenses,
    createLicense
  }
}
