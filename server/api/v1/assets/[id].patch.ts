import { AssetService } from '../../../services/assetService'
import { getAuthContext } from '../../../utils/supabaseClient'
import { AssetUpdateSchema } from '../../../../lib/validation/schemas'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Asset ID is required' })
  }

  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody(event)
  const validation = AssetUpdateSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error.issues[0]?.message || 'Validation error'
    })
  }

  try {
    const updated = await AssetService.updateAsset(id, validation.data, auth.userId, auth.role)
    return {
      success: true,
      data: updated
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message
    })
  }
})
