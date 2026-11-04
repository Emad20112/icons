import { defineEventHandler, readBody, createError } from 'h3'
import { dbStore } from '~/server/utils/mockStore'
import type { FontCategory, FontArabicStyle } from '~/types/fonts'

export default defineEventHandler(async (event) => {
  const jobId = event.context.params?.jobId
  if (!jobId) {
    throw createError({ statusCode: 400, message: 'Missing job ID' })
  }

  const job = dbStore.fontAiJobs.get(jobId)
  if (!job) {
    throw createError({ statusCode: 404, message: 'AI Job not found' })
  }

  const body = await readBody(event)
  const action = (body?.action || 'approve') as 'approve' | 'reject' | 'modify'

  const family = dbStore.fontFamilies.get(job.family_id)
  if (!family) {
    throw createError({ statusCode: 404, message: 'Associated font family not found' })
  }

  const now = new Date().toISOString()
  const reviewerId = 'u1000000-0000-0000-0000-000000000001' // Admin user

  if (action === 'approve') {
    job.status = 'APPROVED'
    job.reviewer_id = reviewerId
    job.reviewed_at = now

    // Apply AI predictions to font family
    family.primary_category = (job.predicted_category || family.primary_category) as FontCategory
    if (job.predicted_arabic_style) {
      family.arabic_style = job.predicted_arabic_style as FontArabicStyle
    }
    if (job.style_tags && job.style_tags.length > 0) {
      family.style_tags = Array.from(new Set([...family.style_tags, ...job.style_tags]))
    }
    if (job.recommended_usage && job.recommended_usage.length > 0) {
      family.recommended_usage = job.recommended_usage
    }
    family.ai_classification_status = 'approved'
    family.ai_confidence = job.confidence_score
    family.updated_at = now

    // Audit log
    dbStore.auditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor_id: reviewerId,
      action: 'APPROVE_FONT_AI_CLASSIFICATION',
      entity_type: 'FONT_FAMILY',
      entity_id: family.id,
      metadata: { jobId, approvedValues: { category: family.primary_category, arabicStyle: family.arabic_style } },
      ip_address: '127.0.0.1',
      created_at: now,
    })
  } else if (action === 'reject') {
    job.status = 'REJECTED'
    job.reviewer_id = reviewerId
    job.reviewed_at = now
    family.ai_classification_status = 'rejected'
    family.updated_at = now

    dbStore.auditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor_id: reviewerId,
      action: 'REJECT_FONT_AI_CLASSIFICATION',
      entity_type: 'FONT_FAMILY',
      entity_id: family.id,
      metadata: { jobId, reason: body?.rejectionReason || 'Manual review rejection' },
      ip_address: '127.0.0.1',
      created_at: now,
    })
  } else if (action === 'modify') {
    job.status = 'MODIFIED'
    job.reviewer_id = reviewerId
    job.reviewed_at = now

    const mod = body?.modifiedData || {}
    if (mod.category) family.primary_category = mod.category
    if (mod.arabicStyle !== undefined) family.arabic_style = mod.arabicStyle
    if (mod.tags) family.style_tags = mod.tags
    if (mod.intendedUse) family.recommended_usage = mod.intendedUse
    if (mod.descriptionAr) family.description = mod.descriptionAr
    if (mod.publicationStatus) family.publication_status = mod.publicationStatus

    family.ai_classification_status = 'approved'
    family.updated_at = now

    dbStore.auditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actor_id: reviewerId,
      action: 'MODIFY_FONT_AI_CLASSIFICATION',
      entity_type: 'FONT_FAMILY',
      entity_id: family.id,
      metadata: { jobId, modifications: mod },
      ip_address: '127.0.0.1',
      created_at: now,
    })
  }

  return {
    success: true,
    message: `AI classification job ${action}ed successfully`,
    job,
    family,
  }
})
