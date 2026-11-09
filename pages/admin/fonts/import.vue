<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-8">
      <!-- Breadcrumb & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <NuxtLink to="/admin" class="hover:underline">{{ $t('common.admin') || 'لوحة الإدارة' }}</NuxtLink>
            <span>/</span>
            <NuxtLink to="/fonts" class="hover:underline">{{ $t('fonts.title') || 'مكتبة الخطوط' }}</NuxtLink>
            <span>/</span>
            <span class="text-slate-800 dark:text-slate-200 font-medium">{{ $t('fonts.import_management') || 'إدارة الاستيراد' }}</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span class="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </span>
            {{ $t('fonts.bulk_font_import') || 'استيراد حزم الخطوط المجمعة (ZIP)' }}
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {{ $t('fonts.import_subtitle') || 'ارفع ملف أرشيف مضغوط يحتوي على خطوط TTF/OTF/WOFF ليقوم النظام بالتحقق الأمني، استخراج البيانات، وتصنيفها آلياً' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin/fonts/ai-review"
            class="px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ $t('fonts.ai_review') || 'مراجعة الذكاء الاصطناعي' }}
          </NuxtLink>
          <NuxtLink
            to="/fonts"
            class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition"
          >
            {{ $t('fonts.view_library') || 'المكتبة العامة' }}
          </NuxtLink>
        </div>
      </div>

      <!-- Upload Dropzone Card -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {{ $t('fonts.dropzone_title') || 'رفع ملف الأرشيف المضغوط (ZIP)' }}
        </h2>

        <!-- Interactive Drag & Drop Area -->
        <div
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="[
            'border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer',
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/20'
          ]"
          @click="triggerFileInput"
        >
          <input
            type="file"
            ref="fileInput"
            accept=".ttf,.otf,.woff,.woff2,.zip,font/ttf,font/otf,font/woff,font/woff2,application/x-font-ttf,application/x-font-opentype,application/font-woff,application/font-woff2,application/zip,application/x-zip-compressed"
            multiple
            class="hidden"
            @change="handleFileSelect"
          />

          <div class="space-y-4 max-w-md mx-auto">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <div>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                {{ selectedFileDescription || ($t('fonts.dropzone_instruction') || 'اسحب وأفلت ملفات الخطوط TTF/OTF/WOFF أو حزمة ZIP هنا أو اضغط للاختيار') }}
              </p>
              <p class="text-xs text-slate-500 mt-1">
                {{ totalFilesSizeText || ($t('fonts.dropzone_constraints') || 'الصيغ المدعومة: TTF, OTF, WOFF, WOFF2 مباشرة أو داخل ملف .zip (الحد الأقصى: 100 ميجابايت)') }}
              </p>
            </div>

            <!-- Upload Action Button -->
            <div v-if="selectedFiles.length > 0 && !uploading">
              <button
                @click.stop="startUpload"
                class="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md"
              >
                {{ $t('fonts.start_import_pipeline') || 'بدء المعالجة والاستيراد الآلي' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Live Progress Status Card -->
        <div v-if="activeBatch" class="space-y-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></span>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {{ activeBatch.status }}
              </span>
            </div>
            <span class="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {{ activeBatch.progress }}%
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-600 rounded-full transition-all duration-300"
              :style="{ width: `${activeBatch.progress}%` }"
            ></div>
          </div>

          <!-- Progress Stage Chips -->
          <div class="flex flex-wrap gap-2 text-xs">
            <span
              v-for="stage in ['uploaded', 'extracting', 'analyzing', 'classifying', 'completed']"
              :key="stage"
              class="px-2.5 py-1 rounded-lg font-medium capitalize"
              :class="[
                activeBatch.status === stage
                  ? 'bg-blue-600 text-white font-bold'
                  : isStagePassed(stage, activeBatch.status)
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              ]"
            >
              {{ stage }}
            </span>
          </div>

          <!-- Realtime Logs Terminal -->
          <div class="p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
            <p v-for="(log, idx) in (activeBatch.log_messages || [])" :key="idx" class="leading-relaxed">
              <span class="text-emerald-400">›</span> {{ log }}
            </p>
          </div>
        </div>
      </div>

      <!-- Import Batches History Table -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('fonts.recent_batches') || 'سجل دفعات الاستيراد السابقة' }}</h2>

        <div v-if="batches.length === 0" class="py-10 text-center text-slate-400 text-xs">
          {{ $t('fonts.no_batches_yet') || 'لم يتم تسجيل أي عمليات استيراد بعد.' }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-start text-xs">
            <thead class="border-b border-slate-200 dark:border-slate-800 text-slate-400">
              <tr>
                <th class="py-3 px-2 text-start">{{ $t('fonts.batch_name') || 'اسم الدفعة' }}</th>
                <th class="py-3 px-2 text-start">{{ $t('fonts.status') || 'الحالة' }}</th>
                <th class="py-3 px-2 text-start">{{ $t('fonts.files') || 'الملفات' }}</th>
                <th class="py-3 px-2 text-start">{{ $t('fonts.date') || 'التاريخ' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr v-for="b in batches" :key="b.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td class="py-3 px-2 font-bold text-slate-800 dark:text-slate-200">{{ b.name }}</td>
                <td class="py-3 px-2">
                  <span
                    class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase"
                    :class="[
                      b.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      b.status === 'failed' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    ]"
                  >
                    {{ b.status }}
                  </span>
                </td>
                <td class="py-3 px-2 font-mono text-slate-500">{{ b.processed_files }} / {{ b.total_files }}</td>
                <td class="py-3 px-2 text-slate-400">{{ formatDate(b.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const selectedFiles = ref<File[]>([])
const selectedFile = computed(() => selectedFiles.value[0] || null)
const uploading = ref(false)
const activeBatch = ref<any>(null)
const batches = ref<any[]>([])

const selectedFileDescription = computed(() => {
  if (selectedFiles.value.length === 0) return ''
  if (selectedFiles.value.length === 1) return selectedFiles.value[0].name
  const names = selectedFiles.value.map(f => f.name).slice(0, 3).join(', ')
  return `${selectedFiles.value.length} ملفات خطوط مختارة (${names}${selectedFiles.value.length > 3 ? '...' : ''})`
})

const totalFilesSizeText = computed(() => {
  if (selectedFiles.value.length === 0) return ''
  const total = selectedFiles.value.reduce((acc, f) => acc + f.size, 0)
  return `${(total / (1024 * 1024)).toFixed(2)} MB (${selectedFiles.value.length} ${selectedFiles.value.length === 1 ? 'ملف' : 'ملفات'})`
})

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFiles.value = Array.from(target.files)
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    selectedFiles.value = Array.from(e.dataTransfer.files)
  }
}

function isStagePassed(stage: string, current: string): boolean {
  const order = ['uploaded', 'extracting', 'analyzing', 'classifying', 'completed']
  const stageIdx = order.indexOf(stage)
  const currentIdx = order.indexOf(current)
  return stageIdx >= 0 && currentIdx > stageIdx
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-EG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function startUpload() {
  if (selectedFiles.value.length === 0) return
  uploading.value = true

  try {
    const formData = new FormData()
    for (const f of selectedFiles.value) {
      formData.append('files', f)
      formData.append('file', f)
    }

    const res = await $fetch<{ success: boolean; batchId: string }>('/api/v1/fonts/import/upload', {
      method: 'POST',
      body: formData,
    })

    if (res.success && res.batchId) {
      await pollBatch(res.batchId)
    }
  } catch (err) {
    console.error('Import upload error:', err)
  } finally {
    uploading.value = false
    await fetchBatches()
  }
}

async function pollBatch(batchId: string) {
  for (let i = 0; i < 20; i++) {
    const res = await $fetch<{ success: boolean; batch: any }>(`/api/v1/fonts/import/${batchId}`)
    if (res.success && res.batch) {
      activeBatch.value = res.batch
      if (res.batch.status === 'completed' || res.batch.status === 'failed') {
        break
      }
    }
    await new Promise(r => setTimeout(r, 1000))
  }
}

async function fetchBatches() {
  try {
    const res = await $fetch<{ success: boolean; batches: any[] }>('/api/v1/fonts/import/batches')
    if (res.success) {
      batches.value = res.batches
    }
  } catch (err) {
    console.error('Failed to load batches:', err)
  }
}

onMounted(() => {
  fetchBatches()
})
</script>
