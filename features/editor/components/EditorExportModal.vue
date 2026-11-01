<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X,
  Download,
  FileCode,
  FileImage,
  Code2,
  Check,
  Copy,
  Sliders,
  Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { EditorDocument, ExportFormat, ExportOptions } from '../types/editor'
import { EditorExportService } from '../services/editorExportService'
import { EditorCodeExportService } from '../services/editorCodeExportService'

const props = defineProps<{
  isOpen: boolean
  document: EditorDocument
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

// Active Modal Tab: 'files' | 'code'
const activeTab = ref<'files' | 'code'>('files')

// --- Files Export State ---
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

// --- Component Code Export State ---
const codeFramework = ref<'vue' | 'react'>('vue')
const componentName = ref(props.document.name || 'CustomIcon')
const withDynamicProps = ref(true)
const codeCopied = ref(false)

const generatedSnippet = computed(() => {
  if (codeFramework.value === 'vue') {
    return EditorCodeExportService.generateVue3Component(props.document, {
      componentName: componentName.value,
      withProps: withDynamicProps.value,
      includeBackground: false
    })
  } else {
    return EditorCodeExportService.generateReactComponent(props.document, {
      componentName: componentName.value,
      typescript: true,
      includeBackground: false
    })
  }
})

const handleCopyCode = async () => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(generatedSnippet.value)
      codeCopied.value = true
      setTimeout(() => {
        codeCopied.value = false
      }, 2000)
    }
  } catch (e) {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = generatedSnippet.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    codeCopied.value = true
    setTimeout(() => {
      codeCopied.value = false
    }, 2000)
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <Download v-if="activeTab === 'files'" class="w-5 h-5" />
            <Code2 v-else class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white">
              {{ t('editor.export.title') }}
            </h3>
            <p class="text-xs text-slate-500">
              {{ activeTab === 'files' ? t('editor.export.subtitle') : t('editor.export.codeSubtitle') }}
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

      <!-- Tab Switcher: Files vs Code -->
      <div class="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all"
          :class="[
            activeTab === 'files'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="activeTab = 'files'"
        >
          <Download class="w-4 h-4" />
          <span>{{ t('editor.export.tabs.files') }}</span>
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all"
          :class="[
            activeTab === 'code'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="activeTab = 'code'"
        >
          <Code2 class="w-4 h-4" />
          <span>{{ t('editor.export.tabs.code') }}</span>
        </button>
      </div>

      <!-- TAB 1: FILES EXPORT (SVG, PNG, WebP, ICO) -->
      <div v-if="activeTab === 'files'" class="space-y-4">
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

        <!-- Footer CTA Buttons for Files -->
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

      <!-- TAB 2: COMPONENT CODE SNIPPETS (Vue 3 / React) -->
      <div v-else class="space-y-4">
        <!-- Framework Selection -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {{ t('editor.export.framework') }}
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center gap-2"
              :class="[
                codeFramework === 'vue'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              ]"
              @click="codeFramework = 'vue'"
            >
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Vue 3 (SFC)</span>
            </button>

            <button
              type="button"
              class="py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center gap-2"
              :class="[
                codeFramework === 'react'
                  ? 'border-cyan-500 bg-cyan-50/70 text-cyan-700 dark:border-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              ]"
              @click="codeFramework = 'react'"
            >
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
              <span>React (TSX)</span>
            </button>
          </div>
        </div>

        <!-- Component Configuration -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {{ t('editor.export.componentName') }}
            </label>
            <input
              type="text"
              v-model="componentName"
              class="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              placeholder="CustomIcon"
            />
          </div>

          <div class="flex items-end pb-1.5">
            <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                v-model="withDynamicProps"
                class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>{{ t('editor.export.withProps') }}</span>
            </label>
          </div>
        </div>

        <!-- Code Preview Box -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
              {{ codeFramework === 'vue' ? `${componentName || 'CustomIcon'}.vue` : `${componentName || 'CustomIcon'}.tsx` }}
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              @click="handleCopyCode"
            >
              <Check v-if="codeCopied" class="w-3.5 h-3.5 text-emerald-500" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ codeCopied ? t('editor.export.copiedCode') : t('editor.export.copyCode') }}</span>
            </button>
          </div>

          <div class="relative rounded-2xl bg-slate-950 border border-slate-800 p-3 max-h-56 overflow-y-auto font-mono text-[11px] text-slate-200 leading-relaxed dir-ltr text-left">
            <pre class="overflow-x-auto whitespace-pre"><code>{{ generatedSnippet }}</code></pre>
          </div>
        </div>

        <!-- Footer Action for Code -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            @click="emit('close')"
          >
            {{ t('common.close') }}
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
            @click="handleCopyCode"
          >
            <Check v-if="codeCopied" class="w-4 h-4 text-emerald-300" />
            <Copy v-else class="w-4 h-4" />
            <span>{{ codeCopied ? t('editor.export.copiedCode') : t('editor.export.copyCode') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
