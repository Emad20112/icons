<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
    <!-- Top Row: Search & Custom Specimen Text -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
      <!-- Search Input -->
      <div class="md:col-span-5 relative">
        <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          v-model="searchQuery"
          @input="emitFilterChange"
          :placeholder="$t('fonts.search_placeholder') || 'ابحث عن خط، مصمم، أو أسلوب خطي (كوفي، نسخ...)'"
          class="w-full ps-10 pe-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      <!-- Custom Live Specimen Input -->
      <div class="md:col-span-5 relative">
        <div class="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <input
          type="text"
          v-model="customText"
          @input="$emit('update:customText', customText)"
          :placeholder="$t('fonts.type_custom_text') || 'اكتب نصك هنا للمعاينة الحية...'"
          class="w-full ps-10 pe-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      <!-- Font Size Slider -->
      <div class="md:col-span-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <span class="text-xs text-slate-400 font-mono">{{ fontSize }}px</span>
        <input
          type="range"
          min="18"
          max="64"
          step="2"
          v-model.number="fontSize"
          @input="$emit('update:fontSize', fontSize)"
          class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    </div>

    <!-- Second Row: Arabic Styles Chips -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span class="font-semibold">{{ $t('fonts.arabic_calligraphy_styles') || 'الأنماط الخطية العربية' }}</span>
        <span v-if="selectedArabicStyle !== 'all'" @click="setArabicStyle('all')" class="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
          {{ $t('common.clear') || 'مسح' }}
        </span>
      </div>

      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          v-for="style in arabicStyles"
          :key="style.value"
          @click="setArabicStyle(style.value)"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap',
            selectedArabicStyle === style.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          ]"
        >
          {{ style.label }}
        </button>
      </div>
    </div>

    <!-- Third Row: Categories & Languages -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Category Dropdown -->
        <select
          v-model="selectedCategory"
          @change="emitFilterChange"
          class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">{{ $t('fonts.all_categories') || 'جميع التصنيفات' }}</option>
          <option value="sans_serif">Sans-Serif (غير مذيل)</option>
          <option value="serif">Serif (مذيل)</option>
          <option value="display">Display (عرض وعناوين)</option>
          <option value="arabic_calligraphy">Arabic Calligraphy (خطوط تراثية)</option>
          <option value="monospace">Monospace (أحادي المسافة)</option>
        </select>

        <!-- Language Dropdown -->
        <select
          v-model="selectedLanguage"
          @change="emitFilterChange"
          class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">{{ $t('fonts.all_languages') || 'جميع اللغات' }}</option>
          <option value="arabic">Arabic (يدعم العربية)</option>
          <option value="latin">Latin (يدعم اللاتينية)</option>
        </select>

        <!-- License Dropdown -->
        <select
          v-model="selectedLicense"
          @change="emitFilterChange"
          class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">{{ $t('fonts.all_licenses') || 'جميع الرخص' }}</option>
          <option value="OFL">Open Font License (OFL)</option>
          <option value="APACHE">Apache 2.0</option>
          <option value="MIT">MIT License</option>
        </select>
      </div>

      <!-- Quick Preset Texts -->
      <div class="flex items-center gap-1.5 text-xs text-slate-400">
        <span class="hidden sm:inline">{{ $t('fonts.samples') || 'أمثلة:' }}</span>
        <button
          @click="setSampleText('القاهرة عاصمة التاريخ والحضارة')"
          class="px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          القاهرة
        </button>
        <button
          @click="setSampleText('أبجد هوز حطي كلمن')"
          class="px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          أبجد هوز
        </button>
        <button
          @click="setSampleText('The quick brown fox jumps over the lazy dog')"
          class="px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition font-sans"
        >
          Latin
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'filter', filters: any): void
  (e: 'update:customText', text: string): void
  (e: 'update:fontSize', size: number): void
}>()

const searchQuery = ref('')
const customText = ref('')
const fontSize = ref(32)
const selectedArabicStyle = ref('all')
const selectedCategory = ref('all')
const selectedLanguage = ref('all')
const selectedLicense = ref('ALL')

const arabicStyles = [
  { value: 'all', label: 'جميع الأنماط' },
  { value: 'kufi', label: 'كوفي (Kufi)' },
  { value: 'naskh', label: 'نسخ (Naskh)' },
  { value: 'ruqah', label: 'رقعة (Ruqah)' },
  { value: 'modern', label: 'حديث (Modern)' },
  { value: 'thuluth', label: 'ثلث (Thuluth)' },
  { value: 'diwani', label: 'ديواني (Diwani)' },
  { value: 'nastaliq', label: 'نستعليق (Nastaliq)' },
]

function setArabicStyle(style: string) {
  selectedArabicStyle.value = style
  emitFilterChange()
}

function setSampleText(text: string) {
  customText.value = text
  emit('update:customText', text)
}

function emitFilterChange() {
  emit('filter', {
    q: searchQuery.value,
    category: selectedCategory.value,
    arabic_style: selectedArabicStyle.value,
    language: selectedLanguage.value,
    license: selectedLicense.value,
  })
}
</script>
