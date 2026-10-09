<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Container from '../components/layout/Container.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import AssetCard from '../components/assets/AssetCard.vue'
import AssetFilter from '../components/assets/AssetFilter.vue'
import AssetCreateModal from '../components/assets/AssetCreateModal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingState from '../components/common/LoadingState.vue'
import ErrorState from '../components/common/ErrorState.vue'
import FoundationStatus from '../components/admin/FoundationStatus.vue'
import { useAssets } from '../composables/useAssets'
import { useCategories } from '../composables/useCategories'
import { useLicenses } from '../composables/useLicenses'
import { useTags } from '../composables/useTags'
import { useAuth } from '../composables/useAuth'
import type { Asset, AssetType, AssetStatus } from '../types/database'
import type { SortOption } from '../server/services/assetService'

const router = useRouter()
const route = useRoute()
const { assets, total, page, totalPages, limit, isLoading, error, fetchAssets } = useAssets()
const { categories, fetchCategories } = useCategories()
const { licenses, fetchLicenses } = useLicenses()
const { tags, fetchTags } = useTags()
const { role } = useAuth()

const isCreateModalOpen = ref(false)
const showArchitectureInfo = ref(false)

// Parse initial query state from route
const initialSearch = (route.query.q as string) || (route.query.search as string) || ''
const initialCategory = (route.query.category as string) || ''
const initialLicense = (route.query.license as string) || ''
const initialType = ((route.query.type as string) || '') as AssetType | ''
const initialStatus = ((route.query.status as string) || '') as AssetStatus | ''
const initialSort = ((route.query.sort as string) || (initialSearch ? 'relevance' : 'newest')) as SortOption
const initialPage = route.query.page ? Math.max(1, Number(route.query.page)) : 1

const initialTags: string[] = []
if (route.query.tag) {
  initialTags.push(route.query.tag as string)
} else if (route.query.tags) {
  initialTags.push(...(route.query.tags as string).split(',').map(s => s.trim()).filter(Boolean))
}

const filters = reactive<{
  search: string
  selectedType: AssetType | ''
  selectedCategory: string
  selectedLicense: string
  selectedStatus: AssetStatus | ''
  selectedTags: string[]
  selectedSort: SortOption
  page: number
}>({
  search: initialSearch,
  selectedType: initialType,
  selectedCategory: initialCategory,
  selectedLicense: initialLicense,
  selectedStatus: initialStatus,
  selectedTags: initialTags,
  selectedSort: initialSort,
  page: initialPage
})

async function triggerFetch() {
  await fetchAssets({
    search: filters.search,
    type: filters.selectedType,
    categorySlug: filters.selectedCategory,
    licenseSlug: filters.selectedLicense,
    tagSlugs: filters.selectedTags,
    status: filters.selectedStatus,
    sort: filters.selectedSort,
    page: filters.page,
    limit: 24
  })

  // Synchronize state with URL query parameters for shareability
  const queryParams: Record<string, string> = {}
  if (filters.search) queryParams.q = filters.search
  if (filters.selectedCategory) queryParams.category = filters.selectedCategory
  if (filters.selectedLicense) queryParams.license = filters.selectedLicense
  if (filters.selectedType) queryParams.type = filters.selectedType
  if (filters.selectedTags.length > 0) queryParams.tags = filters.selectedTags.join(',')
  if (filters.selectedSort && filters.selectedSort !== 'newest') queryParams.sort = filters.selectedSort
  if (filters.page > 1) queryParams.page = String(filters.page)

  router.replace({ query: queryParams }).catch(() => {})
}

async function loadData() {
  await Promise.all([
    fetchCategories(),
    fetchLicenses(),
    fetchTags(),
    triggerFetch()
  ])
}

// Execute immediately for Server-Side Rendering (SSR) & hydration
await loadData()

onMounted(() => {
  loadData()
})

// Reactively re-query on filter change or role toggle
watch(
  [
    () => filters.search,
    () => filters.selectedType,
    () => filters.selectedCategory,
    () => filters.selectedLicense,
    () => filters.selectedStatus,
    () => filters.selectedTags,
    () => filters.selectedSort,
    role
  ],
  () => {
    filters.page = 1 // Reset to first page when filtering
    triggerFetch()
  },
  { deep: true }
)

watch(
  () => filters.page,
  () => {
    triggerFetch()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 400, behavior: 'smooth' })
    }
  }
)

function resetAllFilters() {
  filters.search = ''
  filters.selectedCategory = ''
  filters.selectedLicense = ''
  filters.selectedType = ''
  filters.selectedStatus = ''
  filters.selectedTags = []
  filters.selectedSort = 'newest'
  filters.page = 1
}

function handleAssetSelect(asset: Asset) {
  router.push(`/assets/${asset.id}`)
}
</script>

<template>
  <Container>
    <!-- Top Hero Banner: Digital Assets Platform & Search Discovery -->
    <div class="mb-8 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-lg relative overflow-hidden">
      <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/30 mb-4">
          <span>Phase 2: Advanced Search & Discovery</span>
          <span>•</span>
          <span>PostgreSQL + Full-Text & Relevance</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Explore Professional Digital Assets
        </h1>
        <p class="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          Search thousands of modern icons, fonts, illustrations, and logos with instant full-text search, multi-faceted taxonomy filters, and relevance ranking.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="primary" @click="isCreateModalOpen = true">
            <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Digital Asset
          </Button>

          <Button
            variant="outline"
            class="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            @click="showArchitectureInfo = !showArchitectureInfo"
          >
            {{ showArchitectureInfo ? 'Hide Architecture Status' : 'View Architecture Health' }}
          </Button>

          <NuxtLink to="/admin">
            <Button variant="ghost" class="text-slate-300 hover:text-white hover:bg-white/10">
              Admin Governance &rarr;
            </Button>
          </NuxtLink>
        </div>
      </div>

      <!-- Background Decoration Grid -->
      <div class="absolute -right-12 -bottom-12 w-96 h-96 opacity-10 pointer-events-none">
        <svg viewBox="0 0 200 200" fill="currentColor">
          <path d="M45,-78C58,-70,68,-58,75,-44C82,-30,86,-15,84,-1C82,14,75,28,66,41C57,53,46,65,33,72C20,79,5,81,-10,80C-25,79,-40,75,-52,66C-64,57,-73,43,-79,28C-85,13,-88,-3,-84,-18C-80,-33,-69,-46,-56,-55C-43,-64,-28,-68,-14,-71C0,-74,15,-76,30,-77" />
        </svg>
      </div>
    </div>

    <!-- Collapsible Foundation Status Checklist -->
    <div v-if="showArchitectureInfo" class="mb-8">
      <FoundationStatus />
    </div>

    <!-- Instant Search & Multi-Faceted Filters -->
    <AssetFilter
      v-model:search="filters.search"
      v-model:selected-type="filters.selectedType"
      v-model:selected-category="filters.selectedCategory"
      v-model:selected-license="filters.selectedLicense"
      v-model:selected-status="filters.selectedStatus"
      v-model:selected-tags="filters.selectedTags"
      v-model:selected-sort="filters.selectedSort"
      :categories="categories"
      :licenses="licenses"
      :tags="tags"
      :loading="isLoading"
      :total-count="total"
      @reset="resetAllFilters"
    />

    <!-- Results Header & Live Count Feedback -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span v-if="filters.search">Results for "{{ filters.search }}"</span>
          <span v-else-if="filters.selectedCategory">
            {{ categories.find(c => c.slug === filters.selectedCategory)?.name }} Icons
          </span>
          <span v-else>Catalog Assets</span>
        </h2>
        <Badge variant="secondary" class="font-mono text-xs">
          {{ total }} {{ total === 1 ? 'asset' : 'assets' }}
        </Badge>
      </div>

      <div class="flex items-center gap-4 text-xs text-slate-500">
        <span v-if="totalPages > 1" class="font-medium">
          Page {{ page }} of {{ totalPages }}
        </span>
        <div class="border-l border-slate-200 dark:border-slate-800 pl-4">
          Active Role:
          <span class="font-semibold text-blue-600 dark:text-blue-400">{{ role }}</span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <LoadingState v-if="isLoading" />

    <!-- Error State -->
    <ErrorState
      v-else-if="error"
      title="Failed to load search results"
      :message="error"
      action-label="Retry Search"
      @retry="triggerFetch"
    />

    <!-- Empty State -->
    <EmptyState
      v-else-if="assets.length === 0"
      :title="filters.search ? `No assets found for \"${filters.search}\"` : 'No matching assets found'"
      description="Try checking for typos, clearing active tag filters, or browsing other categories."
    >
      <template #action>
        <div class="flex gap-2">
          <Button size="sm" variant="outline" @click="resetAllFilters">
            Clear all filters
          </Button>
          <Button size="sm" variant="primary" @click="isCreateModalOpen = true">
            Create New Asset
          </Button>
        </div>
      </template>
    </EmptyState>

    <!-- Assets Display Grid -->
    <div v-else class="space-y-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AssetCard
          v-for="asset in assets"
          :key="asset.id"
          :asset="asset"
          @select="handleAssetSelect"
        />
      </div>

      <!-- Pagination Navigation -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6"
      >
        <Button
          variant="outline"
          size="sm"
          :disabled="page <= 1"
          @click="filters.page--"
        >
          &larr; Previous Page
        </Button>

        <div class="flex items-center gap-1">
          <button
            v-for="p in totalPages"
            :key="p"
            type="button"
            class="h-8 w-8 rounded-lg text-xs font-semibold transition-colors"
            :class="p === page
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'"
            @click="filters.page = p"
          >
            {{ p }}
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          :disabled="page >= totalPages"
          @click="filters.page++"
        >
          Next Page &rarr;
        </Button>
      </div>
    </div>

    <!-- Create Asset Modal -->
    <AssetCreateModal
      :open="isCreateModalOpen"
      :categories="categories"
      :licenses="licenses"
      @close="isCreateModalOpen = false"
      @created="loadData"
    />
  </Container>
</template>
