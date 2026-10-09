import { dbStore } from '../../../utils/mockStore'
import { getAuthContext } from '../../../utils/supabaseClient'
import { LicenseCreateSchema } from '../../../../lib/validation/schemas'
import { slugify } from '../../../../lib/sanitizer/filenameSanitizer'
import { AuditService } from '../../../services/auditService'
import type { License } from '../../../../types/database'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId || auth.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only Administrators can create licenses'
    })
  }

  const body = await readBody(event)
  const validation = LicenseCreateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error.issues[0]?.message || 'Validation error'
    })
  }

  const { name, url, commercial_use, redistribution, modification, attribution_required } = validation.data
  const slug = validation.data.slug || slugify(name)

  const existing = Array.from(dbStore.licenses.values()).find(l => l.slug === slug)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `License with slug "${slug}" already exists`
    })
  }

  const licenseId = `l${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const newLic: License = {
    id: licenseId,
    name: name.trim(),
    slug,
    url: url || null,
    commercial_use,
    redistribution,
    modification,
    attribution_required,
    created_at: new Date().toISOString()
  }

  dbStore.licenses.set(licenseId, newLic)

  await AuditService.log({
    actorId: auth.userId,
    action: 'CREATE_LICENSE',
    entityType: 'LICENSE',
    entityId: licenseId,
    metadata: { name: newLic.name, slug: newLic.slug, commercial_use }
  })

  return {
    success: true,
    data: newLic
  }
})
