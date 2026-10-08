import { getAuthContext } from '../../../utils/supabaseClient'
import { dbStore } from '../../../utils/mockStore'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  const allProfiles = Array.from(dbStore.profiles.values())

  return {
    success: true,
    data: auth.user,
    role: auth.role,
    availableProfiles: allProfiles // For easy test switching in Phase 0 UI
  }
})
