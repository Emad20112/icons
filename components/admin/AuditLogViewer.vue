<script setup lang="ts">
import { onMounted } from 'vue'
import { useAudit } from '../../composables/useAudit'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import LoadingState from '../common/LoadingState.vue'
import EmptyState from '../common/EmptyState.vue'

const { auditLogs, isLoading, fetchLogs } = useAudit()

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
    <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Immutable Audit Trail</h3>
        <p class="text-xs text-slate-500">Recorded system operations, mutations, and administrative activities.</p>
      </div>
      <Button size="sm" variant="outline" @click="fetchLogs">
        Refresh Trail
      </Button>
    </div>

    <LoadingState v-if="isLoading" />

    <EmptyState
      v-else-if="auditLogs.length === 0"
      title="No audit entries"
      description="Administrative operations and mutations will appear here."
    />

    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-xs text-slate-600 dark:text-slate-400">
        <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
          <tr>
            <th class="px-6 py-3">Timestamp</th>
            <th class="px-6 py-3">Action</th>
            <th class="px-6 py-3">Entity Type</th>
            <th class="px-6 py-3">Target ID</th>
            <th class="px-6 py-3">Actor</th>
            <th class="px-6 py-3">Metadata</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
          <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
            <td class="px-6 py-3.5 whitespace-nowrap text-slate-400">
              {{ new Date(log.created_at).toLocaleTimeString() }}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap">
              <Badge
                :variant="
                  log.action.includes('CREATE') ? 'success' :
                  log.action.includes('DELETE') ? 'destructive' :
                  log.action.includes('UPDATE') ? 'warning' : 'default'
                "
              >
                {{ log.action }}
              </Badge>
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap font-sans font-medium text-slate-700 dark:text-slate-300">
              {{ log.entity_type }}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-slate-500 truncate max-w-[120px]">
              {{ log.entity_id }}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap font-sans">
              {{ log.actor?.display_name || log.actor_id || 'System' }}
            </td>
            <td class="px-6 py-3.5 font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
              {{ JSON.stringify(log.metadata) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
