import { AuthService, sanitizeProfile } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    username?: string
    password?: string
  }>(event)

  const identifier = (body?.username || body?.email || '').trim()
  if (!identifier) {
    throw createError({ statusCode: 400, statusMessage: 'Username is required' })
  }

  if (!body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' })
  }

  try {
    const user = await AuthService.login(identifier, body.password)

    setCookie(event, 'session_user_id', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400 * 7
    })

    return {
      success: true,
      data: sanitizeProfile(user)
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 401,
      statusMessage: err.message
    })
  }
})
