import type { AssetFileFormat } from './database'

export interface StorageUploadOptions {
  bucket: string
  path: string
  file: Buffer | Uint8Array | Blob
  mimeType: string
  cacheControl?: string
  upsert?: boolean
}

export interface StorageUploadResult {
  path: string
  fullUrl: string
  size: number
  mimeType: string
}

export interface IStorageService {
  uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult>
  deleteFile(bucket: string, path: string): Promise<boolean>
  getPublicUrl(bucket: string, path: string): string
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>
  sanitizeFilename(name: string): string
  validateFile(file: { size: number; mimeType: string; format?: string }): { valid: boolean; error?: string }
}
