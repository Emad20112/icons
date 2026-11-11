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
            <span>{{ copiedIdentifier ? ($t('common.copied') || 'تم النسخ!') : ($t('iconify.copy_identifier') || 'نسخ المعرف') }}</span>
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

        <!-- Platform Integration: Open in Icon Editor & Save to Repository -->
        <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <!-- Open in Icon Editor Button -->
            <button
              @click="openInEditor"
              class="flex-1 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>{{ $t('iconify.open_in_editor') || 'فتح في محرر الأيقونات' }}</span>
            </button>

            <!-- Save to Repository Button / Modal Trigger -->
            <div v-if="user" class="flex-1 flex gap-1.5">
              <select
                v-model="selectedRepoId"
                class="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">{{ $t('iconify.select_repository') || 'اختر المستودع...' }}</option>
                <option v-for="repo in userRepositories" :key="repo.id" :value="repo.id">
                  {{ repo.name }}
                </option>
              </select>
              <button
                @click="saveIconToRepository"
                :disabled="isSaving || !selectedRepoId"
                class="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span v-if="isSaving" class="animate-spin w-3.5 h-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full"></span>
                <span>{{ isSaving ? ($t('iconify.saving') || 'جارٍ الحفظ...') : ($t('iconify.save_to_repository') || 'حفظ') }}</span>
              </button>
            </div>
          </div>

          <!-- Save Notification Banner -->
          <div v-if="saveMessage" :class="[
            'p-2.5 rounded-xl text-xs font-medium flex items-center justify-between',
            saveStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          ]">
            <span>{{ saveMessage }}</span>
            <button @click="saveMessage = null" class="text-xs opacity-75 hover:opacity-100">&times;</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SelectedIconDetails } from '../../composables/useIconify'
import { useAuth } from '../../composables/useAuth'
import { useRepositories } from '../../composables/useRepositories'
import { useI18n } from '#imports'

const props = defineProps<{
  isOpen: boolean
  icon: SelectedIconDetails | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download', prefix: string, name: string, color: string, size: number): void
}>()

const router = useRouter()
const { t } = useI18n()
const { user } = useAuth()
const { repositories, fetchRepositories } = useRepositories()

const currentColor = ref('currentColor')
const currentSize = ref(32)
const copiedIdentifier = ref(false)
const copiedSvg = ref(false)

const selectedRepoId = ref('')
const isSaving = ref(false)
const saveMessage = ref<string | null>(null)
const saveStatus = ref<'success' | 'error'>('success')

const userRepositories = computed(() => {
  return repositories.value || []
})

watch(() => props.isOpen, (open) => {
  if (open && user.value && repositories.value.length === 0) {
    fetchRepositories({ ownerId: user.value.id })
  }
  saveMessage.value = null
})

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

function openInEditor() {
  if (!props.icon?.svgCode) return
  const svgToTransfer = customizedSvgCode.value || props.icon.svgCode
  sessionStorage.setItem('pending_editor_svg', svgToTransfer)
  sessionStorage.setItem('pending_editor_title', props.icon.fullName)
  emit('close')
  router.push('/tools/icon-editor')
}

async function saveIconToRepository() {
  if (!props.icon || !selectedRepoId.value) return
  const svgData = customizedSvgCode.value || props.icon.svgCode
  if (!svgData) return

  isSaving.value = true
  saveMessage.value = null

  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/v1/iconify/save', {
      method: 'POST',
      body: {
        prefix: props.icon.prefix,
        name: props.icon.name,
        svg: svgData,
        repositoryId: selectedRepoId.value
      }
    })

    if (res.success) {
      saveStatus.value = 'success'
      saveMessage.value = t('iconify.save_success') || 'تم حفظ الأيقونة في المستودع بنجاح!'
      setTimeout(() => {
        saveMessage.value = null
      }, 3000)
    }
  } catch (err: any) {
    saveStatus.value = 'error'
    saveMessage.value = err?.data?.statusMessage || err?.message || (t('iconify.save_failed') || 'فشل حفظ الأيقونة')
  } finally {
    isSaving.value = false
  }
}
</script>
