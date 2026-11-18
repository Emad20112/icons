import { defineEventHandler, getRouterParam, readMultipartFormData, readBody, getHeader, createError } from 'h3'
import { getAuthContext } from '../../../../utils/supabaseClient'
import { dbStore } from '../../../../utils/mockStore'
import { AssetService } from '../../../../services/assetService'
import { RepositoryService } from '../../../../services/repositoryService'
import { storageService } from '../../../../services/storageService'
import { sanitizeSvg } from '../../../../../lib/sanitizer/svgSanitizer'

export default defineEventHandler(async (event) => {
  const repositoryId = getRouterParam(event, 'id')
  if (!repositoryId) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID is required' })
  }

  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const repo = dbStore.repositories.get(repositoryId)
  if (!repo) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found' })
  }
  if (repo.owner_id !== auth.userId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Only the repository owner can add icons' })
  }

  let name = ''
  let description = ''
  let rawSvg = ''
  let originalFilename = 'custom-icon.svg'

  const contentType = getHeader(event, 'content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    if (!parts) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid multipart upload' })
    }
    for (const part of parts) {
      if (part.name === 'name') name = part.data.toString('utf-8').trim()
      if (part.name === 'description') description = part.data.toString('utf-8').trim()
      if (part.name === 'svgContent') rawSvg = part.data.toString('utf-8')
      if (part.name === 'file' && part.data?.length) {
        originalFilename = part.filename || originalFilename
        rawSvg = part.data.toString('utf-8')
      }
    }
  } else {
    const body = await readBody<{ name?: string; description?: string; svgContent?: string; filename?: string }>(event)
    name = (body?.name || '').trim()
    description = (body?.description || '').trim()
    rawSvg = body?.svgContent || ''
    if (body?.filename) originalFilename = body.filename
  }

  if (!rawSvg || !rawSvg.toLowerCase().includes('<svg')) {
    throw createError({ statusCode: 400, statusMessage: 'A valid SVG file or SVG markup is required' })
  }

  let cleanSvg: string
  try {
    cleanSvg = sanitizeSvg(rawSvg)
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: err?.message || 'Invalid SVG content' })
  }

  const derivedName = name || originalFilename.replace(/\.svg$/i, '').replace(/[-_]+/g, ' ').trim() || 'Custom Icon'

  const defaultLicense =
    Array.from(dbStore.licenses.values()).find(l => l.slug === 'mit') ||
    Array.from(dbStore.licenses.values())[0]

  const newAsset = await AssetService.createAsset(
    {
      name: derivedName,
      type: 'ICON',
      description: description || `Custom SVG icon uploaded to ${repo.name}`,
      status: 'DRAFT',
      license_id: defaultLicense?.id || null,
      metadata: {
        source: 'repository_upload',
        repository_id: repositoryId,
        uploaded_at: new Date().toISOString()
      }
    },
    auth.userId,
    auth.role
  )

  const safeFilename = storageService.sanitizeFilename(
    originalFilename.toLowerCase().endsWith('.svg') ? originalFilename : `${derivedName}.svg`
  )
  const filePath = `assets/files/${newAsset.id}/svg/${safeFilename}`

  const uploadResult = await storageService.uploadFile({
    bucket: 'assets',
    path: filePath,
    file: Buffer.from(cleanSvg, 'utf-8'),
    mimeType: 'image/svg+xml'
  })

  await AssetService.attachFile(
    {
      asset_id: newAsset.id,
      format: 'SVG',
      file_path: uploadResult.path,
      file_size: uploadResult.size,
      mime_type: 'image/svg+xml',
      width: 24,
      height: 24,
      metadata: { fullUrl: uploadResult.fullUrl, rawContent: cleanSvg }
    },
    auth.userId,
    auth.role
  )

  const repositoryItem = await RepositoryService.addItemToRepository(
    repositoryId,
    'ASSET',
    newAsset.id,
    auth.userId,
    auth.role
  )

  return {
    success: true,
    data: {
      asset: newAsset,
      repositoryItem
    }
  }
})
