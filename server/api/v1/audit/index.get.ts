import { AuditService } from '../../../services/auditService'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId || auth.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only Administrators can view system audit logs'
    })
  }

  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 50

  const logs = await AuditService.getLogs(limit)
  return {
    success: true,
    data: logs
  }
})
