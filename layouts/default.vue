<script setup lang="ts">
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import Toast from '../components/ui/Toast.vue'
import { onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { fetchUser } = useAuth()

onMounted(() => {
  fetchUser()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <AppHeader />
    <main class="flex-1 py-8">
      <slot />
    </main>
    <AppFooter />
    <Toast />
  </div>
</template>
