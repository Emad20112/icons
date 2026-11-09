<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Container from '../../components/layout/Container.vue'
import Button from '../../components/ui/Button.vue'
import Input from '../../components/ui/Input.vue'
import Modal from '../../components/ui/Modal.vue'
import Badge from '../../components/ui/Badge.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import AssetCard from '../../components/assets/AssetCard.vue'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { useRepositories } from '../../composables/useRepositories'
import {
  FolderGit2,
  Type,
  FileImage,
  Heart,
  BarChart3,
  Settings,
  Plus,
  Globe,
  Lock,
  User,
  ExternalLink,
  ShieldCheck,
  Check,
  UploadCloud
} from 'lucide-vue-next'

const router = useRouter()
const { user, isAuthenticated, updateProfile } = useAuth()
const { success, error } = useToast()
const { createRepository } = useRepositories()

const activeTab = ref<'repositories' | 'fonts' | 'icons' | 'favorites' | 'stats' | 'settings'>('repositories')
const isLoading = ref(true)
const dashboardData = ref<any>(null)

// Modal states
const isCreateRepoModalOpen = ref(false)
const isSubmittingRepo = ref(false)
const newRepo = ref({
  name: '',
  description: '',
  visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
})

// Settings state
const settingsForm = ref({
  display_name: '',
  username: '',
  bio: '',
  avatar_url: '',
  password: ''
})
const isSavingSettings = ref(false)

async function loadDashboard() {
  isLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/v1/dashboard')
    if (res.success) {
      dashboardData.value = res.data
      if (res.data.user) {
        settingsForm.value = {
          display_name: res.data.user.display_name || '',
          username: res.data.user.username || '',
          bio: res.data.user.bio || '',
          avatar_url: res.data.user.avatar_url || '',
          password: ''
        }
      }
    }
  } catch (err: any) {
    if (err.statusCode === 401) {
      router.push('/auth/login')
    }
  } finally {
    isLoading.value = false
  }
}

async function handleCreateRepo() {
  if (!newRepo.value.name.trim()) return
  isSubmittingRepo.value = true
  try {
    await createRepository(newRepo.value)
    success('تم إنشاء المستودع', `تم إنشاء مستودع "${newRepo.value.name}" بنجاح.`)
    isCreateRepoModalOpen.value = false
    newRepo.value = { name: '', description: '', visibility: 'PUBLIC' }
    await loadDashboard()
  } catch (err: any) {
    error('تعذر إنشاء المستودع', err.statusMessage || err.message)
  } finally {
    isSubmittingRepo.value = false
  }
}

async function handleSaveSettings() {
  isSavingSettings.value = true
  try {
    await updateProfile(settingsForm.value)
    success('تم حفظ الإعدادات', 'تم تحديث الملف الشخصي وإعدادات الحساب بنجاح.')
    await loadDashboard()
  } catch (err: any) {
    error('فشل حفظ الإعدادات', err.statusMessage || err.message)
  } finally {
    isSavingSettings.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
    <Container class="space-y-8">
      <!-- Loading State -->
      <LoadingState v-if="isLoading" message="جارٍ تجهيز لوحة التحكم..." />

      <div v-else-if="dashboardData" class="space-y-8">
        <!-- Top Profile Welcome Banner -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div class="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
              <img
                :src="dashboardData.user?.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + dashboardData.user?.username"
                :alt="dashboardData.user?.display_name"
                class="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-800 object-cover shadow-sm bg-slate-100"
              />
              <div class="space-y-1">
                <div class="flex items-center justify-center sm:justify-start gap-2">
                  <h1 class="text-2xl font-black text-slate-900 dark:text-white">
                    {{ dashboardData.user?.display_name || dashboardData.user?.username }}
                  </h1>
                  <Badge v-if="dashboardData.user?.role === 'ADMIN'" variant="primary" size="sm">مسؤول</Badge>
                </div>
                <div class="flex items-center justify-center sm:justify-start gap-2 text-xs">
                  <NuxtLink
                    v-if="dashboardData.user?.username"
                    :to="`/@${dashboardData.user.username}`"
                    class="font-mono text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>@{{ dashboardData.user.username }}</span>
                    <ExternalLink class="w-3 h-3" />
                  </NuxtLink>
                  <span class="text-slate-400">•</span>
                  <span class="text-slate-500">{{ dashboardData.user?.email }}</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                  {{ dashboardData.user?.bio || 'مرحباً بك في لوحة تحكم منصة الخطوط والأيقونات الخاصة بك.' }}
                </p>
              </div>
            </div>

            <!-- Fast Action: New Repo -->
            <div class="flex items-center gap-2">
              <Button variant="primary" size="sm" @click="isCreateRepoModalOpen = true" class="shadow-sm">
                <Plus class="w-4 h-4 me-1.5" />
                مستودع جديد
              </Button>
              <NuxtLink v-if="dashboardData.user?.username" :to="`/@${dashboardData.user.username}`">
                <Button variant="outline" size="sm">
                  عرض صفحتي العامة
                </Button>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Dashboard Navigation Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
            :class="activeTab === 'repositories' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'repositories'"
          >
            <FolderGit2 class="w-4 h-4" />
            <span>مستودعاتي ({{ dashboardData.stats.repositories_count }})</span>
          </button>

          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
            :class="activeTab === 'fonts' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'fonts'"
          >
            <Type class="w-4 h-4" />
            <span>خطوطـي ({{ dashboardData.stats.fonts_count }})</span>
          </button>

          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
            :class="activeTab === 'icons' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'icons'"
          >
            <FileImage class="w-4 h-4" />
            <span>أيقوناتي ({{ dashboardData.stats.assets_count }})</span>
          </button>

          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
            :class="activeTab === 'favorites' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'favorites'"
          >
            <Heart class="w-4 h-4" />
            <span>المفضلة ({{ dashboardData.stats.favorites_count }})</span>
          </button>

          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
            :class="activeTab === 'stats' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'stats'"
          >
            <BarChart3 class="w-4 h-4" />
            <span>إحصائيات الحساب</span>
          </button>

          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap"
            :class="activeTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'settings'"
          >
            <Settings class="w-4 h-4" />
            <span>إعدادات الحساب</span>
          </button>
        </div>

        <!-- TAB 1: Repositories -->
        <div v-if="activeTab === 'repositories'" class="space-y-6">
          <div v-if="dashboardData.repositories.length === 0" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <FolderGit2 class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لم تنشئ أي مستودعات حتى الآن</h3>
            <p class="text-xs text-slate-500 mt-1">أنشئ مستودعك الأول لتجميع الأيقونات والخطوط وتنظيمها.</p>
            <Button variant="primary" size="sm" class="mt-4" @click="isCreateRepoModalOpen = true">إنشاء أول مستودع</Button>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NuxtLink
              v-for="repo in dashboardData.repositories"
              :key="repo.id"
              :to="`/repositories/${repo.id}`"
              class="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-blue-500 hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span
                    class="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    :class="repo.visibility === 'PUBLIC' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
                  >
                    <Globe v-if="repo.visibility === 'PUBLIC'" class="w-3.5 h-3.5" />
                    <Lock v-else class="w-3.5 h-3.5" />
                    {{ repo.visibility === 'PUBLIC' ? 'عام' : 'خاص' }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ new Date(repo.created_at).toLocaleDateString('ar-EG') }}</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                  {{ repo.name }}
                </h3>
                <p class="text-xs text-slate-500 line-clamp-2">
                  {{ repo.description || 'لا يوجد وصف لهذا المستودع.' }}
                </p>
              </div>

              <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>استعراض وإدارة المحتوى</span>
                <ExternalLink class="w-4 h-4 group-hover:text-blue-600 transition" />
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- TAB 2: Fonts -->
        <div v-if="activeTab === 'fonts'" class="space-y-6">
          <div v-if="dashboardData.fonts.length === 0" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Type class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد خطوط مسجلة في مستودعاتك</h3>
            <p class="text-xs text-slate-500 mt-1">تصفح مكتبة الخطوط وأضفها إلى مستودعاتك للمعاينة والتنزيل.</p>
            <NuxtLink to="/fonts" class="mt-4 inline-block">
              <Button variant="primary" size="sm">تصفح مكتبة الخطوط</Button>
            </NuxtLink>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="font in dashboardData.fonts"
              :key="font.id"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-base font-bold text-slate-900 dark:text-white">{{ font.display_name || font.name }}</h4>
                  <span class="text-xs text-slate-400 capitalize">{{ font.primary_category }}</span>
                </div>
                <NuxtLink :to="`/fonts/${font.slug}`">
                  <Button size="sm" variant="outline">معاينة متقدمة</Button>
                </NuxtLink>
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

        <!-- TAB 3: Icons -->
        <div v-if="activeTab === 'icons'" class="space-y-6">
          <div v-if="dashboardData.assets.length === 0" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <FileImage class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">لم ترفع أي أيقونات حتى الآن</h3>
            <p class="text-xs text-slate-500 mt-1">استخدم أدوات المنصة لإنشاء الأيقونات أو تصفح الكتالوج.</p>
            <NuxtLink to="/tools/icon-editor" class="mt-4 inline-block">
              <Button variant="primary" size="sm">فتح محرر الأيقونات</Button>
            </NuxtLink>
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AssetCard v-for="asset in dashboardData.assets" :key="asset.id" :asset="asset" />
          </div>
        </div>

        <!-- TAB 4: Favorites -->
        <div v-if="activeTab === 'favorites'" class="space-y-6">
          <div v-if="dashboardData.favorites.length === 0" class="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Heart class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">قائمة المفضلة فارغة حالياً</h3>
            <p class="text-xs text-slate-500 mt-1">اضغط على زر الإعجاب على الأيقونات والخطوط لحفظها هنا.</p>
            <NuxtLink to="/" class="mt-4 inline-block">
              <Button variant="primary" size="sm">استكشاف الكتالوج</Button>
            </NuxtLink>
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AssetCard v-for="asset in dashboardData.favorites" :key="asset.id" :asset="asset" />
          </div>
        </div>

        <!-- TAB 5: Stats -->
        <div v-if="activeTab === 'stats'" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500">إجمالي المستودعات</span>
                <FolderGit2 class="w-5 h-5 text-blue-600" />
              </div>
              <div class="text-3xl font-black text-slate-900 dark:text-white">{{ dashboardData.stats.repositories_count }}</div>
              <div class="text-[11px] text-slate-400 mt-1">مستودعات عامة وخاصة</div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500">الخطوط المحفوظة</span>
                <Type class="w-5 h-5 text-purple-600" />
              </div>
              <div class="text-3xl font-black text-slate-900 dark:text-white">{{ dashboardData.stats.fonts_count }}</div>
              <div class="text-[11px] text-slate-400 mt-1">عائلات خطوط عربية وعالمية</div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500">الأيقونات المرفوعة</span>
                <FileImage class="w-5 h-5 text-emerald-600" />
              </div>
              <div class="text-3xl font-black text-slate-900 dark:text-white">{{ dashboardData.stats.assets_count }}</div>
              <div class="text-[11px] text-slate-400 mt-1">أيقونات متجهة ورسومية</div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-500">التنزيلات المكتسبة</span>
                <BarChart3 class="w-5 h-5 text-amber-600" />
              </div>
              <div class="text-3xl font-black text-slate-900 dark:text-white">{{ dashboardData.stats.downloads_received }}</div>
              <div class="text-[11px] text-slate-400 mt-1">مرات تحميل لأصولك المنشورة</div>
            </div>
          </div>
        </div>

        <!-- TAB 6: Settings -->
        <div v-if="activeTab === 'settings'" class="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <form @submit.prevent="handleSaveSettings" class="space-y-5">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              إعدادات الحساب والملف الشخصي
            </h3>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الاسم الظاهر</label>
              <Input v-model="settingsForm.display_name" required />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم المستخدم الفريد (Username)</label>
              <div class="relative">
                <span class="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 text-xs font-mono">@</span>
                <input
                  v-model="settingsForm.username"
                  type="text"
                  required
                  class="w-full ps-7 pe-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <p class="text-[10px] text-slate-400 mt-1">رابطك العام: /@{{ settingsForm.username }}</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رابط الصورة الشخصية (Avatar URL)</label>
              <Input v-model="settingsForm.avatar_url" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">النبذة الشخصية (Bio)</label>
              <textarea
                v-model="settingsForm.bio"
                rows="3"
                class="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تحديث كلمة المرور</label>
              <Input v-model="settingsForm.password" type="password" placeholder="اتركه فارغاً دون تغيير" />
            </div>

            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button type="submit" variant="primary" :loading="isSavingSettings">حفظ التغييرات</Button>
            </div>
          </form>
        </div>
      </div>
    </Container>

    <!-- Create Repo Modal -->
    <Modal
      :is-open="isCreateRepoModalOpen"
      title="إنشاء مستودع جديد"
      @close="isCreateRepoModalOpen = false"
    >
      <form @submit.prevent="handleCreateRepo" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم المستودع</label>
          <Input v-model="newRepo.name" placeholder="مثال: أيقونات الهواتف الذكية" required />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
          <textarea
            v-model="newRepo.description"
            rows="3"
            placeholder="مستودع يجمع الأيقونات الحديثة..."
            class="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الخصوصية</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold"
              :class="newRepo.visibility === 'PUBLIC' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input type="radio" value="PUBLIC" v-model="newRepo.visibility" class="sr-only" />
              <Globe class="w-4 h-4 text-emerald-600" />
              <span>عام (Public)</span>
            </label>
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-semibold"
              :class="newRepo.visibility === 'PRIVATE' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 text-slate-600'"
            >
              <input type="radio" value="PRIVATE" v-model="newRepo.visibility" class="sr-only" />
              <Lock class="w-4 h-4 text-amber-600" />
              <span>خاص (Private)</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" @click="isCreateRepoModalOpen = false">إلغاء</Button>
          <Button type="submit" variant="primary" :loading="isSubmittingRepo">إنشاء المستودع</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
