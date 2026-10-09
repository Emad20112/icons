<script setup lang="ts">
import Container from '../../components/layout/Container.vue'
import FoundationStatus from '../../components/admin/FoundationStatus.vue'
import Button from '../../components/ui/Button.vue'
import { useAuth } from '../../composables/useAuth'

definePageMeta({
  layout: 'admin'
})

const { role, isAdmin } = useAuth()
</script>

<template>
  <Container>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Governance & Platform Architecture</h1>
        <p class="text-xs text-slate-500 mt-1">Foundation administration for multi-category digital assets.</p>
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/assets">
          <Button size="sm" variant="outline">Moderate Assets</Button>
        </NuxtLink>
        <NuxtLink to="/admin/audit">
          <Button size="sm" variant="primary">View Audit Trail</Button>
        </NuxtLink>
      </div>
    </div>

    <!-- Active Role Warning if User is standard user -->
    <div v-if="!isAdmin" class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <strong>Active Mode: USER</strong>. You are currently viewing the platform with standard USER privileges. Use the Role switcher in the top bar to toggle to ADMIN to test and verify privileged operations.
    </div>

    <FoundationStatus />
  </Container>
</template>
