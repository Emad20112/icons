import { AssetService } from '../../../services/assetService'
import { getAuthContext } from '../../../utils/supabaseClient'
import { AssetCreateSchema } from '../../../../lib/validation/schemas'
import { AuthenticationError, ValidationError } from '../../../../lib/errors/AppError'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.user || !auth.userId || !auth.role) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const body = await readBody(event)
  const validation = AssetCreateSchema.safeParse(body)

  if (!validation.success) {
    const issue = validation.error.issues[0]
    throw createError({
      statusCode: 400,
      statusMessage: issue.message || 'Validation failed',
      data: validation.error.format()
    })
  }

  try {
    const created = await AssetService.createAsset(validation.data, auth.userId, auth.role)
    return {
      success: true,
      data: created
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message
    })
  }
})
