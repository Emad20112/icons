<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Breadcrumb & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <NuxtLink to="/admin" class="hover:underline">{{ $t('common.admin') || 'لوحة الإدارة' }}</NuxtLink>
            <span>/</span>
            <NuxtLink to="/fonts" class="hover:underline">{{ $t('fonts.title') || 'مكتبة الخطوط' }}</NuxtLink>
            <span>/</span>
            <span class="text-slate-800 dark:text-slate-200 font-medium">{{ $t('fonts.ai_review') || 'مراجعة الذكاء الاصطناعي' }}</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span class="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            {{ $t('fonts.ai_classification_review') || 'مراجعة وتدقيق تصنيفات الذكاء الاصطناعي' }}
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {{ $t('fonts.ai_review_subtitle') || 'تحقق من التصنيفات والأنماط الخطية المستخرجة عبر نموذج Gemini 3.8 Flash واعتمادها للمكتبة العامة' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin/fonts/import"
            class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
          >
            {{ $t('fonts.bulk_import') || 'استيراد حزمة خطوط' }}
          </NuxtLink>
          <NuxtLink
            to="/fonts"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm"
          >
            {{ $t('fonts.public_library') || 'عرض المكتبة العامة' }}
          </NuxtLink>
        </div>
      </div>

      <!-- Stat Badges -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ $t('fonts.total_jobs') || 'إجمالي العمليات' }}</p>
          <p class="text-2xl font-black mt-2 text-slate-900 dark:text-white">{{ stats.total }}</p>
        </div>
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm">
          <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{{ $t('fonts.pending_review') || 'بانتظار المراجعة' }}</p>
          <p class="text-2xl font-black mt-2 text-amber-600 dark:text-amber-400">{{ stats.needsReview }}</p>
        </div>
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
          <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{{ $t('fonts.approved') || 'معتمد' }}</p>
          <p class="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{{ stats.approved }}</p>
        </div>
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 shadow-sm">
          <p class="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{{ $t('fonts.avg_confidence') || 'متوسط الدقة' }}</p>
          <p class="text-2xl font-black mt-2 text-purple-600 dark:text-purple-400">{{ stats.avgConfidence }}%</p>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          @click="activeStatus = tab.value"
          :class="[
            'px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap',
            activeStatus === tab.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          ]"
        >
          {{ tab.label }} ({{ getTabCount(tab.value) }})
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
        <p>{{ $t('common.loading') || 'جاري تحميل سجلات التدقيق...' }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredJobs.length === 0" class="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <svg class="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-slate-700 dark:text-slate-300 font-medium">{{ $t('fonts.no_jobs_found') || 'لا توجد مهام ذكاء اصطناعي في هذه الحالة حالياً' }}</p>
      </div>

      <!-- Jobs Grid -->
      <div v-else class="space-y-6">
        <div
          v-for="job in filteredJobs"
          :key="job.id"
          class="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm transition space-y-5"
          :class="[
            job.status === 'NEEDS_REVIEW' ? 'border-amber-300 dark:border-amber-800/60' : 'border-slate-200 dark:border-slate-800'
          ]"
        >
          <!-- Top Row: Font Info & Confidence -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">
                  {{ job.family?.display_name || job.family?.name || 'عائلة خط غير مسماة' }}
                </h3>
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  :class="getStatusBadgeClass(job.status)"
                >
                  {{ job.status }}
                </span>
                <span class="text-xs text-slate-400">ID: {{ job.id.slice(0, 12) }}</span>
              </div>
              <p class="text-xs text-slate-500 mt-1 font-mono">
                Model: {{ job.model_name }} • Created: {{ formatDate(job.created_at) }}
              </p>
            </div>

            <!-- Confidence Bar -->
            <div class="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span class="text-xs font-medium text-slate-500">{{ $t('fonts.ai_confidence') || 'نسبة ثقة النموذج' }}:</span>
              <div class="w-24 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="[
                    (job.confidence_score || 0) >= 0.9 ? 'bg-emerald-500' : (job.confidence_score || 0) >= 0.75 ? 'bg-amber-500' : 'bg-rose-500'
                  ]"
                  :style="{ width: `${Math.round((job.confidence_score || 0) * 100)}%` }"
                ></div>
              </div>
              <span class="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {{ Math.round((job.confidence_score || 0) * 100) }}%
              </span>
            </div>
          </div>

          <!-- Specimen Preview Banner -->
          <div class="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <p class="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">{{ $t('fonts.preview_specimen') || 'معاينة النص الحي' }}</p>
            <p class="text-xl sm:text-2xl text-slate-900 dark:text-slate-100 font-medium" dir="rtl">
              {{ job.family?.preview_text_sample || 'القاهرة عاصمة التاريخ والحضارة، ملتقى الفنون ومنارة الإبداع العربي عبر العصور' }}
            </p>
          </div>

          <!-- AI Predicted Metadata Matrix -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
            <div>
              <p class="text-xs text-slate-500">{{ $t('fonts.predicted_category') || 'التصنيف الأساسي' }}</p>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 capitalize">
                {{ job.predicted_category || '—' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-slate-500">{{ $t('fonts.arabic_calligraphy_style') || 'النمط الخط العربي' }}</p>
              <p class="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 capitalize">
                {{ job.predicted_arabic_style || 'غير محدد / لاتيني' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-slate-500">{{ $t('fonts.intended_use') || 'الاستخدام الموصى به' }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="use in (job.recommended_usage || [])"
                  :key="use"
                  class="px-2 py-0.5 rounded text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  {{ use }}
                </span>
              </div>
            </div>
            <div>
              <p class="text-xs text-slate-500">{{ $t('fonts.tags') || 'الوسوم المستخرجة' }}</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="tag in (job.style_tags || [])"
                  :key="tag"
                  class="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- AI Written Descriptions -->
          <div v-if="job.raw_ai_response?.descriptionAr || job.raw_ai_response?.descriptionEn" class="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p v-if="job.raw_ai_response?.descriptionAr" dir="rtl" class="font-medium">
              <span class="text-slate-400">الوصف العربي:</span> {{ job.raw_ai_response.descriptionAr }}
            </p>
            <p v-if="job.raw_ai_response?.descriptionEn" dir="ltr" class="font-sans">
              <span class="text-slate-400">EN:</span> {{ job.raw_ai_response.descriptionEn }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              v-if="job.status === 'NEEDS_REVIEW'"
              @click="submitReview(job.id, 'reject')"
              :disabled="actionLoading === job.id"
              class="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
            >
              {{ $t('fonts.reject_classification') || 'رفض التصنيف' }}
            </button>

            <button
              @click="openEditModal(job)"
              class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {{ $t('fonts.edit_and_approve') || 'تعديل وتخصيص' }}
            </button>

            <button
              v-if="job.status === 'NEEDS_REVIEW'"
              @click="submitReview(job.id, 'approve')"
              :disabled="actionLoading === job.id"
              class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ $t('fonts.approve_now') || 'اعتماد فوري' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal Dialog -->
    <div
      v-if="editingJob"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 class="text-xl font-bold">{{ $t('fonts.edit_classification') || 'تعديل واعتماد تصنيف الخط' }}</h2>
          <button @click="editingJob = null" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{{ $t('fonts.primary_category') || 'التصنيف الأساسي' }}</label>
            <select
              v-model="editForm.category"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium"
            >
              <option value="serif">Serif (مذيل)</option>
              <option value="sans_serif">Sans-Serif (غير مذيل)</option>
              <option value="display">Display (عرض وعناوين)</option>
              <option value="handwriting">Handwriting (يدوي)</option>
              <option value="monospace">Monospace (أحادي المسافة)</option>
              <option value="arabic_calligraphy">Arabic Calligraphy (خط عربي تقليدي)</option>
              <option value="arabic_modern">Arabic Modern (خط عربي رقمي حديث)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{{ $t('fonts.arabic_calligraphy_style') || 'أسلوب الخط العربي' }}</label>
            <select
              v-model="editForm.arabicStyle"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium"
            >
              <option :value="null">None / Latin (لا يوجد / لاتيني)</option>
              <option value="naskh">نسخ (Naskh)</option>
              <option value="kufi">كوفي (Kufi)</option>
              <option value="ruqah">رقعة (Ruqah)</option>
              <option value="thuluth">ثلث (Thuluth)</option>
              <option value="diwani">ديواني (Diwani)</option>
              <option value="nastaliq">تعليق / نستعليق (Nastaliq)</option>
              <option value="modern">حديث / رقمي (Modern)</option>
              <option value="maghrebi">مغربي (Maghrebi)</option>
              <option value="square_kufic">كوفي مربع (Square Kufic)</option>
              <option value="hybrid">هجين (Hybrid)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{{ $t('fonts.style_tags') || 'الوسوم (مفصولة بفاصلة)' }}</label>
            <input
              type="text"
              v-model="editForm.tagsString"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium"
              placeholder="geometric, modern, branding, clean"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{{ $t('fonts.publication_status') || 'حالة النشر' }}</label>
            <select
              v-model="editForm.publicationStatus"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium"
            >
              <option value="PUBLISHED">منشور في المكتبة العامة (PUBLISHED)</option>
              <option value="PENDING_REVIEW">بانتظار المراجعة (PENDING_REVIEW)</option>
              <option value="DRAFT">مسودة خاصة (DRAFT)</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            @click="editingJob = null"
            class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {{ $t('common.cancel') || 'إلغاء' }}
          </button>
          <button
            @click="submitModification"
            :disabled="actionLoading === editingJob.id"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition"
          >
            {{ $t('common.save_and_approve') || 'حفظ وتحديث الخط' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface AiJob {
  id: string
  family_id: string
  model_name: string
  status: 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED' | 'MODIFIED'
  predicted_category: string
  predicted_arabic_style?: string
  confidence_score: number
  style_tags: string[]
  recommended_usage: string[]
  raw_ai_response?: any
  created_at: string
  family?: any
}

const jobs = ref<AiJob[]>([])
const loading = ref(true)
const actionLoading = ref<string | null>(null)
const activeStatus = ref('ALL')
const editingJob = ref<AiJob | null>(null)

const editForm = ref({
  category: 'sans_serif',
  arabicStyle: null as string | null,
  tagsString: '',
  publicationStatus: 'PUBLISHED',
})

const filterTabs = [
  { value: 'ALL', label: 'الكل' },
  { value: 'NEEDS_REVIEW', label: 'يحتاج مراجعة' },
  { value: 'APPROVED', label: 'معتمد' },
  { value: 'MODIFIED', label: 'معدل' },
  { value: 'REJECTED', label: 'مرفوض' },
]

const stats = computed(() => {
  const total = jobs.value.length
  const needsReview = jobs.value.filter(j => j.status === 'NEEDS_REVIEW').length
  const approved = jobs.value.filter(j => j.status === 'APPROVED' || j.status === 'MODIFIED').length
  const confScores = jobs.value.map(j => j.confidence_score || 0)
  const avg = confScores.length ? Math.round((confScores.reduce((a, b) => a + b, 0) / confScores.length) * 100) : 0
  return { total, needsReview, approved, avgConfidence: avg }
})

const filteredJobs = computed(() => {
  if (activeStatus.value === 'ALL') return jobs.value
  return jobs.value.filter(j => j.status === activeStatus.value)
})

function getTabCount(status: string): number {
  if (status === 'ALL') return jobs.value.length
  return jobs.value.filter(j => j.status === status).length
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'NEEDS_REVIEW':
      return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
    case 'APPROVED':
      return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
    case 'MODIFIED':
      return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
    case 'REJECTED':
      return 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-EG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function fetchJobs() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; jobs: AiJob[] }>('/api/v1/fonts/ai/jobs')
    if (res.success) {
      jobs.value = res.jobs
    }
  } catch (err) {
    console.error('Failed to load font AI jobs:', err)
  } finally {
    loading.value = false
  }
}

async function submitReview(jobId: string, action: 'approve' | 'reject') {
  actionLoading.value = jobId
  try {
    const res = await $fetch<{ success: boolean }>(`/api/v1/fonts/ai/review/${jobId}`, {
      method: 'POST',
      body: { action },
    })
    if (res.success) {
      await fetchJobs()
    }
  } catch (err) {
    console.error(`Failed to ${action} job:`, err)
  } finally {
    actionLoading.value = null
  }
}

function openEditModal(job: AiJob) {
  editingJob.value = job
  editForm.value = {
    category: job.predicted_category || job.family?.primary_category || 'sans_serif',
    arabicStyle: job.predicted_arabic_style || job.family?.arabic_style || null,
    tagsString: (job.style_tags || job.family?.style_tags || []).join(', '),
    publicationStatus: job.family?.publication_status || 'PUBLISHED',
  }
}

async function submitModification() {
  if (!editingJob.value) return
  const jobId = editingJob.value.id
  actionLoading.value = jobId
  try {
    const tags = editForm.value.tagsString
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const res = await $fetch<{ success: boolean }>(`/api/v1/fonts/ai/review/${jobId}`, {
      method: 'POST',
      body: {
        action: 'modify',
        modifiedData: {
          category: editForm.value.category,
          arabicStyle: editForm.value.arabicStyle,
          tags,
          publicationStatus: editForm.value.publicationStatus,
        },
      },
    })
    if (res.success) {
      editingJob.value = null
      await fetchJobs()
    }
  } catch (err) {
    console.error('Failed to submit modification:', err)
  } finally {
    actionLoading.value = null
  }
}

onMounted(() => {
  fetchJobs()
})
</script>
