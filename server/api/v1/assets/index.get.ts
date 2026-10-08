import { AssetService } from '../../../services/assetService'
import { getAuthContext } from '../../../utils/supabaseClient'
import type { AssetType, AssetStatus } from '../../../../types/database'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const auth = await getAuthContext(event)

  const filter = {
    type: query.type as AssetType | undefined,
    categorySlug: query.category as string | undefined,
    licenseSlug: query.license as string | undefined,
    search: query.search as string | undefined,
    status: query.status as AssetStatus | undefined,
    isFeatured: query.featured === 'true' ? true : undefined,
    limit: query.limit ? Number(query.limit) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  }

  const result = await AssetService.listAssets(filter, auth.userId, auth.role)
  return {
    success: true,
    data: result.assets,
    total: result.total
  }
})
