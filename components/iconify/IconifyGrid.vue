<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check, SearchX } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  icons: string[]
  total: number
  loading?: boolean
  previewSize?: 'sm' | 'md' | 'lg'
}>()

defineEmits<{
  (e: 'select', iconId: string): void
  (e: 'loadMore'): void
}>()

const copiedId = ref<string | null>(null)

const hasMore = computed(() => props.icons.length < props.total)

const iconSizeClass = computed(() => {
  if (props.previewSize === 'sm') return 'w-6 h-6'
  if (props.previewSize === 'lg') return 'w-10 h-10'
  return 'w-8 h-8'
})

function getIconSvgUrl(iconId: string): string {
  const [prefix, name] = iconId.split(':')
  if (!prefix || !name) return ''
  return `/api/v1/iconify/${prefix}/${name}/svg?size=36`
}

function formatIconName(iconId: string): string {
  const parts = iconId.split(':')
  return parts[1] || iconId
}

function formatCollectionName(iconId: string): string {
  const parts = iconId.split(':')
  return parts[0] || ''
}

async function quickCopyIdentifier(e: Event, iconId: string) {
  e.stopPropagation()
  try {
    await navigator.clipboard.writeText(iconId)
    copiedId.value = iconId
    setTimeout(() => {
      if (copiedId.value === iconId) copiedId.value = null
    }, 1500)
  } catch {
    // Ignore clipboard failure in unsupported contexts
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Skeleton Loading -->
    <div
      v-if="loading && icons.length === 0"
      class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
    >
      <div
        v-for="i in 24"
        :key="i"
        class="h-28 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200/80 dark:border-slate-800"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && icons.length === 0"
      class="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900 space-y-3"
    >
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <SearchX class="h-6 w-6" />
      </div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">
        {{ t('iconify.no_icons_title') }}
      </h3>
      <p class="mx-auto max-w-sm text-xs text-slate-500 dark:text-slate-400">
        {{ t('iconify.no_icons_desc') }}
      </p>
    </div>

    <!-- Icon Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      <div
        v-for="iconId in icons"
        :key="iconId"
        role="button"
        tabindex="0"
        class="group relative flex flex-col items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 text-center transition-all hover:border-blue-500/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/60 cursor-pointer min-h-[112px]"
        @click="$emit('select', iconId)"
        @keydown.enter="$emit('select', iconId)"
      >
        <!-- Quick Copy Action -->
        <button
          type="button"
          :title="t('iconify.copy_identifier')"
          :aria-label="t('iconify.copy_identifier')"
          class="absolute end-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          @click="quickCopyIdentifier($event, iconId)"
        >
          <Check v-if="copiedId === iconId" class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <Copy v-else class="h-3.5 w-3.5" />
        </button>

        <!-- Icon Glyph Stage -->
        <div class="flex flex-1 items-center justify-center py-2">
          <img
            :src="getIconSvgUrl(iconId)"
            :alt="iconId"
            loading="lazy"
            class="object-contain transition-transform duration-150 group-hover:scale-110 dark:invert"
            :class="iconSizeClass"
          />
        </div>

        <!-- Name & Collection -->
        <div class="w-full space-y-0.5 pt-1">
          <div class="truncate text-xs font-medium text-slate-700 group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400 font-mono">
            {{ formatIconName(iconId) }}
          </div>
          <div class="truncate text-[10px] text-slate-400 dark:text-slate-500">
            {{ formatCollectionName(iconId) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="flex justify-center pt-2">
      <button
        type="button"
        :disabled="loading"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500"
        @click="$emit('loadMore')"
      >
        <span v-if="loading" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>{{ t('iconify.load_more') }}</span>
        <span class="font-mono text-[11px] text-slate-400">({{ icons.length }} / {{ total }})</span>
      </button>
    </div>
  </div>
</template>
