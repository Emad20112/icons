import { dbStore } from '../../../utils/mockStore'
import { getSupabaseAdminClient } from '../../../utils/supabaseClient'
import type { Category } from '../../../../types/database'

export default defineEventHandler(async (event) => {
  const admin = getSupabaseAdminClient()
  if (admin) {
    const { data } = await admin
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (data && data.length > 0) {
      return { success: true, data: data as Category[] }
    }
  }

  const activeCategories = Array.from(dbStore.categories.values())
    .filter(c => c.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    success: true,
    data: activeCategories
  }
})
