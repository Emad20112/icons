import { ref } from 'vue'
import type { AuditLog } from '../types/database'
import { useAuth } from './useAuth'

export function useAudit() {
  const auditLogs = ref<AuditLog[]>([])
  const isLoading = ref<boolean>(false)
  const { role } = useAuth()

  async function fetchLogs(limit = 50) {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: AuditLog[] }>('/api/v1/audit', {
        params: { limit },
        headers: { 'x-user-role': role.value }
      })
      if (res.success) {
        auditLogs.value = res.data
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    auditLogs,
    isLoading,
    fetchLogs
  }
}
