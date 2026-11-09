/**
 * Phase 6: Font Storage & File Management Service
 * Architecture Layer: Storage & File Integrity (SHA-256, Content-Addressable Paths, Magic Byte Verification)
 */

import { createHash } from 'node:crypto'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { dbStore } from '../utils/mockStore'
import { ValidationError, StorageError } from '../../lib/errors/AppError'
import { sanitizeFilename } from '../../lib/sanitizer/filenameSanitizer'
import type { FontFileFormat } from '../../types/fonts'

export interface FontFileValidationResult {
  valid: boolean
  format?: FontFileFormat
  error?: string
}

export interface FontStorageUploadOptions {
  familySlug: string
  fileName: string
  buffer: Buffer
  weight?: number
  style?: string
  bucket?: string
}

export interface FontStorageUploadResult {
  storagePath: string
  fileFormat: FontFileFormat
  fileSize: number
  sha256Hash: string
  publicUrl: string
}

export class FontStorageService {
  public static readonly BUCKET_NAME = 'fonts'
  public static readonly MAX_FONT_FILE_SIZE = 31457280 // 30MB per single font file

  /**
   * Validates binary signature (Magic Bytes) to ensure genuine font file
   * and detect binary executables masquerading as fonts.
   */
  public static inspectMagicBytes(buffer: Buffer): FontFileValidationResult {
    if (!buffer || buffer.length < 4) {
      return { valid: false, error: 'File is empty or truncated' }
    }

    const tag = buffer.subarray(0, 4)
    const tagStr = tag.toString('ascii')
    const tagHex = buffer.readUInt32BE(0)

    // TrueType: 0x00010000 (OpenType TrueType), 'true' (Apple), 0x00020000, or little-endian representation
    if (tagHex === 0x00010000 || tagStr === 'true' || tagHex === 0x00020000 || buffer.readUInt32LE(0) === 0x00010000) {
      return { valid: true, format: 'TTF' }
    }

    // OpenType with CFF PostScript: 'OTTO'
    if (tagStr === 'OTTO') {
      return { valid: true, format: 'OTF' }
    }

    // WOFF 1.0: 'wOFF'
    if (tagStr === 'wOFF') {
      return { valid: true, format: 'WOFF' }
    }

    // WOFF 2.0: 'wOF2'
    if (tagStr === 'wOF2') {
      return { valid: true, format: 'WOFF2' }
    }

    // TrueType Collection: 'ttcf'
    if (tagStr === 'ttcf') {
      return { valid: true, format: 'TTF' }
    }

    // PostScript Type 1: 'typ1'
    if (tagStr === 'typ1') {
      return { valid: true, format: 'OTF' }
    }

    // Known dangerous binary magic bytes
    const sampleStr = buffer.subarray(0, Math.min(128, buffer.length)).toString('utf-8').toLowerCase()

    if (tagStr.startsWith('MZ')) {
      return { valid: false, error: 'Security rejection: Windows executable binary detected' }
    }
    if (tagStr.startsWith('\x7fELF') || buffer.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
      return { valid: false, error: 'Security rejection: ELF Linux executable binary detected' }
    }
    if (tagStr.startsWith('#!')) {
      return { valid: false, error: 'Security rejection: Shell script detected' }
    }
    if (sampleStr.startsWith('<html') || sampleStr.startsWith('<!doc') || sampleStr.startsWith('<?xml') || sampleStr.includes('<script')) {
      return { valid: false, error: 'Security rejection: HTML document disguised as font' }
    }

    return { valid: false, error: `Invalid or unrecognized font magic header (0x${tag.toString('hex')})` }
  }

  /**
   * Alias helper method that throws if magic bytes indicate an executable or invalid font,
   * returning the detected format in lowercase for convenience.
   */
  public static validateFontMagicBytes(buffer: Buffer): string {
    const tag = buffer.subarray(0, 4).toString('ascii')
    if (tag === 'ttcf') return 'ttc'

    const res = this.inspectMagicBytes(buffer)
    if (!res.valid || !res.format) {
      if (res.error?.includes('Security rejection') || res.error?.includes('executable') || res.error?.includes('disguised')) {
        throw new ValidationError(`Security rejection: disguised executable or malicious file detected (${res.error})`)
      }
      throw new ValidationError(res.error || 'Invalid font format')
    }
    return res.format.toLowerCase()
  }

  /**
   * Computes SHA-256 cryptographic digest of font buffer.
   */
  public static calculateSha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Generates a deterministic, content-addressable storage path for a font file.
   */
  public static generateStoragePath(
    familySlug: string,
    fileName: string,
    sha256Hash: string,
    format: FontFileFormat
  ): string {
    const cleanFamily = sanitizeFilename(familySlug || 'unknown-font')
    const shortHash = sha256Hash.substring(0, 10)
    const baseName = sanitizeFilename(fileName.replace(/\.[^.]+$/, '')).substring(0, 50)
    return `fonts/${cleanFamily}/${baseName}_${shortHash}.${format.toLowerCase()}`
  }

  /**
   * Uploads and stores a verified font file into the font storage bucket.
   */
  public static async uploadFontFile(options: FontStorageUploadOptions): Promise<FontStorageUploadResult> {
    const { familySlug, fileName, buffer, bucket = this.BUCKET_NAME } = options

    if (buffer.length > this.MAX_FONT_FILE_SIZE) {
      throw new ValidationError(`Font file exceeds maximum allowed limit of ${this.MAX_FONT_FILE_SIZE / (1024 * 1024)}MB`)
    }

    const inspection = this.inspectMagicBytes(buffer)
    if (!inspection.valid || !inspection.format) {
      throw new ValidationError(inspection.error || 'Invalid font file format or corrupted binary')
    }

    const sha256Hash = this.calculateSha256(buffer)
    const storagePath = this.generateStoragePath(familySlug, fileName, sha256Hash, inspection.format)
    const mimeType = inspection.format === 'WOFF2' ? 'font/woff2'
      : inspection.format === 'WOFF' ? 'font/woff'
      : inspection.format === 'OTF' ? 'font/otf'
      : 'font/ttf'

    // 1. Remote Supabase Storage if configured
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        const { error } = await admin.storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true
          })

        if (error) {
          throw error
        }

        const { data } = admin.storage.from(bucket).getPublicUrl(storagePath)
        return {
          storagePath,
          fileFormat: inspection.format,
          fileSize: buffer.length,
          sha256Hash,
          publicUrl: data.publicUrl
        }
      } catch (err: any) {
        console.warn('Supabase storage upload failed, utilizing mock storage:', err.message)
      }
    }

    // 2. High-fidelity In-Memory Storage
    if (!dbStore.storageBuckets.has(bucket)) {
      dbStore.storageBuckets.set(bucket, new Map())
    }
    dbStore.storageBuckets.get(bucket)!.set(storagePath, {
      buffer,
      mimeType,
      size: buffer.length
    })

    return {
      storagePath,
      fileFormat: inspection.format,
      fileSize: buffer.length,
      sha256Hash,
      publicUrl: `/api/v1/storage/${bucket}/${storagePath}`
    }
  }

  /**
   * Deletes a font file from storage.
   */
  public static async deleteFontFile(storagePath: string, bucket = this.BUCKET_NAME): Promise<boolean> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        const { error } = await admin.storage.from(bucket).remove([storagePath])
        if (!error) return true
      } catch {
        // fallback
      }
    }

    const b = dbStore.storageBuckets.get(bucket)
    if (b && b.has(storagePath)) {
      b.delete(storagePath)
      return true
    }
    return false
  }

  /**
   * Retrieves font file buffer from storage.
   */
  public static async getFontFileBuffer(storagePath: string, bucket = this.BUCKET_NAME): Promise<Buffer | null> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        const { data, error } = await admin.storage.from(bucket).download(storagePath)
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer()
          return Buffer.from(arrayBuffer)
        }
      } catch {
        // fallback
      }
    }

    const b = dbStore.storageBuckets.get(bucket)
    if (b && b.has(storagePath)) {
      const item = b.get(storagePath)!
      return Buffer.isBuffer(item.buffer) ? item.buffer : Buffer.from(item.buffer)
    }

    return null
  }

  /**
   * Alias helper to retrieve font buffer or throw if not found
   */
  public static async retrieveFontBuffer(storagePath: string, bucket = this.BUCKET_NAME): Promise<Buffer> {
    const buf = await this.getFontFileBuffer(storagePath, bucket)
    if (!buf) {
      throw new Error(`Font file not found in storage: ${storagePath}`)
    }
    return buf
  }

  /**
   * Alias helper to store font file with normalized return signature
   */
  public static async storeFontFile(options: {
    buffer: Buffer
    originalFileName: string
    familySlug: string
  }): Promise<{ fileId: string; storagePath: string; fileSize: number; format: 'ttf' | 'otf' | 'woff' | 'woff2'; sha256: string }> {
    const uploadRes = await this.uploadFontFile({
      buffer: options.buffer,
      fileName: options.originalFileName,
      familySlug: options.familySlug,
    })

    return {
      fileId: `ff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      storagePath: uploadRes.storagePath,
      fileSize: uploadRes.fileSize,
      format: uploadRes.fileFormat.toLowerCase() as any,
      sha256: uploadRes.sha256Hash,
    }
  }
}
