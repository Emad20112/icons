import { defineEventHandler, getRouterParam, getQuery, createError, setHeaders } from 'h3'
import { getAuthContext } from '../../../../../../utils/supabaseClient'
import { RepositoryService } from '../../../../../../services/repositoryService'
import { FontDownloadService } from '../../../../../../services/fontDownloadService'

export default defineEventHandler(async (event) => {
  const repositoryId = getRouterParam(event, 'id')
  const fontId = getRouterParam(event, 'fontId')

  if (!repositoryId || !fontId) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID and Font ID are required' })
  }

  const auth = await getAuthContext(event)

  try {
    await RepositoryService.assertCanDownload(repositoryId, 'FONT', fontId, auth.userId, auth.role)
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 403, statusMessage: err.message })
  }

  const query = getQuery(event)
  const fileId = query.file_id ? String(query.file_id) : undefined

  try {
    const download = await FontDownloadService.prepareDownload(fontId, fileId)
    setHeaders(event, {
      'Content-Type': download.contentType,
      'Content-Disposition': `attachment; filename="${download.fileName}"`,
      'Content-Length': download.buffer.length.toString(),
      'Cache-Control': 'private, no-store',
    })
    return download.buffer
  } catch (err: any) {
    throw createError({
      statusCode: 404,
      statusMessage: err?.message || 'Font download failed'
    })
  }
})
