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

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Only administrators can delete font families' })
  }

  const family = Array.from(dbStore.fontFamilies.values()).find(f => f.slug === slug || f.id === slug)
  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Font family not found' })
  }

  // Delete associated font files
  const fileIdsToDelete = Array.from(dbStore.fontFiles.values())
    .filter(ff => ff.family_id === family.id)
    .map(ff => ff.id)

  for (const fId of fileIdsToDelete) {
    dbStore.fontFiles.delete(fId)
  }

  // Remove from repository items
  const repoItemsToDelete = Array.from(dbStore.repositoryItems.entries())
    .filter(([_, ri]) => ri.item_type === 'FONT' && ri.item_id === family.id)
    .map(([key]) => key)

  for (const k of repoItemsToDelete) {
    dbStore.repositoryItems.delete(k)
  }

  dbStore.fontFamilies.delete(family.id)

  return {
    success: true,
    message: 'Font family deleted successfully'
  }
})
