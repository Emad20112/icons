import { ref } from 'vue'
import type { Category } from '../types/database'
import { useAuth } from './useAuth'

export function useCategories() {
  const categories = ref<Category[]>([])
  const isLoading = ref<boolean>(false)
  const { role } = useAuth()

  async function fetchCategories() {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: Category[] }>('/api/v1/categories')
      if (res.success) {
        categories.value = res.data
      }
    } catch (err) {
      console.error('Failed fetching categories:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createCategory(payload: { name: string; description?: string; icon?: string }) {
    const res = await $fetch<{ success: boolean; data: Category }>('/api/v1/categories', {
      method: 'POST',
      body: payload,
      headers: { 'x-user-role': role.value }
    })
    if (res.success) {
      categories.value.push(res.data)
    }
    return res.data
  }

  return {
    categories,
    isLoading,
    fetchCategories,
    createCategory
  }
}
