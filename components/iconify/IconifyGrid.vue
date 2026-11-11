<template>
  <div class="space-y-6">
    <!-- Skeleton Loading -->
    <div v-if="loading && icons.length === 0" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
      <div
        v-for="i in 24"
        :key="i"
        class="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800"
      ></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && icons.length === 0"
      class="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
    >
      <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
        {{ $t('iconify.no_icons_found') || 'لم يتم العثور على أيقونات تطابق بحثك' }}
      </h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        {{ $t('iconify.no_icons_subtitle') || 'جرّب البحث بكلمة باللغة الإنجليزية أو اختر مجموعة أخرى' }}
      </p>
    </div>

    <!-- Icon Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
      <div
        v-for="iconId in icons"
        :key="iconId"
        @click="$emit('select', iconId)"
        class="group relative flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all text-center"
      >
        <!-- Icon Image -->
        <div class="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform">
          <img
            :src="getIconSvgUrl(iconId)"
            :alt="iconId"
            loading="lazy"
            class="w-8 h-8 object-contain dark:invert transition-all"
          />
        </div>

        <!-- Name Label -->
        <span class="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400 truncate w-full text-center group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {{ formatIconName(iconId) }}
        </span>

        <!-- Collection Badge -->
        <span class="text-[10px] font-sans text-slate-400 truncate w-full">
          {{ formatCollectionName(iconId) }}
        </span>

        <!-- Hover Action Overlay -->
        <div class="absolute inset-0 rounded-2xl bg-blue-600/5 dark:bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="text-center pt-4">
      <button
        @click="$emit('loadMore')"
        :disabled="loading"
        class="px-6 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-sm inline-flex items-center gap-2"
      >
        <span v-if="loading" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent"></span>
        <span>{{ $t('common.loadMore') || 'تحميل المزيد من الأيقونات' }}</span>
        <span class="text-slate-400 text-[10px]">({{ icons.length }} / {{ total }})</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  icons: string[]
  total: number
  loading?: boolean
}>()

defineEmits<{
  (e: 'select', iconId: string): void
  (e: 'loadMore'): void
}>()

const hasMore = computed(() => {
  return props.icons.length < props.total
})

function getIconSvgUrl(iconId: string): string {
  const [prefix, name] = iconId.split(':')
  if (!prefix || !name) return ''
  return `/api/v1/iconify/${prefix}/${name}/svg?size=32`
}

function formatIconName(iconId: string): string {
  const parts = iconId.split(':')
  return parts[1] || iconId
}

function formatCollectionName(iconId: string): string {
  const parts = iconId.split(':')
  return parts[0] || ''
}
</script>
