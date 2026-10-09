import { dbStore } from '../../../utils/mockStore'
import { getAuthContext } from '../../../utils/supabaseClient'
import { CategoryCreateSchema } from '../../../../lib/validation/schemas'
import { slugify } from '../../../../lib/sanitizer/filenameSanitizer'
import { AuditService } from '../../../services/auditService'
import type { Category } from '../../../../types/database'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId || auth.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only Administrators can create categories'
    })
  }

  const body = await readBody(event)
  const validation = CategoryCreateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error.issues[0]?.message || 'Validation error'
    })
  }

  const { name, description, icon } = validation.data
  const slug = validation.data.slug || slugify(name)

  const existing = Array.from(dbStore.categories.values()).find(c => c.slug === slug)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Category with slug "${slug}" already exists`
    })
  }

  const catId = `c${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const newCat: Category = {
    id: catId,
    name: name.trim(),
    slug,
    description: description || null,
    icon: icon || 'Tag',
    is_active: true,
    created_at: new Date().toISOString()
  }

  dbStore.categories.set(catId, newCat)

  await AuditService.log({
    actorId: auth.userId,
    action: 'CREATE_CATEGORY',
    entityType: 'CATEGORY',
    entityId: catId,
    metadata: { name: newCat.name, slug: newCat.slug }
  })

  return {
    success: true,
    data: newCat
  }
})
