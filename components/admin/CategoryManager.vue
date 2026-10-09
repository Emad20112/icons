<script setup lang="ts">
import { ref } from 'vue'
import type { Category } from '../../types/database'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'

const props = defineProps<{
  categories: Category[]
}>()

const emit = defineEmits<{
  (e: 'categoryCreated'): void
}>()

const { isAdmin, role } = useAuth()
const { success, error } = useToast()

const name = ref('')
const description = ref('')
const isSubmitting = ref(false)

async function handleCreate() {
  if (!name.value.trim()) return

  isSubmitting.value = true
  try {
    await $fetch('/api/v1/categories', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        description: description.value.trim() || null
      },
      headers: {
        'x-user-role': role.value
      }
    })
    success('Category Created', `Dynamic category "${name.value}" added successfully`)
    name.value = ''
    description.value = ''
    emit('categoryCreated')
  } catch (err: any) {
    error('Creation Failed', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Dynamic Taxonomy Categories</h3>
        <p class="text-xs text-slate-500">Categories are stored dynamically in PostgreSQL, not hardcoded enums.</p>
      </div>
    </div>

    <!-- Create form (Active for Admin) -->
    <form v-if="isAdmin" @submit.prevent="handleCreate" class="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
      <div class="flex-1">
        <Input v-model="name" placeholder="Category name (e.g. Artificial Intelligence)" required />
      </div>
      <div class="flex-1">
        <Input v-model="description" placeholder="Short description..." />
      </div>
      <Button type="submit" :loading="isSubmitting">
        Add Category
      </Button>
    </form>
    <div v-else class="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs dark:bg-amber-950 dark:text-amber-200">
      Viewing as standard USER. Category management requires the ADMIN role.
    </div>

    <!-- Categories List Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="flex flex-col p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
      >
        <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ cat.name }}</span>
        <span class="text-[10px] text-slate-400 font-mono mt-0.5">slug: {{ cat.slug }}</span>
        <span class="text-[11px] text-slate-500 mt-1 line-clamp-1">{{ cat.description || 'No description' }}</span>
      </div>
    </div>
  </div>
</template>
