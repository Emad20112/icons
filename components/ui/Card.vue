<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
    <div v-if="$slots.header" class="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
      <slot name="header" />
    </div>
    <div class="p-6">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-6 py-3 bg-slate-50 border-t border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
      <slot name="footer" />
    </div>
  </div>
</template>
