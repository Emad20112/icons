import { AssetService } from '../../../services/assetService'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Asset ID is required' })
  }

  const auth = await getAuthContext(event)

  try {
    const asset = await AssetService.getAssetById(id, auth.userId, auth.role)
    return {
      success: true,
      data: asset
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 404,
      statusMessage: err.message
    })
  }
})
