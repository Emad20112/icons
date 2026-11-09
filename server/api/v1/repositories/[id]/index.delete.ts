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

  try {
    await RepositoryService.deleteRepository(id, auth.userId, auth.role)
    return {
      success: true,
      message: 'Repository deleted successfully'
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message
    })
  }
})
