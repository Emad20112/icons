import { RepositoryService } from '../../../../services/repositoryService'
import { getAuthContext } from '../../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID is required' })
  }

  const auth = await getAuthContext(event)

  try {
    const repository = await RepositoryService.getRepositoryById(
      id,
      auth.userId,
      auth.role
    )

    return {
      success: true,
      data: repository
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message
    })
  }
})
