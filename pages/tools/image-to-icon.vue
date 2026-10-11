<script setup lang="ts">
import Container from '../../components/layout/Container.vue'
import { useImageConverter } from '../../features/image-converter/composables/useImageConverter'
import ConverterUploadZone from '../../features/image-converter/components/ConverterUploadZone.vue'
import ConverterPreviewStage from '../../features/image-converter/components/ConverterPreviewStage.vue'
import ConverterControlPanel from '../../features/image-converter/components/ConverterControlPanel.vue'
import ConverterExportActions from '../../features/image-converter/components/ConverterExportActions.vue'
import type { ExportImageFormat } from '../../features/image-converter/types/converter'

useHead({
  title: 'Image to Icon Converter — Digital Assets Platform',
  meta: [
    {
      name: 'description',
      content: 'Convert PNG, JPEG, WebP, and SVG images into crisp multi-resolution icons, Windows Favicon (.ICO), and custom formatted icon packs.'
    }
  ]
})

const {
  file,
  fileName,
  sourceUrl,
  sourceImage,
  metadata,
  crop,
  cropPreset,
  shape,
  cornerRadiusPercent,
  backgroundColor,
  paddingPercent,
  fitMode,
  exportFormat,
  currentSize,
  selectedSizes,
  isLoading,
  isExporting,
  exportProgress,
  error,
  previewDataUrl,
  loadFile,
  resetToDefaults,
  clearImage,
  applyDefaultCropForPreset,
  downloadSingle,
  downloadAllAsZip,
  downloadMultiResIco,
  toggleSizeSelection,
  selectAllSizes
} = useImageConverter()

function handleFileSelect(selectedFile: File) {
  loadFile(selectedFile)
}

function handleCropPresetChange(preset: any) {
  applyDefaultCropForPreset(preset)
}

/**
 * Loads a built-in demo SVG icon for quick testing.
 */
function loadDemoIcon() {
  const demoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#3b82f6" fill-opacity="0.2"/>
  </svg>`
  const blob = new Blob([demoSvg], { type: 'image/svg+xml' })
  const demoFile = new File([blob], 'star-badge.svg', { type: 'image/svg+xml' })
  loadFile(demoFile)
}
</script>

<template>
  <Container class="max-w-7xl">
    <!-- Breadcrumb & Header -->
    <div class="mb-8">
      <div class="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <NuxtLink to="/" class="hover:text-blue-600 transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-slate-400">Tools</span>
        <span>/</span>
        <span class="text-blue-600 dark:text-blue-400 font-medium">Image to Icon Converter</span>
      </div>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5 mb-1.5">
            <div class="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Image to Icon Converter
            </h1>
            <span class="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Phase 3
            </span>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Transform any raster or vector graphic into customized app icons and multi-resolution Windows Favicons (.ICO). Adjust margins, shapes, colors, and export as crisp PNG, WebP, or ZIP bundles.
          </p>
        </div>

        <!-- Quick Demo Action -->
        <div v-if="!sourceImage" class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-xl px-3.5 py-2 shadow-sm transition-all flex items-center gap-1.5"
            @click="loadDemoIcon"
          >
            <svg class="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Try with Sample Icon</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Image Workspace -->
    <div v-if="sourceImage">
      <!-- Toolbar Header -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center overflow-hidden">
            <img :src="previewDataUrl || sourceUrl || ''" alt="Thumb" class="h-full w-full object-contain" />
          </div>
          <div>
            <div class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{{ fileName }}</span>
              <span class="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase">
                {{ metadata?.detectedFormat }}
              </span>
            </div>
            <div class="text-xs text-slate-500">
              {{ metadata?.width }} × {{ metadata?.height }} px • {{ ((metadata?.sizeBytes || 0) / 1024).toFixed(0) }} KB
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            @click="resetToDefaults"
          >
            Reset Settings
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-300 px-3 py-1.5 text-xs font-semibold transition-colors"
            @click="clearImage"
          >
            Upload Different Image
          </button>
        </div>
      </div>

      <!-- Main Editor Grid (Two Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left: Live Preview Stage & Export Actions (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-6">
          <ConverterPreviewStage
            :preview-url="previewDataUrl"
            :metadata="metadata"
            :current-size="currentSize"
            :shape="shape"
            :fit-mode="fitMode"
            :background-color="backgroundColor"
            :padding-percent="paddingPercent"
            @update:fit-mode="fitMode = $event"
          />

          <ConverterExportActions
            :export-format="exportFormat"
            :current-size="currentSize"
            :selected-sizes="selectedSizes"
            :is-exporting="isExporting"
            :export-progress="exportProgress"
            @download-single="downloadSingle(currentSize, exportFormat)"
            @download-zip="downloadAllAsZip(exportFormat)"
            @download-multi-ico="downloadMultiResIco"
            @toggle-size="toggleSizeSelection"
            @select-all-sizes="selectAllSizes"
            @new-image="clearImage"
          />
        </div>

        <!-- Right: Control Panel (5 cols) -->
        <div class="lg:col-span-5">
          <ConverterControlPanel
            :shape="shape"
            :corner-radius-percent="cornerRadiusPercent"
            :background-color="backgroundColor"
            :padding-percent="paddingPercent"
            :crop-preset="cropPreset"
            :current-size="currentSize"
            :export-format="exportFormat"
            @update:shape="shape = $event"
            @update:corner-radius-percent="cornerRadiusPercent = $event"
            @update:background-color="backgroundColor = $event"
            @update:padding-percent="paddingPercent = $event"
            @update:crop-preset="handleCropPresetChange"
            @update:current-size="currentSize = $event"
            @update:export-format="exportFormat = $event"
            @reset-defaults="resetToDefaults"
          />
        </div>
      </div>
    </div>

    <!-- Empty Upload State -->
    <div v-else class="flex flex-col gap-10">
      <ConverterUploadZone
        :is-loading="isLoading"
        :error="error"
        @select-file="handleFileSelect"
      />

      <!-- Feature Highlights -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
          <div class="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h4 class="text-base font-bold text-slate-900 dark:text-white mb-1.5">Client-Side & Private</h4>
          <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            All image decoding, resizing, and encoding happens entirely in your local browser. Zero server upload latency and maximum privacy.
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
          <div class="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h4 class="text-base font-bold text-slate-900 dark:text-white mb-1.5">Multi-Resolution ICO</h4>
          <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Generates compliant Windows and Favicon .ICO files embedding 16, 24, 32, 48, 64, 128, and 256px frames in one single file.
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
          <div class="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <h4 class="text-base font-bold text-slate-900 dark:text-white mb-1.5">Batch ZIP Package</h4>
          <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Export all selected resolutions up to 1024px instantly inside a cleanly structured .zip archive ready for app development.
          </p>
        </div>
      </div>
    </div>
  </Container>
</template>
