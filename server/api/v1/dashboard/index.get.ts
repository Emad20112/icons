import { dbStore } from '../../utils/mockStore'
import { getAuthContext } from '../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const auth = await getAuthContext(event)
  if (!auth.userId) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const userId = auth.userId
  const isAdmin = auth.role === 'ADMIN'

  // 1. User repositories
  const repos = Array.from(dbStore.repositories.values()).filter(r => r.owner_id === userId || (isAdmin && r.visibility === 'PUBLIC'))

  // 2. User icons/assets
  const assets = Array.from(dbStore.assets.values()).filter(a => a.author_id === userId)

  // 3. Fonts in user's repositories or authored by user
  const repoIds = new Set(repos.map(r => r.id))
  const fontIds = Array.from(dbStore.repositoryItems.values())
    .filter(ri => ri.item_type === 'FONT' && repoIds.has(ri.repository_id))
    .map(ri => ri.item_id)

  const fonts = Array.from(dbStore.fontFamilies.values()).filter(f => fontIds.includes(f.id))

  // 4. Favorites (assets favorited by this user)
  const favoriteAssetIds = new Set(
    dbStore.auditLogs
      .filter(l => l.actor_id === userId && l.action === 'FAVORITE_ASSET')
      .map(l => l.entity_id)
  )
  const favorites = Array.from(dbStore.assets.values()).filter(a => favoriteAssetIds.has(a.id))

  // 5. Statistics aggregation
  const totalDownloads = assets.reduce((sum, a) => sum + (a.download_count || 0), 0)
  const totalFavorites = assets.reduce((sum, a) => sum + (a.favorite_count || 0), 0)

  return {
    success: true,
    data: {
      user: auth.user,
      stats: {
        repositories_count: repos.length,
        fonts_count: fonts.length,
        assets_count: assets.length,
        favorites_count: favorites.length,
        downloads_received: totalDownloads,
        favorites_received: totalFavorites
      },
      repositories: repos,
      assets,
      fonts,
      favorites
    }
  }
})
