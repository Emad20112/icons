<script setup lang="ts">
import Container from '../../components/layout/Container.vue'
import AuditLogViewer from '../../components/admin/AuditLogViewer.vue'

definePageMeta({
  layout: 'admin'
})
</script>

<template>
  <Container>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">Audit Logs & Compliance</h1>
      <p class="text-xs text-slate-500">Immutable trail of critical system actions, asset creation, and administrative modifications.</p>
    </div>

    <AuditLogViewer />
  </Container>
</template>
