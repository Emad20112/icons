import { ref, computed } from 'vue'

export interface IconifySearchResult {
  icons: string[]
  total: number
  limit: number
  start: number
  collections?: Record<string, { name: string; total?: number; author?: any; license?: any }>
}

export interface SelectedIconDetails {
  prefix: string
  name: string
  fullName: string
  svgUrl: string
  svgCode?: string
  width?: number
  height?: number
  collectionName?: string
}

export function useIconify() {
  const searchQuery = ref('')
  const selectedCollection = ref<string>('lucide')
  const isSearching = ref(false)
  const searchError = ref<string | null>(null)
  const searchResults = ref<string[]>([])
  const totalResults = ref(0)
  const currentOffset = ref(0)
  const pageSize = 48

  const popularCollections = [
    { prefix: 'lucide', label: 'Lucide' },
    { prefix: 'heroicons', label: 'Heroicons' },
    { prefix: 'tabler', label: 'Tabler' },
    { prefix: 'material-symbols', label: 'Material' },
    { prefix: 'ph', label: 'Phosphor' },
    { prefix: 'ri', label: 'Remix' },
    { prefix: 'bi', label: 'Bootstrap' },
  ]

  // Modal / Selection State
  const selectedIcon = ref<SelectedIconDetails | null>(null)
  const isModalOpen = ref(false)
  const iconColor = ref('currentColor')
  const iconSize = ref(32)
  const isFetchingSvg = ref(false)

  // Internal AbortController for debouncing
  let searchAbortController: AbortController | null = null
  let debounceTimeout: NodeJS.Timeout | null = null

  /**
   * Performs search with AbortController cancellation and debouncing
   */
  function triggerDebouncedSearch(delay = 350) {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    debounceTimeout = setTimeout(() => {
      executeSearch(0)
    }, delay)
  }

  async function executeSearch(offset = 0) {
    const trimmedQuery = searchQuery.value ? searchQuery.value.trim() : ''

    // If query is 1 character, do not send to server to avoid 400 Bad Request
    if (trimmedQuery.length === 1) {
      return
    }

    // Cancel in-flight request if user is still typing
    if (searchAbortController) {
      searchAbortController.abort()
    }
    searchAbortController = new AbortController()

    isSearching.value = true
    searchError.value = null
    currentOffset.value = offset

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        start: String(offset),
      })

      if (trimmedQuery) {
        params.append('query', trimmedQuery)
      }

      if (selectedCollection.value) {
        params.append('prefix', selectedCollection.value)
      }

      const res = await $fetch<IconifySearchResult>(`/api/v1/iconify/search?${params.toString()}`, {
        signal: searchAbortController.signal,
      })

      if (offset === 0) {
        searchResults.value = res.icons || []
      } else {
        searchResults.value = [...searchResults.value, ...(res.icons || [])]
      }
      totalResults.value = res.total || 0
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('[useIconify] Search failed:', err)
      searchError.value = err?.data?.error?.message || err?.message || 'فشل البحث في مكتبة الأيقونات'
    } finally {
      isSearching.value = false
    }
  }

  function loadMore() {
    if (isSearching.value || searchResults.value.length >= totalResults.value) return
    const nextOffset = currentOffset.value + pageSize
    executeSearch(nextOffset)
  }

  function setCollection(prefix: string) {
    selectedCollection.value = prefix
    currentOffset.value = 0
    executeSearch(0)
  }

  async function openIconDetails(fullIconName: string) {
    const parts = fullIconName.split(':')
    if (parts.length !== 2) return

    const [prefix, name] = parts
    const svgUrl = `/api/v1/iconify/${prefix}/${name}/svg`

    selectedIcon.value = {
      prefix,
      name,
      fullName: fullIconName,
      svgUrl,
      svgCode: '',
    }
    isModalOpen.value = true
    isFetchingSvg.value = true

    try {
      const svgText = await $fetch<string>(svgUrl)
      if (selectedIcon.value) {
        selectedIcon.value.svgCode = svgText
      }
    } catch (err) {
      console.error('[useIconify] Failed to fetch SVG:', err)
    } finally {
      isFetchingSvg.value = false
    }
  }

  function closeIconDetails() {
    isModalOpen.value = false
    selectedIcon.value = null
  }

  function getDynamicSvgUrl(prefix: string, name: string, color?: string, size?: number): string {
    const params = new URLSearchParams()
    if (color && color !== 'currentColor') params.append('color', color)
    if (size) params.append('size', String(size))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return `/api/v1/iconify/${prefix}/${name}/svg${qs}`
  }

  function downloadSvg(prefix: string, name: string, color?: string, size?: number) {
    const params = new URLSearchParams({ download: 'true' })
    if (color && color !== 'currentColor') params.append('color', color)
    if (size) params.append('size', String(size))

    const url = `/api/v1/iconify/${prefix}/${name}/svg?${params.toString()}`
    const a = document.createElement('a')
    a.href = url
    a.download = `${prefix}-${name}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return {
    searchQuery,
    selectedCollection,
    popularCollections,
    isSearching,
    searchError,
    searchResults,
    totalResults,
    currentOffset,
    selectedIcon,
    isModalOpen,
    iconColor,
    iconSize,
    isFetchingSvg,
    triggerDebouncedSearch,
    executeSearch,
    loadMore,
    setCollection,
    openIconDetails,
    closeIconDetails,
    getDynamicSvgUrl,
    downloadSvg,
  }
}
