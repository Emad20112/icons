import { AssetService, SortOption } from '../../../services/assetService'
import { getAuthContext } from '../../../utils/supabaseClient'
import type { AssetType, AssetStatus } from '../../../../types/database'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const auth = await getAuthContext(event)

  // Support both 'q' and 'search'
  const searchTerm = (query.q as string | undefined) ?? (query.search as string | undefined)

  // Support both 'tag' and 'tags'
  const tagParam = (query.tag as string | string[] | undefined) ?? (query.tags as string | string[] | undefined)

  const filter = {
    type: query.type as AssetType | undefined,
    categorySlug: query.category as string | undefined,
    licenseSlug: query.license as string | undefined,
    tagSlugs: tagParam,
    search: searchTerm,
    status: query.status as AssetStatus | undefined,
    isFeatured: query.featured === 'true' ? true : undefined,
    sort: query.sort as SortOption | undefined,
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 24,
    offset: query.offset ? Number(query.offset) : undefined,
  }

  const result = await AssetService.listAssets(filter, auth.userId, auth.role)
  return {
    success: true,
    data: result.assets,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    query: result.query
  }
})
