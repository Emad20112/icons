<script setup lang="ts">
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  Magnet,
  Eye,
  Download,
  HelpCircle,
  Save,
  RotateCcw
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { CanvasTransform, CanvasGridConfig } from '../types/editor'

const props = defineProps<{
  docName: string
  canUndo: boolean
  canRedo: boolean
  lastUndoLabel: string | null
  canvasTransform: CanvasTransform
  gridConfig: CanvasGridConfig
  isPreviewMode: boolean
  isDirty: boolean
}>()

const emit = defineEmits<{
  (e: 'update:docName', name: string): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'reset-zoom'): void
  (e: 'toggle-grid'): void
  (e: 'toggle-snap'): void
  (e: 'toggle-preview'): void
  (e: 'save'): void
  (e: 'open-export'): void
  (e: 'open-shortcuts'): void
}>()

const { t } = useI18n()

const handleNameBlur = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:docName', target.value)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
    <!-- Left: Project Name & Save Indicator -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <input
          type="text"
          :value="docName"
          class="font-bold text-sm sm:text-base text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-0.5 max-w-[180px] sm:max-w-[260px] truncate"
          :title="t('editor.toolbar.renameTitle')"
          @blur="handleNameBlur"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <span
          v-if="isDirty"
          class="w-2 h-2 rounded-full bg-amber-500"
          :title="t('editor.toolbar.unsavedChanges')"
        ></span>
      </div>

      <button
        type="button"
        class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        :title="t('editor.toolbar.save')"
        @click="emit('save')"
      >
        <Save class="w-3.5 h-3.5" />
        <span>{{ t('editor.toolbar.save') }}</span>
      </button>
    </div>

    <!-- Center: Undo/Redo, Zoom, Grid, Snap, Preview -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- Undo / Redo Group -->
      <div class="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          :disabled="!canUndo"
          :title="lastUndoLabel ? `${t('editor.toolbar.undo')}: ${lastUndoLabel}` : t('editor.toolbar.undo')"
          @click="emit('undo')"
        >
          <Undo2 class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          :disabled="!canRedo"
          :title="t('editor.toolbar.redo')"
          @click="emit('redo')"
        >
          <Redo2 class="w-4 h-4" />
        </button>
      </div>

      <!-- Zoom Controls -->
      <div class="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
          :title="t('editor.toolbar.zoomOut')"
          @click="emit('zoom-out')"
        >
          <ZoomOut class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          class="px-2 py-1 font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
          :title="t('editor.toolbar.resetZoom')"
          @click="emit('reset-zoom')"
        >
          {{ Math.round(canvasTransform.zoom * 100) }}%
        </button>
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
          :title="t('editor.toolbar.zoomIn')"
          @click="emit('zoom-in')"
        >
          <ZoomIn class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- View Options: Grid, Snap, Preview -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="p-2 rounded-xl border transition-colors text-xs"
          :class="[
            gridConfig.showGrid
              ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400 font-bold'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          :title="t('editor.toolbar.toggleGrid')"
          @click="emit('toggle-grid')"
        >
          <Grid class="w-4 h-4" />
        </button>

        <button
          type="button"
          class="p-2 rounded-xl border transition-colors text-xs"
          :class="[
            gridConfig.snapToGrid
              ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400 font-bold'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          :title="t('editor.toolbar.snapToGrid')"
          @click="emit('toggle-snap')"
        >
          <Magnet class="w-4 h-4" />
        </button>

        <button
          type="button"
          class="p-2 rounded-xl border transition-colors text-xs"
          :class="[
            isPreviewMode
              ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400 font-bold'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          :title="t('editor.toolbar.previewMode')"
          @click="emit('toggle-preview')"
        >
          <Eye class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Right: Shortcuts & Primary Export CTA -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        :title="t('editor.toolbar.shortcuts')"
        @click="emit('open-shortcuts')"
      >
        <HelpCircle class="w-4 h-4" />
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-98"
        @click="emit('open-export')"
      >
        <Download class="w-4 h-4" />
        <span>{{ t('editor.toolbar.export') }}</span>
      </button>
    </div>
  </div>
</template>
