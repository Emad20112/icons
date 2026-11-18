<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import Input from '../../components/ui/Input.vue'
import Modal from '../../components/ui/Modal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import { useRepositories } from '../../composables/useRepositories'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import {
  Plus,
  Search,
  Globe,
  Lock,
  Type,
  FileImage,
  ExternalLink,
  Download,
  EyeOff
} from 'lucide-vue-next'

const { repositories, isLoading, fetchRepositories, createRepository } = useRepositories()
const { isAuthenticated } = useAuth()
const { success, error } = useToast()

const searchQuery = ref('')
const isCreateModalOpen = ref(false)
const isSubmitting = ref(false)

const newRepo = ref<{
  name: string
  slug: string
  description: string
  visibility: 'PUBLIC' | 'PRIVATE'
  allow_download: boolean
}>({
  name: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC',
  allow_download: true
})

async function loadData() {
  await fetchRepositories({ search: searchQuery.value || undefined })
}

async function handleSearch() {
  await fetchRepositories({ search: searchQuery.value || undefined })
}

async function handleCreateRepository() {
  if (!newRepo.value.name.trim()) return
  isSubmitting.value = true
  try {
    await createRepository(newRepo.value)
    success('تم إنشاء المستودع', `تم إنشاء مستودع "${newRepo.value.name}" بنجاح.`)
    isCreateModalOpen.value = false
    newRepo.value = { name: '', slug: '', description: '', visibility: 'PUBLIC', allow_download: true }
    await loadData()
  } catch (err: any) {
    error('تعذر إنشاء المستودع', err.statusMessage || err.message)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
    <Container class="space-y-8">
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            مستودعات الأيقونات والخطوط
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            أنشئ مستودعاتك الخاصة أو العامة لإضافة الأيقونات والخطوط والتحكم الكامل بصلاحية التحميل والاستخدام للزوار.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button
            v-if="isAuthenticated"
            variant="primary"
            class="flex items-center gap-2 shadow-xs"
            @click="isCreateModalOpen = true"
          >
            <Plus class="w-4 h-4" />
            <span>مستودع جديد</span>
          </Button>
          <NuxtLink v-else to="/auth/login">
            <Button variant="primary">تسجيل الدخول لإنشاء مستودع</Button>
          </NuxtLink>
        </div>
      </div>

      <!-- Search & Count Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form class="relative w-full sm:w-96" @submit.prevent="handleSearch">
          <Search class="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ابحث في المستودعات بالاسم أو الوصف..."
            class="w-full ps-9 pe-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </form>

        <div class="text-xs text-slate-500">
          عرض <strong class="text-slate-900 dark:text-slate-100">{{ repositories.length }}</strong> مستودع متاح
        </div>
      </div>

      <!-- Loading State -->
      <LoadingState v-if="isLoading" message="جارٍ استرجاع المستودعات..." />

      <!-- Empty State -->
      <EmptyState
        v-else-if="repositories.length === 0"
        title="لا توجد مستودعات مطابقة"
        description="لم يتم العثور على أي مستودعات تطابق بحثك، أو لم يتم إنشاء مستودعات عامة بعد."
      >
        <template #action>
          <Button v-if="isAuthenticated" variant="primary" @click="isCreateModalOpen = true">
            إنشاء أول مستودع
          </Button>
        </template>
      </EmptyState>

      <!-- Repositories Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <NuxtLink
          v-for="repo in repositories"
          :key="repo.id"
          :to="`/repositories/${repo.id}`"
          class="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5"
        >
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-3">
                <span
                  class="inline-flex items-center gap-1 font-semibold"
                  :class="repo.visibility === 'PUBLIC' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
                >
                  <Globe v-if="repo.visibility === 'PUBLIC'" class="w-3.5 h-3.5" />
                  <Lock v-else class="w-3.5 h-3.5" />
                  <span>{{ repo.visibility === 'PUBLIC' ? 'عام' : 'خاص' }}</span>
                </span>

                <span
                  class="inline-flex items-center gap-1 text-[11px]"
                  :class="repo.allow_download !== false ? 'text-slate-500 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  <Download v-if="repo.allow_download !== false" class="w-3 h-3" />
                  <EyeOff v-else class="w-3 h-3" />
                  <span>{{ repo.allow_download !== false ? 'متاح للتحميل' : 'معاينة فقط' }}</span>
                </span>
              </div>

              <span class="text-[11px] text-slate-400 font-mono">
                {{ new Date(repo.created_at).toLocaleDateString('ar-EG') }}
              </span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              {{ repo.name }}
            </h3>

            <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {{ repo.description || 'مستودع أصول رقمية مخصص لتنظيم الأيقونات والخطوط.' }}
            </p>
          </div>

          <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-4 text-xs text-slate-500">
              <span class="flex items-center gap-1.5">
                <FileImage class="w-3.5 h-3.5 text-blue-600" />
                <span>{{ repo.asset_count || 0 }} أيقونات</span>
              </span>
              <span class="flex items-center gap-1.5">
                <Type class="w-3.5 h-3.5 text-purple-600" />
                <span>{{ repo.font_count || 0 }} خطوط</span>
              </span>
            </div>

            <div class="flex items-center justify-between pt-1">
              <div v-if="repo.owner" class="flex items-center gap-2">
                <img
                  :src="repo.owner.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + (repo.owner.username || repo.owner.id)"
                  class="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {{ repo.owner.display_name || repo.owner.username }}
                </span>
              </div>
              <ExternalLink class="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </Container>

    <!-- Create Repository Modal -->
    <Modal
      :open="isCreateModalOpen"
      title="إنشاء مستودع جديد"
      @close="isCreateModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreateRepository">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم المستودع</label>
          <Input v-model="newRepo.name" placeholder="مثال: حزمة الهوية البصرية" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الرابط الفريد (Slug)</label>
          <Input v-model="newRepo.slug" placeholder="اتركه فارغاً للتوليد التلقائي" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
          <textarea
            v-model="newRepo.description"
            rows="3"
            placeholder="اكتب نبذة عن الأيقونات والخطوط الموجودة في هذا المستودع..."
            class="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">مستوى الخصوصية</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs font-semibold"
              :class="newRepo.visibility === 'PUBLIC' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input v-model="newRepo.visibility" type="radio" value="PUBLIC" class="sr-only" />
              <Globe class="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div>عام (Public)</div>
                <div class="text-[10px] font-normal text-slate-400">يراه جميع المستخدمين</div>
              </div>
            </label>

            <label
              class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition text-xs font-semibold"
              :class="newRepo.visibility === 'PRIVATE' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input v-model="newRepo.visibility" type="radio" value="PRIVATE" class="sr-only" />
              <Lock class="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <div>خاص (Private)</div>
                <div class="text-[10px] font-normal text-slate-400">تراه أنت فقط</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Allow Download Control -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-950/50">
          <label class="flex items-start justify-between gap-3 cursor-pointer">
            <div class="space-y-0.5">
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                السماح للمستخدمين بتحميل واستخدام الأيقونات والخطوط
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                عند التعطيل، يمكن للزوار معاينة محتويات المستودع العام فقط دون التمكن من تنزيل الملفات أو نسخ الأكواد.
              </p>
            </div>
            <input
              v-model="newRepo.allow_download"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" @click="isCreateModalOpen = false">إلغاء</Button>
          <Button type="submit" variant="primary" :loading="isSubmitting">إنشاء المستودع</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
