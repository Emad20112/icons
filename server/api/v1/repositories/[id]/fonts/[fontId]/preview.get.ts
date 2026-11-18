import { defineEventHandler, getRouterParam, getQuery, createError, setHeaders } from 'h3'
import { getAuthContext } from '../../../../../../utils/supabaseClient'
import { dbStore } from '../../../../../../utils/mockStore'
import { RepositoryService } from '../../../../../../services/repositoryService'
import { FontStorageService } from '../../../../../../services/fontStorageService'

export default defineEventHandler(async (event) => {
  const repositoryId = getRouterParam(event, 'id')
  const fontId = getRouterParam(event, 'fontId')

  if (!repositoryId || !fontId) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID and Font ID are required' })
  }

  const auth = await getAuthContext(event)

  try {
    // Enforces PRIVATE repository isolation
    await RepositoryService.getRepositoryById(repositoryId, auth.userId, auth.role)
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 403, statusMessage: err.message })
  }

  const query = getQuery(event)
  const fileId = query.file_id ? String(query.file_id) : undefined

  const files = Array.from(dbStore.fontFiles.values()).filter(f => f.family_id === fontId)
  const target = (fileId ? files.find(f => f.id === fileId) : null) || files[0]
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Font preview file not found' })
  }

  const buf = await FontStorageService.getFontFileBuffer(target.storage_path)
  if (!buf) {
    throw createError({ statusCode: 404, statusMessage: 'Font binary not found in storage' })
  }

  const mimeMap: Record<string, string> = {
    WOFF2: 'font/woff2',
    WOFF: 'font/woff',
    OTF: 'font/otf',
    TTF: 'font/ttf'
  }

  setHeaders(event, {
    'Content-Type': mimeMap[target.file_format] || 'font/ttf',
    'Content-Disposition': `inline; filename="${target.file_name}"`,
    'Cache-Control': 'public, max-age=3600',
  })

  return buf
})
