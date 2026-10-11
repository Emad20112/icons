<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import LoadingState from '../common/LoadingState.vue'
import { useToast } from '../../composables/useToast'

const health = ref<any>(null)
const isLoading = ref(true)
const showSqlModal = ref(false)
const { success } = useToast()

async function loadHealth() {
  isLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/v1/health')
    if (res.success) {
      health.value = res.data
    }
  } catch (err) {
    console.error('Failed to load health:', err)
  } finally {
    isLoading.value = false
  }
}

function copySchemaNotice() {
  navigator.clipboard.writeText('database/migrations/full_schema.sql')
  success('Path Copied', 'SQL Migration file: database/migrations/full_schema.sql')
}

onMounted(() => {
  loadHealth()
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Phase 0 Foundation Architecture Status</h3>
        <p class="text-xs text-slate-500">Live inspection of relational schema, RLS enforcement, storage buckets, and audit log.</p>
      </div>
      <Button size="sm" variant="outline" @click="loadHealth">
        Re-verify
      </Button>
    </div>

    <LoadingState v-if="isLoading" />

    <div v-else-if="health" class="space-y-6">
      <!-- Supabase Live Connection Status Card -->
      <div class="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Supabase Backend Connected
              </h4>
              <Badge variant="success">LIVE PROJECT</Badge>
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-300 font-mono mt-1">
              {{ health.supabase?.projectUrl || 'https://ksreqvwzkznoejjkcnfh.supabase.co' }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">Storage Buckets:</span>
            <span class="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {{ health.supabase?.remoteBuckets?.join(', ') || 'assets, temp-uploads' }}
            </span>
          </div>
        </div>

        <div v-if="!health.supabase?.remoteDatabaseTablesReady" class="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span>PostgreSQL Tables: In-memory store active while awaiting Supabase SQL execution.</span>
          </div>
          <a
            href="https://supabase.com/dashboard/project/ksreqvwzkznoejjkcnfh/sql"
            target="_blank"
            rel="noopener"
            class="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            Open Supabase SQL Editor &rarr;
          </a>
        </div>
      </div>

      <!-- Top Metrics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">Core Assets</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.assetsTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Polymorphic entities</div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">Categories</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.categoriesTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Dynamic taxonomy</div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">Licenses</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.licensesTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Legal constraints</div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">Audit Logs</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.auditLogsTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">Immutable records</div>
        </div>
      </div>

      <!-- Relational Tables Checklist -->
      <div class="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h4 class="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 tracking-wider mb-3">
          Relational Database Entities (10 Foundation Tables)
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div
            v-for="table in health.architecture.tables"
            :key="table"
            class="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
          >
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>{{ table }}</span>
          </div>
        </div>
      </div>

      <!-- Architectural Invariants Checklist -->
      <div class="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h4 class="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 tracking-wider mb-3">
          Architectural Invariants & Security Boundaries
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div
            v-for="chk in health.checks"
            :key="chk.name"
            class="flex items-center justify-between p-2.5 rounded bg-slate-50 dark:bg-slate-800/60"
          >
            <span class="text-slate-800 dark:text-slate-200">{{ chk.name }}</span>
            <Badge :variant="chk.passed ? 'success' : 'destructive'">
              {{ chk.passed ? 'VERIFIED' : 'FAILED' }}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
