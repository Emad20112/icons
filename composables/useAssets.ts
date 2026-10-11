import { ref } from 'vue'
import type { Asset, AssetType, AssetStatus } from '../types/database'
import type { SortOption } from '../server/services/assetService'
import { useAuth } from './useAuth'

export interface AssetFilterState {
  type?: AssetType | ''
  categorySlug?: string
  licenseSlug?: string
  tagSlugs?: string[]
  search?: string
  status?: AssetStatus | ''
  sort?: SortOption
  page?: number
  limit?: number
}

let activeAbortController: AbortController | null = null

export function useAssets() {
  const assets = ref<Asset[]>([])
  const total = ref<number>(0)
  const page = ref<number>(1)
  const limit = ref<number>(24)
  const totalPages = ref<number>(1)
  const query = ref<string>('')
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const { role } = useAuth()

  async function fetchAssets(filters: AssetFilterState = {}) {
    // 1. Cancel previous in-flight search request to prevent stale overwrite race conditions
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }

    const abortController = new AbortController()
    activeAbortController = abortController

    isLoading.value = true
    error.value = null

    try {
      const queryParams: Record<string, any> = {}
      if (filters.search !== undefined) queryParams.q = filters.search.trim()
      if (filters.type) queryParams.type = filters.type
      if (filters.categorySlug) queryParams.category = filters.categorySlug
      if (filters.licenseSlug) queryParams.license = filters.licenseSlug
      if (filters.tagSlugs && filters.tagSlugs.length > 0) queryParams.tags = filters.tagSlugs.join(',')
      if (filters.status) queryParams.status = filters.status
      if (filters.sort) queryParams.sort = filters.sort
      if (filters.page) queryParams.page = filters.page
      if (filters.limit) queryParams.limit = filters.limit

      const res = await $fetch<{
        success: boolean
        data: Asset[]
        total: number
        page: number
        limit: number
        totalPages: number
        query?: string
      }>('/api/v1/assets', {
        params: queryParams,
        signal: abortController.signal,
        headers: {
          'x-user-role': role.value
        }
      })

      // Only update if this request wasn't aborted
      if (!abortController.signal.aborted && res.success) {
        assets.value = res.data
        total.value = res.total
        page.value = res.page || 1
        limit.value = res.limit || 24
        totalPages.value = res.totalPages || 1
        query.value = res.query || ''
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        // Silently ignore superseded aborted search requests
        return
      }
      error.value = err.statusMessage || err.message || 'Failed to load assets'
    } finally {
      if (activeAbortController === abortController) {
        isLoading.value = false
        activeAbortController = null
      }
    }
  }

  async function getAsset(id: string) {
    return $fetch<{ success: boolean; data: Asset }>(`/api/v1/assets/${id}`, {
      headers: { 'x-user-role': role.value }
    })
  }

  async function getRelatedAssets(id: string, limit = 8) {
    return $fetch<{ success: boolean; data: Asset[] }>(`/api/v1/assets/${id}/related`, {
      params: { limit },
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
    page,
    limit,
    totalPages,
    query,
    isLoading,
    error,
    fetchAssets,
    getAsset,
    getRelatedAssets,
    createAsset,
    updateAsset,
    deleteAsset
  }
}
