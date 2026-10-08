import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import type { AuditLog } from '../../types/database'
import { logger } from '../../lib/logger/logger'

export interface LogActionParams {
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, any>
  ipAddress?: string
}

export class AuditService {
  public static async log(params: LogActionParams): Promise<AuditLog> {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || '127.0.0.1',
      created_at: new Date().toISOString()
    }

    // 1. Log to structured application logger
    logger.info(`Audit: ${params.action} on ${params.entityType}:${params.entityId}`, 'AuditService', entry)

    // 2. Persist to real Supabase if connected
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        await admin.from('audit_logs').insert([entry])
      } catch (err: any) {
        logger.error('Failed to write audit log to remote Supabase', 'AuditService', err)
      }
    }

    // 3. Always maintain in in-memory audit store for immediate queries
    dbStore.auditLogs.unshift(entry)
    // Keep max 500 in memory
    if (dbStore.auditLogs.length > 500) {
      dbStore.auditLogs.pop()
    }

    return entry
  }

  public static async getLogs(limit = 50): Promise<AuditLog[]> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      const { data, error } = await admin
        .from('audit_logs')
        .select('*, actor:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        return data as AuditLog[]
      }
    }

    return dbStore.auditLogs.slice(0, limit).map((log) => ({
      ...log,
      actor: log.actor_id ? dbStore.profiles.get(log.actor_id) || null : null
    }))
  }
}
