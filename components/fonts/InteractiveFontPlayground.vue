<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Type,
  Palette,
  Sliders,
  Copy,
  Check,
  Code,
  Download,
  RotateCcw,
  Sun,
  Moon
} from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const props = defineProps<{
  family: {
    id: string
    name: string
    display_name?: string
    slug: string
    weights?: number[]
    files?: Array<{ id: string; weight: number; style: string; format: string; storage_path?: string }>
    language_support?: string[]
  }
}>()

const { success } = useToast()

// Playground state
const text = ref('القاهرة عاصمة التاريخ والحضارة، ملتقى الفنون ومنارة الإبداع العربي عبر العصور.')
const fontSize = ref(42)
const lineHeight = ref(1.6)
const letterSpacing = ref(0)
const selectedWeight = ref(400)
const selectedStyle = ref<'normal' | 'italic'>('normal')
const textColor = ref('#0f172a')
const backgroundColor = ref('#ffffff')
const textAlign = ref<'right' | 'center' | 'left'>('right')

const copiedCss = ref(false)
const copiedUrl = ref(false)

// Predefined pangrams
const arabicPangram = 'أبجد هوز حطي كلمن صعفض قرشت ثخذ ضظغ • ٠١٢٣٤٥٦٧٨٩'
const englishPangram = 'The quick brown fox jumps over the lazy dog • 0123456789'
const titlePangram = 'العناوين الرئيسية والتصميم المطبعي الرقمي'

// Predefined Color Presets
const colorPresets = [
  { name: 'افتراضي فاتح', text: '#0f172a', bg: '#ffffff' },
  { name: 'افتراضي داكن', text: '#f8fafc', bg: '#090d16' },
  { name: 'ورقي كلاسيكي', text: '#292524', bg: '#fef3c7' },
  { name: 'أزرق تقني', text: '#ffffff', bg: '#1e3a8a' },
  { name: 'أخضر زمردي', text: '#ecfdf5', bg: '#064e3b' },
  { name: 'لوح رمادي', text: '#e2e8f0', bg: '#1e293b' }
]

function applyPreset(preset: typeof colorPresets[0]) {
  textColor.value = preset.text
  backgroundColor.value = preset.bg
}

const isArabic = computed(() => {
  return /[\u0600-\u06FF]/.test(text.value)
})

const fontDownloadUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1/fonts/${props.family.slug}/download`
  }
  return `/api/v1/fonts/${props.family.slug}/download`
})

const generatedCss = computed(() => {
  return `/* Digital Assets Platform Font CSS */
@font-face {
  font-family: '${props.family.name}';
  src: url('${fontDownloadUrl.value}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.custom-typography {
  font-family: '${props.family.name}', system-ui, sans-serif;
  font-weight: ${selectedWeight.value};
  font-style: ${selectedStyle.value};
  font-size: ${fontSize.value}px;
  line-height: ${lineHeight.value};
  letter-spacing: ${letterSpacing.value}px;
  color: ${textColor.value};
}`
})

async function copyCssCode() {
  if (typeof window !== 'undefined') {
    await navigator.clipboard.writeText(generatedCss.value)
    copiedCss.value = true
    success('تم نسخ كود CSS', 'تم نسخ كود @font-face وقواعد التنسيق بنجاح.')
    setTimeout(() => { copiedCss.value = false }, 2000)
  }
}

async function copyDirectFontUrl() {
  if (typeof window !== 'undefined') {
    await navigator.clipboard.writeText(fontDownloadUrl.value)
    copiedUrl.value = true
    success('تم نسخ الرابط المباشر', 'تم نسخ رابط تنزيل الخط إلى الحافظة.')
    setTimeout(() => { copiedUrl.value = false }, 2000)
  }
}

function resetPlayground() {
  text.value = 'القاهرة عاصمة التاريخ والحضارة، ملتقى الفنون ومنارة الإبداع العربي عبر العصور.'
  fontSize.value = 42
  lineHeight.value = 1.6
  letterSpacing.value = 0
  selectedWeight.value = 400
  selectedStyle.value = 'normal'
  textColor.value = '#0f172a'
  backgroundColor.value = '#ffffff'
  textAlign.value = 'right'
}

onMounted(() => {
  if (props.family.weights && props.family.weights.length > 0) {
    selectedWeight.value = props.family.weights.includes(400) ? 400 : props.family.weights[0]
  }
})
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
    <!-- Header & Quick Pangrams -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Type class="w-5 h-5 text-blue-600" />
          معمل المعاينة الحي والتفاعلي
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          جرب الخط مباشرة بالأوزان والأنماط والألوان المخصصة وانسخ كود CSS الجاهز للمشروع
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          @click="text = arabicPangram; textAlign = 'right'"
          class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
        >
          أبجدية عربية
        </button>
        <button
          type="button"
          @click="text = titlePangram; textAlign = 'right'"
          class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
        >
          عنوان تجريبي
        </button>
        <button
          type="button"
          @click="text = englishPangram; textAlign = 'left'"
          class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition font-sans"
        >
          Latin Pangram
        </button>
        <button
          type="button"
          @click="resetPlayground"
          title="إعادة ضبط"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Controls Toolbar -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
      <!-- Font Size Slider -->
      <div class="space-y-1.5">
        <div class="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
          <span>حجم الخط</span>
          <span class="font-mono text-blue-600">{{ fontSize }}px</span>
        </div>
        <input
          type="range"
          min="14"
          max="96"
          step="2"
          v-model.number="fontSize"
          class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      <!-- Line Height & Spacing -->
      <div class="space-y-1.5">
        <div class="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
          <span>ارتفاع السطر</span>
          <span class="font-mono text-blue-600">{{ lineHeight }}</span>
        </div>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.1"
          v-model.number="lineHeight"
          class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      <!-- Weight Selection -->
      <div class="space-y-1.5">
        <label class="block font-semibold text-slate-600 dark:text-slate-400">الوزن المعروض</label>
        <select
          v-model.number="selectedWeight"
          class="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold"
        >
          <option v-for="w in (family.weights || [400, 700])" :key="w" :value="w">
            وزن {{ w }}
          </option>
        </select>
      </div>

      <!-- Color Pickers & Presets -->
      <div class="space-y-1.5">
        <label class="block font-semibold text-slate-600 dark:text-slate-400">ألوان العرض</label>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="color" v-model="textColor" class="w-6 h-6 rounded-lg cursor-pointer border-0 p-0" />
            <span class="text-[11px] text-slate-500">النص</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="color" v-model="backgroundColor" class="w-6 h-6 rounded-lg cursor-pointer border-0 p-0" />
            <span class="text-[11px] text-slate-500">الخلفية</span>
          </label>
          <div class="flex items-center gap-1 ms-auto">
            <button
              v-for="p in colorPresets.slice(0, 3)"
              :key="p.name"
              type="button"
              :title="p.name"
              class="w-4 h-4 rounded-full border border-slate-400"
              :style="{ backgroundColor: p.bg, borderColor: p.text }"
              @click="applyPreset(p)"
            ></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Interactive Canvas -->
    <div
      class="rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 transition-colors shadow-inner min-h-[220px] flex items-center"
      :style="{ backgroundColor }"
    >
      <textarea
        v-model="text"
        rows="4"
        class="w-full bg-transparent border-none outline-none resize-none transition-all placeholder-slate-400"
        :style="{
          color: textColor,
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          fontWeight: selectedWeight,
          fontStyle: selectedStyle,
          fontFamily: `'${family.name}', system-ui, sans-serif`,
          textAlign: textAlign
        }"
        :dir="isArabic ? 'rtl' : 'ltr'"
      ></textarea>
    </div>

    <!-- Export Actions & CSS Copy Section -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="copyCssCode"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition"
        >
          <Check v-if="copiedCss" class="w-4 h-4 text-emerald-600" />
          <Code v-else class="w-4 h-4 text-blue-600" />
          <span>{{ copiedCss ? 'تم نسخ كود CSS!' : 'نسخ كود CSS' }}</span>
        </button>

        <button
          type="button"
          @click="copyDirectFontUrl"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition"
        >
          <Check v-if="copiedUrl" class="w-4 h-4 text-emerald-600" />
          <Copy v-else class="w-4 h-4" />
          <span>{{ copiedUrl ? 'تم نسخ الرابط!' : 'نسخ رابط الخط المباشر' }}</span>
        </button>
      </div>

      <a
        :href="fontDownloadUrl"
        download
        class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm"
      >
        <Download class="w-4 h-4" />
        <span>تنزيل حزمة الخط المكتملة</span>
      </a>
    </div>
  </div>
</template>
