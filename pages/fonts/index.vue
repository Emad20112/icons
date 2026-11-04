<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Hero Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3">
            <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            {{ $t('fonts.hero_badge') || 'المكتبة الرقمية للخطوط العربية والعالمية' }}
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            {{ $t('fonts.library_title') || 'مكتبة الخطوط والتايبوغرافي' }}
          </h1>
          <p class="text-base text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            {{ $t('fonts.library_subtitle') || 'اكتشف خطوطاً عربية وعالمية عالية الجودة، مصنفة بدقة بواسطة الذكاء الاصطناعي مع دعم المعاينة الحية والتنزيل الفوري.' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin/fonts/ai-review"
            class="px-4 py-2.5 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ $t('fonts.ai_review') || 'تدقيق الذكاء الاصطناعي' }}
          </NuxtLink>

          <NuxtLink
            to="/admin/fonts/import"
            class="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {{ $t('fonts.bulk_import') || 'استيراد خطوط' }}
          </NuxtLink>
        </div>
      </div>

      <!-- Filter Bar -->
      <FontFilterBar
        @filter="onFilterChange"
        @update:customText="val => liveCustomText = val"
        @update:fontSize="val => liveFontSize = val"
      />

      <!-- Results Stats Bar -->
      <div class="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          {{ $t('fonts.showing_results') || 'عرض' }} <strong class="text-slate-900 dark:text-slate-100">{{ families.length }}</strong> {{ $t('fonts.families') || 'عائلة خطوط' }}
        </span>
        <div class="flex items-center gap-2">
          <span>{{ $t('fonts.sort_by') || 'الترتيب:' }}</span>
          <select
            v-model="currentSort"
            @change="fetchFamilies"
            class="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 p-0 cursor-pointer"
          >
            <option value="popular">{{ $t('fonts.sort_popular') || 'الأكثر رواجاً' }}</option>
            <option value="newest">{{ $t('fonts.sort_newest') || 'الأحدث' }}</option>
            <option value="name_asc">{{ $t('fonts.sort_name_asc') || 'الاسم (أ-ي)' }}</option>
            <option value="name_desc">{{ $t('fonts.sort_name_desc') || 'الاسم (ي-أ)' }}</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-24 text-center text-slate-400">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4"></div>
        <p class="text-sm font-medium">{{ $t('common.loading') || 'جاري تحميل مكتبة الخطوط...' }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="families.length === 0" class="py-24 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <svg class="mx-auto h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ $t('fonts.no_results_title') || 'لم يتم العثور على خطوط مطابقة' }}</h3>
        <p class="text-sm text-slate-500 mt-1">{{ $t('fonts.no_results_subtitle') || 'جرب تغيير معايير البحث أو مسح المرشحات المطبقة.' }}</p>
        <button
          @click="resetFilters"
          class="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-blue-600 hover:bg-slate-200 transition"
        >
          {{ $t('common.reset_filters') || 'إعادة ضبط البحث' }}
        </button>
      </div>

      <!-- Families Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="family in families"
          :key="family.id"
          class="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition space-y-5 flex flex-col justify-between"
        >
          <!-- Top Card Meta -->
          <div>
            <div class="flex items-start justify-between gap-4">
              <div>
                <NuxtLink :to="`/fonts/${family.slug}`" class="hover:text-blue-600 transition">
                  <h2 class="text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                    {{ family.display_name || family.name }}
                  </h2>
                </NuxtLink>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ family.designer || 'Unknown' }} {{ family.foundry ? `• ${family.foundry}` : '' }}
                </p>
              </div>

              <!-- Badges -->
              <div class="flex flex-wrap items-center gap-1.5 justify-end">
                <span
                  v-if="family.arabic_style"
                  class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                >
                  {{ family.arabic_style }}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                  {{ family.primary_category }}
                </span>
                <span class="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  {{ family.license_type }}
                </span>
              </div>
            </div>

            <!-- Live Text Specimen Box -->
            <div class="my-6 min-h-[90px] flex items-center justify-start overflow-hidden">
              <p
                class="text-slate-900 dark:text-slate-100 transition-all font-normal leading-relaxed break-words w-full"
                :style="{
                  fontSize: `${liveFontSize}px`,
                  fontFamily: `'${family.name}', system-ui, sans-serif`
                }"
                :dir="family.language_support.includes('arabic') ? 'rtl' : 'ltr'"
              >
                {{ liveCustomText || family.preview_text_sample || 'القاهرة عاصمة التاريخ والحضارة' }}
              </p>
            </div>
          </div>

          <!-- Bottom Card: Weights & Download Action -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <!-- Available Weights -->
            <div class="flex items-center gap-1 text-xs text-slate-500">
              <span class="font-medium text-slate-400 me-1">{{ family.files_count }} {{ $t('fonts.weights') || 'أوزان' }}:</span>
              <span
                v-for="w in family.weights"
                :key="w"
                class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono"
              >
                {{ w }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <NuxtLink
                :to="`/fonts/${family.slug}`"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition"
              >
                {{ $t('fonts.explore') || 'استكشاف' }}
              </NuxtLink>

              <a
                :href="`/api/v1/fonts/${family.slug}/download`"
                download
                class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                ZIP
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FontFilterBar from '~/components/fonts/FontFilterBar.vue'

interface FontFamilyItem {
  id: string
  name: string
  slug: string
  display_name?: string
  description?: string
  designer?: string
  foundry?: string
  primary_category: string
  arabic_style?: string
  language_support: string[]
  preview_text_sample?: string
  license_type: string
  files_count: number
  weights: number[]
  styles: string[]
}

const families = ref<FontFamilyItem[]>([])
const loading = ref(true)
const liveCustomText = ref('')
const liveFontSize = ref(32)
const currentSort = ref('popular')
const activeFilters = ref<any>({})

async function fetchFamilies() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (activeFilters.value.q) params.set('q', activeFilters.value.q)
    if (activeFilters.value.category) params.set('category', activeFilters.value.category)
    if (activeFilters.value.arabic_style) params.set('arabic_style', activeFilters.value.arabic_style)
    if (activeFilters.value.language) params.set('language', activeFilters.value.language)
    if (activeFilters.value.license) params.set('license', activeFilters.value.license)
    if (currentSort.value) params.set('sort', currentSort.value)

    const res = await $fetch<{ success: boolean; families: FontFamilyItem[] }>(`/api/v1/fonts?${params.toString()}`)
    if (res.success) {
      families.value = res.families
    }
  } catch (err) {
    console.error('Failed to load font library:', err)
  } finally {
    loading.value = false
  }
}

function onFilterChange(filters: any) {
  activeFilters.value = filters
  fetchFamilies()
}

function resetFilters() {
  activeFilters.value = {}
  fetchFamilies()
}

onMounted(() => {
  fetchFamilies()
})
</script>
