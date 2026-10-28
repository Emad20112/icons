<script setup lang="ts">
import { computed } from 'vue'
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Layers,
  Palette,
  Eye,
  Zap
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type {
  VectorizationOptions,
  VectorizationColorMode,
  VectorizationPreset,
  VectorizationDetailLevel,
  VectorizationSmoothing
} from '../types/vectorization'

const props = defineProps<{
  options: VectorizationOptions
  isProcessing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:options', options: Partial<VectorizationOptions>): void
  (e: 'apply-preset', preset: VectorizationPreset): void
  (e: 'reset'): void
}>()

const { t } = useI18n()

const presets: Array<{ id: VectorizationPreset; labelKey: string }> = [
  { id: 'icon', labelKey: 'vectorizer.presets.icon' },
  { id: 'line_art', labelKey: 'vectorizer.presets.lineArt' },
  { id: 'detailed', labelKey: 'vectorizer.presets.detailed' }
]

const colorModes: Array<{ id: VectorizationColorMode; labelKey: string }> = [
  { id: 'black_and_white', labelKey: 'vectorizer.controls.modes.blackAndWhite' },
  { id: 'grayscale', labelKey: 'vectorizer.controls.modes.grayscale' },
  { id: 'multi_color', labelKey: 'vectorizer.controls.modes.multiColor' }
]

const detailLevels: Array<{ id: VectorizationDetailLevel; labelKey: string }> = [
  { id: 'low', labelKey: 'vectorizer.controls.details.low' },
  { id: 'medium', labelKey: 'vectorizer.controls.details.medium' },
  { id: 'high', labelKey: 'vectorizer.controls.details.high' },
  { id: 'ultra', labelKey: 'vectorizer.controls.details.ultra' }
]

const smoothingLevels: Array<{ id: VectorizationSmoothing; labelKey: string }> = [
  { id: 'none', labelKey: 'vectorizer.controls.smoothings.none' },
  { id: 'low', labelKey: 'vectorizer.controls.smoothings.low' },
  { id: 'medium', labelKey: 'vectorizer.controls.smoothings.medium' },
  { id: 'high', labelKey: 'vectorizer.controls.smoothings.high' }
]

const isBW = computed(() => props.options.colorMode === 'black_and_white')
const isColorOrGray = computed(() => props.options.colorMode !== 'black_and_white')
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
    <!-- Header with Reset -->
    <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
          <Sliders class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {{ t('vectorizer.controls.title') }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t('vectorizer.controls.subtitle') }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        :disabled="isProcessing"
        @click="emit('reset')"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        {{ t('vectorizer.controls.reset') }}
      </button>
    </div>

    <!-- Presets Selector -->
    <div class="space-y-2">
      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ t('vectorizer.presets.title') }}
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          class="px-3 py-2 text-xs font-medium rounded-xl border transition-all text-center flex flex-col items-center gap-1"
          :class="[
            options.preset === p.id
              ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-bold shadow-xs'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40'
          ]"
          :disabled="isProcessing"
          @click="emit('apply-preset', p.id)"
        >
          <Sparkles v-if="p.id === 'icon'" class="w-3.5 h-3.5" />
          <Zap v-else-if="p.id === 'line_art'" class="w-3.5 h-3.5" />
          <Layers v-else class="w-3.5 h-3.5" />
          <span>{{ t(p.labelKey) }}</span>
        </button>
      </div>
    </div>

    <!-- Color Mode Segmented Control -->
    <div class="space-y-2">
      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ t('vectorizer.controls.colorMode') }}
      </label>
      <div class="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <button
          v-for="cm in colorModes"
          :key="cm.id"
          type="button"
          class="py-1.5 px-2 text-xs font-medium rounded-lg transition-all text-center"
          :class="[
            options.colorMode === cm.id
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          :disabled="isProcessing"
          @click="emit('update:options', { colorMode: cm.id })"
        >
          {{ t(cm.labelKey) }}
        </button>
      </div>
    </div>

    <!-- Threshold Slider (Black & White mode) -->
    <div v-if="isBW" class="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-slate-800 dark:text-slate-200">
          {{ t('vectorizer.controls.threshold') }}
        </span>
        <span class="px-2 py-0.5 rounded font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
          {{ options.threshold }}
        </span>
      </div>
      <input
        type="range"
        min="10"
        max="245"
        step="1"
        :value="options.threshold"
        class="w-full accent-blue-600 cursor-pointer"
        :disabled="isProcessing"
        @input="e => emit('update:options', { threshold: Number((e.target as HTMLInputElement).value) })"
      />
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        {{ t('vectorizer.controls.thresholdDesc') }}
      </p>
    </div>

    <!-- Palette Colors Slider (Grayscale / Multi-Color) -->
    <div v-if="isColorOrGray" class="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-slate-800 dark:text-slate-200">
          {{ t('vectorizer.controls.colorsCount') }}
        </span>
        <span class="px-2 py-0.5 rounded font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
          {{ options.numberOfColors }} {{ t('vectorizer.stats.colorCount') }}
        </span>
      </div>
      <input
        type="range"
        min="2"
        max="32"
        step="1"
        :value="options.numberOfColors"
        class="w-full accent-blue-600 cursor-pointer"
        :disabled="isProcessing"
        @input="e => emit('update:options', { numberOfColors: Number((e.target as HTMLInputElement).value) })"
      />
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        {{ t('vectorizer.controls.colorsDesc') }}
      </p>
    </div>

    <!-- Detail & Path Tolerance -->
    <div class="space-y-2">
      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ t('vectorizer.controls.detailLevel') }}
      </label>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          v-for="d in detailLevels"
          :key="d.id"
          type="button"
          class="py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center"
          :class="[
            options.detail === d.id
              ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-bold'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
          ]"
          :disabled="isProcessing"
          @click="emit('update:options', { detail: d.id })"
        >
          {{ t(d.labelKey) }}
        </button>
      </div>
    </div>

    <!-- Curve Smoothing -->
    <div class="space-y-2">
      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ t('vectorizer.controls.smoothing') }}
      </label>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <button
          v-for="s in smoothingLevels"
          :key="s.id"
          type="button"
          class="py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center"
          :class="[
            options.smoothing === s.id
              ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-bold'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
          ]"
          :disabled="isProcessing"
          @click="emit('update:options', { smoothing: s.id })"
        >
          {{ t(s.labelKey) }}
        </button>
      </div>
    </div>

    <!-- Speckle Filter Slider -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-slate-700 dark:text-slate-300">
          {{ t('vectorizer.controls.speckleFilter') }}
        </span>
        <span class="font-mono text-xs text-slate-500 dark:text-slate-400">
          {{ options.speckleFilter }} px
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="32"
        step="1"
        :value="options.speckleFilter"
        class="w-full accent-blue-600 cursor-pointer"
        :disabled="isProcessing"
        @input="e => emit('update:options', { speckleFilter: Number((e.target as HTMLInputElement).value) })"
      />
      <p class="text-[11px] text-slate-500 dark:text-slate-400">
        {{ t('vectorizer.controls.speckleDesc', { pixels: options.speckleFilter }) }}
      </p>
    </div>

    <!-- Toggles: Invert & Remove White BG -->
    <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <!-- Invert Toggle -->
      <label class="flex items-center justify-between cursor-pointer select-none">
        <div>
          <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {{ t('vectorizer.controls.invert') }}
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">
            {{ t('vectorizer.controls.invertDesc') }}
          </span>
        </div>
        <input
          type="checkbox"
          :checked="options.invert"
          class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          :disabled="isProcessing"
          @change="e => emit('update:options', { invert: (e.target as HTMLInputElement).checked })"
        />
      </label>

      <!-- Remove Background Toggle -->
      <label class="flex items-center justify-between cursor-pointer select-none">
        <div>
          <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {{ t('vectorizer.controls.removeBg') }}
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">
            {{ t('vectorizer.controls.removeBgDesc') }}
          </span>
        </div>
        <input
          type="checkbox"
          :checked="options.removeBackground"
          class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          :disabled="isProcessing"
          @change="e => emit('update:options', { removeBackground: (e.target as HTMLInputElement).checked })"
        />
      </label>
    </div>
  </div>
</template>
