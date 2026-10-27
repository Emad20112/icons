<script setup lang="ts">
import { ref } from 'vue'
import type { FitMode, IconShape, ImageMetadata } from '../types/converter'

const { t } = useI18n()

const props = defineProps<{
  previewUrl: string | null
  metadata: ImageMetadata | null
  currentSize: number
  shape: IconShape
  fitMode: FitMode
  backgroundColor: string
  paddingPercent: number
}>()

const emit = defineEmits<{
  (e: 'update:fitMode', mode: FitMode): void
}>()

const zoom = ref<number>(1)
const showCheckerboard = ref<boolean>(true)

const miniSizes = [16, 24, 32, 48, 64, 128]

function toggleFitMode() {
  emit('update:fitMode', props.fitMode === 'contain' ? 'cover' : 'contain')
}
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- Main Preview Viewport -->
    <div class="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-inner flex flex-col items-center justify-center p-8 min-h-[380px] sm:min-h-[440px]">
      
      <!-- Top Viewport Bar -->
      <div class="absolute top-3 start-3 end-3 flex items-center justify-between text-xs z-10">
        <!-- Resolution badge -->
        <div class="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-slate-200 font-mono border border-white/10 shadow-sm">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{{ currentSize }} × {{ currentSize }} px</span>
        </div>

        <!-- Mode controls -->
        <div class="flex items-center gap-2">
          <!-- Fit mode toggle -->
          <button
            type="button"
            class="rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
            :title="t('converter.preview.modeTooltip', { mode: fitMode })"
            @click="toggleFitMode"
          >
            <span>{{ t('converter.preview.fitMode') }}</span>
            <span class="font-semibold uppercase text-blue-400">{{ fitMode }}</span>
          </button>

          <!-- Checkerboard toggle -->
          <button
            type="button"
            class="rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md p-1.5 text-slate-300 hover:text-white border border-white/10 transition-colors"
            :title="showCheckerboard ? t('converter.preview.hideGrid') : t('converter.preview.showGrid')"
            @click="showCheckerboard = !showCheckerboard"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Live Canvas Preview Box with Checkerboard Background -->
      <div class="relative flex items-center justify-center p-4">
        <!-- Transparency Checkerboard Plate -->
        <div
          class="relative flex items-center justify-center overflow-hidden transition-all shadow-2xl"
          :class="[
            showCheckerboard ? 'bg-checkerboard' : 'bg-transparent',
            shape === 'circle' ? 'rounded-full' : shape === 'rounded' ? 'rounded-3xl' : 'rounded-lg'
          ]"
          :style="{
            width: `${Math.min(280, Math.max(160, currentSize))}px`,
            height: `${Math.min(280, Math.max(160, currentSize))}px`
          }"
        >
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="t('converter.preview.scalingTitle')"
            class="h-full w-full object-contain pointer-events-none select-none transition-transform duration-75"
          />
          <div v-else class="flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></div>
            <span>{{ t('converter.preview.rendering') }}</span>
          </div>
        </div>
      </div>

      <!-- Bottom Metadata Pill -->
      <div v-if="metadata" class="absolute bottom-3 start-3 end-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>{{ t('converter.preview.original', { width: metadata.width, height: metadata.height, size: (metadata.sizeBytes / 1024).toFixed(0) }) }}</span>
        <span class="uppercase font-semibold text-slate-300">{{ metadata.detectedFormat }}</span>
      </div>
    </div>

    <!-- Multi-Scale Real-Size Preview Strip -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {{ t('converter.preview.scalingTitle') }}
        </h4>
        <span class="text-[11px] text-slate-500">{{ t('converter.preview.scalingSubtitle') }}</span>
      </div>

      <div class="flex items-end justify-around gap-4 overflow-x-auto py-2 px-1">
        <div
          v-for="size in miniSizes"
          :key="size"
          class="flex flex-col items-center gap-1.5 shrink-0"
        >
          <!-- Mini Preview Frame with Checkerboard -->
          <div
            class="bg-checkerboard border border-slate-200 dark:border-slate-700 rounded shadow-sm flex items-center justify-center overflow-hidden"
            :style="{
              width: `${size}px`,
              height: `${size}px`
            }"
          >
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="`${size}px preview`"
              class="h-full w-full object-contain pointer-events-none"
            />
          </div>
          <span class="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
            {{ size }}px
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-checkerboard {
  background-color: #1e293b;
  background-image: 
    linear-gradient(45deg, #0f172a 25%, transparent 25%), 
    linear-gradient(-45deg, #0f172a 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #0f172a 75%), 
    linear-gradient(-45deg, transparent 75%, #0f172a 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
