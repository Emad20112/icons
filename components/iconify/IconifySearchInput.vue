<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

const { t } = useI18n()

defineProps<{
  modelValue: string
  loading?: boolean
  suggestions?: string[]
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search'): void
  (e: 'suggest', keyword: string): void
}>()
</script>

<template>
  <div class="w-full space-y-3">
    <div class="relative flex items-center">
      <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-slate-400">
        <Search class="h-5 w-5" />
      </div>

      <input
        type="text"
        :value="modelValue"
        :placeholder="t('iconify.search_placeholder')"
        :aria-label="t('iconify.search_placeholder')"
        class="w-full rounded-xl border border-slate-200 bg-white py-3.5 ps-12 pe-12 text-sm sm:text-base text-slate-900 placeholder-slate-400 shadow-xs transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value); $emit('search')"
      />

      <div class="absolute inset-y-0 end-0 flex items-center pe-3.5">
        <span
          v-if="loading"
          class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        />
        <button
          v-else-if="modelValue"
          type="button"
          :aria-label="t('filters.clearSearch')"
          class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          @click="$emit('update:modelValue', ''); $emit('search')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Quick keyword suggestions -->
    <div v-if="suggestions && suggestions.length > 0" class="flex flex-wrap items-center gap-1.5 text-xs">
      <span class="text-slate-400 dark:text-slate-500 me-1">{{ t('iconify.quick_suggestions') }}</span>
      <button
        v-for="item in suggestions"
        :key="item"
        type="button"
        class="rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors"
        :class="modelValue.trim().toLowerCase() === item
          ? 'bg-blue-600 text-white font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'"
        @click="$emit('suggest', item)"
      >
        {{ item }}
      </button>
    </div>
  </div>
</template>
