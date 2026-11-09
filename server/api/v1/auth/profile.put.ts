import { AuthService } from '../../../services/authService'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody<{
    display_name?: string
    avatar_url?: string
    username?: string
    bio?: string
    password?: string
  }>(event)

  try {
    const updated = await AuthService.updateProfile(
      auth.userId,
      body,
      auth.userId,
      auth.role
    )

    return {
      success: true,
      data: updated
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message
    })
  }
})
