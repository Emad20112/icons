import { ref } from 'vue'
import type { Asset, AssetType, AssetStatus } from '../types/database'
import { useAuth } from './useAuth'

export interface AssetFilterState {
  type?: AssetType | ''
  categorySlug?: string
  licenseSlug?: string
  search?: string
  status?: AssetStatus | ''
}

export function useAssets() {
  const assets = ref<Asset[]>([])
  const total = ref<number>(0)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const { role } = useAuth()

  async function fetchAssets(filters: AssetFilterState = {}) {
    isLoading.value = true
    error.value = null
    try {
      const query: Record<string, any> = {}
      if (filters.type) query.type = filters.type
      if (filters.categorySlug) query.category = filters.categorySlug
      if (filters.licenseSlug) query.license = filters.licenseSlug
      if (filters.search) query.search = filters.search
      if (filters.status) query.status = filters.status

      const res = await $fetch<{ success: boolean; data: Asset[]; total: number }>('/api/v1/assets', {
        params: query,
        headers: {
          'x-user-role': role.value
        }
      })

      if (res.success) {
        assets.value = res.data
        total.value = res.total
      }
    } catch (err: any) {
      error.value = err.statusMessage || err.message || 'Failed to load assets'
    } finally {
      isLoading.value = false
    }
  }

  async function getAsset(id: string) {
    return $fetch<{ success: boolean; data: Asset }>(`/api/v1/assets/${id}`, {
      headers: { 'x-user-role': role.value }
    })
  }

  async function createAsset(payload: any) {
    return $fetch<{ success: boolean; data: Asset }>('/api/v1/assets', {
      method: 'POST',
      body: payload,
      headers: { 'x-user-role': role.value }
    })
  }

  async function updateAsset(id: string, updates: any) {
    return $fetch<{ success: boolean; data: Asset }>(`/api/v1/assets/${id}`, {
      method: 'PATCH',
      body: updates,
      headers: { 'x-user-role': role.value }
    })
  }

  async function deleteAsset(id: string) {
    return $fetch<{ success: boolean }>(`/api/v1/assets/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-role': role.value }
    })
  }

  return {
    assets,
    total,
    isLoading,
    error,
    fetchAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset
  }
}
