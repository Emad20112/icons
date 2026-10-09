import type { IStorageService, StorageUploadOptions, StorageUploadResult } from '../../types/storage'
import { sanitizeFilename } from '../../lib/sanitizer/filenameSanitizer'
import { sanitizeSvg } from '../../lib/sanitizer/svgSanitizer'
import { ValidationError, StorageError } from '../../lib/errors/AppError'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { dbStore } from '../utils/mockStore'
import { logger } from '../../lib/logger/logger'

const ALLOWED_MIME_TYPES = new Set([
  'image/svg+xml',
  'image/png',
  'image/webp',
  'image/x-icon',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/x-font-ttf'
])

const MAX_FILE_SIZE = 52428800 // 50MB

export class StorageService implements IStorageService {
  public validateFile(file: { size: number; mimeType: string }): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` }
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimeType.toLowerCase())) {
      return { valid: false, error: `Unsupported MIME type: ${file.mimeType}. Whitelisted types only.` }
    }
    return { valid: true }
  }

  public sanitizeFilename(name: string): string {
    return sanitizeFilename(name)
  }

  public async uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const { bucket, path, file, mimeType } = options

    const validation = this.validateFile({
      size: typeof file === 'string' ? Buffer.byteLength(file) : (file as any).byteLength || (file as any).size || 100,
      mimeType
    })

    if (!validation.valid) {
      throw new ValidationError(validation.error || 'File validation failed')
    }

    let payload: Buffer | string = file as any

    // Run SVG Sanitizer if SVG
    if (mimeType === 'image/svg+xml') {
      try {
        const rawContent = typeof file === 'string' ? file : Buffer.from(file as any).toString('utf-8')
        payload = sanitizeSvg(rawContent)
      } catch (err: any) {
        throw new ValidationError(`SVG Sanitization error: ${err.message}`)
      }
    }

    const safePath = path.split('/').map(segment => sanitizeFilename(segment)).join('/')

    // 1. Try upload to real Supabase Storage if configured
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        const { error } = await admin.storage
          .from(bucket)
          .upload(safePath, payload, {
            contentType: mimeType,
            upsert: options.upsert ?? true
          })

        if (!error) {
          const publicUrl = this.getPublicUrl(bucket, safePath)
          return {
            path: safePath,
            fullUrl: publicUrl,
            size: typeof payload === 'string' ? Buffer.byteLength(payload) : (payload as any).length || 0,
            mimeType
          }
        }
      } catch (err: any) {
        logger.error('Failed uploading to remote Supabase Storage', 'StorageService', err)
      }
    }

    // 2. In-Memory Store Fallback
    if (!dbStore.storageBuckets.has(bucket)) {
      dbStore.storageBuckets.set(bucket, new Map())
    }

    const bucketMap = dbStore.storageBuckets.get(bucket)!
    const size = typeof payload === 'string' ? Buffer.byteLength(payload) : (payload as any).length || 0
    bucketMap.set(safePath, { buffer: payload, mimeType, size })

    return {
      path: safePath,
      fullUrl: `/api/v1/storage/raw?bucket=${bucket}&path=${encodeURIComponent(safePath)}`,
      size,
      mimeType
    }
  }

  public async deleteFile(bucket: string, path: string): Promise<boolean> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        await admin.storage.from(bucket).remove([path])
      } catch (err) {
        logger.error('Failed deleting from Supabase Storage', 'StorageService', err)
      }
    }

    const bucketMap = dbStore.storageBuckets.get(bucket)
    if (bucketMap) {
      bucketMap.delete(path)
    }

    return true
  }

  public getPublicUrl(bucket: string, path: string): string {
    const admin = getSupabaseAdminClient()
    if (admin) {
      const { data } = admin.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    }
    return `/api/v1/storage/raw?bucket=${bucket}&path=${encodeURIComponent(path)}`
  }

  public async getSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
      if (!error && data) {
        return data.signedUrl
      }
    }
    return `/api/v1/storage/raw?bucket=${bucket}&path=${encodeURIComponent(path)}&expires=${Date.now() + expiresInSeconds * 1000}`
  }
}

export const storageService = new StorageService()
