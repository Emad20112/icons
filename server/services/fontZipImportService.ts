/**
 * Phase 6: Secure Bulk ZIP Import Engine
 * Architecture Layer: Archive Decompression & Hardened Security (ZIP Bomb, Path Traversal, Extension Filtering)
 */

import JSZip from 'jszip'
import { ValidationError } from '../../lib/errors/AppError'
import { FontStorageService } from './fontStorageService'
import type { FontFileFormat } from '../../types/fonts'

export interface ExtractedFontEntry {
  originalPath: string
  fileName: string
  buffer: Buffer
  format: FontFileFormat
  size: number
  sha256Hash: string
}

export interface DiscardedFileEntry {
  path: string
  reason: string
}

export interface ZipExtractionResult {
  totalArchiveFiles: number
  validFonts: ExtractedFontEntry[]
  discardedFiles: DiscardedFileEntry[]
  totalExtractedBytes: number
  compressionRatio: number
}

export class FontZipImportService {
  // Hard limits to thwart ZIP bombs and resource exhaustion
  public static readonly MAX_ZIP_BYTES = 104857600 // 100MB
  public static readonly MAX_UNCOMPRESSED_BYTES = 262144000 // 250MB
  public static readonly MAX_COMPRESSION_RATIO = 12.0 // Ratio > 12:1 is treated as ZIP Bomb
  public static readonly MAX_ENTRY_COUNT = 1000
  public static readonly ALLOWED_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2'])

  /**
   * Sanitizes relative file path against Zip Slip / Path Traversal attacks.
   */
  public static sanitizeZipPath(rawPath: string): string | null {
    if (!rawPath || typeof rawPath !== 'string') return null

    // Remove null bytes
    const noNull = rawPath.replace(/\0/g, '')

    // Reject path traversal tokens
    if (noNull.includes('..') || noNull.startsWith('/') || noNull.startsWith('\\') || /^[a-zA-Z]:/.test(noNull)) {
      return null
    }

    // Normalize forward slashes and filter out empty segments
    const cleanSegments = noNull
      .split(/[/\\]+/)
      .map(s => s.trim())
      .filter(s => s && s !== '.' && s !== '..')

    if (cleanSegments.length === 0) return null
    return cleanSegments.join('/')
  }

  /**
   * Evaluates if a file entry is an unwanted OS artifact or metadata file.
   */
  public static isIgnoredArtifact(path: string): boolean {
    const lower = path.toLowerCase()
    return (
      lower.includes('__macosx') ||
      lower.startsWith('._') ||
      lower.includes('/._') ||
      lower.endsWith('.ds_store') ||
      lower.endsWith('thumbs.db') ||
      lower.endsWith('.git')
    )
  }

  /**
   * Securely unpacks a ZIP archive, inspects entries, checks size limits,
   * verifies font magic bytes, and deduplicates within the batch.
   */
  public static async extractZipArchive(zipBuffer: Buffer): Promise<ZipExtractionResult> {
    if (!zipBuffer || zipBuffer.length === 0) {
      throw new ValidationError('Provided ZIP file buffer is empty.')
    }

    if (zipBuffer.length > this.MAX_ZIP_BYTES) {
      throw new ValidationError(
        `ZIP archive size (${(zipBuffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${this.MAX_ZIP_BYTES / (1024 * 1024)}MB`
      )
    }

    let zip: JSZip
    try {
      zip = await JSZip.loadAsync(zipBuffer)
    } catch (err: any) {
      throw new ValidationError(`Failed to parse ZIP archive: ${err.message || 'Corrupted file'}`)
    }

    const entries = Object.keys(zip.files)
    if (entries.length > this.MAX_ENTRY_COUNT) {
      throw new ValidationError(
        `ZIP archive contains ${entries.length} entries, exceeding safe limit of ${this.MAX_ENTRY_COUNT}`
      )
    }

    let totalExtractedBytes = 0
    const validFonts: ExtractedFontEntry[] = []
    const discardedFiles: DiscardedFileEntry[] = []
    const seenHashes = new Set<string>()

    for (const rawPath of entries) {
      const fileEntry = zip.files[rawPath]

      // Skip directory nodes
      if (fileEntry.dir) continue

      // Ignore macOS resource forks and OS caches
      if (this.isIgnoredArtifact(rawPath)) {
        discardedFiles.push({ path: rawPath, reason: 'Ignored OS metadata/resource file' })
        continue
      }

      // Check path traversal security
      const safePath = this.sanitizeZipPath(rawPath)
      if (!safePath) {
        discardedFiles.push({ path: rawPath, reason: 'Security rejection: Path traversal attempt detected' })
        continue
      }

      // Match extension
      const extMatch = safePath.match(/\.[^.]+$/)
      const ext = extMatch ? extMatch[0].toLowerCase() : ''
      if (!this.ALLOWED_EXTENSIONS.has(ext)) {
        discardedFiles.push({ path: rawPath, reason: `Unsupported extension '${ext}'. Only TTF, OTF, WOFF, WOFF2 allowed.` })
        continue
      }

      // Extract file buffer
      const entryBuffer = await fileEntry.async('nodebuffer')
      totalExtractedBytes += entryBuffer.length

      // Check cumulative uncompressed threshold (ZIP Bomb defense)
      if (totalExtractedBytes > this.MAX_UNCOMPRESSED_BYTES) {
        throw new ValidationError(
          `ZIP Bomb safety trigger: Cumulative uncompressed payload exceeded ${this.MAX_UNCOMPRESSED_BYTES / (1024 * 1024)}MB`
        )
      }

      // Check compression ratio on each entry
      const compressedRatio = zipBuffer.length > 0 ? totalExtractedBytes / zipBuffer.length : 1
      if (compressedRatio > this.MAX_COMPRESSION_RATIO && totalExtractedBytes > 10 * 1024 * 1024) {
        throw new ValidationError(
          `ZIP Bomb safety trigger: High compression ratio (${compressedRatio.toFixed(1)}:1) detected`
        )
      }

      // Verify binary magic bytes
      const magicCheck = FontStorageService.inspectMagicBytes(entryBuffer)
      if (!magicCheck.valid || !magicCheck.format) {
        discardedFiles.push({ path: rawPath, reason: magicCheck.error || 'Invalid font binary signature' })
        continue
      }

      // Calculate SHA256 & detect intra-batch duplicates
      const hash = FontStorageService.calculateSha256(entryBuffer)
      if (seenHashes.has(hash)) {
        discardedFiles.push({ path: rawPath, reason: 'Duplicate font file in same archive (identical SHA-256)' })
        continue
      }
      seenHashes.add(hash)

      const fileName = safePath.split('/').pop() || safePath

      validFonts.push({
        originalPath: safePath,
        fileName,
        buffer: entryBuffer,
        format: magicCheck.format,
        size: entryBuffer.length,
        sha256Hash: hash
      })
    }

    const finalRatio = zipBuffer.length > 0 ? totalExtractedBytes / zipBuffer.length : 1
    const nonDirCount = entries.filter(k => !zip.files[k].dir).length

    return {
      totalArchiveFiles: nonDirCount,
      validFonts,
      discardedFiles,
      totalExtractedBytes,
      compressionRatio: Number(finalRatio.toFixed(2))
    }
  }

  /**
   * Helper that tests whether a path is a directory traversal attempt
   */
  public static isPathTraversalAttack(path: string): boolean {
    return this.sanitizeZipPath(path) === null
  }

  /**
   * Helper that tests whether a file is an unwanted OS or metadata artifact
   */
  public static isSystemOrMetadataArtifact(path: string): boolean {
    return this.isIgnoredArtifact(path)
  }

  /**
   * Alias helper method wrapping extractZipArchive with support for direct font files
   */
  public static async extractAndValidateZip(
    zipBuffer: Buffer,
    hintFileName = 'fonts-import.zip'
  ): Promise<{
    entries: Array<{ fileName: string; buffer: Buffer; format: 'ttf' | 'otf' | 'woff' | 'woff2'; sha256: string }>
    totalEntriesFound: number
    skippedNonFontEntries: number
    totalFontFiles: number
  }> {
    // If input is a direct font binary rather than a ZIP archive
    const isZip = zipBuffer && zipBuffer.length >= 4 && zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b
    if (!isZip) {
      const magic = FontStorageService.inspectMagicBytes(zipBuffer)
      if (magic.valid && magic.format) {
        const hash = FontStorageService.calculateSha256(zipBuffer)
        const cleanName = hintFileName && !hintFileName.endsWith('.zip')
          ? hintFileName
          : `font.${magic.format.toLowerCase()}`
        return {
          entries: [{
            fileName: cleanName,
            buffer: zipBuffer,
            format: magic.format.toLowerCase() as any,
            sha256: hash,
          }],
          totalEntriesFound: 1,
          skippedNonFontEntries: 0,
          totalFontFiles: 1,
        }
      }
    }

    const res = await this.extractZipArchive(zipBuffer)
    return {
      entries: res.validFonts.map(f => ({
        fileName: f.fileName,
        buffer: f.buffer,
        format: f.format.toLowerCase() as any,
        sha256: f.sha256Hash,
      })),
      totalEntriesFound: res.totalArchiveFiles,
      skippedNonFontEntries: res.discardedFiles.length,
      totalFontFiles: res.validFonts.length,
    }
  }
}
