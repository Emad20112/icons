<script setup lang="ts">
import { computed } from 'vue'
import type {
  CropPreset,
  ExportImageFormat,
  IconShape,
  StandardIconSize
} from '../types/converter'
import { STANDARD_ICON_SIZES } from '../types/converter'

const props = defineProps<{
  shape: IconShape
  cornerRadiusPercent: number
  backgroundColor: string
  paddingPercent: number
  cropPreset: CropPreset
  currentSize: number
  exportFormat: ExportImageFormat
}>()

const emit = defineEmits<{
  (e: 'update:shape', value: IconShape): void
  (e: 'update:cornerRadiusPercent', value: number): void
  (e: 'update:backgroundColor', value: string): void
  (e: 'update:paddingPercent', value: number): void
  (e: 'update:cropPreset', value: CropPreset): void
  (e: 'update:currentSize', value: number): void
  (e: 'update:exportFormat', value: ExportImageFormat): void
  (e: 'reset-defaults'): void
}>()

const bgPresets = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Navy', value: '#0f172a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Violet', value: '#7c3aed' }
]

const paddingQuickButtons = [0, 5, 10, 15, 20, 30]

const isCustomBg = computed(() => {
  return !bgPresets.some(p => p.value.toLowerCase() === props.backgroundColor.toLowerCase())
})
</script>

<template>
  <div class="flex flex-col gap-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
    <!-- Header with Reset -->
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">Icon Customization</h3>
        <p class="text-xs text-slate-500">Fine-tune shape, spacing, color, and dimensions</p>
      </div>
      <button
        type="button"
        class="text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1"
        @click="emit('reset-defaults')"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Reset
      </button>
    </div>

    <!-- 1. Icon Shape -->
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
        Icon Shape
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all"
          :class="shape === 'square'
            ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'"
          @click="emit('update:shape', 'square')"
        >
          <div class="h-6 w-6 rounded-none border-2 border-current"></div>
          <span>Square</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all"
          :class="shape === 'rounded'
            ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'"
          @click="emit('update:shape', 'rounded')"
        >
          <div class="h-6 w-6 rounded-md border-2 border-current"></div>
          <span>Rounded</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-medium transition-all"
          :class="shape === 'circle'
            ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'"
          @click="emit('update:shape', 'circle')"
        >
          <div class="h-6 w-6 rounded-full border-2 border-current"></div>
          <span>Circle</span>
        </button>
      </div>

      <!-- Corner Radius Slider (visible if rounded) -->
      <div v-if="shape === 'rounded'" class="mt-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
          <span>Corner Curvature:</span>
          <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">{{ cornerRadiusPercent }}%</span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          :value="cornerRadiusPercent"
          class="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
          @input="emit('update:cornerRadiusPercent', +($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- 2. Background Color & Transparency -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Background & Transparency
        </label>
        <span class="text-[11px] font-mono text-slate-500">
          {{ backgroundColor === 'transparent' ? 'True Alpha' : backgroundColor }}
        </span>
      </div>

      <!-- Presets Grid -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="preset in bgPresets"
          :key="preset.name"
          type="button"
          class="h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all"
          :class="backgroundColor.toLowerCase() === preset.value.toLowerCase()
            ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'"
          @click="emit('update:backgroundColor', preset.value)"
        >
          <span
            v-if="preset.value === 'transparent'"
            class="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600 bg-checkerboard-thumb"
          ></span>
          <span
            v-else
            class="h-3.5 w-3.5 rounded-full border border-slate-300/40"
            :style="{ backgroundColor: preset.value }"
          ></span>
          <span>{{ preset.name }}</span>
        </button>

        <!-- Custom Color Picker -->
        <label
          class="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer hover:border-slate-300 transition-all"
          :class="{ 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50 dark:bg-blue-950/40': isCustomBg }"
        >
          <input
            type="color"
            :value="backgroundColor === 'transparent' ? '#ffffff' : backgroundColor"
            class="h-4 w-4 cursor-pointer rounded border-0 p-0"
            @input="emit('update:backgroundColor', ($event.target as HTMLInputElement).value)"
          />
          <span>Custom</span>
        </label>
      </div>
    </div>

    <!-- 3. Padding (Inner Margin) -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Icon Padding
        </label>
        <span class="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
          {{ paddingPercent }}%
        </span>
      </div>

      <input
        type="range"
        min="0"
        max="40"
        step="1"
        :value="paddingPercent"
        class="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"
        @input="emit('update:paddingPercent', +($event.target as HTMLInputElement).value)"
      />

      <div class="flex items-center justify-between gap-1">
        <button
          v-for="p in paddingQuickButtons"
          :key="p"
          type="button"
          class="rounded px-2 py-0.5 text-[11px] font-medium border transition-colors"
          :class="paddingPercent === p
            ? 'bg-blue-600 text-white border-blue-600'
            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
          @click="emit('update:paddingPercent', p)"
        >
          {{ p }}%
        </button>
      </div>
    </div>

    <!-- 4. Crop Aspect Presets -->
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
        Crop Aspect Ratio
      </label>
      <div class="grid grid-cols-4 gap-2 text-xs">
        <button
          v-for="preset in (['1:1', '4:3', '3:4', 'free'] as const)"
          :key="preset"
          type="button"
          class="rounded-lg border py-1.5 font-medium transition-all"
          :class="cropPreset === preset
            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
          @click="emit('update:cropPreset', preset)"
        >
          {{ preset === '1:1' ? '1:1 (Icon)' : preset }}
        </button>
      </div>
    </div>

    <!-- 5. Target Preview Resolution -->
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
        Target Preview Resolution
      </label>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="size in STANDARD_ICON_SIZES"
          :key="size"
          type="button"
          class="rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition-all"
          :class="currentSize === size
            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'"
          @click="emit('update:currentSize', size)"
        >
          {{ size }}px
        </button>
      </div>
    </div>

    <!-- 6. Export Format -->
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
        Export Format
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="rounded-xl border p-2.5 text-xs font-medium flex flex-col items-center gap-1 transition-all"
          :class="exportFormat === 'PNG'
            ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
          @click="emit('update:exportFormat', 'PNG')"
        >
          <span class="font-bold">PNG</span>
          <span class="text-[10px] text-slate-500">Lossless & Alpha</span>
        </button>

        <button
          type="button"
          class="rounded-xl border p-2.5 text-xs font-medium flex flex-col items-center gap-1 transition-all"
          :class="exportFormat === 'WEBP'
            ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
          @click="emit('update:exportFormat', 'WEBP')"
        >
          <span class="font-bold">WebP</span>
          <span class="text-[10px] text-slate-500">Modern & Compact</span>
        </button>

        <button
          type="button"
          class="rounded-xl border p-2.5 text-xs font-medium flex flex-col items-center gap-1 transition-all"
          :class="exportFormat === 'ICO'
            ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
          @click="emit('update:exportFormat', 'ICO')"
        >
          <span class="font-bold">ICO</span>
          <span class="text-[10px] text-slate-500">Windows & Favicon</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-checkerboard-thumb {
  background-color: #cbd5e1;
  background-image: 
    linear-gradient(45deg, #64748b 25%, transparent 25%), 
    linear-gradient(-45deg, #64748b 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #64748b 75%), 
    linear-gradient(-45deg, transparent 75%, #64748b 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
}
</style>
