<script setup lang="ts">
import type { Asset } from '../../types/database'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'

defineProps<{
  asset: Asset
}>()

defineEmits<{
  (e: 'select', asset: Asset): void
}>()
</script>

<template>
  <div
    class="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
    @click="$emit('select', asset)"
  >
    <!-- Header: Type & Status Badges -->
    <div class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-1.5">
        <span
          class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          :class="[
            asset.type === 'ICON' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
            asset.type === 'FONT' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
            asset.type === 'ILLUSTRATION' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
            asset.type === 'LOGO' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          ]"
        >
          {{ asset.type }}
        </span>
        <span v-if="asset.is_featured" class="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded dark:bg-amber-950">
          ★ Featured
        </span>
      </div>

      <Badge
        :variant="
          asset.status === 'PUBLISHED' ? 'success' :
          asset.status === 'DRAFT' ? 'secondary' :
          asset.status === 'PENDING_REVIEW' ? 'warning' : 'destructive'
        "
      >
        {{ asset.status }}
      </Badge>
    </div>

    <!-- Preview Canvas Area -->
    <div class="relative flex h-36 w-full items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800/60 overflow-hidden group-hover:bg-slate-100/70 transition-colors">
      <!-- If file has rawContent in metadata -->
      <div
        v-if="asset.files?.[0]?.metadata?.rawContent"
        class="h-16 w-16 text-slate-800 dark:text-slate-200"
        v-html="asset.files[0].metadata.rawContent"
      />
      <div v-else-if="asset.type === 'FONT'" class="text-3xl font-serif text-slate-800 dark:text-slate-200 font-bold">
        Aa
      </div>
      <div v-else-if="asset.type === 'ILLUSTRATION'" class="text-center text-slate-600 dark:text-slate-300">
        <svg class="h-12 w-12 mx-auto text-emerald-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <div v-else class="text-center">
        <svg class="h-12 w-12 mx-auto text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
    </div>

    <!-- Metadata Content -->
    <div class="mt-3 flex-1 flex flex-col">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600">
          {{ asset.name }}
        </h3>
      </div>
      <p class="text-xs text-slate-500 line-clamp-1 mt-0.5">
        {{ asset.description || `Digital ${asset.type.toLowerCase()} asset` }}
      </p>

      <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <span class="truncate max-w-[100px]">
          {{ asset.category?.name || 'General' }}
        </span>
        <span v-if="asset.license" class="text-slate-400 font-medium">
          {{ asset.license.name.split(' ')[0] }}
        </span>
        <span v-else class="text-amber-500 font-medium">
          No License
        </span>
      </div>
    </div>
  </div>
</template>
