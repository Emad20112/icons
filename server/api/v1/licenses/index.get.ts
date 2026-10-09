import { dbStore } from '../../../utils/mockStore'
import { getSupabaseAdminClient } from '../../../utils/supabaseClient'
import type { License } from '../../../../types/database'

export default defineEventHandler(async (event) => {
  const admin = getSupabaseAdminClient()
  if (admin) {
    const { data } = await admin
      .from('licenses')
      .select('*')
      .order('name', { ascending: true })

    if (data && data.length > 0) {
      return { success: true, data: data as License[] }
    }
  }

  const licenses = Array.from(dbStore.licenses.values()).sort((a, b) => a.name.localeCompare(b.name))

  return {
    success: true,
    data: licenses
  }
})
