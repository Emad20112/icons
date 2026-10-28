<script setup lang="ts">
import { ref } from 'vue'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Split,
  Columns,
  Code,
  Eye,
  Check,
  Copy,
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { VectorizationResult } from '../types/vectorization'

const props = defineProps<{
  sourceUrl: string | null
  result: VectorizationResult | null
  isProcessing: boolean
  viewMode: 'preview' | 'split' | 'side_by_side' | 'code'
  zoomLevel: number
  splitPosition: number
}>()

const emit = defineEmits<{
  (e: 'update:viewMode', mode: 'preview' | 'split' | 'side_by_side' | 'code'): void
  (e: 'update:zoomLevel', level: number): void
  (e: 'update:splitPosition', pos: number): void
  (e: 'copy-code'): void
}>()

const { t } = useI18n()
const showCheckerboard = ref(true)
const isCopied = ref(false)

const zoomLevels = [100, 200, 400, 800]

const handleCopy = () => {
  emit('copy-code')
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

const handleSliderInput = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  emit('update:splitPosition', val)
}
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
    <!-- Stage Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
      <!-- View Mode Buttons -->
      <div class="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          :class="[
            viewMode === 'preview'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="emit('update:viewMode', 'preview')"
        >
          <Eye class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.preview.viewModes.preview') }}</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          :class="[
            viewMode === 'split'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="emit('update:viewMode', 'split')"
        >
          <Split class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.preview.viewModes.split') }}</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          :class="[
            viewMode === 'side_by_side'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="emit('update:viewMode', 'side_by_side')"
        >
          <Columns class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.preview.viewModes.sideBySide') }}</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          :class="[
            viewMode === 'code'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="emit('update:viewMode', 'code')"
        >
          <Code class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.preview.viewModes.code') }}</span>
        </button>
      </div>

      <!-- Controls: Zoom & Checkerboard -->
      <div class="flex items-center gap-2">
        <!-- Zoom Level Dropdown / Buttons -->
        <div class="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="px-2 text-slate-500 font-medium">{{ t('vectorizer.preview.zoom') }}</span>
          <button
            v-for="z in zoomLevels"
            :key="z"
            type="button"
            class="px-2 py-1 rounded-lg font-mono font-bold transition-colors"
            :class="[
              zoomLevel === z
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="emit('update:zoomLevel', z)"
          >
            {{ z }}%
          </button>
        </div>

        <!-- Checkerboard pattern toggle -->
        <button
          type="button"
          class="p-2 rounded-xl border transition-colors text-xs"
          :class="[
            showCheckerboard
              ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          :title="t('vectorizer.preview.checkerboard')"
          @click="showCheckerboard = !showCheckerboard"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Active Stage Viewport -->
    <div
      class="relative w-full min-h-[380px] sm:min-h-[460px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center p-4"
      :class="[
        showCheckerboard
          ? 'bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] dark:bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%),linear-gradient(-45deg,#0f172a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#0f172a_75%),linear-gradient(-45deg,transparent_75%,#0f172a_75%)] bg-[size:20px_20px] bg-slate-100 dark:bg-slate-950'
          : 'bg-slate-100 dark:bg-slate-950'
      ]"
    >
      <!-- Processing Overlay -->
      <div
        v-if="isProcessing"
        class="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center z-30 transition-all"
      >
        <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
          {{ t('vectorizer.upload.processing') }}
        </p>
      </div>

      <!-- MODE 1: Single SVG Preview with Zoom -->
      <div
        v-if="viewMode === 'preview' && result"
        class="w-full h-full flex flex-col items-center justify-center overflow-auto p-4"
      >
        <div
          class="transition-transform duration-200 origin-center max-w-full max-h-[420px] flex items-center justify-center shadow-lg rounded-lg bg-transparent"
          :style="{ transform: `scale(${zoomLevel / 100})` }"
        >
          <!-- Direct safe SVG rendering via Data URL image or sanitized content -->
          <img
            :src="result.svgDataUrl"
            alt="Vectorized SVG Result"
            class="max-w-[360px] max-h-[360px] object-contain drop-shadow-md select-none"
          />
        </div>
      </div>

      <!-- MODE 2: Split Compare View with Drag Slider -->
      <div
        v-else-if="viewMode === 'split' && result && sourceUrl"
        class="relative w-full h-[400px] select-none overflow-hidden rounded-lg shadow-inner bg-white/50 dark:bg-slate-900/50 flex items-center justify-center"
      >
        <!-- Original Layer (Left side) -->
        <div
          class="absolute inset-0 flex items-center justify-center overflow-hidden"
          :style="{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }"
        >
          <img
            :src="sourceUrl"
            alt="Original Raster"
            class="max-w-[340px] max-h-[340px] object-contain"
            :style="{ transform: `scale(${zoomLevel / 100})` }"
          />
          <div class="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-[11px] font-mono">
            {{ t('vectorizer.preview.original') }}
          </div>
        </div>

        <!-- Vectorized Layer (Right side) -->
        <div
          class="absolute inset-0 flex items-center justify-center overflow-hidden"
          :style="{ clipPath: `inset(0 0 0 ${splitPosition}%)` }"
        >
          <img
            :src="result.svgDataUrl"
            alt="Vectorized Result"
            class="max-w-[340px] max-h-[340px] object-contain"
            :style="{ transform: `scale(${zoomLevel / 100})` }"
          />
          <div class="absolute top-3 right-3 px-2 py-1 rounded bg-blue-600/80 text-white text-[11px] font-mono">
            {{ t('vectorizer.preview.vectorized') }}
          </div>
        </div>

        <!-- Divider Line -->
        <div
          class="absolute top-0 bottom-0 w-0.5 bg-blue-600 shadow-md z-20 pointer-events-none"
          :style="{ left: `${splitPosition}%` }"
        >
          <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white text-xs">
            ⇄
          </div>
        </div>

        <!-- Slider Range Controller -->
        <input
          type="range"
          min="0"
          max="100"
          :value="splitPosition"
          class="absolute inset-x-0 bottom-3 w-3/4 mx-auto z-20 accent-blue-600 cursor-ew-resize opacity-80 hover:opacity-100 transition-opacity"
          @input="handleSliderInput"
        />
      </div>

      <!-- MODE 3: Side-by-Side Compare -->
      <div
        v-else-if="viewMode === 'side_by_side' && result && sourceUrl"
        class="w-full grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-2"
      >
        <!-- Original Side -->
        <div class="flex flex-col items-center justify-center p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div class="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>{{ t('vectorizer.preview.original') }}</span>
          </div>
          <div class="h-64 flex items-center justify-center overflow-hidden">
            <img
              :src="sourceUrl"
              alt="Original Raster"
              class="max-w-full max-h-56 object-contain"
              :style="{ transform: `scale(${zoomLevel / 100})` }"
            />
          </div>
        </div>

        <!-- Vectorized Side -->
        <div class="flex flex-col items-center justify-center p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-blue-200 dark:border-blue-900 shadow-xs">
          <div class="flex items-center gap-1.5 mb-3 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ t('vectorizer.preview.vectorized') }}</span>
          </div>
          <div class="h-64 flex items-center justify-center overflow-hidden">
            <img
              :src="result.svgDataUrl"
              alt="Vectorized Result"
              class="max-w-full max-h-56 object-contain"
              :style="{ transform: `scale(${zoomLevel / 100})` }"
            />
          </div>
        </div>
      </div>

      <!-- MODE 4: Code Inspector View -->
      <div
        v-else-if="viewMode === 'code' && result"
        class="w-full h-[420px] flex flex-col rounded-xl overflow-hidden bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800"
      >
        <div class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <span class="text-slate-400 font-medium">SVG Output ({{ result.stats.svgByteSize }} bytes)</span>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs transition-colors"
            @click="handleCopy"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ isCopied ? t('vectorizer.preview.copied') : t('vectorizer.preview.copyCode') }}</span>
          </button>
        </div>
        <pre class="flex-1 p-4 overflow-auto leading-relaxed select-all text-emerald-400"><code>{{ result.svgString }}</code></pre>
      </div>

      <!-- Empty / Fallback State -->
      <div v-else class="text-center p-8 text-slate-400">
        <p class="text-sm">Upload an image to start vectorization preview</p>
      </div>
    </div>

    <!-- Verified Vector Badge -->
    <div
      v-if="result?.isTrueVector"
      class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
    >
      <div class="flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>{{ t('vectorizer.stats.trueVectorBadge') }}</span>
      </div>
      <div class="flex items-center gap-3 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
        <span>{{ result.stats.pathCount }} {{ t('vectorizer.stats.pathCount') }}</span>
        <span>•</span>
        <span>{{ result.stats.nodeCount }} {{ t('vectorizer.stats.nodeCount') }}</span>
        <span>•</span>
        <span>{{ result.stats.durationMs }}ms</span>
      </div>
    </div>
  </div>
</template>
