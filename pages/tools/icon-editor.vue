<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Container from '../../components/layout/Container.vue'
import { useIconEditor } from '../../features/editor/composables/useIconEditor'
import EditorTopToolbar from '../../features/editor/components/EditorTopToolbar.vue'
import EditorLeftToolbar from '../../features/editor/components/EditorLeftToolbar.vue'
import EditorCanvas from '../../features/editor/components/EditorCanvas.vue'
import EditorPropertiesPanel from '../../features/editor/components/EditorPropertiesPanel.vue'
import EditorLayersPanel from '../../features/editor/components/EditorLayersPanel.vue'
import EditorExportModal from '../../features/editor/components/EditorExportModal.vue'
import EditorKeyboardShortcutsModal from '../../features/editor/components/EditorKeyboardShortcutsModal.vue'
import { Sparkles, Sliders, Layers, Check, AlertCircle } from 'lucide-vue-next'

const { t } = useI18n()

useHead({
  title: () => `${t('editor.meta.title')}`,
  meta: [
    {
      name: 'description',
      content: () => t('editor.meta.description')
    }
  ]
})

const {
  core,
  doc,
  selectedIds,
  primarySelected,
  selectionBounds,
  activeTool,
  canvasTransform,
  gridConfig,
  isExportModalOpen,
  isShortcutsModalOpen,
  isPreviewMode,
  isDirty,
  canUndo,
  canRedo,
  lastUndoLabel,
  undo,
  redo,
  addShape,
  selectElement,
  clearSelection,
  selectAll,
  deleteSelected,
  duplicateSelected,
  updateSelectedProps,
  applyTransform,
  reorderLayer,
  toggleLayerVisibility,
  toggleLayerLock,
  renameLayer,
  copySelected,
  paste,
  zoomIn,
  zoomOut,
  resetZoom,
  importSvg,
  importReferenceImage,
  saveToLocalStorage,
  loadFromLocalStorage
} = useIconEditor()

// Right sidebar tab toggle on mobile / desktop
const activeSidebarTab = ref<'properties' | 'layers'>('properties')
const notification = ref<string | null>(null)

const showNotification = (msg: string) => {
  notification.value = msg
  setTimeout(() => {
    notification.value = null
  }, 2500)
}

const handleSave = () => {
  const ok = saveToLocalStorage()
  if (ok) {
    showNotification(t('editor.toolbar.savedSuccess'))
  }
}

/**
 * Loads a pre-built geometric icon composition into the editor for instant prototyping.
 */
const loadSampleComposition = () => {
  core.loadDocument(core.createDefaultDocument('rocket-badge', 256, 256))

  // Background Badge
  const badge = core.createCircle(128, 128, 96)
  badge.name = 'Badge Circle'
  badge.fill = '#eff6ff'
  badge.stroke = '#3b82f6'
  badge.strokeWidth = 3
  core.addElement(badge)

  // Rocket Body
  const body = core.createPath('M 128 50 C 148 90, 160 130, 150 170 L 106 170 C 96 130, 108 90, 128 50 Z', 'Rocket Body')
  body.fill = '#2563eb'
  body.stroke = '#1d4ed8'
  body.strokeWidth = 2
  core.addElement(body)

  // Rocket Window
  const windowCircle = core.createCircle(128, 110, 16)
  windowCircle.name = 'Porthole'
  windowCircle.fill = '#38bdf8'
  windowCircle.stroke = '#ffffff'
  windowCircle.strokeWidth = 2
  core.addElement(windowCircle)

  // Rocket Fin Left
  const finLeft = core.createPolygon(94, 165, 20, 3)
  finLeft.name = 'Fin Left'
  finLeft.fill = '#f59e0b'
  finLeft.stroke = '#d97706'
  core.addElement(finLeft)

  // Rocket Fin Right
  const finRight = core.createPolygon(162, 165, 20, 3)
  finRight.name = 'Fin Right'
  finRight.fill = '#f59e0b'
  finRight.stroke = '#d97706'
  core.addElement(finRight)

  // Flame
  const flame = core.createPath('M 120 174 C 124 195, 128 205, 128 205 C 128 205, 132 195, 136 174 Z', 'Exhaust Flame')
  flame.fill = '#ef4444'
  flame.stroke = '#dc2626'
  core.addElement(flame)

  clearSelection()
  showNotification(t('editor.header.sampleLoaded'))
}

// Global Keyboard Shortcuts
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement
  const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

  // Never hijack standard text typing
  if (isInput) return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

  if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) {
      redo()
    } else {
      undo()
    }
  } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    redo()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
  } else if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
    e.preventDefault()
    selectAll()
  } else if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
    e.preventDefault()
    copySelected()
  } else if (cmdOrCtrl && e.key.toLowerCase() === 'v') {
    e.preventDefault()
    paste()
  } else if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    duplicateSelected()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    clearSelection()
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomIn()
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    zoomOut()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
  // Try loading previous autosaved local session if exists
  loadFromLocalStorage()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
})
</script>

<template>
  <Container class="max-w-7xl py-4 sm:py-6 space-y-4">
    <!-- Breadcrumb & Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <NuxtLink to="/" class="hover:text-blue-600 transition-colors">
            {{ t('editor.breadcrumb.home') }}
          </NuxtLink>
          <span>/</span>
          <span class="text-slate-400">{{ t('editor.breadcrumb.tools') }}</span>
          <span>/</span>
          <span class="text-blue-600 dark:text-blue-400 font-semibold">
            {{ t('editor.breadcrumb.iconEditor') }}
          </span>
        </div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {{ t('editor.header.title') }}
          </h1>
          <span class="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {{ t('editor.header.phaseBadge') }}
          </span>
        </div>
      </div>

      <!-- Quick Template Action -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl px-3.5 py-2 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
          @click="loadSampleComposition"
        >
          <Sparkles class="w-3.5 h-3.5 text-amber-500" />
          <span>{{ t('editor.header.sampleButton') }}</span>
        </button>
      </div>
    </div>

    <!-- Top Action Toolbar -->
    <EditorTopToolbar
      :doc-name="doc.name"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :last-undo-label="lastUndoLabel"
      :canvas-transform="canvasTransform"
      :grid-config="gridConfig"
      :is-preview-mode="isPreviewMode"
      :is-dirty="isDirty"
      @update:doc-name="name => core.setDocumentName(name)"
      @undo="undo"
      @redo="redo"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
      @toggle-grid="gridConfig.showGrid = !gridConfig.showGrid"
      @toggle-snap="gridConfig.snapToGrid = !gridConfig.snapToGrid"
      @toggle-preview="isPreviewMode = !isPreviewMode"
      @save="handleSave"
      @open-export="isExportModalOpen = true"
      @open-shortcuts="isShortcutsModalOpen = true"
    />

    <!-- Main Workspace: 3-column responsive layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
      <!-- Column 1: Left Creation Tools (1 Col) -->
      <div class="lg:col-span-1 flex lg:flex-col justify-center">
        <EditorLeftToolbar
          :active-tool="activeTool"
          @update:active-tool="t => activeTool = t"
          @import-svg="importSvg"
          @import-reference-image="importReferenceImage"
        />
      </div>

      <!-- Column 2: Center Interactive Canvas (7 Cols) -->
      <div class="lg:col-span-7 xl:col-span-8 h-[580px]">
        <EditorCanvas
          :doc="doc"
          :selected-ids="selectedIds"
          :active-tool="activeTool"
          :canvas-transform="canvasTransform"
          :grid-config="gridConfig"
          :selection-bounds="selectionBounds"
          :is-preview-mode="isPreviewMode"
          @select-element="selectElement"
          @clear-selection="clearSelection"
          @add-shape-at="addShape"
          @transform-change="applyTransform"
          @update:canvas-transform="t => canvasTransform = t"
        />
      </div>

      <!-- Column 3: Right Properties & Layers Panel (4 Cols) -->
      <div class="lg:col-span-4 xl:col-span-3 space-y-3">
        <!-- Tab Switcher for Properties vs Layers -->
        <div class="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all"
            :class="[
              activeSidebarTab === 'properties'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="activeSidebarTab = 'properties'"
          >
            <Sliders class="w-3.5 h-3.5" />
            <span>{{ t('editor.sidebar.properties') }}</span>
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all"
            :class="[
              activeSidebarTab === 'layers'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="activeSidebarTab = 'layers'"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>{{ t('editor.sidebar.layers') }} ({{ doc.elements.length }})</span>
          </button>
        </div>

        <!-- Properties Panel -->
        <EditorPropertiesPanel
          v-show="activeSidebarTab === 'properties'"
          :selected-element="primarySelected"
          :document="doc"
          @update-props="updateSelectedProps"
          @update-doc-dimensions="(w, h) => core.setCanvasDimensions(w, h)"
          @update-doc-background="color => core.setCanvasBackground(color)"
          @duplicate-selected="duplicateSelected"
          @delete-selected="deleteSelected"
        />

        <!-- Layers Panel -->
        <EditorLayersPanel
          v-show="activeSidebarTab === 'layers'"
          :elements="doc.elements"
          :selected-ids="selectedIds"
          @select-element="selectElement"
          @reorder-layer="reorderLayer"
          @toggle-visibility="toggleLayerVisibility"
          @toggle-lock="toggleLayerLock"
          @rename-layer="renameLayer"
          @delete-element="id => core.removeElement(id)"
          @duplicate-element="id => core.duplicateElement(id)"
        />
      </div>
    </div>

    <!-- Modals -->
    <EditorExportModal
      :is-open="isExportModalOpen"
      :document="doc"
      @close="isExportModalOpen = false"
    />

    <EditorKeyboardShortcutsModal
      :is-open="isShortcutsModalOpen"
      @close="isShortcutsModalOpen = false"
    />

    <!-- Floating Feedback Notification -->
    <div
      v-if="notification"
      class="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <Check class="w-4 h-4 text-emerald-400" />
      <span>{{ notification }}</span>
    </div>
  </Container>
</template>
