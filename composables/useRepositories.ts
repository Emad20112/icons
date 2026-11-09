import { ref } from 'vue'
import type { Repository, RepositoryVisibility } from '../types/repositories'

export function useRepositories() {
  const repositories = ref<Repository[]>([])
  const currentRepository = ref<Repository | null>(null)
  const isLoading = ref<boolean>(false)

  async function fetchRepositories(options?: { ownerId?: string; search?: string }) {
    isLoading.value = true
    try {
      const queryParams = new URLSearchParams()
      if (options?.ownerId) queryParams.set('owner_id', options.ownerId)
      if (options?.search) queryParams.set('q', options.search)

      const url = `/api/v1/repositories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const res = await $fetch<{ success: boolean; data: Repository[] }>(url)
      if (res.success) {
        repositories.value = res.data
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRepository(id: string) {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Repository }>(`/api/v1/repositories/${id}`)
      if (res.success) {
        currentRepository.value = res.data
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function createRepository(payload: { name: string; slug?: string; description?: string; visibility?: RepositoryVisibility }) {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Repository }>('/api/v1/repositories', {
        method: 'POST',
        body: payload
      })
      if (res.success) {
        repositories.value.unshift(res.data)
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function updateRepository(id: string, updates: { name?: string; slug?: string; description?: string; visibility?: RepositoryVisibility }) {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Repository }>(`/api/v1/repositories/${id}`, {
        method: 'PUT',
        body: updates
      })
      if (res.success) {
        const index = repositories.value.findIndex(r => r.id === id)
        if (index !== -1) repositories.value[index] = res.data
        if (currentRepository.value?.id === id) currentRepository.value = res.data
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function deleteRepository(id: string) {
    isLoading.value = true
    try {
      await $fetch(`/api/v1/repositories/${id}`, { method: 'DELETE' })
      repositories.value = repositories.value.filter(r => r.id !== id)
      if (currentRepository.value?.id === id) currentRepository.value = null
      return true
    } finally {
      isLoading.value = false
    }
  }

  async function addItem(repositoryId: string, itemType: 'ASSET' | 'FONT', itemId: string) {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/v1/repositories/${repositoryId}/items`, {
      method: 'POST',
      body: { item_type: itemType, item_id: itemId }
    })
    return res.data
  }

  async function removeItem(repositoryId: string, itemType: 'ASSET' | 'FONT', itemId: string) {
    await $fetch(`/api/v1/repositories/${repositoryId}/items`, {
      method: 'DELETE',
      body: { item_type: itemType, item_id: itemId }
    })
    return true
  }

  return {
    repositories,
    currentRepository,
    isLoading,
    fetchRepositories,
    fetchRepository,
    createRepository,
    updateRepository,
    deleteRepository,
    addItem,
    removeItem
  }
}
