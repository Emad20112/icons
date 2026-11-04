import { defineEventHandler, createError } from 'h3'
import { FontJobQueueService } from '~/server/services/fontJobQueueService'

export default defineEventHandler(async (event) => {
  const batchId = event.context.params?.batchId
  if (!batchId) {
    throw createError({ statusCode: 400, message: 'Missing batch ID' })
  }

  const batch = FontJobQueueService.getBatch(batchId)
  if (!batch) {
    throw createError({ statusCode: 404, message: 'Batch not found' })
  }

  return {
    success: true,
    batch,
  }
})
