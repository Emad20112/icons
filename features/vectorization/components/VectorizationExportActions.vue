<script setup lang="ts">
import { ref } from 'vue'
import { Download, Copy, Check, RotateCcw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  hasResult: boolean
  isProcessing: boolean
}>()

const emit = defineEmits<{
  (e: 'download'): void
  (e: 'copy'): void
  (e: 'reset'): void
}>()

const { t } = useI18n()
const isCopied = ref(false)

const handleCopy = () => {
  emit('copy')
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
    <button
      type="button"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
      :disabled="isProcessing"
      @click="emit('reset')"
    >
      <RotateCcw class="w-4 h-4" />
      <span>{{ t('vectorizer.preview.resetImage') }}</span>
    </button>

    <div class="flex items-center gap-2.5">
      <!-- Copy SVG Code -->
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
        :disabled="!hasResult || isProcessing"
        @click="handleCopy"
      >
        <Check v-if="isCopied" class="w-4 h-4 text-emerald-600" />
        <Copy v-else class="w-4 h-4 text-slate-500" />
        <span>{{ isCopied ? t('vectorizer.preview.copied') : t('vectorizer.preview.copyCode') }}</span>
      </button>

      <!-- Download SVG Button (Primary CTA) -->
      <button
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
        :disabled="!hasResult || isProcessing"
        @click="emit('download')"
      >
        <Download class="w-4 h-4" />
        <span>{{ t('vectorizer.preview.downloadSvg') }}</span>
      </button>
    </div>
  </div>
</template>
