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
const { t } = useI18n()

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
  success(t('foundationStatus.pathCopied'), {
    key: 'foundationStatus.pathCopiedMessage',
    params: { path: 'database/migrations/full_schema.sql' }
  })
}

onMounted(() => {
  loadHealth()
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('foundationStatus.title') }}</h3>
        <p class="text-xs text-slate-500">{{ t('foundationStatus.description') }}</p>
      </div>
      <Button size="sm" variant="outline" @click="loadHealth">
        {{ t('foundationStatus.reverify') }}
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
                {{ t('foundationStatus.backendConnected') }}
              </h4>
              <Badge variant="success">{{ t('foundationStatus.liveProject') }}</Badge>
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-300 font-mono mt-1">
              {{ health.supabase?.projectUrl || 'https://ksreqvwzkznoejjkcnfh.supabase.co' }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">{{ t('foundationStatus.storageBuckets') }}</span>
            <span class="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
              {{ health.supabase?.remoteBuckets?.join(', ') || 'assets, temp-uploads' }}
            </span>
          </div>
        </div>

        <div v-if="!health.supabase?.remoteDatabaseTablesReady" class="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span>{{ t('foundationStatus.tablesPending') }}</span>
          </div>
          <a
            href="https://supabase.com/dashboard/project/ksreqvwzkznoejjkcnfh/sql"
            target="_blank"
            rel="noopener"
            class="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            {{ t('foundationStatus.openSqlEditor') }} <span class="rtl:rotate-180 inline-block" aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>

      <!-- Top Metrics -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">{{ t('foundationStatus.metrics.assets') }}</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.assetsTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">{{ t('foundationStatus.metrics.assetsHint') }}</div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">{{ t('foundationStatus.metrics.categories') }}</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.categoriesTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">{{ t('foundationStatus.metrics.categoriesHint') }}</div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">{{ t('foundationStatus.metrics.licenses') }}</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.licensesTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">{{ t('foundationStatus.metrics.licensesHint') }}</div>
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold text-slate-500 uppercase">{{ t('foundationStatus.metrics.audit') }}</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">{{ health.counts.auditLogsTotal }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">{{ t('foundationStatus.metrics.auditHint') }}</div>
        </div>
      </div>

      <!-- Relational Tables Checklist -->
      <div class="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h4 class="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 tracking-wider mb-3">
          {{ t('foundationStatus.tablesTitle') }}
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
          {{ t('foundationStatus.invariantsTitle') }}
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div
            v-for="chk in health.checks"
            :key="chk.name"
            class="flex items-center justify-between p-2.5 rounded bg-slate-50 dark:bg-slate-800/60"
          >
            <span class="text-slate-800 dark:text-slate-200">{{ chk.name }}</span>
            <Badge :variant="chk.passed ? 'success' : 'destructive'">
              {{ chk.passed ? t('foundationStatus.verified') : t('foundationStatus.failed') }}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
