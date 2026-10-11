<script setup lang="ts">
import type { ExportImageFormat } from '../types/converter'
import { STANDARD_ICON_SIZES } from '../types/converter'

const props = defineProps<{
  exportFormat: ExportImageFormat
  currentSize: number
  selectedSizes: number[]
  isExporting: boolean
  exportProgress: string
}>()

const emit = defineEmits<{
  (e: 'download-single'): void
  (e: 'download-zip'): void
  (e: 'download-multi-ico'): void
  (e: 'toggle-size', size: number): void
  (e: 'select-all-sizes'): void
  (e: 'new-image'): void
}>()
</script>

<template>
  <div class="flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
    <!-- Section Header -->
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">Export & Download Options</h3>
        <p class="text-xs text-slate-500">Choose sizes to bundle into a ZIP archive or download single file</p>
      </div>
      <button
        type="button"
        class="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
        @click="emit('select-all-sizes')"
      >
        Select All
      </button>
    </div>

    <!-- Batch Sizes Grid -->
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
        Sizes Included for ZIP Bundle ({{ selectedSizes.length }} selected):
      </label>
      <div class="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        <button
          v-for="size in STANDARD_ICON_SIZES"
          :key="size"
          type="button"
          class="rounded-lg border px-1.5 py-1.5 text-center text-xs font-mono font-medium transition-all"
          :class="selectedSizes.includes(size)
            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-bold'
            : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          @click="emit('toggle-size', size)"
        >
          {{ size }}
        </button>
      </div>
    </div>

    <!-- Export Buttons -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
      <!-- 1. Download Single -->
      <button
        type="button"
        class="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isExporting"
        @click="emit('download-single')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Download {{ exportFormat }} ({{ currentSize }}px)</span>
      </button>

      <!-- 2. Download All as ZIP -->
      <button
        type="button"
        class="flex-1 rounded-xl border-2 border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-5 py-3 text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isExporting || selectedSizes.length === 0"
        @click="emit('download-zip')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
        <span>Download All as ZIP ({{ selectedSizes.length }} Sizes)</span>
      </button>
    </div>

    <!-- Extra: Multi-Res Favicon/ICO button -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
      <button
        type="button"
        class="w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        :disabled="isExporting"
        @click="emit('download-multi-ico')"
      >
        <svg class="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span>Download Complete Windows Favicon (.ICO with 7 sizes)</span>
      </button>

      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        @click="emit('new-image')"
      >
        Convert Another Image
      </button>
    </div>

    <!-- Export Progress Status -->
    <div
      v-if="isExporting"
      class="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 text-xs text-blue-700 dark:text-blue-300"
    >
      <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      <span class="font-medium">{{ exportProgress || 'Exporting files...' }}</span>
    </div>
  </div>
</template>
