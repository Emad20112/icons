import { defineEventHandler, createError } from 'h3'
import { dbStore, type UserRole } from '~/server/utils/mockStore'

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Missing font slug or id' })
  }

  // Auth / Role check for RLS
  const authHeader = event.node.req.headers.authorization
  let userRole: UserRole | null = null
  let userId: string | null = null

  if (authHeader?.includes('admin')) {
    userRole = 'ADMIN'
    userId = 'u1000000-0000-0000-0000-000000000001'
  }

  // Find family by slug or id
  const family = Array.from(dbStore.fontFamilies.values()).find(
    f => f.slug === slug || f.id === slug
  )

  if (!family) {
    throw createError({ statusCode: 404, message: 'Font family not found' })
  }

  // Enforce RLS
  if (userRole !== 'ADMIN' && family.publication_status !== 'PUBLISHED') {
    throw createError({ statusCode: 403, message: 'Font family is pending review or private' })
  }

  // Fetch files
  const files = Array.from(dbStore.fontFiles.values())
    .filter(f => f.family_id === family.id)
    .sort((a, b) => a.weight - b.weight || a.style.localeCompare(b.style))

  const weights = Array.from(new Set(files.map(f => f.weight))).sort((a, b) => a - b)
  const styles = Array.from(new Set(files.map(f => f.style)))
  const formats = Array.from(new Set(files.map(f => f.file_format)))
  const isVariable = files.some(f => f.is_variable)

  // Find any AI jobs for insights
  const aiJobs = Array.from(dbStore.fontAiJobs.values())
    .filter(j => j.family_id === family.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const latestAiJob = aiJobs[0] || null

  return {
    success: true,
    family: {
      ...family,
      weights,
      styles,
      formats,
      is_variable: isVariable,
      files_count: files.length,
      files,
      ai_insights: latestAiJob ? {
        model: latestAiJob.model_name,
        confidence: latestAiJob.confidence_score,
        status: latestAiJob.status,
        predicted_category: latestAiJob.predicted_category,
        predicted_arabic_style: latestAiJob.predicted_arabic_style,
        tags: latestAiJob.style_tags,
        recommended_usage: latestAiJob.recommended_usage,
        response: latestAiJob.raw_ai_response,
      } : null,
    },
  }
})
