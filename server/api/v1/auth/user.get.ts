import { getAuthContext, isDevImpersonationEnabled } from '../../../utils/supabaseClient'
import { dbStore } from '../../../utils/mockStore'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)

  // The profile directory is a development-only convenience for switching test
  // accounts. It must never be exposed on a real deployment: leaking the full
  // user list (with emails and roles) is an information disclosure risk.
  const availableProfiles = isDevImpersonationEnabled()
    ? Array.from(dbStore.profiles.values())
    : []

  return {
    success: true,
    data: auth.user,
    role: auth.role,
    availableProfiles
  }
})
