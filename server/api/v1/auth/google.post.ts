import { AuthService } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string
    name?: string
    picture?: string
    googleId?: string
  }>(event)

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: 'Google email is required' })
  }

  const user = await AuthService.loginWithGoogle(body)

  setCookie(event, 'session_user_id', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400 * 7
  })

  return {
    success: true,
    data: user
  }
})
