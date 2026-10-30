<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X,
  Download,
  FileCode,
  FileImage,
  Layers,
  Sparkles,
  Check
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { EditorDocument, ExportFormat, ExportOptions } from '../types/editor'
import { EditorExportService } from '../services/editorExportService'

const props = defineProps<{
  isOpen: boolean
  document: EditorDocument
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

const format = ref<ExportFormat>('SVG')
const fileName = ref(props.document.name || 'icon')
const scale = ref<number>(1)
const includeBackground = ref(true)
const quality = ref<number>(0.95)
const isExporting = ref(false)
const exportSuccess = ref(false)

const scales = [
  { value: 1, label: '1x (Default)' },
  { value: 2, label: '2x (@2x Retina)' },
  { value: 4, label: '4x (@4x Ultra)' },
  { value: 8, label: '8x (Print Ready)' }
]

const calculatedWidth = computed(() => Math.round(props.document.width * scale.value))
const calculatedHeight = computed(() => Math.round(props.document.height * scale.value))

const handleDownload = async () => {
  isExporting.value = true
  try {
    const options: ExportOptions = {
      format: format.value,
      width: props.document.width,
      height: props.document.height,
      scale: scale.value,
      includeBackground: includeBackground.value,
      quality: quality.value,
      fileName: fileName.value
    }

    const result = await EditorExportService.exportDocument(props.document, options)
    EditorExportService.downloadBlob(result.blob, result.fileName)
    exportSuccess.value = true
    setTimeout(() => {
      exportSuccess.value = false
      emit('close')
    }, 1200)
  } catch (err: any) {
    alert(err?.message || 'Export failed')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6"
      @click.stop
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <Download class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white">
              {{ t('editor.export.title') }}
            </h3>
            <p class="text-xs text-slate-500">
              {{ t('editor.export.subtitle') }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Format Selection -->
      <div class="space-y-2">
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {{ t('editor.export.format') }}
        </label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="fmt in (['SVG', 'PNG', 'WebP', 'ICO'] as ExportFormat[])"
            :key="fmt"
            type="button"
            class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center gap-1"
            :class="[
              format === fmt
                ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 shadow-2xs'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            ]"
            @click="format = fmt"
          >
            <FileCode v-if="fmt === 'SVG'" class="w-4 h-4" />
            <FileImage v-else class="w-4 h-4" />
            <span>{{ fmt }}</span>
          </button>
        </div>
      </div>

      <!-- File Name Input -->
      <div class="space-y-1.5">
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {{ t('editor.export.fileName') }}
        </label>
        <div class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <input
            type="text"
            v-model="fileName"
            class="flex-1 bg-transparent font-semibold focus:outline-none text-slate-900 dark:text-white"
            placeholder="icon"
          />
          <span class="text-slate-400 font-mono text-[11px] uppercase">
            .{{ format.toLowerCase() }}
          </span>
        </div>
      </div>

      <!-- Resolution / Scale (PNG & WebP only) -->
      <div v-if="format === 'PNG' || format === 'WebP'" class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <label class="font-bold text-slate-700 dark:text-slate-300">
            {{ t('editor.export.resolution') }}
          </label>
          <span class="font-mono text-slate-500">
            {{ calculatedWidth }} × {{ calculatedHeight }} px
          </span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="s in scales"
            :key="s.value"
            type="button"
            class="py-2 px-2 rounded-xl border text-center text-xs font-medium transition-all"
            :class="[
              scale === s.value
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            ]"
            @click="scale = s.value"
          >
            {{ s.value }}x
          </button>
        </div>
      </div>

      <!-- Background Transparency Toggle -->
      <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
        <label class="flex items-center justify-between cursor-pointer select-none">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ t('editor.export.includeBackground') }}
          </span>
          <input
            type="checkbox"
            v-model="includeBackground"
            class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
        </label>
      </div>

      <!-- Footer CTA Buttons -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          class="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          @click="emit('close')"
        >
          {{ t('common.cancel') }}
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          :disabled="isExporting"
          @click="handleDownload"
        >
          <Check v-if="exportSuccess" class="w-4 h-4" />
          <Download v-else class="w-4 h-4" />
          <span>{{ exportSuccess ? t('editor.export.downloaded') : t('editor.export.download') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
