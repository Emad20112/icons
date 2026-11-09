<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import Input from '../../components/ui/Input.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import AssetCard from '../../components/assets/AssetCard.vue'
import { useRepositories } from '../../composables/useRepositories'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import {
  FolderGit2,
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
  ExternalLink
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const repoId = route.params.id as string

const { currentRepository, isLoading, fetchRepository, updateRepository, deleteRepository, removeItem } = useRepositories()
const { user, role, isAdmin } = useAuth()
const { success, error } = useToast()

const activeTab = ref<'fonts' | 'icons'>('fonts')
const isEditModalOpen = ref(false)
const isSubmitting = ref(false)

const isOwner = computed(() => {
  if (!currentRepository.value || !user.value) return false
  return currentRepository.value.owner_id === user.value.id || isAdmin.value
})

const editForm = ref({
  name: '',
  description: '',
  visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
})

async function loadRepo() {
  try {
    const repo = await fetchRepository(repoId)
    if (repo) {
      editForm.value = {
        name: repo.name,
        description: repo.description || '',
        visibility: repo.visibility
      }
    }
  } catch (err: any) {
    error('تعذر فتح المستودع', err.statusMessage || err.message)
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
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المستودع نهائياً؟ لن يتم حذف الملفات الأصلية.')) return
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
          المستودعات
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
        <template #actions>
          <NuxtLink to="/repositories">
            <Button variant="primary">استعراض المستودعات العامة</Button>
          </NuxtLink>
        </template>
      </EmptyState>

      <div v-else class="space-y-8">
        <!-- Hero Details Header -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div class="space-y-3 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                  :class="currentRepository.visibility === 'PUBLIC' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'"
                >
                  <Globe v-if="currentRepository.visibility === 'PUBLIC'" class="w-3.5 h-3.5" />
                  <Lock v-else class="w-3.5 h-3.5" />
                  {{ currentRepository.visibility === 'PUBLIC' ? 'مستودع عام (Public)' : 'مستودع خاص (Private)' }}
                </span>
                <span class="text-xs text-slate-400 font-mono">{{ currentRepository.slug }}</span>
              </div>

              <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {{ currentRepository.name }}
              </h1>

              <p class="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                {{ currentRepository.description || 'لا يوجد وصف متاح لهذا المستودع.' }}
              </p>

              <div class="flex items-center gap-4 pt-2 text-xs text-slate-500">
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
                  <span v-else class="font-semibold text-slate-700 dark:text-slate-300">{{ currentRepository.owner.display_name }}</span>
                </div>
                <span>•</span>
                <span>{{ new Date(currentRepository.created_at).toLocaleDateString('ar-EG') }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" @click="shareRepository">
                <Share2 class="w-4 h-4 me-1.5" />
                مشاركة الرابط
              </Button>

              <template v-if="isOwner">
                <Button variant="outline" size="sm" @click="isEditModalOpen = true">
                  <Edit class="w-4 h-4 me-1.5" />
                  تعديل
                </Button>
                <Button variant="destructive" size="sm" @click="handleDelete">
                  <Trash2 class="w-4 h-4 me-1.5" />
                  حذف
                </Button>
              </template>
            </div>
          </div>
        </div>

        <!-- Contents Tabs -->
        <div class="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            :class="activeTab === 'fonts' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'fonts'"
          >
            <Type class="w-4 h-4" />
            الخطوط ({{ currentRepository.fonts?.length || 0 }})
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            :class="activeTab === 'icons' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'icons'"
          >
            <FileImage class="w-4 h-4" />
            الأيقونات ({{ currentRepository.assets?.length || 0 }})
          </button>
        </div>

        <!-- Fonts View -->
        <div v-if="activeTab === 'fonts'">
          <div v-if="!currentRepository.fonts || currentRepository.fonts.length === 0" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Type class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد خطوط مضافة إلى هذا المستودع</h3>
            <p class="text-xs text-slate-500 mt-1">تصفح مكتبة الخطوط وأضف الخطوط المفضلة إلى مستودعك.</p>
            <NuxtLink to="/fonts" class="mt-4 inline-block">
              <Button size="sm" variant="primary">استعراض مكتبة الخطوط</Button>
            </NuxtLink>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="font in currentRepository.fonts"
              :key="font.id"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-base font-bold text-slate-900 dark:text-white">{{ font.display_name || font.name }}</h4>
                  <span class="text-xs text-slate-400 capitalize">{{ font.primary_category }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <NuxtLink :to="`/fonts/${font.slug}`">
                    <Button size="sm" variant="outline">معاينة</Button>
                  </NuxtLink>
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
                class="text-2xl text-slate-800 dark:text-slate-200 py-3 border-t border-slate-100 dark:border-slate-800"
                :style="{ fontFamily: `'${font.name}', system-ui, sans-serif` }"
              >
                {{ font.preview_text_sample || 'القاهرة ملتقى الحضارات والفنون' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Icons View -->
        <div v-else-if="activeTab === 'icons'">
          <div v-if="!currentRepository.assets || currentRepository.assets.length === 0" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <FileImage class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد أيقونات مضافة إلى هذا المستودع</h3>
            <p class="text-xs text-slate-500 mt-1">تصفح كتالوج الأيقونات واختر الأيقونات التي تريد تنظيمها هنا.</p>
            <NuxtLink to="/" class="mt-4 inline-block">
              <Button size="sm" variant="primary">استعراض كتالوج الأيقونات</Button>
            </NuxtLink>
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div v-for="asset in currentRepository.assets" :key="asset.id" class="relative group">
              <AssetCard :asset="asset" />
              <button
                v-if="isOwner"
                type="button"
                title="إزالة من المستودع"
                class="absolute top-2 end-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow-sm z-10"
                @click="handleRemoveItem('ASSET', asset.id)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Container>

    <!-- Edit Repository Modal -->
    <Modal
      :open="isEditModalOpen"
      title="تعديل بيانات المستودع"
      @close="isEditModalOpen = false"
    >
      <form @submit.prevent="handleUpdate" class="space-y-4">
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
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الخصوصية</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold"
              :class="editForm.visibility === 'PUBLIC' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input type="radio" value="PUBLIC" v-model="editForm.visibility" class="sr-only" />
              <Globe class="w-4 h-4 text-emerald-600" />
              <span>عام (Public)</span>
            </label>
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold"
              :class="editForm.visibility === 'PRIVATE' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input type="radio" value="PRIVATE" v-model="editForm.visibility" class="sr-only" />
              <Lock class="w-4 h-4 text-amber-600" />
              <span>خاص (Private)</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" @click="isEditModalOpen = false">إلغاء</Button>
          <Button type="submit" variant="primary" :loading="isSubmitting">حفظ التغييرات</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
