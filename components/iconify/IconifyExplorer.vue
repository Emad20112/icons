<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Container from '../layout/Container.vue'
import { useIconify } from '../../composables/useIconify'
import IconifySearchInput from './IconifySearchInput.vue'
import IconifyCollectionPicker from './IconifyCollectionPicker.vue'
import IconifyGrid from './IconifyGrid.vue'
import IconifyDetailModal from './IconifyDetailModal.vue'
import { PenTool } from 'lucide-vue-next'

const { t } = useI18n()

const {
  searchQuery,
  selectedCollection,
  popularCollections,
  quickSuggestions,
  isSearching,
  searchError,
  searchResults,
  totalResults,
  selectedIcon,
  isModalOpen,
  triggerDebouncedSearch,
  executeSearch,
  loadMore,
  setCollection,
  applySuggestion,
  openIconDetails,
  closeIconDetails,
  downloadSvg,
} = useIconify()

const previewSize = ref<'sm' | 'md' | 'lg'>('md')

onMounted(() => {
  executeSearch(0)
})
</script>

<template>
  <Container class="space-y-6">
    <!-- Clean Header & Search Hero -->
    <section class="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6">
        <div class="space-y-1.5 max-w-2xl">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {{ t('iconify.title') }}
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {{ t('iconify.subtitle') }}
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <NuxtLink
            to="/tools/icon-editor"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <PenTool class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{{ t('header.nav.iconEditor') }}</span>
          </NuxtLink>
        </div>
      </div>

      <IconifySearchInput
        v-model="searchQuery"
        :loading="isSearching"
        :suggestions="quickSuggestions"
        @search="triggerDebouncedSearch(300)"
        @suggest="applySuggestion"
      />
    </section>

    <!-- Collection Tabs & Results Toolbar -->
    <div class="space-y-4">
      <IconifyCollectionPicker
        :collections="popularCollections"
        :active-prefix="selectedCollection"
        @select="setCollection"
      />

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <span v-if="totalResults > 0" class="font-medium text-slate-700 dark:text-slate-300">
            {{ t('iconify.showing_of', { shown: searchResults.length, total: totalResults }) }}
          </span>
          <span v-else-if="!isSearching">
            {{ t('iconify.ready_to_search') }}
          </span>
        </div>

        <!-- Preview Size Density Control -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 me-1">{{ t('iconify.icon_size') }}</span>
          <div class="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              v-for="sizeKey in (['sm', 'md', 'lg'] as const)"
              :key="sizeKey"
              type="button"
              class="rounded-md px-2 py-1 text-[11px] font-mono uppercase transition-colors"
              :class="previewSize === sizeKey
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
              @click="previewSize = sizeKey"
            >
              {{ sizeKey }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="searchError"
      class="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      <span>{{ searchError }}</span>
      <button type="button" class="font-semibold underline" @click="executeSearch(0)">
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Icons Grid -->
    <IconifyGrid
      :icons="searchResults"
      :total="totalResults"
      :loading="isSearching"
      :preview-size="previewSize"
      @select="openIconDetails"
      @load-more="loadMore"
    />

    <!-- Detail Modal -->
    <IconifyDetailModal
      :is-open="isModalOpen"
      :icon="selectedIcon"
      @close="closeIconDetails"
      @download="downloadSvg"
    />
  </Container>
</template>
