import { RepositoryService } from '../../../services/repositoryService'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  const query = getQuery(event)

  const ownerId = query.owner_id as string | undefined
  const search = query.q as string | undefined

  const repositories = await RepositoryService.listRepositories(
    auth.userId,
    auth.role,
    { ownerId, search }
  )

  return {
    success: true,
    data: repositories
  }
})
