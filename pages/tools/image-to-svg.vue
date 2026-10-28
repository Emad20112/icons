<script setup lang="ts">
import Container from '../../components/layout/Container.vue'
import { useVectorization } from '../../features/vectorization/composables/useVectorization'
import VectorizationUploadZone from '../../features/vectorization/components/VectorizationUploadZone.vue'
import VectorizationControlPanel from '../../features/vectorization/components/VectorizationControlPanel.vue'
import VectorizationPreviewStage from '../../features/vectorization/components/VectorizationPreviewStage.vue'
import VectorizationComparisonView from '../../features/vectorization/components/VectorizationComparisonView.vue'
import VectorizationExportActions from '../../features/vectorization/components/VectorizationExportActions.vue'
import { Sparkles, Layers, ArrowLeft } from 'lucide-vue-next'

const { t } = useI18n()

useHead({
  title: () => `${t('vectorizer.meta.title')}`,
  meta: [
    {
      name: 'description',
      content: () => t('vectorizer.meta.description')
    }
  ]
})

const {
  sourceFile,
  sourceUrl,
  sourceDimensions,
  options,
  result,
  isProcessing,
  errorMessage,
  viewMode,
  zoomLevel,
  splitPosition,
  setSourceImage,
  applyPreset,
  updateOptions,
  executeVectorization,
  downloadSvg,
  copySvgCode,
  reset
} = useVectorization()

const handleFileSelect = (file: File) => {
  setSourceImage(file)
}

/**
 * Generates an SVG/raster blob of a clean shield logo to demonstrate instant vectorization.
 */
const loadSampleImage = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Draw crisp sample geometric icon
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 256)

  // Outer shield path
  ctx.beginPath()
  ctx.moveTo(128, 24)
  ctx.lineTo(216, 64)
  ctx.lineTo(216, 140)
  ctx.bezierCurveTo(216, 192, 172, 228, 128, 240)
  ctx.bezierCurveTo(84, 228, 40, 192, 40, 140)
  ctx.lineTo(40, 64)
  ctx.closePath()
  ctx.fillStyle = '#2563eb'
  ctx.fill()

  // Inner star
  ctx.beginPath()
  ctx.arc(128, 132, 42, 0, Math.PI * 2)
  ctx.fillStyle = '#38bdf8'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(128, 132, 22, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], 'shield-badge-sample.png', { type: 'image/png' })
      setSourceImage(file)
    }
  }, 'image/png')
}
</script>

<template>
  <Container class="max-w-7xl py-6 sm:py-8 space-y-8">
    <!-- Breadcrumb & Header -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <NuxtLink to="/" class="hover:text-blue-600 transition-colors">
          {{ t('vectorizer.breadcrumb.home') }}
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-400">{{ t('vectorizer.breadcrumb.tools') }}</span>
        <span>/</span>
        <span class="text-blue-600 dark:text-blue-400 font-semibold">
          {{ t('vectorizer.breadcrumb.imageToSvg') }}
        </span>
      </div>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5 mb-1.5">
            <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center shadow-md">
              <Layers class="h-5 w-5" />
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {{ t('vectorizer.header.title') }}
            </h1>
            <span class="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {{ t('vectorizer.header.phaseBadge') }}
            </span>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {{ t('vectorizer.header.description') }}
          </p>
        </div>

        <!-- Try Sample Button -->
        <div v-if="!sourceUrl" class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl px-4 py-2.5 shadow-xs hover:shadow-md transition-all flex items-center gap-2"
            @click="loadSampleImage"
          >
            <Sparkles class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{{ t('vectorizer.header.sampleButton') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Upload Stage (if no image loaded) -->
    <div v-if="!sourceUrl" class="py-2">
      <VectorizationUploadZone
        :is-processing="isProcessing"
        :error-message="errorMessage"
        @file-selected="handleFileSelect"
        @load-sample="loadSampleImage"
      />
    </div>

    <!-- Active Workspace Stage (when image is loaded) -->
    <div v-else class="space-y-6">
      <!-- Two Column Layout: Left Stage (Preview/Compare) | Right Panel (Settings) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Preview & Comparison Stage (8 Cols) -->
        <div class="lg:col-span-7 xl:col-span-8 space-y-6">
          <VectorizationPreviewStage
            :source-url="sourceUrl"
            :result="result"
            :is-processing="isProcessing"
            :view-mode="viewMode"
            :zoom-level="zoomLevel"
            :split-position="splitPosition"
            @update:view-mode="m => viewMode = m"
            @update:zoom-level="z => zoomLevel = z"
            @update:split-position="p => splitPosition = p"
            @copy-code="copySvgCode"
          />

          <!-- Geometry & Storage Metrics Comparison -->
          <VectorizationComparisonView
            v-if="result"
            :stats="result.stats"
          />
        </div>

        <!-- Controls Sidebar (5 Cols) -->
        <div class="lg:col-span-5 xl:col-span-4 space-y-6">
          <VectorizationControlPanel
            :options="options"
            :is-processing="isProcessing"
            @update:options="updateOptions"
            @apply-preset="applyPreset"
            @reset="reset"
          />
        </div>
      </div>

      <!-- Bottom Export & Download Bar -->
      <VectorizationExportActions
        :has-result="!!result"
        :is-processing="isProcessing"
        @download="() => downloadSvg()"
        @copy="copySvgCode"
        @reset="reset"
      />
    </div>
  </Container>
</template>
