import { defineEventHandler, getRouterParam, createError, setHeader } from 'h3'
import { getAuthContext } from '../../../../../../utils/supabaseClient'
import { dbStore } from '../../../../../../utils/mockStore'
import { RepositoryService } from '../../../../../../services/repositoryService'
import { slugify } from '../../../../../../../lib/sanitizer/filenameSanitizer'

export default defineEventHandler(async (event) => {
  const repositoryId = getRouterParam(event, 'id')
  const assetId = getRouterParam(event, 'assetId')

  if (!repositoryId || !assetId) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID and Asset ID are required' })
  }

  const auth = await getAuthContext(event)

  try {
    await RepositoryService.assertCanDownload(repositoryId, 'ASSET', assetId, auth.userId, auth.role)
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 403, statusMessage: err.message })
  }

  const asset = dbStore.assets.get(assetId)
  if (!asset) {
    throw createError({ statusCode: 404, statusMessage: 'Icon asset not found' })
  }

  const files = Array.from(dbStore.assetFiles.values()).filter(f => f.asset_id === assetId)
  const svgFile = files.find(f => f.format.toUpperCase() === 'SVG' || f.mime_type.includes('svg')) || files[0]

  let content: Buffer | string | null = svgFile?.metadata?.rawContent || null
  let mimeType = svgFile?.mime_type || 'image/svg+xml'

  if (!content && svgFile?.file_path) {
    const bucket = dbStore.storageBuckets.get('assets')
    const stored = bucket?.get(svgFile.file_path)
    if (stored) {
      content = stored.buffer
      mimeType = stored.mimeType || mimeType
    }
  }

  if (!content) {
    throw createError({ statusCode: 404, statusMessage: 'Icon file payload not found' })
  }

  // Increment download counter
  dbStore.assets.set(asset.id, {
    ...asset,
    download_count: (asset.download_count || 0) + 1
  })

  const fileSlug = slugify(asset.slug || asset.name || 'icon') || 'icon'
  const ext = svgFile?.format ? svgFile.format.toLowerCase() : 'svg'

  setHeader(event, 'Content-Type', mimeType)
  setHeader(event, 'Content-Disposition', `attachment; filename="${fileSlug}.${ext}"`)
  return content
})
