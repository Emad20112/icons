<template>
  <div class="relative w-full max-w-3xl mx-auto space-y-3">
    <div class="relative flex items-center">
      <!-- Search Icon -->
      <div class="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-slate-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Input -->
      <input
        type="text"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value); $emit('search')"
        :placeholder="$t('iconify.search_placeholder') || 'ابحث في أكثر من 200,000 أيقونة (مثال: home, user, search, check)...'"
        class="w-full ps-11 pe-24 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition text-sm sm:text-base"
      />

      <!-- Clear / Loading -->
      <div class="absolute inset-y-0 end-0 pe-3 flex items-center gap-2">
        <span v-if="loading" class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></span>
        <button
          v-if="modelValue && !loading"
          @click="$emit('update:modelValue', ''); $emit('search')"
          class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  loading?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search'): void
}>()
</script>
