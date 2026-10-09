import { AssetService } from '../../../../services/assetService'
import { getAuthContext } from '../../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Asset ID is required' })
  }

  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 8
  const auth = await getAuthContext(event)

  try {
    const related = await AssetService.getRelatedAssets(id, limit, auth.userId, auth.role)
    return {
      success: true,
      data: related
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message
    })
  }
})
