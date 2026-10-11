<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'select-file', file: File): void
}>()

const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    emit('select-file', file)
  }
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('select-file', target.files[0])
    target.value = '' // Reset input so same file can be re-selected if desired
  }
}

function triggerFileBrowser() {
  fileInputRef.value?.click()
}
</script>

<template>
  <div class="w-full">
    <div
      class="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer group"
      :class="[
        isDragging
          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-400 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20'
      ]"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="triggerFileBrowser"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        class="hidden"
        @change="onFileChange"
      />

      <!-- Icon & Glow -->
      <div class="relative mb-4">
        <div class="h-16 w-16 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
      </div>

      <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        Drop your image here, or <span class="text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-2">browse files</span>
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">
        Supports PNG, JPEG, WebP, and SVG images up to 20MB. Automatic 1:1 icon centering, transparency preservation, and background styling.
      </p>

      <!-- Format Badges -->
      <div class="flex flex-wrap items-center justify-center gap-2">
        <span class="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          PNG
        </span>
        <span class="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          JPEG
        </span>
        <span class="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          WEBP
        </span>
        <span class="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          SVG
        </span>
        <span class="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Max 20MB
        </span>
      </div>

      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center"
      >
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2"></div>
        <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Verifying and decoding image...</p>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      <svg class="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <p class="font-semibold">Unable to load image</p>
        <p class="text-xs mt-0.5">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
