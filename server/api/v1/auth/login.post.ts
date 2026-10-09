import { AuthService } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  const user = await AuthService.login(body.email)
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
