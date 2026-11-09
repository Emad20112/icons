import { AuthService } from '../../../services/authService'
import { dbStore } from '../../../utils/mockStore'
import { getAuthContext } from '../../../utils/supabaseClient'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Username is required' })
  }

  const clean = username.startsWith('@') ? username.slice(1) : username
  const profile = await AuthService.getProfileByUsername(clean)

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }

  const auth = await getAuthContext(event)
  const isOwner = auth.userId === profile.id
  const isAdmin = auth.role === 'ADMIN'

  // Fetch user's public repositories (or all if owner/admin)
  const repos = Array.from(dbStore.repositories.values()).filter(r => {
    if (r.owner_id !== profile.id) return false
    if (r.visibility === 'PUBLIC') return true
    return isOwner || isAdmin
  })

  // Fetch user's published assets (or all if owner/admin)
  const assets = Array.from(dbStore.assets.values()).filter(a => {
    if (a.author_id !== profile.id) return false
    if (a.status === 'PUBLISHED') return true
    return isOwner || isAdmin
  })

  // Fetch fonts associated with user's repositories or authored by user
  const repoIds = new Set(repos.map(r => r.id))
  const fontIdsInRepos = Array.from(dbStore.repositoryItems.values())
    .filter(ri => ri.item_type === 'FONT' && repoIds.has(ri.repository_id))
    .map(ri => ri.item_id)

  const fonts = Array.from(dbStore.fontFamilies.values()).filter(f =>
    fontIdsInRepos.includes(f.id) || (isOwner && f.publication_status === 'PUBLISHED')
  )

  return {
    success: true,
    data: {
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio || null,
        role: profile.role,
        created_at: profile.created_at
      },
      stats: {
        repositories_count: repos.length,
        assets_count: assets.length,
        fonts_count: fonts.length
      },
      repositories: repos,
      assets,
      fonts
    }
  }
})
