<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Category, License, Tag, AssetType, AssetStatus } from '../../types/database'
import type { SortOption } from '../../server/services/assetService'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'

const props = withDefaults(
  defineProps<{
    search: string
    selectedType: AssetType | ''
    selectedCategory: string
    selectedLicense: string
    selectedStatus: AssetStatus | ''
    selectedTags: string[]
    selectedSort: SortOption
    categories: Category[]
    licenses: License[]
    tags: Tag[]
    loading?: boolean
    totalCount?: number
  }>(),
  {
    loading: false,
    selectedTags: () => [],
    selectedSort: 'relevance'
  }
)

const emit = defineEmits<{
  (e: 'update:search', val: string): void
  (e: 'update:selectedType', val: AssetType | ''): void
  (e: 'update:selectedCategory', val: string): void
  (e: 'update:selectedLicense', val: string): void
  (e: 'update:selectedStatus', val: AssetStatus | ''): void
  (e: 'update:selectedTags', val: string[]): void
  (e: 'update:selectedSort', val: SortOption): void
  (e: 'reset'): void
}>()

const localSearch = ref(props.search)
const searchInputRef = ref<HTMLInputElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Sync local input with props
watch(
  () => props.search,
  (newVal) => {
    if (newVal !== localSearch.value) {
      localSearch.value = newVal
    }
  }
)

function onSearchInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  localSearch.value = val

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // 300ms debounce
  debounceTimer = setTimeout(() => {
    emit('update:search', val)
  }, 300)
}

function clearSearch() {
  localSearch.value = ''
  if (debounceTimer) clearTimeout(debounceTimer)
  emit('update:search', '')
  searchInputRef.value?.focus()
}

function handleKeyDown(e: KeyboardEvent) {
  // Enter immediately applies search
  if (e.key === 'Enter') {
    if (debounceTimer) clearTimeout(debounceTimer)
    emit('update:search', localSearch.value)
  } else if (e.key === 'Escape') {
    clearSearch()
    searchInputRef.value?.blur()
  }
}

// Global keyboard shortcut '/' to focus search
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})

function toggleTag(slug: string) {
  const current = [...props.selectedTags]
  const idx = current.indexOf(slug)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(slug)
  }
  emit('update:selectedTags', current)
}

function selectCategoryPill(slug: string) {
  if (props.selectedCategory === slug) {
    emit('update:selectedCategory', '') // Toggle off
  } else {
    emit('update:selectedCategory', slug)
  }
}

const showAdvancedFilters = ref(false)
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-6 space-y-4">
    <!-- Top Row: Instant Search Bar & Sort Dropdown -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <!-- Search Input Container -->
      <div class="relative flex-1">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <svg
            v-if="!loading"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <!-- Loading Spinner -->
          <svg
            v-else
            class="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>

        <input
          ref="searchInputRef"
          type="text"
          :value="localSearch"
          placeholder="Search icons, tags, keywords (e.g. shopping cart, shield, عربة تسوق)..."
          class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-24 text-sm font-medium transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:bg-slate-900"
          @input="onSearchInput"
          @keydown="handleKeyDown"
        />

        <div class="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5">
          <!-- Clear Button -->
          <button
            v-if="localSearch"
            type="button"
            class="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Clear search (Esc)"
            @click="clearSearch"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- Keyboard Shortcut Hint -->
          <kbd class="hidden sm:inline-flex items-center rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            /
          </kbd>
        </div>
      </div>

      <!-- Sort Dropdown -->
      <div class="flex items-center gap-2">
        <label class="hidden sm:inline-block text-xs font-semibold text-slate-500 whitespace-nowrap">Sort:</label>
        <select
          :value="selectedSort"
          class="h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-1 text-xs font-semibold shadow-2xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 min-w-[150px]"
          @change="emit('update:selectedSort', ($event.target as HTMLSelectElement).value as any)"
        >
          <option value="relevance">Relevance</option>
          <option value="downloads">Most Downloaded</option>
          <option value="newest">Newest First</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
        </select>

        <!-- Toggle Filters Button -->
        <Button
          variant="outline"
          size="md"
          class="h-11 rounded-xl whitespace-nowrap"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <svg class="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
          Filters
          <span
            v-if="selectedCategory || selectedLicense || selectedTags.length > 0 || selectedType"
            class="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
          >
            {{ (selectedCategory ? 1 : 0) + (selectedLicense ? 1 : 0) + (selectedType ? 1 : 0) + selectedTags.length }}
          </span>
        </Button>
      </div>
    </div>

    <!-- Category Pills Quick Bar -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 font-medium transition-colors shrink-0"
        :class="!selectedCategory ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
        @click="emit('update:selectedCategory', '')"
      >
        All Categories
      </button>

      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="rounded-lg px-3 py-1.5 font-medium transition-colors shrink-0 flex items-center gap-1"
        :class="selectedCategory === cat.slug ? 'bg-blue-600 text-white shadow-2xs font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
        @click="selectCategoryPill(cat.slug)"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- Collapsible Advanced Filter Drawer (Tags, License, Asset Type) -->
    <div
      v-if="showAdvancedFilters"
      class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3.5"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <!-- Asset Type -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Asset Type</label>
          <select
            :value="selectedType"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @change="emit('update:selectedType', ($event.target as HTMLSelectElement).value as any)"
          >
            <option value="">All Asset Types</option>
            <option value="ICON">Icon (Vector)</option>
            <option value="FONT">Font (Typography)</option>
            <option value="ILLUSTRATION">Illustration (Scene)</option>
            <option value="LOGO">Logo (Brand)</option>
            <option value="TEMPLATE">Template (Design System)</option>
          </select>
        </div>

        <!-- License Filter -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Legal License</label>
          <select
            :value="selectedLicense"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @change="emit('update:selectedLicense', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">All Licenses</option>
            <option v-for="lic in licenses" :key="lic.id" :value="lic.slug">
              {{ lic.name }} ({{ lic.commercial_use ? 'Commercial' : 'Personal' }})
            </option>
          </select>
        </div>

        <!-- Quick Status Filter (for Admins) -->
        <div>
          <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Status Lifecycle</label>
          <select
            :value="selectedStatus"
            class="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @change="emit('update:selectedStatus', ($event.target as HTMLSelectElement).value as any)"
          >
            <option value="">Any Status</option>
            <option value="PUBLISHED">Published (Public)</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <!-- Tags Cloud Multi-Select -->
      <div>
        <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Filter by Tags</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in tags"
            :key="t.id"
            type="button"
            class="rounded-md border px-2.5 py-1 text-xs font-medium transition-all"
            :class="selectedTags.includes(t.slug)
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'"
            @click="toggleTag(t.slug)"
          >
            #{{ t.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Active Filters Strip -->
    <div
      v-if="search || selectedCategory || selectedLicense || selectedType || selectedTags.length > 0"
      class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs"
    >
      <span class="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Active:</span>

      <!-- Query Chip -->
      <span
        v-if="search"
        class="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
      >
        Query: "{{ search }}"
        <button type="button" class="hover:text-blue-900" @click="clearSearch">✕</button>
      </span>

      <!-- Category Chip -->
      <span
        v-if="selectedCategory"
        class="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
      >
        Category: {{ categories.find(c => c.slug === selectedCategory)?.name || selectedCategory }}
        <button type="button" class="hover:text-indigo-900" @click="emit('update:selectedCategory', '')">✕</button>
      </span>

      <!-- Tags Chips -->
      <span
        v-for="tagSlug in selectedTags"
        :key="tagSlug"
        class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
      >
        #{{ tags.find(t => t.slug === tagSlug)?.name || tagSlug }}
        <button type="button" class="hover:text-emerald-900" @click="toggleTag(tagSlug)">✕</button>
      </span>

      <!-- License Chip -->
      <span
        v-if="selectedLicense"
        class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
      >
        License: {{ licenses.find(l => l.slug === selectedLicense)?.name || selectedLicense }}
        <button type="button" class="hover:text-amber-900" @click="emit('update:selectedLicense', '')">✕</button>
      </span>

      <!-- Type Chip -->
      <span
        v-if="selectedType"
        class="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
      >
        Type: {{ selectedType }}
        <button type="button" class="hover:text-purple-900" @click="emit('update:selectedType', '')">✕</button>
      </span>

      <!-- Reset All -->
      <button
        type="button"
        class="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline ml-auto"
        @click="emit('reset')"
      >
        Clear all filters
      </button>
    </div>
  </div>
</template>
