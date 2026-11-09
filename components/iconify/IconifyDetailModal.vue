<template>
  <div v-if="isOpen && icon" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span class="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
            {{ icon.prefix }}
          </span>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ icon.name }}
          </h3>
        </div>
        <button
          @click="$emit('close')"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- SVG Stage -->
        <div class="w-full h-48 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden">
          <div
            v-if="icon.svgCode"
            v-html="customizedSvgCode"
            class="flex items-center justify-center transition-all"
            :style="{ width: `${currentSize}px`, height: `${currentSize}px`, color: currentColor }"
          ></div>
          <div v-else class="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>

        <!-- Customization Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Color Picker -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
              {{ $t('iconify.color') || 'لون الأيقونة' }}
            </label>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="c in colorOptions"
                :key="c.value"
                @click="currentColor = c.value"
                :class="[
                  'w-7 h-7 rounded-full border-2 transition-transform',
                  currentColor === c.value ? 'scale-110 border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 dark:border-slate-700'
                ]"
                :style="{ backgroundColor: c.preview }"
                :title="c.label"
              ></button>
            </div>
          </div>

          <!-- Size Selector -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
              {{ $t('iconify.size') || 'الحجم (بكسل)' }}: {{ currentSize }}px
            </label>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="s in [16, 24, 32, 48, 64]"
                :key="s"
                @click="currentSize = s"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition',
                  currentSize === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                ]"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <!-- Copy Identifier -->
          <button
            @click="copyIdentifier"
            class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{{ copiedIdentifier ? ($t('common.copied') || 'تم النسخ!') : ($t('iconify.copy_id') || 'نسخ المعرف') }}</span>
          </button>

          <!-- Copy SVG Code -->
          <button
            @click="copySvgMarkup"
            class="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span>{{ copiedSvg ? ($t('common.copied') || 'تم النسخ!') : ($t('iconify.copy_svg') || 'نسخ SVG') }}</span>
          </button>

          <!-- Download SVG File -->
          <button
            @click="triggerDownload"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{{ $t('iconify.download_svg') || 'تنزيل SVG' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SelectedIconDetails } from '../../composables/useIconify'

const props = defineProps<{
  isOpen: boolean
  icon: SelectedIconDetails | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download', prefix: string, name: string, color: string, size: number): void
}>()

const currentColor = ref('currentColor')
const currentSize = ref(32)
const copiedIdentifier = ref(false)
const copiedSvg = ref(false)

const colorOptions = [
  { value: 'currentColor', preview: '#64748b', label: 'افتراضي / currentColor' },
  { value: '#0f172a', preview: '#0f172a', label: 'داكن / Dark' },
  { value: '#2563eb', preview: '#2563eb', label: 'أزرق / Blue' },
  { value: '#16a34a', preview: '#16a34a', label: 'أخضر / Green' },
  { value: '#dc2626', preview: '#dc2626', label: 'أحمر / Red' },
  { value: '#9333ea', preview: '#9333ea', label: 'بنفسجي / Purple' },
  { value: '#ea580c', preview: '#ea580c', label: 'برتقالي / Orange' },
]

const customizedSvgCode = computed(() => {
  if (!props.icon?.svgCode) return ''
  let code = props.icon.svgCode
  if (currentColor.value !== 'currentColor') {
    code = code.replace(/<svg\b([^>]*)>/, `<svg$1 color="${currentColor.value}">`)
  }
  return code
})

async function copyIdentifier() {
  if (!props.icon) return
  await navigator.clipboard.writeText(props.icon.fullName)
  copiedIdentifier.value = true
  setTimeout(() => { copiedIdentifier.value = false }, 2000)
}

async function copySvgMarkup() {
  if (!props.icon?.svgCode) return
  await navigator.clipboard.writeText(customizedSvgCode.value || props.icon.svgCode)
  copiedSvg.value = true
  setTimeout(() => { copiedSvg.value = false }, 2000)
}

function triggerDownload() {
  if (!props.icon) return
  emit('download', props.icon.prefix, props.icon.name, currentColor.value, currentSize.value)
}
</script>
