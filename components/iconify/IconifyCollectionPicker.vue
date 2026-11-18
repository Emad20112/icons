<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  collections: Array<{ prefix: string; label: string; labelKey?: string }>
  activePrefix: string
}>()

defineEmits<{
  (e: 'select', prefix: string): void
}>()
</script>

<template>
  <div class="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-0">
    <button
      v-for="col in collections"
      :key="col.prefix"
      type="button"
      class="relative whitespace-nowrap px-3.5 py-2.5 text-xs font-medium transition-colors"
      :class="activePrefix === col.prefix
        ? 'text-blue-600 dark:text-blue-400 font-semibold'
        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'"
      @click="$emit('select', col.prefix)"
    >
      <span>{{ col.labelKey ? t(col.labelKey) : col.label }}</span>
      <span
        v-if="activePrefix === col.prefix"
        class="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400"
      />
    </button>
  </div>
</template>
