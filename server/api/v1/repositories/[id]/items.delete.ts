import { RepositoryService } from '../../../../services/repositoryService'
import { getAuthContext } from '../../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID is required' })
  }

  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody<{ item_type: 'ASSET' | 'FONT'; item_id: string }>(event)

  if (!body?.item_type || !body?.item_id) {
    throw createError({ statusCode: 400, statusMessage: 'item_type and item_id are required' })
  }

  try {
    await RepositoryService.removeItemFromRepository(
      id,
      body.item_type,
      body.item_id,
      auth.userId,
      auth.role
    )

    return {
      success: true,
      message: 'Item removed from repository'
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message
    })
  }
})
