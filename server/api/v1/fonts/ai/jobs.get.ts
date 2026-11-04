import { defineEventHandler, getQuery } from 'h3'
import { dbStore } from '~/server/utils/mockStore'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const statusFilter = query.status ? String(query.status).toUpperCase() : undefined

  let jobs = Array.from(dbStore.fontAiJobs.values())

  if (statusFilter && statusFilter !== 'ALL') {
    jobs = jobs.filter(j => j.status === statusFilter)
  }

  // Enrich with family info
  const enrichedJobs = jobs.map(j => {
    const family = dbStore.fontFamilies.get(j.family_id)
    return {
      ...j,
      family: family ? {
        id: family.id,
        name: family.name,
        slug: family.slug,
        display_name: family.display_name,
        primary_category: family.primary_category,
        arabic_style: family.arabic_style,
        publication_status: family.publication_status,
        preview_text_sample: family.preview_text_sample,
        style_tags: family.style_tags,
      } : null,
    }
  })

  // Sort newest first
  enrichedJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return {
    success: true,
    total: enrichedJobs.length,
    jobs: enrichedJobs,
  }
})
