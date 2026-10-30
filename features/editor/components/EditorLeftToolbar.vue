<script setup lang="ts">
import { ref } from 'vue'
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Disc,
  Minus,
  Hexagon,
  PenTool,
  Type,
  Upload,
  Image as ImageIcon
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { EditorTool } from '../types/editor'

const props = defineProps<{
  activeTool: EditorTool
}>()

const emit = defineEmits<{
  (e: 'update:activeTool', tool: EditorTool): void
  (e: 'import-svg', content: string): void
  (e: 'import-reference-image', file: File): void
}>()

const { t } = useI18n()
const svgFileInputRef = ref<HTMLInputElement | null>(null)
const imageFileInputRef = ref<HTMLInputElement | null>(null)

interface ToolItem {
  id: EditorTool
  labelKey: string
  icon: any
}

const mainTools: ToolItem[] = [
  { id: 'select', labelKey: 'editor.tools.select', icon: MousePointer },
  { id: 'move', labelKey: 'editor.tools.move', icon: Hand }
]

const shapeTools: ToolItem[] = [
  { id: 'rect', labelKey: 'editor.tools.rect', icon: Square },
  { id: 'circle', labelKey: 'editor.tools.circle', icon: Circle },
  { id: 'ellipse', labelKey: 'editor.tools.ellipse', icon: Disc },
  { id: 'line', labelKey: 'editor.tools.line', icon: Minus },
  { id: 'polygon', labelKey: 'editor.tools.polygon', icon: Hexagon },
  { id: 'pen', labelKey: 'editor.tools.pen', icon: PenTool },
  { id: 'text', labelKey: 'editor.tools.text', icon: Type }
]

const handleSvgUpload = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    const reader = new FileReader()
    reader.onload = (re) => {
      const content = re.target?.result as string
      if (content) {
        emit('import-svg', content)
      }
    }
    reader.readAsText(file)
    input.value = ''
  }
}

const handleImageUpload = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('import-reference-image', input.files[0])
    input.value = ''
  }
}
</script>

<template>
  <div class="flex sm:flex-col items-center gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-x-auto sm:overflow-visible">
    <!-- Hidden File Inputs -->
    <input
      ref="svgFileInputRef"
      type="file"
      accept=".svg,image/svg+xml"
      class="hidden"
      @change="handleSvgUpload"
    />
    <input
      ref="imageFileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="hidden"
      @change="handleImageUpload"
    />

    <!-- Pointer & Navigation Tools -->
    <button
      v-for="tool in mainTools"
      :key="tool.id"
      type="button"
      class="p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0"
      :class="[
        activeTool === tool.id
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      ]"
      :title="t(tool.labelKey)"
      @click="emit('update:activeTool', tool.id)"
    >
      <component :is="tool.icon" class="w-5 h-5" />
    </button>

    <!-- Divider -->
    <div class="w-px h-6 sm:w-6 sm:h-px bg-slate-200 dark:bg-slate-800 my-0.5"></div>

    <!-- Shapes & Creation Tools -->
    <button
      v-for="tool in shapeTools"
      :key="tool.id"
      type="button"
      class="p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0"
      :class="[
        activeTool === tool.id
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      ]"
      :title="t(tool.labelKey)"
      @click="emit('update:activeTool', tool.id)"
    >
      <component :is="tool.icon" class="w-5 h-5" />
    </button>

    <!-- Divider -->
    <div class="w-px h-6 sm:w-6 sm:h-px bg-slate-200 dark:bg-slate-800 my-0.5"></div>

    <!-- Import SVG Tool -->
    <button
      type="button"
      class="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
      :title="t('editor.tools.importSvg')"
      @click="svgFileInputRef?.click()"
    >
      <Upload class="w-5 h-5" />
    </button>

    <!-- Add Image Guide Tool -->
    <button
      type="button"
      class="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
      :title="t('editor.tools.importRefImage')"
      @click="imageFileInputRef?.click()"
    >
      <ImageIcon class="w-5 h-5" />
    </button>
  </div>
</template>
