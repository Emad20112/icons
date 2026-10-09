<script setup lang="ts">
import type { Category, License, AssetType, AssetStatus } from '../../types/database'
import Input from '../ui/Input.vue'

defineProps<{
  search: string
  selectedType: AssetType | ''
  selectedCategory: string
  selectedLicense: string
  selectedStatus: AssetStatus | ''
  categories: Category[]
  licenses: License[]
}>()

const emit = defineEmits<{
  (e: 'update:search', val: string): void
  (e: 'update:selectedType', val: AssetType | ''): void
  (e: 'update:selectedCategory', val: string): void
  (e: 'update:selectedLicense', val: string): void
  (e: 'update:selectedStatus', val: AssetStatus | ''): void
  (e: 'reset'): void
}>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
      <!-- Search -->
      <div class="md:col-span-2">
        <Input
          :model-value="search"
          placeholder="Search assets by name or keyword..."
          @update:model-value="emit('update:search', $event)"
        />
      </div>

      <!-- Type Filter -->
      <div>
        <select
          :value="selectedType"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          @change="emit('update:selectedType', ($event.target as HTMLSelectElement).value as any)"
        >
          <option value="">All Asset Types</option>
          <option value="ICON">Icon</option>
          <option value="FONT">Font</option>
          <option value="ILLUSTRATION">Illustration</option>
          <option value="LOGO">Logo</option>
          <option value="TEMPLATE">Template</option>
        </select>
      </div>

      <!-- Category Filter -->
      <div>
        <select
          :value="selectedCategory"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          @change="emit('update:selectedCategory', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.slug">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- License Filter -->
      <div>
        <select
          :value="selectedLicense"
          class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          @change="emit('update:selectedLicense', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All Licenses</option>
          <option v-for="lic in licenses" :key="lic.id" :value="lic.slug">
            {{ lic.name }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
