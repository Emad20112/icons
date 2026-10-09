import { ref } from 'vue'
import type { Tag } from '../types/database'

export function useTags() {
  const tags = ref<Tag[]>([])
  const isLoading = ref<boolean>(false)

  async function fetchTags() {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Tag[] }>('/api/v1/tags')
      if (res.success) {
        tags.value = res.data
      }
    } catch (err) {
      console.error('Failed fetching tags:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    tags,
    isLoading,
    fetchTags
  }
}
