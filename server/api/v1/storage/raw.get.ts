import { dbStore } from '../../../utils/mockStore'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const bucketName = (query.bucket as string) || 'assets'
  const path = query.path as string

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Path parameter is required' })
  }

  const bucket = dbStore.storageBuckets.get(bucketName)
  if (!bucket || !bucket.has(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Storage object not found' })
  }

  const fileItem = bucket.get(path)!
  setHeader(event, 'Content-Type', fileItem.mimeType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')

  return fileItem.buffer
})
