import { defineEventHandler, getQuery, createError, setHeaders } from 'h3'
import { FontDownloadService } from '~/server/services/fontDownloadService'

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Missing font slug or id' })
  }

  const query = getQuery(event)
  const fileId = query.file_id ? String(query.file_id) : undefined

  try {
    const download = await FontDownloadService.prepareDownload(slug, fileId)

    setHeaders(event, {
      'Content-Type': download.contentType,
      'Content-Disposition': `attachment; filename="${download.fileName}"`,
      'Content-Length': download.buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400, immutable',
    })

    return download.buffer
  } catch (err: any) {
    throw createError({
      statusCode: 404,
      message: err?.message || 'Font download failed',
    })
  }
})
