import { defineEventHandler, getRouterParam, readMultipartFormData, createError } from 'h3'
import { getAuthContext } from '../../../../utils/supabaseClient'
import { dbStore } from '../../../../utils/mockStore'
import { RepositoryService } from '../../../../services/repositoryService'
import { FontStorageService } from '../../../../services/fontStorageService'
import { FontMetadataService } from '../../../../services/fontMetadataService'
import { slugify } from '../../../../../lib/sanitizer/filenameSanitizer'
import type { FontFamily, FontFile, FontFileFormat, FontLicenseType } from '../../../../../types/fonts'

export default defineEventHandler(async (event) => {
  const repositoryId = getRouterParam(event, 'id')
  if (!repositoryId) {
    throw createError({ statusCode: 400, statusMessage: 'Repository ID is required' })
  }

  const auth = await getAuthContext(event)
  if (!auth.userId || !auth.role) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const repo = dbStore.repositories.get(repositoryId)
  if (!repo) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found' })
  }
  if (repo.owner_id !== auth.userId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Only the repository owner can add fonts' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Font file upload is required' })
  }

  let customName = ''
  let customDescription = ''
  let previewSample = ''
  const fontParts: Array<{ filename: string; data: Buffer }> = []

  for (const part of parts) {
    if (part.name === 'name') customName = part.data.toString('utf-8').trim()
    if (part.name === 'description') customDescription = part.data.toString('utf-8').trim()
    if (part.name === 'preview_text') previewSample = part.data.toString('utf-8').trim()
    if ((part.name === 'file' || part.name === 'files') && part.data?.length) {
      fontParts.push({
        filename: part.filename || 'custom-font.ttf',
        data: part.data
      })
    }
  }

  if (fontParts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Please select at least one TTF, OTF, WOFF, or WOFF2 font file' })
  }

  const firstPart = fontParts[0]
  const magic = FontStorageService.inspectMagicBytes(firstPart.data)
  if (!magic.valid || !magic.format) {
    throw createError({ statusCode: 400, statusMessage: magic.error || 'Unsupported or invalid font file' })
  }

  const extracted = await FontMetadataService.extractFontMetadata(
    firstPart.data,
    firstPart.filename,
    magic.format
  )

  const familyName = customName || extracted.familyName || FontMetadataService.inferFamilyFromFilename(firstPart.filename)
  const baseSlug = slugify(familyName) || `font-${Date.now()}`
  let slug = baseSlug
  let counter = 1
  while (Array.from(dbStore.fontFamilies.values()).some(f => f.slug === slug)) {
    slug = `${baseSlug}-${counter++}`
  }

  const familyId = `ffam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const now = new Date().toISOString()

  const weights = new Set<number>()
  const styles = new Set<string>()
  const formats = new Set<FontFileFormat>()
  const uploadedFiles: FontFile[] = []

  for (const part of fontParts) {
    const check = FontStorageService.inspectMagicBytes(part.data)
    if (!check.valid || !check.format) {
      throw createError({ statusCode: 400, statusMessage: check.error || `Invalid font file: ${part.filename}` })
    }

    const meta = await FontMetadataService.extractFontMetadata(part.data, part.filename, check.format)
    const uploadRes = await FontStorageService.uploadFontFile({
      familySlug: slug,
      fileName: part.filename,
      buffer: part.data,
      weight: meta.weight,
      style: meta.style
    })

    const fontFileId = `ffile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const fontFile: FontFile = {
      id: fontFileId,
      family_id: familyId,
      file_name: part.filename,
      file_format: uploadRes.fileFormat,
      file_size: uploadRes.fileSize,
      storage_path: uploadRes.storagePath,
      weight: meta.weight || 400,
      style: meta.style || 'normal',
      subfamily_name: meta.subfamilyName || 'Regular',
      is_variable: meta.isVariable,
      variable_axes: meta.variableAxes,
      character_count: meta.characterCount || 0,
      unicode_ranges: meta.unicodeRanges || [],
      sha256_hash: uploadRes.sha256Hash,
      technical_metadata: meta.technicalMetadata || {},
      created_at: now
    }

    dbStore.fontFiles.set(fontFileId, fontFile)
    uploadedFiles.push(fontFile)
    weights.add(fontFile.weight)
    styles.add(fontFile.style)
    formats.add(fontFile.file_format)
  }

  const languageSupport: string[] = []
  if (extracted.hasArabicCoverage) languageSupport.push('arabic')
  if (extracted.hasLatinCoverage || languageSupport.length === 0) languageSupport.push('latin')

  const arabicStyle = extracted.hasArabicCoverage ? FontMetadataService.inferArabicStyle(familyName) : undefined

  const newFamily: FontFamily = {
    id: familyId,
    owner_id: auth.userId,
    name: familyName,
    slug,
    display_name: familyName,
    description: customDescription || extracted.copyright || `Custom font uploaded to ${repo.name}`,
    designer: extracted.designer || undefined,
    foundry: extracted.foundry || undefined,
    primary_category: extracted.hasArabicCoverage ? 'arabic_modern' : 'sans-serif',
    secondary_categories: [],
    arabic_style: arabicStyle,
    language_support: languageSupport,
    style_tags: ['custom'],
    recommended_usage: ['body', 'ui'],
    preview_text_sample: previewSample || (extracted.hasArabicCoverage ? 'أبجد هوز حطي كلمن سعفص قرشت' : 'The quick brown fox jumps over the lazy dog'),
    license_type: (extracted.license as FontLicenseType) || 'OFL',
    license_url: extracted.licenseUrl,
    publication_status: 'PUBLISHED',
    ai_classification_status: 'approved',
    weights_count: weights.size,
    files: uploadedFiles,
    created_at: now,
    updated_at: now
  }

  dbStore.fontFamilies.set(familyId, newFamily)

  const repositoryItem = await RepositoryService.addItemToRepository(
    repositoryId,
    'FONT',
    familyId,
    auth.userId,
    auth.role
  )

  return {
    success: true,
    data: {
      family: {
        ...newFamily,
        files: uploadedFiles
      },
      repositoryItem
    }
  }
})
