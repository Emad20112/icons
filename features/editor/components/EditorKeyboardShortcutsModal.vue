<script setup lang="ts">
import { X, Keyboard } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

const shortcuts = [
  { key: 'Ctrl/Cmd + Z', descKey: 'editor.shortcuts.undo' },
  { key: 'Ctrl/Cmd + Shift + Z', descKey: 'editor.shortcuts.redo' },
  { key: 'Delete / Backspace', descKey: 'editor.shortcuts.delete' },
  { key: 'Ctrl/Cmd + A', descKey: 'editor.shortcuts.selectAll' },
  { key: 'Ctrl/Cmd + C', descKey: 'editor.shortcuts.copy' },
  { key: 'Ctrl/Cmd + V', descKey: 'editor.shortcuts.paste' },
  { key: 'Ctrl/Cmd + D', descKey: 'editor.shortcuts.duplicate' },
  { key: 'Escape', descKey: 'editor.shortcuts.escape' },
  { key: '+ / -', descKey: 'editor.shortcuts.zoom' },
  { key: 'Space + Drag', descKey: 'editor.shortcuts.pan' }
]
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
  >
    <div
      class="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5"
      @click.stop
    >
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <Keyboard class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white">
              {{ t('editor.shortcuts.title') }}
            </h3>
            <p class="text-xs text-slate-500">
              {{ t('editor.shortcuts.subtitle') }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="emit('close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-2 max-h-[360px] overflow-y-auto">
        <div
          v-for="sc in shortcuts"
          :key="sc.key"
          class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs"
        >
          <span class="text-slate-600 dark:text-slate-300">
            {{ t(sc.descKey) }}
          </span>
          <kbd class="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
            {{ sc.key }}
          </kbd>
        </div>
      </div>
    </div>
  </div>
</template>
