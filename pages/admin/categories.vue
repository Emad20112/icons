<script setup lang="ts">
import { onMounted } from 'vue'
import Container from '../../components/layout/Container.vue'
import CategoryManager from '../../components/admin/CategoryManager.vue'
import LoadingState from '../../components/common/LoadingState.vue'
import { useCategories } from '../../composables/useCategories'

definePageMeta({
  layout: 'admin'
})

const { categories, isLoading, fetchCategories } = useCategories()

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <Container>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Taxonomy & Categories</h1>
      <p class="text-xs text-slate-500">Manage categories dynamically stored in PostgreSQL.</p>
    </div>

    <LoadingState v-if="isLoading" />
    <CategoryManager v-else :categories="categories" @category-created="fetchCategories" />
  </Container>
</template>
