<template>
  <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
    <button
      v-for="col in collections"
      :key="col.prefix"
      @click="$emit('select', col.prefix)"
      :class="[
        'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
        activePrefix === col.prefix
          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      ]"
    >
      <span>{{ col.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  collections: Array<{ prefix: string; label: string }>
  activePrefix: string
}>()

defineEmits<{
  (e: 'select', prefix: string): void
}>()
</script>
