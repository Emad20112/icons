<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Container from '../../components/layout/Container.vue'
import Card from '../../components/ui/Card.vue'
import Button from '../../components/ui/Button.vue'
import Input from '../../components/ui/Input.vue'
import Badge from '../../components/ui/Badge.vue'
import Modal from '../../components/ui/Modal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import { useRepositories } from '../../composables/useRepositories'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import {
  FolderGit2,
  Plus,
  Search,
  Globe,
  Lock,
  Type,
  FileImage,
  ExternalLink,
  User
} from 'lucide-vue-next'

const { repositories, isLoading, fetchRepositories, createRepository } = useRepositories()
const { isAuthenticated, user } = useAuth()
const { success, error } = useToast()

const searchQuery = ref('')
const isCreateModalOpen = ref(false)
const isSubmitting = ref(false)

const newRepo = ref<{
  name: string
  slug: string
  description: string
  visibility: 'PUBLIC' | 'PRIVATE'
}>({
  name: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC'
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
    newRepo.value = { name: '', slug: '', description: '', visibility: 'PUBLIC' }
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
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3">
            <FolderGit2 class="w-3.5 h-3.5" />
            <span>نظام المستودعات المتكامل</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            مستودعات الخطوط والأيقونات
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            استكشف حزم ومستودعات الخطوط والأيقونات العامة التي أنشأها المبدعون، أو أنشئ مستودعك المخصص لتنظيم أصولك ومشاركتها.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button
            v-if="isAuthenticated"
            variant="primary"
            @click="isCreateModalOpen = true"
            class="flex items-center gap-2 shadow-sm"
          >
            <Plus class="w-4 h-4" />
            مستودع جديد
          </Button>
          <NuxtLink v-else to="/auth/login">
            <Button variant="primary">تسجيل الدخول لإنشاء مستودع</Button>
          </NuxtLink>
        </div>
      </div>

      <!-- Search & Filters Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form @submit.prevent="handleSearch" class="relative w-full sm:w-96">
          <Search class="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ابحث في المستودعات بالاسم أو الوصف..."
            class="w-full ps-9 pe-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
        <template #actions>
          <Button v-if="isAuthenticated" variant="primary" @click="isCreateModalOpen = true">
            إنشاء أول مستودع
          </Button>
        </template>
      </EmptyState>

      <!-- Repositories Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="repo in repositories"
          :key="repo.id"
          :to="`/repositories/${repo.id}`"
          class="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-5"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span
                class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                :class="repo.visibility === 'PUBLIC' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
              >
                <Globe v-if="repo.visibility === 'PUBLIC'" class="w-3.5 h-3.5" />
                <Lock v-else class="w-3.5 h-3.5" />
                {{ repo.visibility === 'PUBLIC' ? 'مستودع عام' : 'مستودع خاص' }}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">{{ new Date(repo.created_at).toLocaleDateString('ar-EG') }}</span>
            </div>

            <h3 class="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
              {{ repo.name }}
            </h3>

            <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {{ repo.description || 'مستودع أصول رقمية مخصص لتنظيم الأيقونات والخطوط.' }}
            </p>
          </div>

          <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <!-- Items count tags -->
            <div class="flex items-center gap-3 text-xs text-slate-500">
              <span class="flex items-center gap-1">
                <Type class="w-3.5 h-3.5 text-purple-600" />
                {{ repo.font_count || 0 }} خطوط
              </span>
              <span class="flex items-center gap-1">
                <FileImage class="w-3.5 h-3.5 text-blue-600" />
                {{ repo.asset_count || 0 }} أيقونات
              </span>
            </div>

            <!-- Owner Credit -->
            <div class="flex items-center justify-between pt-2">
              <div v-if="repo.owner" class="flex items-center gap-2">
                <img
                  :src="repo.owner.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + repo.owner.email"
                  class="w-6 h-6 rounded-full object-cover"
                />
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ repo.owner.display_name || repo.owner.username }}
                </span>
              </div>
              <ExternalLink class="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </Container>

    <!-- Create Repository Modal -->
    <Modal
      :is-open="isCreateModalOpen"
      title="إنشاء مستودع جديد"
      @close="isCreateModalOpen = false"
    >
      <form @submit.prevent="handleCreateRepository" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم المستودع</label>
          <Input v-model="newRepo.name" placeholder="مثال: حزمة الهوية البصرية الرسمية" required />
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
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">مستوى الخصوصية</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition text-xs font-semibold"
              :class="newRepo.visibility === 'PUBLIC' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input type="radio" value="PUBLIC" v-model="newRepo.visibility" class="sr-only" />
              <Globe class="w-4 h-4 text-emerald-600" />
              <div>
                <div>عام (Public)</div>
                <div class="text-[10px] font-normal text-slate-400">متاح لجميع الزوار</div>
              </div>
            </label>

            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition text-xs font-semibold"
              :class="newRepo.visibility === 'PRIVATE' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input type="radio" value="PRIVATE" v-model="newRepo.visibility" class="sr-only" />
              <Lock class="w-4 h-4 text-amber-600" />
              <div>
                <div>خاص (Private)</div>
                <div class="text-[10px] font-normal text-slate-400">لك فقط دون سواك</div>
              </div>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" @click="isCreateModalOpen = false">إلغاء</Button>
          <Button type="submit" variant="primary" :loading="isSubmitting">إنشاء المستودع</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
