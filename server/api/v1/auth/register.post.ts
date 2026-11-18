import { AuthService, sanitizeProfile } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    displayName?: string
    username?: string
    password?: string
  }>(event)

  const username = body?.username?.trim()
  const password = body?.password

  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Username is required' })
  }

  if (!password || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters' })
  }

  try {
    const user = await AuthService.register(body?.email || null, body?.displayName, username, password)

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
      statusCode: err.statusCode || 400,
      statusMessage: err.message
    })
  }
})
