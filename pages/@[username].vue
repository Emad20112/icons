<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Container from '../components/layout/Container.vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingState from '../components/common/LoadingState.vue'
import AssetCard from '../components/assets/AssetCard.vue'
import {
  User,
  FolderGit2,
  Type,
  FileImage,
  Share2,
  Calendar,
  Lock,
  Globe,
  ExternalLink
} from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const route = useRoute()
const { success } = useToast()

const rawParam = route.params.username as string
const username = rawParam.startsWith('@') ? rawParam.slice(1) : rawParam

const profileData = ref<any>(null)
const loading = ref(true)
const activeTab = ref<'repositories' | 'fonts' | 'icons'>('repositories')

async function fetchUserProfile() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/v1/users/${username}`)
    if (res.success) {
      profileData.value = res.data
    }
  } catch (err) {
    console.error('Failed to load user profile:', err)
  } finally {
    loading.value = false
  }
}

function copyProfileLink() {
  if (typeof window !== 'undefined') {
    navigator.clipboard.writeText(window.location.href)
    success('تم نسخ الرابط', 'تم نسخ رابط الملف الشخصي للحافظة بنجاح')
  }
}

onMounted(() => {
  fetchUserProfile()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
    <Container>
      <!-- Loading State -->
      <LoadingState v-if="loading" message="جارٍ تحميل الملف الشخصي العام للمستخدم..." />

      <!-- Not Found -->
      <EmptyState
        v-else-if="!profileData"
        title="المستخدم غير موجود"
        description="لم يتم العثور على أي حساب مسجل باسم المستخدم المطلوب."
      >
        <template #actions>
          <NuxtLink to="/">
            <Button variant="primary">العودة للرئيسية</Button>
          </NuxtLink>
        </template>
      </EmptyState>

      <!-- Profile Header & Content -->
      <div v-else class="space-y-8">
        <!-- User Bio Banner -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-start">
            <img
              :src="profileData.profile.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + profileData.profile.username"
              :alt="profileData.profile.display_name"
              class="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-md object-cover bg-slate-100"
            />
            <div class="flex-1 space-y-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {{ profileData.profile.display_name || profileData.profile.username }}
                  </h1>
                  <div class="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <span class="font-mono text-sm text-blue-600 dark:text-blue-400 font-bold">@{{ profileData.profile.username }}</span>
                    <Badge v-if="profileData.profile.role === 'ADMIN'" variant="default">إدارة المنصة</Badge>
                  </div>
                </div>

                <div class="flex items-center gap-2 justify-center">
                  <Button variant="outline" size="sm" @click="copyProfileLink">
                    <Share2 class="w-3.5 h-3.5 me-1.5" />
                    مشاركة الحساب
                  </Button>
                </div>
              </div>

              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                {{ profileData.profile.bio || 'مصمم ومطور محتوى رقمي على منصة الأصول الرقمية.' }}
              </p>

              <!-- Stats Pill Counter -->
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-3 text-xs text-slate-500 font-medium border-t border-slate-100 dark:border-slate-800">
                <span class="flex items-center gap-1.5">
                  <FolderGit2 class="w-4 h-4 text-blue-600" />
                  <strong>{{ profileData.stats.repositories_count }}</strong> مستودعات
                </span>
                <span class="flex items-center gap-1.5">
                  <Type class="w-4 h-4 text-purple-600" />
                  <strong>{{ profileData.stats.fonts_count }}</strong> خطوط
                </span>
                <span class="flex items-center gap-1.5">
                  <FileImage class="w-4 h-4 text-emerald-600" />
                  <strong>{{ profileData.stats.assets_count }}</strong> أيقونات
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            :class="activeTab === 'repositories' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'repositories'"
          >
            <FolderGit2 class="w-4 h-4" />
            المستودعات ({{ profileData.repositories.length }})
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            :class="activeTab === 'fonts' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'fonts'"
          >
            <Type class="w-4 h-4" />
            الخطوط ({{ profileData.fonts.length }})
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            :class="activeTab === 'icons' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="activeTab = 'icons'"
          >
            <FileImage class="w-4 h-4" />
            الأيقونات ({{ profileData.assets.length }})
          </button>
        </div>

        <!-- Repositories Grid -->
        <div v-if="activeTab === 'repositories'">
          <div v-if="profileData.repositories.length === 0" class="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p class="text-xs text-slate-500">لا توجد مستودعات عامة منشورة لهذا المستخدم حتى الآن.</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <NuxtLink
              v-for="repo in profileData.repositories"
              :key="repo.id"
              :to="`/repositories/${repo.id}`"
              class="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    :class="repo.visibility === 'PUBLIC' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
                  >
                    <Globe v-if="repo.visibility === 'PUBLIC'" class="w-3 h-3" />
                    <Lock v-else class="w-3 h-3" />
                    {{ repo.visibility === 'PUBLIC' ? 'عام' : 'خاص' }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ new Date(repo.created_at).toLocaleDateString('ar-EG') }}</span>
                </div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                  {{ repo.name }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {{ repo.description || 'لا يوجد وصف متاح لهذا المستودع.' }}
                </p>
              </div>

              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>استعراض المحتويات</span>
                <ExternalLink class="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Fonts Grid -->
        <div v-else-if="activeTab === 'fonts'">
          <div v-if="profileData.fonts.length === 0" class="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p class="text-xs text-slate-500">لا توجد خطوط منسوبة لهذا المستخدم.</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              v-for="font in profileData.fonts"
              :key="font.id"
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-base font-bold text-slate-900 dark:text-white">{{ font.display_name || font.name }}</h4>
                  <span class="text-[11px] text-slate-400 capitalize">{{ font.primary_category }}</span>
                </div>
                <NuxtLink :to="`/fonts/${font.slug}`">
                  <Button size="sm" variant="outline">معاينة</Button>
                </NuxtLink>
              </div>
              <p
                class="text-2xl text-slate-800 dark:text-slate-200 py-3 border-t border-slate-100 dark:border-slate-800"
                :style="{ fontFamily: `'${font.name}', system-ui, sans-serif` }"
              >
                {{ font.preview_text_sample || 'أبجد هوز حطي كلمن' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Icons Grid -->
        <div v-else-if="activeTab === 'icons'">
          <div v-if="profileData.assets.length === 0" class="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p class="text-xs text-slate-500">لا توجد أيقونات منشورة من قبل هذا المستخدم.</p>
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AssetCard
              v-for="asset in profileData.assets"
              :key="asset.id"
              :asset="asset"
            />
          </div>
        </div>
      </div>
    </Container>
  </div>
</template>
