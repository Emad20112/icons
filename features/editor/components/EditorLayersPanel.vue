<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Square,
  Circle,
  Disc,
  Minus,
  Hexagon,
  PenTool,
  Type,
  Image as ImageIcon
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { EditorElement, ElementType } from '../types/editor'

const props = defineProps<{
  elements: EditorElement[]
  selectedIds: string[]
}>()

const emit = defineEmits<{
  (e: 'select-element', id: string, multi: boolean): void
  (e: 'reorder-layer', id: string, action: 'front' | 'back' | 'forward' | 'backward'): void
  (e: 'toggle-visibility', id: string): void
  (e: 'toggle-lock', id: string): void
  (e: 'rename-layer', id: string, newName: string): void
  (e: 'delete-element', id: string): void
  (e: 'duplicate-element', id: string): void
}>()

const { t } = useI18n()

// Reversed elements: In SVG DOM, index 0 is at the bottom, so top of layer stack is last index
const displayLayers = computed(() => {
  return [...props.elements].reverse()
})

const editingLayerId = ref<string | null>(null)
const editingName = ref('')

const startRename = (el: EditorElement) => {
  editingLayerId.value = el.id
  editingName.value = el.name
}

const saveRename = (id: string) => {
  if (editingName.value.trim()) {
    emit('rename-layer', id, editingName.value.trim())
  }
  editingLayerId.value = null
}

const getElementIcon = (type: ElementType) => {
  switch (type) {
    case 'rect': return Square
    case 'circle': return Circle
    case 'ellipse': return Disc
    case 'line': return Minus
    case 'polygon': return Hexagon
    case 'path': return PenTool
    case 'text': return Type
    case 'image': return ImageIcon
    default: return Square
  }
}
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-xs text-slate-800 dark:text-slate-200">
    <!-- Header with Layer Count -->
    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-2">
        <div class="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
          <Layers class="w-4 h-4" />
        </div>
        <div>
          <h4 class="font-bold text-sm text-slate-900 dark:text-white">
            {{ t('editor.layers.title') }}
          </h4>
          <p class="text-[11px] text-slate-500">
            {{ elements.length }} {{ t('editor.layers.count') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="elements.length === 0"
      class="text-center py-8 text-slate-400 space-y-2"
    >
      <p class="text-xs">{{ t('editor.layers.empty') }}</p>
    </div>

    <!-- Layers List -->
    <div v-else class="space-y-1.5 max-h-[380px] overflow-y-auto pe-1">
      <div
        v-for="el in displayLayers"
        :key="el.id"
        class="group flex items-center justify-between p-2 rounded-xl border transition-all select-none"
        :class="[
          selectedIds.includes(el.id)
            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-700 shadow-2xs'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
        ]"
        @click="emit('select-element', el.id, false)"
      >
        <!-- Left: Element Icon & Name -->
        <div class="flex items-center gap-2.5 min-w-0 flex-1 me-2">
          <component
            :is="getElementIcon(el.type)"
            class="w-3.5 h-3.5 shrink-0"
            :class="selectedIds.includes(el.id) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'"
          />

          <!-- Name or inline editor -->
          <div v-if="editingLayerId === el.id" class="flex-1">
            <input
              type="text"
              v-model="editingName"
              class="w-full bg-white dark:bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
              @blur="saveRename(el.id)"
              @keydown.enter="saveRename(el.id)"
              @keydown.escape="editingLayerId = null"
              autofocus
            />
          </div>
          <span
            v-else
            class="truncate font-medium text-xs cursor-pointer hover:text-blue-600"
            :class="selectedIds.includes(el.id) ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'"
            @dblclick="startRename(el)"
          >
            {{ el.name }}
          </span>
        </div>

        <!-- Right: Actions (Visibility, Lock, Order, Delete) -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Visibility Toggle -->
          <button
            type="button"
            class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            :class="el.visible ? 'text-slate-400 hover:text-slate-700 dark:hover:text-white' : 'text-slate-300 dark:text-slate-600'"
            :title="t('editor.layers.toggleVisibility')"
            @click.stop="emit('toggle-visibility', el.id)"
          >
            <Eye v-if="el.visible" class="w-3.5 h-3.5" />
            <EyeOff v-else class="w-3.5 h-3.5" />
          </button>

          <!-- Lock Toggle -->
          <button
            type="button"
            class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            :class="el.locked ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'"
            :title="t('editor.layers.toggleLock')"
            @click.stop="emit('toggle-lock', el.id)"
          >
            <Lock v-if="el.locked" class="w-3.5 h-3.5" />
            <Unlock v-else class="w-3.5 h-3.5" />
          </button>

          <!-- Reorder Up/Down -->
          <button
            type="button"
            class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            :title="t('editor.layers.bringForward')"
            @click.stop="emit('reorder-layer', el.id, 'forward')"
          >
            <ChevronUp class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            :title="t('editor.layers.sendBackward')"
            @click.stop="emit('reorder-layer', el.id, 'backward')"
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>

          <!-- Delete -->
          <button
            type="button"
            class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition-colors"
            :title="t('editor.layers.delete')"
            @click.stop="emit('delete-element', el.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
