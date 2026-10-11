<script setup lang="ts">
import Button from '../ui/Button.vue'

defineProps<{
  title?: string
  message?: string
  actionLabel?: string
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20 my-6">
    <div class="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/40 dark:text-red-400 mb-3">
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <h3 class="text-sm font-semibold text-red-900 dark:text-red-200">{{ title || 'An error occurred' }}</h3>
    <p v-if="message" class="text-xs text-red-700 dark:text-red-300 mt-1 max-w-sm">
      {{ message }}
    </p>
    <div class="mt-4 flex gap-2">
      <Button v-if="actionLabel" size="sm" variant="outline" @click="emit('retry')">
        {{ actionLabel }}
      </Button>
      <slot name="action" />
    </div>
  </div>
</template>
