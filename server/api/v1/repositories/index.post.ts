import { RepositoryService } from '../../../services/repositoryService'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody(event)

  try {
    const repository = await RepositoryService.createRepository(
      body,
      auth.userId,
      auth.role
    )

    return {
      success: true,
      data: repository
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message
    })
  }
})
