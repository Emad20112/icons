import { defineEventHandler, createError } from 'h3'
import { dbStore } from '~/server/utils/mockStore'
import { FontAiClassificationService } from '~/server/services/fontAiClassificationService'
import type { ExtractedFontMetadata } from '~/types/fonts'

export default defineEventHandler(async (event) => {
  const familyId = event.context.params?.familyId
  if (!familyId) {
    throw createError({ statusCode: 400, message: 'Missing family ID' })
  }

  const family = dbStore.fontFamilies.get(familyId)
  if (!family) {
    throw createError({ statusCode: 404, message: 'Font family not found' })
  }

  // Find files for this family
  const familyFiles = Array.from(dbStore.fontFiles.values()).filter(f => f.family_id === familyId)
  const primaryFile = familyFiles[0]

  // Construct mock extracted metadata for classification
  const metadata: ExtractedFontMetadata = {
    familyName: family.name,
    subfamilyName: primaryFile?.subfamily_name || 'Regular',
    fullName: `${family.name} ${primaryFile?.subfamily_name || 'Regular'}`,
    postscriptName: primaryFile?.postscript_name || `${family.name}-Regular`,
    weight: primaryFile?.weight || 400,
    weightName: 'Regular',
    style: primaryFile?.style || 'normal',
    isItalic: primaryFile?.style === 'italic',
    isVariable: primaryFile?.is_variable || false,
    format: (primaryFile?.file_format.toLowerCase() as any) || 'ttf',
    supportedScripts: family.language_support.includes('arabic') ? ['Arabic', 'Latin'] : ['Latin'],
    supportedLanguages: family.language_support,
    isArabic: family.language_support.includes('arabic'),
    isLatin: family.language_support.includes('latin'),
    numGlyphs: primaryFile?.character_count || 500,
    designer: family.designer,
    foundry: family.foundry,
    license: family.license_type,
    category: family.primary_category as any,
    arabicStyle: family.arabic_style as any,
  }

  const classification = await FontAiClassificationService.classifyFont({
    familyName: family.name,
    subfamilyName: primaryFile?.subfamily_name,
    metadata,
  })

  // Create an AI job record
  const jobId = `aij-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const aiJob = {
    id: jobId,
    family_id: familyId,
    model_name: 'gemini-3.8-flash',
    prompt_version: 'v1.0.0',
    status: 'NEEDS_REVIEW' as const,
    predicted_category: classification.category,
    predicted_arabic_style: classification.arabicStyle || undefined,
    confidence_score: classification.confidence,
    style_tags: classification.tags,
    recommended_usage: classification.intendedUse,
    raw_ai_response: classification,
    created_at: new Date().toISOString(),
  }

  dbStore.fontAiJobs.set(jobId, aiJob)
  family.ai_classification_status = 'needs_review'
  family.ai_confidence = classification.confidence
  family.updated_at = new Date().toISOString()

  return {
    success: true,
    job: aiJob,
    classification,
  }
})
