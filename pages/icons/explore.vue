<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- Breadcrumb & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <NuxtLink to="/" class="hover:underline">{{ $t('common.home') || 'الرئيسية' }}</NuxtLink>
            <span>/</span>
            <span class="text-slate-800 dark:text-slate-200 font-medium">{{ $t('iconify.title') || 'مكتبة Iconify العالمية' }}</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span class="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </span>
            {{ $t('iconify.title') || 'مكتبة الأيقونات العالمية (Iconify API)' }}
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {{ $t('iconify.subtitle') || 'ابحث وتصفح أكثر من 200,000 أيقونة مفتوحة المصدر من مجموعات Lucide، Heroicons، Tabler والمزيد بشكل ديناميكي فوري دون استهلاك مساحة التخزين.' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/tools/icon-editor"
            class="px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold transition flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {{ $t('common.iconEditor') || 'محرر الأيقونات' }}
          </NuxtLink>
        </div>
      </div>

      <!-- Search Section -->
      <div class="space-y-4">
        <IconifySearchInput
          v-model="searchQuery"
          :loading="isSearching"
          @search="triggerDebouncedSearch(350)"
        />

        <!-- Collection Chips -->
        <IconifyCollectionPicker
          :collections="popularCollections"
          :active-prefix="selectedCollection"
          @select="setCollection"
        />
      </div>

      <!-- Results Stats Banner -->
      <div class="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <span v-if="totalResults > 0">
            {{ $t('iconify.found_results', { count: totalResults }) || `تم العثور على ${totalResults} أيقونة` }}
          </span>
          <span v-else-if="!isSearching">
            {{ $t('iconify.ready_to_search') || 'أدخل كلمة البحث لاستكشاف الأيقونات' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-mono text-[11px] text-slate-400">Live Iconify Stream</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="searchError" class="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
        <span>{{ searchError }}</span>
        <button @click="executeSearch(0)" class="underline font-bold">
          {{ $t('common.retry') || 'إعادة المحاولة' }}
        </button>
      </div>

      <!-- Icon Grid -->
      <IconifyGrid
        :icons="searchResults"
        :total="totalResults"
        :loading="isSearching"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useIconify } from '../../composables/useIconify'
import IconifySearchInput from '../../components/iconify/IconifySearchInput.vue'
import IconifyCollectionPicker from '../../components/iconify/IconifyCollectionPicker.vue'
import IconifyGrid from '../../components/iconify/IconifyGrid.vue'
import IconifyDetailModal from '../../components/iconify/IconifyDetailModal.vue'

const {
  searchQuery,
  selectedCollection,
  popularCollections,
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
  openIconDetails,
  closeIconDetails,
  downloadSvg,
} = useIconify()

onMounted(() => {
  executeSearch(0)
})
</script>
