export default defineEventHandler(async (event) => {
  deleteCookie(event, 'session_user_id')
  return {
    success: true
  }
})
