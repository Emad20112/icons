import { dbStore } from '../../../utils/mockStore'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Font slug is required' })
  }

  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const family = Array.from(dbStore.fontFamilies.values()).find(f => f.slug === slug || f.id === slug)
  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Font family not found' })
  }

  // Admin or owner check
  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Only administrators or authors can modify font details' })
  }

  const body = await readBody<{
    display_name?: string
    description?: string
    designer?: string
    foundry?: string
    primary_category?: string
    arabic_style?: string
    preview_text_sample?: string
  }>(event)

  const updated = {
    ...family,
    display_name: body.display_name !== undefined ? body.display_name : family.display_name,
    description: body.description !== undefined ? body.description : family.description,
    designer: body.designer !== undefined ? body.designer : family.designer,
    foundry: body.foundry !== undefined ? body.foundry : family.foundry,
    primary_category: body.primary_category !== undefined ? body.primary_category : family.primary_category,
    arabic_style: body.arabic_style !== undefined ? body.arabic_style : family.arabic_style,
    preview_text_sample: body.preview_text_sample !== undefined ? body.preview_text_sample : family.preview_text_sample,
    updated_at: new Date().toISOString()
  }

  dbStore.fontFamilies.set(family.id, updated)

  return {
    success: true,
    data: updated
  }
})
