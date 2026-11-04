import { defineEventHandler } from 'h3'
import { dbStore } from '~/server/utils/mockStore'

export default defineEventHandler(async () => {
  const batches = Array.from(dbStore.fontImportBatches.values())
  batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return {
    success: true,
    total: batches.length,
    batches,
  }
})
