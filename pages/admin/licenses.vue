<script setup lang="ts">
import { onMounted } from 'vue'
import Container from '../../components/layout/Container.vue'
import LicenseManager from '../../components/admin/LicenseManager.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import { useLicenses } from '../../composables/useLicenses'

definePageMeta({
  layout: 'admin'
})

const { licenses, isLoading, fetchLicenses } = useLicenses()
const { t } = useI18n()

onMounted(() => {
  fetchLicenses()
})
</script>

<template>
  <Container>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ t('adminLicensesPage.title') }}</h1>
      <p class="text-xs text-slate-500">{{ t('adminLicensesPage.subtitle') }}</p>
    </div>

    <LoadingState v-if="isLoading" />
    <LicenseManager v-else :licenses="licenses" @license-created="fetchLicenses" />
  </Container>
</template>
