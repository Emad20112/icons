import { AuthService } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    username?: string
    password?: string
  }>(event)

  const identifier = body?.username || body?.email
  if (!identifier) {
    throw createError({ statusCode: 400, statusMessage: 'Username or email is required' })
  }

  const user = await AuthService.login(identifier, body?.password)
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
