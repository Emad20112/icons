import { defineEventHandler, readMultipartFormData, readBody, createError } from 'h3'
import { FontJobQueueService } from '~/server/services/fontJobQueueService'
import { FontZipImportService } from '~/server/services/fontZipImportService'
import { FontMetadataService } from '~/server/services/fontMetadataService'
import { FontStorageService } from '~/server/services/fontStorageService'
import { FontFamilyGrouper, type ExtractedFontWithStorage } from '~/server/services/fontFamilyGrouper'
import { FontAiClassificationService } from '~/server/services/fontAiClassificationService'
import { dbStore } from '~/server/utils/mockStore'
import type { FontFamily, FontFile } from '~/types/fonts'

interface ExtractedFontInputEntry {
  fileName: string
  buffer: Buffer
  format: 'ttf' | 'otf' | 'woff' | 'woff2'
  sha256: string
}

export default defineEventHandler(async (event) => {
  const fontEntries: ExtractedFontInputEntry[] = []
  let primaryFileName = 'fonts-import'

  // Try reading multipart form data (supports single or multiple font files, or zip archives)
  const multipart = await readMultipartFormData(event).catch(() => null)
  if (multipart && multipart.length > 0) {
    const fileParts = multipart.filter(p => p.data && p.data.length > 0 && (p.filename || p.name))
    for (const part of fileParts) {
      const fileName = part.filename || part.name || 'font.ttf'
      if (primaryFileName === 'fonts-import') primaryFileName = fileName

      const isZip = (part.data.length >= 4 && part.data[0] === 0x50 && part.data[1] === 0x4b) || fileName.toLowerCase().endsWith('.zip')
      if (isZip) {
        const zipRes = await FontZipImportService.extractAndValidateZip(part.data, fileName)
        fontEntries.push(...zipRes.entries)
      } else {
        // Direct font file
        const magic = FontStorageService.inspectMagicBytes(part.data)
        if (magic.valid && magic.format) {
          const hash = FontStorageService.calculateSha256(part.data)
          fontEntries.push({
            fileName,
            buffer: part.data,
            format: magic.format.toLowerCase() as any,
            sha256: hash,
          })
        } else {
          // If extension matches font types, try heuristic inclusion
          const lowerName = fileName.toLowerCase()
          if (lowerName.endsWith('.ttf') || lowerName.endsWith('.otf') || lowerName.endsWith('.woff') || lowerName.endsWith('.woff2')) {
            const detectedFormat = lowerName.endsWith('.ttf') ? 'ttf' : lowerName.endsWith('.otf') ? 'otf' : lowerName.endsWith('.woff') ? 'woff' : 'woff2'
            const hash = FontStorageService.calculateSha256(part.data)
            fontEntries.push({
              fileName,
              buffer: part.data,
              format: detectedFormat as any,
              sha256: hash,
            })
          }
        }
      }
    }
  }

  // Fallback: read body as base64 or json payload
  if (fontEntries.length === 0) {
    const body = await readBody(event).catch(() => null)
    if (body?.zipBase64 || body?.fontBase64 || body?.fileBase64) {
      const rawB64 = body.zipBase64 || body.fontBase64 || body.fileBase64
      const buf = Buffer.from(rawB64, 'base64')
      const fileName = body.fileName || (body.zipBase64 ? 'import.zip' : 'font.ttf')
      primaryFileName = fileName

      const isZip = (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) || fileName.toLowerCase().endsWith('.zip')
      if (isZip) {
        const zipRes = await FontZipImportService.extractAndValidateZip(buf, fileName)
        fontEntries.push(...zipRes.entries)
      } else {
        const magic = FontStorageService.inspectMagicBytes(buf)
        const format = (magic.valid && magic.format ? magic.format.toLowerCase() : (fileName.toLowerCase().endsWith('.otf') ? 'otf' : 'ttf')) as any
        const hash = FontStorageService.calculateSha256(buf)
        fontEntries.push({
          fileName,
          buffer: buf,
          format,
          sha256: hash,
        })
      }
    }
  }

  if (fontEntries.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'لم يتم العثور على ملفات خطوط صالحة (.ttf, .otf, .woff, .woff2, .zip) في الطلب'
    })
  }

  // 1. Initialize Import Batch
  const adminId = 'u1000000-0000-0000-0000-000000000001'
  const batch = await FontJobQueueService.createBatch({
    originalFileName: primaryFileName,
    uploadedBy: adminId,
    totalFiles: fontEntries.length,
  })

  // 2. Run Pipeline asynchronously or immediately
  try {
    await FontJobQueueService.updateBatchStatus(batch.id, 'extracting', {
      processedFiles: 0,
      logMessage: `Scanned and prepared ${fontEntries.length} font files for metadata inspection...`,
    })

    await FontJobQueueService.updateBatchStatus(batch.id, 'analyzing', {
      totalFiles: fontEntries.length,
      logMessage: `Ready to inspect ${fontEntries.length} font files. Starting metadata inspection...`,
    })

    const processedFonts: ExtractedFontWithStorage[] = []

    for (let i = 0; i < fontEntries.length; i++) {
      const entry = fontEntries[i]

      try {
        // Parse metadata using opentype.js and fallback
        const metadata = await FontMetadataService.extractFontMetadata(entry.buffer, entry.fileName)

        // Store font binary
        const stored = await FontStorageService.storeFontFile({
          buffer: entry.buffer,
          originalFileName: entry.fileName,
          familySlug: FontFamilyGrouper.slugify(metadata.familyName),
        })

        processedFonts.push({
          fileId: stored.fileId,
          originalFileName: entry.fileName,
          storagePath: stored.storagePath,
          fileSize: stored.fileSize,
          format: stored.format,
          sha256: stored.sha256,
          metadata: {
            ...metadata,
            supportedScripts: metadata.unicodeRanges || ['Basic Latin'],
            supportedLanguages: metadata.hasArabicCoverage && metadata.hasLatinCoverage ? ['arabic', 'latin'] : metadata.hasArabicCoverage ? ['arabic'] : ['latin'],
            isArabic: Boolean(metadata.hasArabicCoverage),
            isLatin: Boolean(metadata.hasLatinCoverage),
          },
        })

        await FontJobQueueService.updateBatchStatus(batch.id, 'analyzing', {
          processedFiles: i + 1,
          logMessage: `Parsed (${i + 1}/${fontEntries.length}): ${metadata.familyName} (${metadata.subfamilyName || metadata.weight})`,
        })
      } catch (err: any) {
        console.error(`Error processing font entry ${entry.fileName}:`, err)
        await FontJobQueueService.logBatchError(batch.id, entry.fileName, err?.message || 'Metadata extraction failed')
      }
    }

    // 3. Cluster into font families
    await FontJobQueueService.updateBatchStatus(batch.id, 'classifying', {
      logMessage: 'Grouping font files into typographic families...',
    })

    const groupedFamilies = FontFamilyGrouper.groupFonts(processedFonts)

    // 4. Persist Families & Files
    for (const group of groupedFamilies) {
      // Check if family already exists
      let family = Array.from(dbStore.fontFamilies.values()).find(f => f.slug === group.slug)
      const now = new Date().toISOString()

      if (!family) {
        family = {
          id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: group.name,
          slug: group.slug,
          display_name: `${group.name} ${group.isArabic ? '(عربي)' : ''}`,
          description: group.description || `خط ${group.name} بمختلف الأوزان والأنماط.`,
          designer: group.designer,
          foundry: group.foundry,
          primary_category: group.category,
          secondary_categories: [],
          arabic_style: group.arabicStyle,
          language_support: group.isArabic && group.isLatin ? ['arabic', 'latin'] : group.isArabic ? ['arabic'] : ['latin'],
          style_tags: group.arabicStyle ? [group.arabicStyle, group.category] : [group.category],
          recommended_usage: ['body', 'ui'],
          preview_image_path: `fonts/previews/${group.slug}.svg`,
          preview_text_sample: group.sampleTextArabic || group.sampleTextLatin,
          license_type: (group.license as any) || 'OFL',
          license_url: group.licenseUrl,
          publication_status: 'PUBLISHED',
          ai_classification_status: 'needs_review',
          created_at: now,
          updated_at: now,
        }
        dbStore.fontFamilies.set(family.id, family)
      }

      const activeFamily = family!

      // Add variant files
      for (const variant of group.variants) {
        const fileRecord: FontFile = {
          id: variant.fileId,
          family_id: activeFamily.id,
          file_name: variant.originalFileName,
          storage_path: variant.storagePath,
          file_format: variant.format.toUpperCase() as any,
          file_size: variant.fileSize,
          sha256_hash: variant.sha256,
          weight: variant.weight,
          style: variant.style,
          subfamily_name: variant.weightName,
          postscript_name: variant.postscriptName,
          is_variable: variant.isVariable,
          variable_axes: variant.variableAxes as any,
          character_count: 500,
          unicode_ranges: group.isArabic ? ['Arabic', 'Basic Latin'] : ['Basic Latin'],
          created_at: now,
        }
        dbStore.fontFiles.set(fileRecord.id, fileRecord)
      }

      // 5. Trigger AI Classification
      try {
        const primaryVariant = processedFonts.find(p => p.metadata.familyName === group.name)
        if (primaryVariant) {
          const aiResult = await FontAiClassificationService.classifyFont({
            familyName: group.name,
            subfamilyName: primaryVariant.metadata.subfamilyName,
            metadata: primaryVariant.metadata,
          })

          const jobId = `aij-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          dbStore.fontAiJobs.set(jobId, {
            id: jobId,
            family_id: activeFamily.id,
            model_name: 'gemini-3.8-flash',
            prompt_version: 'v1.0.0',
            status: 'NEEDS_REVIEW',
            predicted_category: aiResult.category,
            predicted_arabic_style: aiResult.arabicStyle || undefined,
            confidence_score: aiResult.confidence,
            style_tags: aiResult.tags,
            recommended_usage: aiResult.intendedUse,
            raw_ai_response: aiResult,
            created_at: now,
          })

          activeFamily.ai_classification_status = 'needs_review'
          activeFamily.ai_confidence = aiResult.confidence
        }
      } catch (aiErr) {
        console.warn(`[Batch Import] AI classification failed for ${group.name}:`, aiErr)
      }
    }

    await FontJobQueueService.updateBatchStatus(batch.id, 'completed', {
      processedFiles: processedFonts.length,
      logMessage: `Import completed successfully. Created ${groupedFamilies.length} families from ${processedFonts.length} files.`,
    })

    return {
      success: true,
      batchId: batch.id,
      importedFamilies: groupedFamilies.length,
      importedFiles: processedFonts.length,
    }
  } catch (err: any) {
    console.error('Batch import failed:', err)
    await FontJobQueueService.updateBatchStatus(batch.id, 'failed', {
      errorMessage: err?.message || 'Fatal error processing font archive',
      logMessage: `Error: ${err?.message || 'Processing failed'}`,
    })
    return {
      success: false,
      batchId: batch.id,
      error: err?.message || 'Import failed',
    }
  }
})
