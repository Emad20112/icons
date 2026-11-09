<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Maximize2,
  Copy,
  Check,
  Download,
  Palette,
  Sliders,
  Share2,
  FolderPlus
} from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'
import { useRepositories } from '../../composables/useRepositories'
import { useAuth } from '../../composables/useAuth'

const props = defineProps<{
  asset: {
    id: string
    name: string
    files?: Array<{
      id: string
      format: string
      file_path: string
      file_size: number
      metadata?: any
    }>
  }
  rawSvg?: string
}>()

const { success, error } = useToast()
const { repositories, fetchRepositories, addItem } = useRepositories()
const { isAuthenticated } = useAuth()

const iconSize = ref(64)
const iconColor = ref('#2563eb')
const backgroundColor = ref('#ffffff')
const bgStyle = ref<'transparent' | 'light' | 'dark' | 'checkerboard'>('light')

const copiedSvg = ref(false)
const copiedUrl = ref(false)
const isRepoModalOpen = ref(false)
const selectedRepoId = ref('')
const isAddingToRepo = ref(false)

const sizes = [24, 32, 48, 64, 96, 128]

const currentSvg = computed(() => {
  if (props.rawSvg) return props.rawSvg
  const svgFile = props.asset.files?.find(f => f.format === 'SVG')
  if (svgFile?.metadata?.rawContent) return svgFile.metadata.rawContent
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>`
})

const coloredSvg = computed(() => {
  let svg = currentSvg.value
  // Dynamically set stroke or fill if currentcolor
  if (svg.includes('currentColor')) {
    svg = svg.replace(/currentColor/g, iconColor.value)
  } else if (!svg.includes('stroke=') && !svg.includes('fill=')) {
    svg = svg.replace('<svg', `<svg fill="${iconColor.value}"`)
  }
  return svg
})

async function copySvgCode() {
  if (typeof window !== 'undefined') {
    await navigator.clipboard.writeText(coloredSvg.value)
    copiedSvg.value = true
    success('تم نسخ كود SVG', 'تم نسخ كود الأيقونة المتجهة بنجاح.')
    setTimeout(() => { copiedSvg.value = false }, 2000)
  }
}

async function copyAssetLink() {
  if (typeof window !== 'undefined') {
    await navigator.clipboard.writeText(window.location.href)
    copiedUrl.value = true
    success('تم نسخ رابط الأيقونة', 'تم نسخ رابط المشاركة بنجاح.')
    setTimeout(() => { copiedUrl.value = false }, 2000)
  }
}

async function openAddToRepoModal() {
  if (!isAuthenticated.value) {
    error('تسجيل الدخول مطلوب', 'يرجى تسجيل الدخول أولاً لإضافة الأيقونة لمستودعاتك.')
    return
  }
  await fetchRepositories()
  isRepoModalOpen.value = true
}

async function confirmAddToRepo() {
  if (!selectedRepoId.value) return
  isAddingToRepo.value = true
  try {
    await addItem(selectedRepoId.value, 'ASSET', props.asset.id)
    success('تمت الإضافة للمستودع', 'تمت إضافة الأيقونة إلى مستودعك المحدد.')
    isRepoModalOpen.value = false
  } catch (err: any) {
    error('فشل الإضافة للمستودع', err.statusMessage || err.message)
  } finally {
    isAddingToRepo.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Interactive Preview Box -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">معاينة الأيقونة والتحكم المباشر</h3>
          <p class="text-xs text-slate-500">تحكم بالحجم والألوان والخلفية وانسخ الكود الصافي</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openAddToRepoModal"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
          >
            <FolderPlus class="w-3.5 h-3.5 text-blue-600" />
            <span>إضافة إلى مستودع</span>
          </button>
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
        <!-- Size Selector -->
        <div>
          <label class="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            الحجم: <span class="font-mono text-blue-600">{{ iconSize }}px</span>
          </label>
          <div class="flex items-center gap-1.5">
            <button
              v-for="s in sizes"
              :key="s"
              type="button"
              class="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition"
              :class="iconSize === s ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'"
              @click="iconSize = s"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Color Picker -->
        <div>
          <label class="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5">لون الأيقونة</label>
          <div class="flex items-center gap-2">
            <input type="color" v-model="iconColor" class="w-7 h-7 rounded-lg cursor-pointer border-0 p-0" />
            <span class="font-mono text-[11px] text-slate-500 uppercase">{{ iconColor }}</span>
          </div>
        </div>

        <!-- Background Presets -->
        <div>
          <label class="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5">نمط الخلفية</label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1 rounded-lg text-[11px] font-bold border"
              :class="bgStyle === 'light' ? 'bg-white text-slate-900 border-blue-500' : 'bg-slate-100 text-slate-600 border-slate-300'"
              @click="bgStyle = 'light'; backgroundColor = '#ffffff'"
            >
              فاتح
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded-lg text-[11px] font-bold border"
              :class="bgStyle === 'dark' ? 'bg-slate-900 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700'"
              @click="bgStyle = 'dark'; backgroundColor = '#0f172a'"
            >
              داكن
            </button>
            <button
              type="button"
              class="px-3 py-1 rounded-lg text-[11px] font-bold border"
              :class="bgStyle === 'checkerboard' ? 'border-blue-500' : 'border-slate-300'"
              @click="bgStyle = 'checkerboard'"
            >
              مربعات الشفافية
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Canvas Stage -->
      <div
        class="h-64 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-8 transition-colors shadow-inner"
        :class="bgStyle === 'checkerboard' ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]' : ''"
        :style="bgStyle !== 'checkerboard' ? { backgroundColor } : {}"
      >
        <div
          class="transition-all duration-200"
          :style="{ width: `${iconSize}px`, height: `${iconSize}px`, color: iconColor }"
          v-html="coloredSvg"
        ></div>
      </div>

      <!-- Copy Code & Links Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="copySvgCode"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm"
          >
            <Check v-if="copiedSvg" class="w-4 h-4" />
            <Copy v-else class="w-4 h-4" />
            <span>{{ copiedSvg ? 'تم نسخ كود SVG!' : 'نسخ كود SVG الصافي' }}</span>
          </button>

          <button
            type="button"
            @click="copyAssetLink"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition"
          >
            <Check v-if="copiedUrl" class="w-4 h-4 text-emerald-600" />
            <Share2 v-else class="w-4 h-4" />
            <span>{{ copiedUrl ? 'تم نسخ الرابط!' : 'مشاركة الرابط' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Add To Repository -->
    <div
      v-if="isRepoModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">إضافة الأيقونة إلى مستودع</h3>
        <p class="text-xs text-slate-500">اختر المستودع الذي ترغب في حفظ هذه الأيقونة بداخله:</p>

        <div v-if="repositories.length === 0" class="text-center py-6 text-xs text-slate-500">
          ليس لديك أي مستودعات حتى الآن. أنشئ مستودعاً أولاً من صفحة المستودعات.
        </div>
        <div v-else class="space-y-2 max-h-48 overflow-y-auto">
          <label
            v-for="repo in repositories"
            :key="repo.id"
            class="flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs font-semibold"
            :class="selectedRepoId === repo.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800'"
          >
            <div class="flex items-center gap-2">
              <input type="radio" :value="repo.id" v-model="selectedRepoId" class="sr-only" />
              <span>{{ repo.name }}</span>
            </div>
            <span class="text-[10px] text-slate-400 font-normal font-mono">{{ repo.visibility }}</span>
          </label>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700"
            @click="isRepoModalOpen = false"
          >
            إلغاء
          </button>
          <button
            type="button"
            :disabled="!selectedRepoId || isAddingToRepo"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            @click="confirmAddToRepo"
          >
            {{ isAddingToRepo ? 'جارٍ الحفظ...' : 'تأكيد الإضافة' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
