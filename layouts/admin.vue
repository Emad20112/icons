<script setup lang="ts">
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import Container from '../components/layout/Container.vue'
import Toast from '../components/ui/Toast.vue'
import { onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { fetchUser, isAdmin } = useAuth()
const { t } = useI18n()

onMounted(() => {
  fetchUser()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <AppHeader />

    <!-- Sub-navigation for Admin -->
    <div class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <Container class="flex items-center gap-6 py-3 text-xs font-medium overflow-x-auto whitespace-nowrap">
        <NuxtLink
          to="/admin"
          class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors shrink-0"
          exact-active-class="text-blue-600 dark:text-blue-400 font-semibold"
        >
          {{ t('admin.nav.overview') }}
        </NuxtLink>
        <NuxtLink
          to="/admin/assets"
          class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors shrink-0"
          exact-active-class="text-blue-600 dark:text-blue-400 font-semibold"
        >
          {{ t('admin.nav.assets') }}
        </NuxtLink>
        <NuxtLink
          to="/admin/categories"
          class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors shrink-0"
          exact-active-class="text-blue-600 dark:text-blue-400 font-semibold"
        >
          {{ t('admin.nav.categories') }}
        </NuxtLink>
        <NuxtLink
          to="/admin/licenses"
          class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors shrink-0"
          exact-active-class="text-blue-600 dark:text-blue-400 font-semibold"
        >
          {{ t('admin.nav.licenses') }}
        </NuxtLink>
        <NuxtLink
          to="/admin/audit"
          class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors shrink-0"
          exact-active-class="text-blue-600 dark:text-blue-400 font-semibold"
        >
          {{ t('admin.nav.audit') }}
        </NuxtLink>
      </Container>
    </div>

    <main class="flex-1 py-8">
      <slot />
    </main>

    <AppFooter />
    <Toast />
  </div>
</template>
