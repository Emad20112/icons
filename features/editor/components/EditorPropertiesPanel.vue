<script setup lang="ts">
import { computed } from 'vue'
import {
  Sliders,
  Maximize2,
  Palette,
  RotateCw,
  Copy,
  Trash2,
  Type,
  Layers,
  Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { EditorElement, EditorDocument } from '../types/editor'
import { PRESET_CANVAS_SIZES } from '../types/editor'

const props = defineProps<{
  selectedElement: EditorElement | null
  document: EditorDocument
}>()

const emit = defineEmits<{
  (e: 'update-props', patch: Record<string, any>, label?: string): void
  (e: 'update-doc-dimensions', width: number, height: number): void
  (e: 'update-doc-background', color: string): void
  (e: 'duplicate-selected'): void
  (e: 'delete-selected'): void
}>()

const { t } = useI18n()

// Preset color palette for quick swatches
const paletteColors = [
  '#000000', '#ffffff', '#2563eb', '#3b82f6', '#06b6d4',
  '#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#8b5cf6', '#64748b', 'none'
]

const hasFill = computed(() => {
  if (!props.selectedElement) return false
  return 'fill' in props.selectedElement
})

const hasStroke = computed(() => {
  if (!props.selectedElement) return false
  return 'stroke' in props.selectedElement
})

const handleDimensionPreset = (w: number, h: number) => {
  emit('update-doc-dimensions', w, h)
}
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5 text-xs text-slate-800 dark:text-slate-200 overflow-y-auto max-h-[calc(100vh-220px)]">
    <!-- CASE 1: ELEMENT SELECTED -->
    <template v-if="selectedElement">
      <!-- Element Header & Quick Actions -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {{ selectedElement.type }}
          </span>
          <input
            type="text"
            :value="selectedElement.name"
            class="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none block w-full truncate"
            @change="e => emit('update-props', { name: (e.target as HTMLInputElement).value }, 'Rename element')"
          />
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            :title="t('editor.props.duplicate')"
            @click="emit('duplicate-selected')"
          >
            <Copy class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            :title="t('editor.props.delete')"
            @click="emit('delete-selected')"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Geometry / Coordinates -->
      <div class="space-y-3">
        <label class="block font-bold text-slate-700 dark:text-slate-300">
          {{ t('editor.props.geometry') }}
        </label>

        <!-- Position: X & Y -->
        <div v-if="'x' in selectedElement" class="grid grid-cols-2 gap-2">
          <div class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 font-mono">X</span>
            <input
              type="number"
              :value="(selectedElement as any).x"
              class="w-full bg-transparent font-mono focus:outline-none"
              @change="e => emit('update-props', { x: Number((e.target as HTMLInputElement).value) }, 'Change X')"
            />
          </div>
          <div class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 font-mono">Y</span>
            <input
              type="number"
              :value="(selectedElement as any).y"
              class="w-full bg-transparent font-mono focus:outline-none"
              @change="e => emit('update-props', { y: Number((e.target as HTMLInputElement).value) }, 'Change Y')"
            />
          </div>
        </div>

        <!-- Center: CX & CY for Circle/Ellipse -->
        <div v-else-if="'cx' in selectedElement" class="grid grid-cols-2 gap-2">
          <div class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 font-mono">CX</span>
            <input
              type="number"
              :value="(selectedElement as any).cx"
              class="w-full bg-transparent font-mono focus:outline-none"
              @change="e => emit('update-props', { cx: Number((e.target as HTMLInputElement).value) }, 'Change CX')"
            />
          </div>
          <div class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 font-mono">CY</span>
            <input
              type="number"
              :value="(selectedElement as any).cy"
              class="w-full bg-transparent font-mono focus:outline-none"
              @change="e => emit('update-props', { cy: Number((e.target as HTMLInputElement).value) }, 'Change CY')"
            />
          </div>
        </div>

        <!-- Dimensions: Width & Height -->
        <div v-if="'width' in selectedElement" class="grid grid-cols-2 gap-2">
          <div class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 font-mono">W</span>
            <input
              type="number"
              :value="(selectedElement as any).width"
              min="1"
              class="w-full bg-transparent font-mono focus:outline-none"
              @change="e => emit('update-props', { width: Math.max(1, Number((e.target as HTMLInputElement).value)) }, 'Change Width')"
            />
          </div>
          <div class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 font-mono">H</span>
            <input
              type="number"
              :value="(selectedElement as any).height"
              min="1"
              class="w-full bg-transparent font-mono focus:outline-none"
              @change="e => emit('update-props', { height: Math.max(1, Number((e.target as HTMLInputElement).value)) }, 'Change Height')"
            />
          </div>
        </div>

        <!-- Radius for Circle -->
        <div v-if="'r' in selectedElement" class="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span class="text-slate-400 font-mono">R</span>
          <input
            type="number"
            :value="(selectedElement as any).r"
            min="1"
            class="w-full bg-transparent font-mono focus:outline-none"
            @change="e => emit('update-props', { r: Math.max(1, Number((e.target as HTMLInputElement).value)) }, 'Change Radius')"
          />
        </div>

        <!-- Corner Radius for Rect -->
        <div v-if="selectedElement.type === 'rect'" class="space-y-1">
          <div class="flex justify-between text-[11px] text-slate-500">
            <span>{{ t('editor.props.cornerRadius') }}</span>
            <span class="font-mono">{{ (selectedElement as any).rx }}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="64"
            :value="(selectedElement as any).rx"
            class="w-full accent-blue-600 cursor-pointer"
            @input="e => emit('update-props', { rx: Number((e.target as HTMLInputElement).value), ry: Number((e.target as HTMLInputElement).value) }, 'Corner Radius')"
          />
        </div>

        <!-- Rotation & Opacity -->
        <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <!-- Rotation -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] text-slate-500">
              <span class="flex items-center gap-1">
                <RotateCw class="w-3 h-3" />
                <span>{{ t('editor.props.rotation') }}</span>
              </span>
              <span class="font-mono">{{ selectedElement.rotation }}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              :value="selectedElement.rotation"
              class="w-full accent-blue-600 cursor-pointer"
              @input="e => emit('update-props', { rotation: Number((e.target as HTMLInputElement).value) }, 'Rotation')"
            />
          </div>

          <!-- Opacity -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] text-slate-500">
              <span>{{ t('editor.props.opacity') }}</span>
              <span class="font-mono">{{ Math.round(selectedElement.opacity * 100) }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="selectedElement.opacity"
              class="w-full accent-blue-600 cursor-pointer"
              @input="e => emit('update-props', { opacity: Number((e.target as HTMLInputElement).value) }, 'Opacity')"
            />
          </div>
        </div>
      </div>

      <!-- Text Specific Typography -->
      <div v-if="selectedElement.type === 'text'" class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <label class="block font-bold text-slate-700 dark:text-slate-300">
          {{ t('editor.props.typography') }}
        </label>
        <div>
          <label class="block text-[11px] text-slate-500 mb-1">{{ t('editor.props.textContent') }}</label>
          <input
            type="text"
            :value="(selectedElement as any).text"
            class="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
            @change="e => emit('update-props', { text: (e.target as HTMLInputElement).value }, 'Change text')"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] text-slate-500 mb-1">{{ t('editor.props.fontSize') }}</label>
            <input
              type="number"
              :value="(selectedElement as any).fontSize"
              min="8"
              max="128"
              class="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none"
              @change="e => emit('update-props', { fontSize: Number((e.target as HTMLInputElement).value) }, 'Font Size')"
            />
          </div>
          <div>
            <label class="block text-[11px] text-slate-500 mb-1">{{ t('editor.props.textAlign') }}</label>
            <select
              :value="(selectedElement as any).textAlign"
              class="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none cursor-pointer"
              @change="e => emit('update-props', { textAlign: (e.target as HTMLSelectElement).value }, 'Text Align')"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Fill Color -->
      <div v-if="hasFill" class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <label class="font-bold text-slate-700 dark:text-slate-300">{{ t('editor.props.fill') }}</label>
          <button
            type="button"
            class="text-[11px] font-semibold text-blue-600 hover:underline"
            @click="emit('update-props', { fill: 'none' }, 'No Fill')"
          >
            {{ t('editor.props.transparent') }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="(selectedElement as any).fill === 'none' ? '#ffffff' : (selectedElement as any).fill"
            class="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0"
            @input="e => emit('update-props', { fill: (e.target as HTMLInputElement).value }, 'Fill Color')"
          />
          <input
            type="text"
            :value="(selectedElement as any).fill"
            class="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none"
            @change="e => emit('update-props', { fill: (e.target as HTMLInputElement).value }, 'Fill Color')"
          />
        </div>
        <!-- Swatches -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="color in paletteColors"
            :key="color"
            type="button"
            class="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 shadow-2xs hover:scale-115 transition-transform"
            :style="{ backgroundColor: color === 'none' ? 'transparent' : color }"
            :title="color"
            @click="emit('update-props', { fill: color }, 'Fill Swatch')"
          ></button>
        </div>
      </div>

      <!-- Stroke Color & Width -->
      <div v-if="hasStroke" class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <label class="font-bold text-slate-700 dark:text-slate-300">{{ t('editor.props.stroke') }}</label>
          <button
            type="button"
            class="text-[11px] font-semibold text-blue-600 hover:underline"
            @click="emit('update-props', { stroke: 'none', strokeWidth: 0 }, 'No Stroke')"
          >
            {{ t('editor.props.transparent') }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="(selectedElement as any).stroke === 'none' ? '#000000' : (selectedElement as any).stroke"
            class="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0"
            @input="e => emit('update-props', { stroke: (e.target as HTMLInputElement).value }, 'Stroke Color')"
          />
          <input
            type="text"
            :value="(selectedElement as any).stroke"
            class="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none"
            @change="e => emit('update-props', { stroke: (e.target as HTMLInputElement).value }, 'Stroke Color')"
          />
        </div>
        <!-- Stroke Width Slider -->
        <div class="space-y-1 pt-1">
          <div class="flex justify-between text-[11px] text-slate-500">
            <span>{{ t('editor.props.strokeWidth') }}</span>
            <span class="font-mono">{{ (selectedElement as any).strokeWidth || 0 }}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            :value="(selectedElement as any).strokeWidth || 0"
            class="w-full accent-blue-600 cursor-pointer"
            @input="e => emit('update-props', { strokeWidth: Number((e.target as HTMLInputElement).value) }, 'Stroke Width')"
          />
        </div>
      </div>
    </template>

    <!-- CASE 2: NO ELEMENT SELECTED (DOCUMENT SETTINGS) -->
    <template v-else>
      <div class="pb-3 border-b border-slate-100 dark:border-slate-800">
        <h4 class="font-bold text-sm text-slate-900 dark:text-white">
          {{ t('editor.props.canvasSettings') }}
        </h4>
        <p class="text-[11px] text-slate-500">
          {{ t('editor.props.canvasSettingsSubtitle') }}
        </p>
      </div>

      <!-- Canvas Dimensions -->
      <div class="space-y-3">
        <label class="block font-bold text-slate-700 dark:text-slate-300">
          {{ t('editor.props.dimensions') }}
        </label>
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 block text-[10px] font-mono">WIDTH</span>
            <input
              type="number"
              :value="document.width"
              min="16"
              max="2048"
              class="w-full bg-transparent font-bold font-mono focus:outline-none"
              @change="e => emit('update-doc-dimensions', Number((e.target as HTMLInputElement).value), document.height)"
            />
          </div>
          <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="text-slate-400 block text-[10px] font-mono">HEIGHT</span>
            <input
              type="number"
              :value="document.height"
              min="16"
              max="2048"
              class="w-full bg-transparent font-bold font-mono focus:outline-none"
              @change="e => emit('update-doc-dimensions', document.width, Number((e.target as HTMLInputElement).value))"
            />
          </div>
        </div>

        <!-- Preset Dimensions Quick Select -->
        <div class="space-y-1.5 pt-2">
          <label class="block text-[11px] font-semibold text-slate-500">
            {{ t('editor.props.presetSizes') }}
          </label>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="s in PRESET_CANVAS_SIZES"
              :key="s.label"
              type="button"
              class="px-2 py-1.5 text-[11px] rounded-lg border text-start transition-all"
              :class="[
                document.width === s.width && document.height === s.height
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-bold'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              ]"
              @click="handleDimensionPreset(s.width, s.height)"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Canvas Background -->
      <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <label class="block font-bold text-slate-700 dark:text-slate-300">
          {{ t('editor.props.background') }}
        </label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex-1 py-1.5 px-3 rounded-xl border text-center font-medium transition-all"
            :class="[
              document.background === 'transparent'
                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            ]"
            @click="emit('update-doc-background', 'transparent')"
          >
            {{ t('editor.props.transparent') }}
          </button>
          <input
            type="color"
            :value="document.background === 'transparent' ? '#ffffff' : document.background"
            class="w-9 h-9 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 p-0"
            @input="e => emit('update-doc-background', (e.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- Stats -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
        <div class="flex justify-between text-[11px] text-slate-500">
          <span>{{ t('editor.props.totalElements') }}</span>
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ document.elements.length }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
