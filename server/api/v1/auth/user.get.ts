import { getAuthContext, isDevImpersonationEnabled } from '../../../utils/supabaseClient'
import { dbStore } from '../../../utils/mockStore'
import { sanitizeProfile } from '../../../services/authService'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)

  const availableProfiles = isDevImpersonationEnabled()
    ? Array.from(dbStore.profiles.values()).map(p => sanitizeProfile(p))
    : []

  return {
    success: true,
    data: sanitizeProfile(auth.user),
    role: auth.role,
    availableProfiles
  }
})
