<script setup lang="ts">
import Container from './Container.vue'
</script>

<template>
  <footer class="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900 mt-auto">
    <Container class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-slate-700 dark:text-slate-300">Digital Assets Platform</span>
        <span>•</span>
        <span>Phase 0: Foundation</span>
        <span>•</span>
        <span>PostgreSQL 16 & Supabase RLS</span>
      </div>
      <div class="flex items-center gap-6">
        <span>Polymorphic Schema (Icons, Fonts, Illustrations, Logos, Templates)</span>
        <span>Decoupled Storage</span>
        <span>Full Audit Trail</span>
      </div>
    </Container>
  </footer>
</template>
