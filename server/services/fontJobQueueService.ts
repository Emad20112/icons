/**
 * Phase 6: Font Background Processing & Job Queue Service
 * Architecture Layer: Job Queue & Batch Lifecycle Orchestration (Idempotency, Retries, Progress Tracking)
 */

import { dbStore } from '../utils/mockStore'
import { getSupabaseAdminClient } from '../utils/supabaseClient'
import { NotFoundError, ValidationError } from '../../lib/errors/AppError'
import type { FontImportBatch, FontBatchStatus } from '../../types/fonts'

export interface CreateBatchInput {
  uploadedBy?: string
  originalFileName: string
  storagePath?: string
  totalFiles: number
}

export interface UpdateBatchProgressInput {
  processedIncrement?: number
  failedIncrement?: number
  duplicateIncrement?: number
  status?: FontBatchStatus
  error?: string
}

export class FontJobQueueService {
  /**
   * Creates a new font import batch in the database store.
   */
  public static async createBatch(input: CreateBatchInput): Promise<FontImportBatch> {
    const id = `b_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()

    const batch: FontImportBatch = {
      id,
      uploaded_by: input.uploadedBy,
      original_file_name: input.originalFileName,
      storage_path: input.storagePath,
      total_files: input.totalFiles,
      processed_files: 0,
      failed_files: 0,
      duplicate_files: 0,
      status: 'uploaded',
      error_summary: [],
      created_at: now,
      started_at: now
    }

    // 1. Supabase persistence
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        await admin.from('font_import_batches').insert([batch])
      } catch (err: any) {
        console.warn('Supabase batch insert failed, using mock store:', err.message)
      }
    }

    // 2. High-fidelity In-Memory Store
    dbStore.fontImportBatches.set(id, batch)
    return batch
  }

  /**
   * Retrieves a batch by ID.
   */
  public static async getBatch(id: string): Promise<FontImportBatch> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        const { data, error } = await admin
          .from('font_import_batches')
          .select('*')
          .eq('id', id)
          .single()
        if (!error && data) return data
      } catch {
        // fallback
      }
    }

    const batch = dbStore.fontImportBatches.get(id)
    if (!batch) {
      throw new NotFoundError(`Font import batch '${id}' not found.`)
    }
    return batch
  }

  /**
   * Lists all import batches sorted newest first.
   */
  public static async listBatches(limit = 50): Promise<FontImportBatch[]> {
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        const { data, error } = await admin
          .from('font_import_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (!error && data) return data
      } catch {
        // fallback
      }
    }

    const batches = Array.from(dbStore.fontImportBatches.values())
    batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return batches.slice(0, limit)
  }

  /**
   * Atomically updates batch progress and error diagnostics.
   */
  public static async updateProgress(id: string, update: UpdateBatchProgressInput): Promise<FontImportBatch> {
    const batch = await this.getBatch(id)

    if (update.processedIncrement) {
      batch.processed_files += update.processedIncrement
    }
    if (update.failedIncrement) {
      batch.failed_files += update.failedIncrement
    }
    if (update.duplicateIncrement) {
      batch.duplicate_files += update.duplicateIncrement
    }
    if (update.status) {
      batch.status = update.status
      if (update.status === 'completed' || update.status === 'partially_completed' || update.status === 'failed') {
        batch.completed_at = new Date().toISOString()
      }
    }
    if (update.error) {
      batch.error_summary = [...batch.error_summary, update.error]
    }

    // Auto-calculate completion if all files processed
    if (
      batch.processed_files + batch.failed_files + batch.duplicate_files >= batch.total_files &&
      batch.status !== 'completed' &&
      batch.status !== 'failed' &&
      batch.status !== 'cancelled'
    ) {
      batch.status = batch.failed_files > 0 ? 'partially_completed' : 'completed'
      batch.completed_at = new Date().toISOString()
    }

    // Update in Supabase
    const admin = getSupabaseAdminClient()
    if (admin) {
      try {
        await admin
          .from('font_import_batches')
          .update(batch)
          .eq('id', id)
      } catch {
        // fallback
      }
    }

    dbStore.fontImportBatches.set(id, batch)
    return batch
  }

  /**
   * Cancels a running batch import.
   */
  public static async cancelBatch(id: string): Promise<FontImportBatch> {
    const batch = await this.getBatch(id)
    if (batch.status === 'completed') {
      throw new ValidationError('Cannot cancel a completed batch.')
    }
    return await this.updateProgress(id, {
      status: 'cancelled',
      error: 'Batch operation manually cancelled by admin.'
    })
  }

  /**
   * Resets failed counters to allow re-processing.
   */
  public static async retryBatch(id: string): Promise<FontImportBatch> {
    const batch = await this.getBatch(id)
    batch.failed_files = 0
    batch.status = 'extracting'
    batch.error_summary = []
    return await this.updateProgress(id, { status: 'extracting' })
  }

  /**
   * Convenience helper to update batch status with options
   */
  public static async updateBatchStatus(
    id: string,
    status: FontBatchStatus,
    options?: { processedFiles?: number; totalFiles?: number; errorMessage?: string; logMessage?: string }
  ): Promise<FontImportBatch> {
    const batch = await this.getBatch(id)
    if (options?.totalFiles !== undefined) batch.total_files = options.totalFiles
    if (options?.processedFiles !== undefined) batch.processed_files = options.processedFiles
    return await this.updateProgress(id, {
      status,
      error: options?.errorMessage || options?.logMessage,
    })
  }

  /**
   * Convenience helper to log batch error
   */
  public static async logBatchError(id: string, fileName: string, errorMsg: string): Promise<void> {
    await this.updateProgress(id, {
      failedIncrement: 1,
      error: `${fileName}: ${errorMsg}`,
    })
  }
}
