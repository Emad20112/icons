<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-10">
      <!-- Loading State -->
      <div v-if="loading" class="py-32 text-center text-slate-400">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-4"></div>
        <p class="text-sm font-medium">{{ $t('common.loading') || 'جاري تحميل تفاصيل الخط...' }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="!family" class="py-32 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-200">{{ $t('fonts.not_found') || 'عائلة الخط غير موجودة' }}</h2>
        <NuxtLink to="/fonts" class="mt-4 inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
          {{ $t('fonts.back_to_library') || 'العودة لمكتبة الخطوط' }}
        </NuxtLink>
      </div>

      <!-- Family Content -->
      <div v-else class="space-y-10">
        <!-- Top Breadcrumbs & Family Header -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <NuxtLink to="/" class="hover:underline">{{ $t('common.home') || 'الرئيسية' }}</NuxtLink>
            <span>/</span>
            <NuxtLink to="/fonts" class="hover:underline">{{ $t('fonts.title') || 'مكتبة الخطوط' }}</NuxtLink>
            <span>/</span>
            <span class="text-slate-800 dark:text-slate-200 font-semibold">{{ family.display_name || family.name }}</span>
          </div>

          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span
                  v-if="family.arabic_style"
                  class="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                >
                  خط {{ family.arabic_style }}
                </span>
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
                  {{ family.primary_category }}
                </span>
                <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  {{ family.license_type }}
                </span>
                <span v-if="family.is_variable" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  Variable Font
                </span>
              </div>

              <h1 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                {{ family.display_name || family.name }}
              </h1>

              <p class="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
                {{ family.description || 'عائلة خط رقمية احترافية ملائمة للتطبيقات والمنشورات وواجهات المستخدم.' }}
              </p>

              <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
                <span v-if="family.designer"><strong>{{ $t('fonts.designer') || 'المصمم:' }}</strong> {{ family.designer }}</span>
                <span v-if="family.foundry"><strong>{{ $t('fonts.foundry') || 'المسبك:' }}</strong> {{ family.foundry }}</span>
                <span><strong>{{ $t('fonts.weights_count') || 'الأوزان المتاحة:' }}</strong> {{ family.weights?.length || 1 }}</span>
                <span><strong>{{ $t('fonts.formats') || 'الصيغ:' }}</strong> {{ (family.formats || ['TTF']).join(', ') }}</span>
              </div>
            </div>

            <!-- Primary Download Button -->
            <div class="flex items-center gap-3">
              <a
                :href="`/api/v1/fonts/${family.slug}/download`"
                download
                class="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-md flex items-center gap-2 whitespace-nowrap"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ $t('fonts.download_family_zip') || 'تحميل الحزمة كاملة (ZIP)' }}
              </a>
            </div>
          </div>
        </div>

        <!-- Interactive Specimen Playground -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 class="text-lg font-bold flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {{ $t('fonts.interactive_playground') || 'مختبر المعاينة التفاعلي' }}
            </h2>

            <!-- Quick Pangram Selectors -->
            <div class="flex items-center gap-2 overflow-x-auto text-xs">
              <button
                @click="playgroundText = 'القاهرة عاصمة التاريخ والحضارة، ملتقى الفنون ومنارة الإبداع العربي عبر العصور.'"
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
              >
                جملة عربية
              </button>
              <button
                @click="playgroundText = 'أبجد هوز حطي كلمن صعفض قرشت ثخذ ضظغ • ٠١٢٣٤٥٦٧٨٩'"
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
              >
                الحروف والأرقام
              </button>
              <button
                @click="playgroundText = 'The quick brown fox jumps over the lazy dog • 0123456789'"
                class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium font-sans"
              >
                Latin Pangram
              </button>
            </div>
          </div>

          <!-- Controls Bar -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <!-- Font Size -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{{ $t('fonts.font_size') || 'حجم الخط' }}</span>
                <span class="font-mono">{{ playgroundFontSize }}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="84"
                step="2"
                v-model.number="playgroundFontSize"
                class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <!-- Line Height -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-500 font-semibold">
                <span>{{ $t('fonts.line_height') || 'ارتفاع السطر' }}</span>
                <span class="font-mono">{{ playgroundLineHeight }}</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                v-model.number="playgroundLineHeight"
                class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <!-- Weight Switcher -->
            <div class="space-y-1">
              <span class="block text-xs text-slate-500 font-semibold mb-1">{{ $t('fonts.preview_weight') || 'الوزن المعروض' }}</span>
              <select
                v-model.number="selectedWeight"
                class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                <option v-for="w in family.weights" :key="w" :value="w">
                  {{ getWeightLabel(w) }} ({{ w }})
                </option>
              </select>
            </div>
          </div>

          <!-- Canvas / Textarea -->
          <div class="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[160px]">
            <textarea
              v-model="playgroundText"
              rows="3"
              class="w-full bg-transparent border-none outline-none resize-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
              :style="{
                fontSize: `${playgroundFontSize}px`,
                lineHeight: playgroundLineHeight,
                fontWeight: selectedWeight,
                fontFamily: `'${family.name}', system-ui, sans-serif`
              }"
              :dir="family.language_support.includes('arabic') ? 'rtl' : 'ltr'"
            ></textarea>
          </div>
        </div>

        <!-- Available Weights & Variants List -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold tracking-tight">{{ $t('fonts.styles_and_weights') || 'الأوزان والأنماط المتاحة' }}</h2>

          <div class="space-y-4">
            <div
              v-for="file in family.files"
              :key="file.id"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div class="space-y-2 flex-1">
                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {{ file.weight }}
                  </span>
                  <span class="text-sm font-bold text-slate-900 dark:text-white">
                    {{ file.subfamily_name || getWeightLabel(file.weight) }}
                  </span>
                  <span class="text-xs text-slate-400 uppercase font-mono">
                    {{ file.format }}
                  </span>
                </div>

                <!-- Specimen sample in that specific weight -->
                <p
                  class="text-xl sm:text-2xl text-slate-800 dark:text-slate-200 pt-2"
                  :style="{
                    fontWeight: file.weight,
                    fontStyle: file.style,
                    fontFamily: `'${family.name}', system-ui, sans-serif`
                  }"
                  :dir="family.language_support.includes('arabic') ? 'rtl' : 'ltr'"
                >
                  {{ playgroundText.slice(0, 50) || 'القاهرة عاصمة التاريخ والحضارة' }}
                </p>
              </div>

              <!-- Direct Weight Download -->
              <div>
                <a
                  :href="`/api/v1/fonts/${family.slug}/download?file_id=${file.id}`"
                  download
                  class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {{ $t('fonts.download_file') || 'تنزيل' }} ({{ file.format }})
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Classification Insights Card -->
        <div v-if="family.ai_insights" class="p-6 sm:p-8 rounded-3xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {{ $t('fonts.ai_classification_insights') || 'تحليلات الذكاء الاصطناعي (Gemini 3.8 Flash)' }}
            </h3>
            <span class="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
              Confidence: {{ Math.round((family.ai_insights.confidence || 0) * 100) }}%
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span class="text-slate-500 font-medium">{{ $t('fonts.calligraphy_school') || 'مدرسة الخط العربي:' }}</span>
              <p class="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 capitalize">
                {{ family.ai_insights.predicted_arabic_style || 'عالمي / غير محدد' }}
              </p>
            </div>
            <div>
              <span class="text-slate-500 font-medium">{{ $t('fonts.intended_use') || 'أفضل الاستخدامات:' }}</span>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="use in (family.ai_insights.recommended_usage || [])"
                  :key="use"
                  class="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-semibold"
                >
                  {{ use }}
                </span>
              </div>
            </div>
            <div>
              <span class="text-slate-500 font-medium">{{ $t('fonts.style_tags') || 'الوسوم الدلالية:' }}</span>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="tag in (family.ai_insights.tags || [])"
                  :key="tag"
                  class="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-semibold"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const slug = route.params.slug as string

const family = ref<any>(null)
const loading = ref(true)
const playgroundText = ref('القاهرة عاصمة التاريخ والحضارة، ملتقى الفنون ومنارة الإبداع العربي عبر العصور.')
const playgroundFontSize = ref(38)
const playgroundLineHeight = ref(1.6)
const selectedWeight = ref(400)

function getWeightLabel(w: number): string {
  switch (w) {
    case 100: return 'Thin'
    case 200: return 'ExtraLight'
    case 300: return 'Light'
    case 400: return 'Regular'
    case 500: return 'Medium'
    case 600: return 'SemiBold'
    case 700: return 'Bold'
    case 800: return 'ExtraBold'
    case 900: return 'Black'
    default: return `Weight ${w}`
  }
}

async function fetchFamily() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; family: any }>(`/api/v1/fonts/${slug}`)
    if (res.success) {
      family.value = res.family
      if (family.value.weights && family.value.weights.length > 0) {
        selectedWeight.value = family.value.weights.includes(400) ? 400 : family.value.weights[0]
      }
      if (family.value.preview_text_sample) {
        playgroundText.value = family.value.preview_text_sample
      }
    }
  } catch (err) {
    console.error('Failed to load font details:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFamily()
})
</script>
