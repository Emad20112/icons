import { AuthService } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = query.username as string
  const excludeUserId = query.excludeUserId as string | undefined

  if (!username) {
    return { success: false, available: false, message: 'Username parameter required' }
  }

  const available = await AuthService.isUsernameAvailable(username, excludeUserId)
  return {
    success: true,
    available,
    username: username.trim().toLowerCase()
  }
})
