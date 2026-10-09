<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Container from '../components/layout/Container.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import AssetCard from '../components/assets/AssetCard.vue'
import AssetFilter from '../components/assets/AssetFilter.vue'
import AssetCreateModal from '../components/assets/AssetCreateModal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingState from '../components/common/LoadingState.vue'
import FoundationStatus from '../components/admin/FoundationStatus.vue'
import { useAssets } from '../composables/useAssets'
import { useCategories } from '../composables/useCategories'
import { useLicenses } from '../composables/useLicenses'
import { useAuth } from '../composables/useAuth'
import type { Asset, AssetType, AssetStatus } from '../types/database'

const router = useRouter()
const { assets, total, isLoading, fetchAssets } = useAssets()
const { categories, fetchCategories } = useCategories()
const { licenses, fetchLicenses } = useLicenses()
const { role, isAdmin } = useAuth()

const isCreateModalOpen = ref(false)
const showArchitectureInfo = ref(false)

const filters = reactive<{
  search: string
  selectedType: AssetType | ''
  selectedCategory: string
  selectedLicense: string
  selectedStatus: AssetStatus | ''
}>({
  search: '',
  selectedType: '',
  selectedCategory: '',
  selectedLicense: '',
  selectedStatus: ''
})

async function loadData() {
  await Promise.all([
    fetchCategories(),
    fetchLicenses(),
    fetchAssets({
      search: filters.search,
      type: filters.selectedType,
      categorySlug: filters.selectedCategory,
      licenseSlug: filters.selectedLicense,
      status: filters.selectedStatus
    })
  ])
}

// Execute immediately for Server-Side Rendering (SSR) & hydration
await loadData()

onMounted(() => {
  loadData()
})

// Refetch on filter change or role toggle (to test RLS visibility)
watch([filters, role], () => {
  fetchAssets({
    search: filters.search,
    type: filters.selectedType,
    categorySlug: filters.selectedCategory,
    licenseSlug: filters.selectedLicense,
    status: filters.selectedStatus
  })
}, { deep: true })

function handleAssetSelect(asset: Asset) {
  router.push(`/assets/${asset.id}`)
}
</script>

<template>
  <Container>
    <!-- Top Hero Banner: Phase 0 Foundation -->
    <div class="mb-8 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-lg relative overflow-hidden">
      <div class="relative z-10 max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/30 mb-4">
          <span>Phase 0: Foundation Layer</span>
          <span>•</span>
          <span>PostgreSQL + RLS + Storage</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Extensible Digital Assets Platform
        </h1>
        <p class="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          Architected for high scale. Polymorphic assets entity supporting 
          <strong class="text-white">Icons, Fonts, Illustrations, Logos, and Templates</strong> with decoupled Supabase Storage, strict PostgreSQL Row Level Security, and comprehensive audit trails.
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

    <!-- Filter & Search Controls -->
    <AssetFilter
      v-model:search="filters.search"
      v-model:selected-type="filters.selectedType"
      v-model:selected-category="filters.selectedCategory"
      v-model:selected-license="filters.selectedLicense"
      v-model:selected-status="filters.selectedStatus"
      :categories="categories"
      :licenses="licenses"
    />

    <!-- Assets Catalog Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
          Catalog Assets
        </h2>
        <Badge variant="secondary">
          {{ total }} {{ total === 1 ? 'asset' : 'assets' }}
        </Badge>
      </div>

      <div class="text-xs text-slate-500">
        Active RLS View:
        <span class="font-semibold text-blue-600 dark:text-blue-400">{{ role }}</span>
        <span v-if="role === 'USER'" class="ml-1 text-[11px] text-slate-400">(Drafts private to author)</span>
        <span v-else class="ml-1 text-[11px] text-slate-400">(All statuses accessible)</span>
      </div>
    </div>

    <!-- Assets Display Grid -->
    <LoadingState v-if="isLoading" />

    <EmptyState
      v-else-if="assets.length === 0"
      title="No assets matching criteria"
      description="Try clearing your filters or create a new digital asset."
    >
      <template #action>
        <Button size="sm" @click="isCreateModalOpen = true">
          Create First Asset
        </Button>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <AssetCard
        v-for="asset in assets"
        :key="asset.id"
        :asset="asset"
        @select="handleAssetSelect"
      />
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
