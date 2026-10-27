<script setup lang="ts">
import Container from './Container.vue'

const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900 mt-auto">
    <Container class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      <div class="flex flex-wrap items-center justify-center gap-2">
        <span class="font-semibold text-slate-700 dark:text-slate-300">{{ t('footer.brand') }}</span>
        <span aria-hidden="true">•</span>
        <span>{{ t('footer.phase') }}</span>
        <span aria-hidden="true">•</span>
        <span>{{ t('footer.database') }}</span>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span>{{ t('footer.schema') }}</span>
        <span>{{ t('footer.storage') }}</span>
        <span>{{ t('footer.audit') }}</span>
      </div>
    </Container>
  </footer>
</template>
