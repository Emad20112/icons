<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto rounded-lg border p-4 shadow-lg transition-all duration-300 bg-white dark:bg-slate-900"
      :class="[
        toast.type === 'success' ? 'border-emerald-200 text-emerald-900 dark:border-emerald-800 dark:text-emerald-200' :
        toast.type === 'error' ? 'border-red-200 text-red-900 dark:border-red-800 dark:text-red-200' :
        toast.type === 'warning' ? 'border-amber-200 text-amber-900 dark:border-amber-800 dark:text-amber-200' :
        'border-blue-200 text-blue-900 dark:border-blue-800 dark:text-blue-200'
      ]"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="text-sm font-semibold">{{ toast.title }}</h4>
          <p v-if="toast.message" class="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {{ toast.message }}
          </p>
        </div>
        <button
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
          @click="dismiss(toast.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
