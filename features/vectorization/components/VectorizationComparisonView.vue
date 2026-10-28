<script setup lang="ts">
import { computed } from 'vue'
import {
  Layers,
  Activity,
  FileCode,
  HardDrive,
  Clock,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { VectorizationStats } from '../types/vectorization'

const props = defineProps<{
  stats: VectorizationStats
}>()

const { t } = useI18n()

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
    <div class="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
      <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
        <Activity class="w-4 h-4" />
      </div>
      <div>
        <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          {{ t('vectorizer.stats.title') }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ stats.width }} × {{ stats.height }} px
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- Paths -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <Layers class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.stats.pathCount') }}</span>
        </div>
        <p class="mt-1 text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
          {{ stats.pathCount }}
        </p>
      </div>

      <!-- Nodes -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <Sparkles class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.stats.nodeCount') }}</span>
        </div>
        <p class="mt-1 text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
          {{ stats.nodeCount }}
        </p>
      </div>

      <!-- Colors -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <Zap class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.stats.colorCount') }}</span>
        </div>
        <p class="mt-1 text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
          {{ stats.colorCount }}
        </p>
      </div>

      <!-- SVG Size -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <FileCode class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{{ t('vectorizer.stats.svgSize') }}</span>
        </div>
        <p class="mt-1 text-base sm:text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
          {{ formatBytes(stats.svgByteSize) }}
        </p>
      </div>

      <!-- Original Size -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <HardDrive class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.stats.originalSize') }}</span>
        </div>
        <p class="mt-1 text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
          {{ stats.originalByteSize > 0 ? formatBytes(stats.originalByteSize) : 'N/A' }}
        </p>
      </div>

      <!-- Trace Time -->
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
          <Clock class="w-3.5 h-3.5" />
          <span>{{ t('vectorizer.stats.renderTime') }}</span>
        </div>
        <p class="mt-1 text-base sm:text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {{ stats.durationMs }} ms
        </p>
      </div>
    </div>
  </div>
</template>
