<script setup lang="ts">
import Container from './Container.vue'

const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950 mt-auto">
    <Container class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
      <div class="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-start">
        <span class="font-semibold text-slate-800 dark:text-slate-200">{{ t('footer.brand') }}</span>
        <span class="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">•</span>
        <span>{{ t('footer.tagline') }}</span>
      </div>
      <nav class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <NuxtLink to="/" class="hover:text-slate-900 dark:hover:text-white transition-colors">
          {{ t('header.nav.iconify') }}
        </NuxtLink>
        <NuxtLink to="/fonts" class="hover:text-slate-900 dark:hover:text-white transition-colors">
          {{ t('header.nav.fonts') }}
        </NuxtLink>
        <NuxtLink to="/repositories" class="hover:text-slate-900 dark:hover:text-white transition-colors">
          {{ t('header.nav.repositories') }}
        </NuxtLink>
        <NuxtLink to="/tools/icon-editor" class="hover:text-slate-900 dark:hover:text-white transition-colors">
          {{ t('header.nav.iconEditor') }}
        </NuxtLink>
      </nav>
    </Container>
  </footer>
</template>
