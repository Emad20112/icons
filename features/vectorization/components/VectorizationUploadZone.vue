<script setup lang="ts">
import { ref } from 'vue'
import { Upload, FileImage, Sparkles, Info, ShieldCheck } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  isProcessing: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  (e: 'file-selected', file: File): void
  (e: 'load-sample'): void
}>()

const { t } = useI18n()
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (props.isProcessing) return

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    emit('file-selected', files[0])
  }
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('file-selected', input.files[0])
    input.value = ''
  }
}

const triggerFileInput = () => {
  if (props.isProcessing) return
  fileInputRef.value?.click()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Guidance Banner -->
    <div class="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 sm:p-5">
      <div class="flex items-start gap-3">
        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 shrink-0">
          <Info class="w-5 h-5" />
        </div>
        <div class="space-y-2 text-sm">
          <h3 class="font-semibold text-blue-900 dark:text-blue-200">
            {{ t('vectorizer.guidance.title') }}
          </h3>
          <div class="grid sm:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
            <div class="flex items-start gap-2 bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <span class="text-emerald-500 font-bold shrink-0">✓</span>
              <div>
                <strong class="text-slate-900 dark:text-white">{{ t('vectorizer.guidance.idealTitle') }}:</strong>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{{ t('vectorizer.guidance.idealDesc') }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2 bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <span class="text-amber-500 font-bold shrink-0">ℹ</span>
              <div>
                <strong class="text-slate-900 dark:text-white">{{ t('vectorizer.guidance.photoTitle') }}:</strong>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{{ t('vectorizer.guidance.photoDesc') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Drop Zone -->
    <div
      class="relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none"
      :class="[
        isDragging
          ? 'border-blue-500 bg-blue-500/10 scale-[1.005]'
          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/30',
        isProcessing ? 'pointer-events-none opacity-60' : ''
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileInput"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        @change="handleFileChange"
      />

      <div class="flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
        <div class="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
          <Upload v-if="!isProcessing" class="w-8 h-8" />
          <div v-else class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div class="space-y-1">
          <p class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            <span v-if="!isProcessing">
              {{ t('vectorizer.upload.dropPrompt') }}
              <span class="text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-4 font-bold">
                {{ t('vectorizer.upload.browseFiles') }}
              </span>
            </span>
            <span v-else>
              {{ t('vectorizer.upload.processing') }}
            </span>
          </p>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {{ t('vectorizer.upload.supportedNotice') }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <FileImage class="w-3.5 h-3.5" />
            PNG, JPEG, WebP
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {{ t('vectorizer.upload.maxSize') }}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <ShieldCheck class="w-3.5 h-3.5" />
            Client-Side 100% Private
          </span>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm flex items-start gap-3"
    >
      <span class="text-red-500 font-bold">⚠</span>
      <div>
        <strong class="font-semibold">{{ t('vectorizer.upload.errorTitle') }}:</strong>
        <p class="mt-0.5 text-xs">{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>
