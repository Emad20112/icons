<script setup lang="ts">
import IconifyExplorer from '../components/iconify/IconifyExplorer.vue'

const { t } = useI18n()

useHead(() => ({
  title: t('iconify.meta_title'),
  meta: [
    { name: 'description', content: t('iconify.meta_description') },
    { property: 'og:title', content: t('iconify.meta_title') },
    { property: 'og:description', content: t('iconify.meta_description') }
  ]
}))
</script>

<template>
  <IconifyExplorer />
</template>
