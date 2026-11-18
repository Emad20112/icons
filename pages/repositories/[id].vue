<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import Input from '../../components/ui/Input.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import { useRepositories } from '../../composables/useRepositories'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import {
  Globe,
  Lock,
  Type,
  FileImage,
  Share2,
  Trash2,
  Edit,
  Plus,
  ArrowRight,
  User,
  Download,
  Copy,
  Check,
  EyeOff,
  Upload
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const repoId = route.params.id as string

const {
  currentRepository,
  isLoading,
  fetchRepository,
  updateRepository,
  deleteRepository,
  addItem,
  removeItem,
  uploadIcon,
  uploadFont
} = useRepositories()
const { user, isAdmin } = useAuth()
const { success, error } = useToast()

const activeTab = ref<'icons' | 'fonts'>('icons')
const isEditModalOpen = ref(false)
const isAddIconModalOpen = ref(false)
const isAddFontModalOpen = ref(false)
const isSubmitting = ref(false)
const copiedAssetId = ref<string | null>(null)
const fontPreviewSample = ref('أبجد هوز حطي كلمن — The quick brown fox 123')

const isOwner = computed(() => {
  if (!currentRepository.value || !user.value) return false
  return currentRepository.value.owner_id === user.value.id || isAdmin.value
})

const canDownload = computed(() => {
  if (!currentRepository.value) return false
  if (isOwner.value) return true
  return currentRepository.value.can_download !== false && currentRepository.value.allow_download !== false
})

const editForm = ref({
  name: '',
  description: '',
  visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
  allow_download: true
})

// Add Icon Modal state
const iconForm = ref({
  name: '',
  description: '',
  svgContent: '',
  file: null as File | null
})
const isUploadingIcon = ref(false)

// Add Font Modal state
const addFontMode = ref<'upload' | 'library'>('upload')
const fontForm = ref({
  name: '',
  description: '',
  previewText: '',
  files: [] as File[]
})
const isUploadingFont = ref(false)
const libraryFonts = ref<any[]>([])
const libraryFontSearch = ref('')
const isLoadingLibraryFonts = ref(false)

async function loadRepo() {
  try {
    const repo = await fetchRepository(repoId)
    if (repo) {
      editForm.value = {
        name: repo.name,
        description: repo.description || '',
        visibility: repo.visibility,
        allow_download: repo.allow_download !== false
      }
      await loadFontFaces(repo.fonts || [])
    }
  } catch (err: any) {
    error('تعذر فتح المستودع', err.statusMessage || err.message)
  }
}

async function loadFontFaces(fonts: any[]) {
  if (typeof window === 'undefined' || !('FontFace' in window)) return
  for (const font of fonts) {
    if (!font.files || font.files.length === 0) continue
    try {
      const fontUrl = `/api/v1/repositories/${repoId}/fonts/${font.id}/preview`
      const face = new FontFace(font.name, `url(${fontUrl})`)
      const loaded = await face.load()
      document.fonts.add(loaded)
    } catch {
      // Fallback to system font silently if font fails to decode
    }
  }
}

async function handleUpdate() {
  isSubmitting.value = true
  try {
    await updateRepository(repoId, editForm.value)
    success('تم تحديث المستودع', 'تم حفظ التعديلات بنجاح.')
    isEditModalOpen.value = false
    await loadRepo()
  } catch (err: any) {
    error('فشل التحديث', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete() {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المستودع نهائياً؟')) return
  try {
    await deleteRepository(repoId)
    success('تم حذف المستودع', 'تم حذف المستودع بنجاح.')
    router.push('/repositories')
  } catch (err: any) {
    error('فشل الحذف', err.statusMessage || err.message)
  }
}

async function handleRemoveItem(itemType: 'ASSET' | 'FONT', itemId: string) {
  try {
    await removeItem(repoId, itemType, itemId)
    success('تمت إزالة العنصر', 'تمت إزالة العنصر من المستودع بنجاح.')
    await loadRepo()
  } catch (err: any) {
    error('فشل إزالة العنصر', err.statusMessage || err.message)
  }
}

function onIconFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  iconForm.value.file = file
  if (!iconForm.value.name) {
    iconForm.value.name = file.name.replace(/\.svg$/i, '')
  }
  const reader = new FileReader()
  reader.onload = () => {
    iconForm.value.svgContent = String(reader.result || '')
  }
  reader.readAsText(file)
}

async function handleUploadIcon() {
  if (!iconForm.value.svgContent.trim() && !iconForm.value.file) return
  isUploadingIcon.value = true
  try {
    if (iconForm.value.file) {
      const fd = new FormData()
      fd.append('name', iconForm.value.name)
      fd.append('description', iconForm.value.description)
      fd.append('file', iconForm.value.file)
      await uploadIcon(repoId, fd)
    } else {
      await uploadIcon(repoId, {
        name: iconForm.value.name || 'Custom Icon',
        description: iconForm.value.description,
        svgContent: iconForm.value.svgContent
      })
    }
    success('تمت إضافة الأيقونة', 'تم رفع الأيقونة وحفظها في المستودع بنجاح.')
    isAddIconModalOpen.value = false
    iconForm.value = { name: '', description: '', svgContent: '', file: null }
    await loadRepo()
    activeTab.value = 'icons'
  } catch (err: any) {
    error('فشل رفع الأيقونة', err?.data?.statusMessage || err?.message)
  } finally {
    isUploadingIcon.value = false
  }
}

function onFontFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  fontForm.value.files = files
  if (!fontForm.value.name && files[0]) {
    fontForm.value.name = files[0].name.replace(/\.[^.]+$/, '').replace(/[-_].*$/, '')
  }
}

async function handleUploadFont() {
  if (fontForm.value.files.length === 0) return
  isUploadingFont.value = true
  try {
    const fd = new FormData()
    if (fontForm.value.name.trim()) fd.append('name', fontForm.value.name.trim())
    if (fontForm.value.description.trim()) fd.append('description', fontForm.value.description.trim())
    if (fontForm.value.previewText.trim()) fd.append('preview_text', fontForm.value.previewText.trim())
    for (const file of fontForm.value.files) {
      fd.append('files', file)
    }
    await uploadFont(repoId, fd)
    success('تمت إضافة الخط', 'تم رفع الخط وإضافته إلى المستودع بنجاح.')
    isAddFontModalOpen.value = false
    fontForm.value = { name: '', description: '', previewText: '', files: [] }
    await loadRepo()
    activeTab.value = 'fonts'
  } catch (err: any) {
    error('فشل رفع الخط', err?.data?.statusMessage || err?.message)
  } finally {
    isUploadingFont.value = false
  }
}

async function loadLibraryFonts() {
  isLoadingLibraryFonts.value = true
  try {
    const params = new URLSearchParams()
    if (libraryFontSearch.value.trim()) params.set('q', libraryFontSearch.value.trim())
    const res = await $fetch<{ success: boolean; families: any[] }>(`/api/v1/fonts?${params.toString()}`)
    if (res.success) {
      libraryFonts.value = res.families || []
    }
  } finally {
    isLoadingLibraryFonts.value = false
  }
}

async function attachLibraryFont(fontId: string) {
  try {
    await addItem(repoId, 'FONT', fontId)
    success('تمت إضافة الخط', 'تمت إضافة الخط من المكتبة إلى المستودع.')
    await loadRepo()
  } catch (err: any) {
    error('تعذر الإضافة', err?.data?.statusMessage || err?.message)
  }
}

watch(isAddFontModalOpen, (open) => {
  if (open && libraryFonts.value.length === 0) {
    loadLibraryFonts()
  }
})

async function copyAssetSvg(asset: any) {
  if (!canDownload.value) return
  const raw = asset.files?.[0]?.metadata?.rawContent
  if (!raw) return
  await navigator.clipboard.writeText(raw)
  copiedAssetId.value = asset.id
  setTimeout(() => {
    if (copiedAssetId.value === asset.id) copiedAssetId.value = null
  }, 1500)
}

function getAssetSvgPreview(asset: any): string {
  return asset.files?.[0]?.metadata?.rawContent || ''
}

function shareRepository() {
  if (typeof window !== 'undefined') {
    navigator.clipboard.writeText(window.location.href)
    success('تم نسخ الرابط', 'تم نسخ رابط المستودع للحافظة.')
  }
}

onMounted(() => {
  loadRepo()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
    <Container class="space-y-8">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <NuxtLink to="/repositories" class="hover:underline flex items-center gap-1">
          <ArrowRight class="w-3.5 h-3.5" />
          <span>المستودعات</span>
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-800 dark:text-slate-200 font-semibold">{{ currentRepository?.name || 'تفاصيل المستودع' }}</span>
      </div>

      <LoadingState v-if="isLoading && !currentRepository" message="جارٍ تحميل المستودع..." />

      <EmptyState
        v-else-if="!currentRepository"
        title="المستودع غير متاح"
        description="قد يكون المستودع محذوفاً أو خاصاً ولا تملك صلاحية الوصول إليه."
      >
        <template #action>
          <NuxtLink to="/repositories">
            <Button variant="primary">استعراض المستودعات العامة</Button>
          </NuxtLink>
        </template>
      </EmptyState>

      <div v-else class="space-y-8">
        <!-- Hero Details Header -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div class="space-y-3 flex-1">
              <div class="flex flex-wrap items-center gap-4 text-xs">
                <span
                  class="inline-flex items-center gap-1.5 font-semibold"
                  :class="currentRepository.visibility === 'PUBLIC' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
                >
                  <Globe v-if="currentRepository.visibility === 'PUBLIC'" class="w-3.5 h-3.5" />
                  <Lock v-else class="w-3.5 h-3.5" />
                  <span>{{ currentRepository.visibility === 'PUBLIC' ? 'مستودع عام' : 'مستودع خاص' }}</span>
                </span>

                <span
                  class="inline-flex items-center gap-1.5 font-medium"
                  :class="currentRepository.allow_download !== false ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  <Download v-if="currentRepository.allow_download !== false" class="w-3.5 h-3.5" />
                  <EyeOff v-else class="w-3.5 h-3.5" />
                  <span>
                    {{ currentRepository.allow_download !== false ? 'التحميل والاستخدام متاح' : 'معاينة فقط (التحميل معطل)' }}
                  </span>
                </span>

                <span class="text-slate-400 font-mono">{{ currentRepository.slug }}</span>
              </div>

              <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {{ currentRepository.name }}
              </h1>

              <p class="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {{ currentRepository.description || 'لا يوجد وصف متاح لهذا المستودع.' }}
              </p>

              <div class="flex items-center gap-4 pt-1 text-xs text-slate-500">
                <div v-if="currentRepository.owner" class="flex items-center gap-1.5">
                  <User class="w-3.5 h-3.5" />
                  <span>المالك:</span>
                  <NuxtLink
                    v-if="currentRepository.owner.username"
                    :to="`/@${currentRepository.owner.username}`"
                    class="font-semibold text-blue-600 hover:underline"
                  >
                    @{{ currentRepository.owner.username }}
                  </NuxtLink>
                  <span v-else class="font-semibold text-slate-700 dark:text-slate-300">
                    {{ currentRepository.owner.display_name }}
                  </span>
                </div>
                <span>•</span>
                <span>{{ new Date(currentRepository.created_at).toLocaleDateString('ar-EG') }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" @click="shareRepository">
                <Share2 class="w-4 h-4 me-1.5" />
                مشاركة
              </Button>

              <template v-if="isOwner">
                <Button variant="primary" size="sm" @click="isAddIconModalOpen = true">
                  <Plus class="w-4 h-4 me-1" />
                  إضافة أيقونة
                </Button>
                <Button variant="outline" size="sm" @click="isAddFontModalOpen = true">
                  <Plus class="w-4 h-4 me-1" />
                  إضافة خط
                </Button>
                <Button variant="outline" size="sm" @click="isEditModalOpen = true">
                  <Edit class="w-4 h-4 me-1.5" />
                  إعدادات
                </Button>
                <Button variant="destructive" size="sm" @click="handleDelete">
                  <Trash2 class="w-4 h-4 me-1.5" />
                  حذف
                </Button>
              </template>
            </div>
          </div>
        </div>

        <!-- Download Restriction Notice for Visitors -->
        <div
          v-if="!canDownload"
          class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <EyeOff class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>قام صاحب المستودع بتعطيل التحميل والاستخدام المباشر للزوار. يمكنك استعراض الأيقونات والخطوط ومعاينتها فقط.</span>
        </div>

        <!-- Contents Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2"
            :class="activeTab === 'icons' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'icons'"
          >
            <FileImage class="w-4 h-4" />
            <span>الأيقونات ({{ currentRepository.assets?.length || 0 }})</span>
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2"
            :class="activeTab === 'fonts' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'fonts'"
          >
            <Type class="w-4 h-4" />
            <span>الخطوط ({{ currentRepository.fonts?.length || 0 }})</span>
          </button>
        </div>

        <!-- Icons View -->
        <div v-if="activeTab === 'icons'">
          <div
            v-if="!currentRepository.assets || currentRepository.assets.length === 0"
            class="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <FileImage class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد أيقونات مضافة إلى هذا المستودع</h3>
            <p class="text-xs text-slate-500">يمكنك رفع ملفات SVG خاصة بك أو حفظ أيقونات من المكتبة الرئيسية.</p>
            <div class="flex items-center justify-center gap-2 pt-2">
              <Button v-if="isOwner" size="sm" variant="primary" @click="isAddIconModalOpen = true">
                إضافة أيقونة الآن
              </Button>
              <NuxtLink to="/">
                <Button size="sm" variant="outline">تصفح مكتبة الأيقونات</Button>
              </NuxtLink>
            </div>
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div
              v-for="asset in currentRepository.assets"
              :key="asset.id"
              class="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                v-if="isOwner"
                type="button"
                title="إزالة من المستودع"
                class="absolute top-2 end-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow-xs z-10"
                @click="handleRemoveItem('ASSET', asset.id)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>

              <!-- SVG Preview -->
              <div class="flex h-28 w-full items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4">
                <div
                  v-if="getAssetSvgPreview(asset)"
                  v-html="getAssetSvgPreview(asset)"
                  class="h-12 w-12 text-slate-800 dark:text-slate-100 [&>svg]:w-full [&>svg]:h-full"
                />
                <FileImage v-else class="h-10 w-10 text-slate-400" />
              </div>

              <div class="mt-3 space-y-2">
                <div class="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {{ asset.name }}
                </div>

                <!-- Download / Copy Actions (controlled by owner's allow_download) -->
                <div v-if="canDownload" class="flex items-center gap-1.5">
                  <a
                    :href="`/api/v1/repositories/${currentRepository.id}/assets/${asset.id}/download`"
                    class="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
                  >
                    <Download class="w-3 h-3" />
                    <span>SVG</span>
                  </a>
                  <button
                    v-if="getAssetSvgPreview(asset)"
                    type="button"
                    title="نسخ SVG"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    @click="copyAssetSvg(asset)"
                  >
                    <Check v-if="copiedAssetId === asset.id" class="w-3.5 h-3.5 text-emerald-600" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div v-else class="text-[11px] text-slate-400 flex items-center gap-1">
                  <EyeOff class="w-3 h-3" />
                  <span>معاينة فقط</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fonts View -->
        <div v-else-if="activeTab === 'fonts'" class="space-y-4">
          <div
            v-if="currentRepository.fonts && currentRepository.fonts.length > 0"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3"
          >
            <span class="text-xs font-semibold text-slate-500 whitespace-nowrap">نص المعاينة:</span>
            <input
              v-model="fontPreviewSample"
              type="text"
              class="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div
            v-if="!currentRepository.fonts || currentRepository.fonts.length === 0"
            class="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <Type class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد خطوط مضافة إلى هذا المستودع</h3>
            <p class="text-xs text-slate-500">يمكنك رفع ملفات خطوط (.ttf, .otf, .woff, .woff2) أو إضافتها من مكتبة الخطوط.</p>
            <div class="flex items-center justify-center gap-2 pt-2">
              <Button v-if="isOwner" size="sm" variant="primary" @click="isAddFontModalOpen = true">
                إضافة خط الآن
              </Button>
              <NuxtLink to="/fonts">
                <Button size="sm" variant="outline">تصفح مكتبة الخطوط</Button>
              </NuxtLink>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              v-for="font in currentRepository.fonts"
              :key="font.id"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h4 class="text-base font-bold text-slate-900 dark:text-white truncate">
                    {{ font.display_name || font.name }}
                  </h4>
                  <span class="text-xs text-slate-400 capitalize">
                    {{ font.primary_category }} • {{ (font.files && font.files.length ? [...new Set(font.files.map(f => f.file_format))] : ['TTF']).join(', ') }}
                  </span>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <a
                    v-if="canDownload"
                    :href="`/api/v1/repositories/${currentRepository.id}/fonts/${font.id}/download`"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
                  >
                    <Download class="w-3.5 h-3.5" />
                    <span>تحميل</span>
                  </a>
                  <span v-else class="text-[11px] text-slate-400 flex items-center gap-1">
                    <EyeOff class="w-3.5 h-3.5" />
                    <span>معاينة فقط</span>
                  </span>

                  <button
                    v-if="isOwner"
                    type="button"
                    title="إزالة من المستودع"
                    class="p-2 text-slate-400 hover:text-red-600 transition"
                    @click="handleRemoveItem('FONT', font.id)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p
                class="text-2xl text-slate-800 dark:text-slate-100 py-4 border-t border-slate-100 dark:border-slate-800 break-words"
                :style="{ fontFamily: `'${font.name}', system-ui, sans-serif` }"
              >
                {{ fontPreviewSample || font.preview_text_sample || 'أبجد هوز حطي كلمن' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>

    <!-- Edit Repository Modal -->
    <Modal
      :open="isEditModalOpen"
      title="إعدادات المستودع"
      @close="isEditModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleUpdate">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم المستودع</label>
          <Input v-model="editForm.name" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
          <textarea
            v-model="editForm.description"
            rows="3"
            class="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الخصوصية</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold"
              :class="editForm.visibility === 'PUBLIC' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input v-model="editForm.visibility" type="radio" value="PUBLIC" class="sr-only" />
              <Globe class="w-4 h-4 text-emerald-600" />
              <span>عام (Public)</span>
            </label>
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold"
              :class="editForm.visibility === 'PRIVATE' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input v-model="editForm.visibility" type="radio" value="PRIVATE" class="sr-only" />
              <Lock class="w-4 h-4 text-amber-600" />
              <span>خاص (Private)</span>
            </label>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-950/50">
          <label class="flex items-start justify-between gap-3 cursor-pointer">
            <div class="space-y-0.5">
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                السماح للمستخدمين بالتحميل والاستخدام
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                تحكم في إمكانية تنزيل الأيقونات والخطوط من قبل زوار المستودع.
              </p>
            </div>
            <input
              v-model="editForm.allow_download"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" @click="isEditModalOpen = false">إلغاء</Button>
          <Button type="submit" variant="primary" :loading="isSubmitting">حفظ التغييرات</Button>
        </div>
      </form>
    </Modal>

    <!-- Add Custom SVG Icon Modal -->
    <Modal
      :open="isAddIconModalOpen"
      title="إضافة أيقونة إلى المستودع"
      @close="isAddIconModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleUploadIcon">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الأيقونة</label>
          <Input v-model="iconForm.name" placeholder="مثال: custom-logo" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رفع ملف SVG</label>
          <label class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-500 transition-colors">
            <Upload class="w-4 h-4 text-blue-600" />
            <span>{{ iconForm.file ? iconForm.file.name : 'اختر ملف .svg من جهازك' }}</span>
            <input type="file" accept=".svg,image/svg+xml" class="sr-only" @change="onIconFileSelected" />
          </label>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">أو الصق كود SVG مباشرة</label>
          <textarea
            v-model="iconForm.svgContent"
            rows="4"
            placeholder="<svg viewBox='0 0 24 24'>...</svg>"
            class="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <NuxtLink to="/" class="text-xs font-semibold text-blue-600 hover:underline">
            أو اختر من مكتبة الأيقونات
          </NuxtLink>
          <div class="flex items-center gap-2">
            <Button type="button" variant="outline" @click="isAddIconModalOpen = false">إلغاء</Button>
            <Button type="submit" variant="primary" :loading="isUploadingIcon">إضافة الأيقونة</Button>
          </div>
        </div>
      </form>
    </Modal>

    <!-- Add Font Modal -->
    <Modal
      :open="isAddFontModalOpen"
      title="إضافة خط إلى المستودع"
      @close="isAddFontModalOpen = false"
    >
      <div class="space-y-4">
        <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            :class="addFontMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="addFontMode = 'upload'"
          >
            رفع ملف خط
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            :class="addFontMode === 'library' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="addFontMode = 'library'"
          >
            اختيار من مكتبة الخطوط
          </button>
        </div>

        <form v-if="addFontMode === 'upload'" class="space-y-4" @submit.prevent="handleUploadFont">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم عائلة الخط</label>
            <Input v-model="fontForm.name" placeholder="يُستخرج تلقائياً إن تُرك فارغاً" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملفات الخط (TTF, OTF, WOFF, WOFF2)</label>
            <label class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-500 transition-colors">
              <Upload class="w-4 h-4 text-blue-600" />
              <span>
                {{ fontForm.files.length > 0 ? `${fontForm.files.length} ملف محدد` : 'اختر ملف أو أكثر (.ttf, .otf, .woff, .woff2)' }}
              </span>
              <input type="file" accept=".ttf,.otf,.woff,.woff2" multiple class="sr-only" @change="onFontFilesSelected" />
            </label>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نص معاينة مخصص (اختياري)</label>
            <Input v-model="fontForm.previewText" placeholder="مثال: أهلاً بكم في منصتنا" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" @click="isAddFontModalOpen = false">إلغاء</Button>
            <Button type="submit" variant="primary" :loading="isUploadingFont" :disabled="fontForm.files.length === 0">
              رفع وإضافة الخط
            </Button>
          </div>
        </form>

        <div v-else class="space-y-3">
          <div class="flex gap-2">
            <Input v-model="libraryFontSearch" placeholder="ابحث عن خط في المكتبة..." @keyup.enter="loadLibraryFonts" />
            <Button type="button" size="sm" variant="outline" @click="loadLibraryFonts">بحث</Button>
          </div>

          <div v-if="isLoadingLibraryFonts" class="py-8 text-center text-xs text-slate-400">جارٍ التحميل...</div>
          <div v-else class="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            <div
              v-for="f in libraryFonts"
              :key="f.id"
              class="flex items-center justify-between py-2.5 gap-2"
            >
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ f.display_name || f.name }}</div>
                <div class="text-[11px] text-slate-400">{{ f.primary_category }}</div>
              </div>
              <Button size="sm" variant="outline" @click="attachLibraryFont(f.id)">إضافة</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
