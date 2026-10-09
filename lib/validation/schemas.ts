import { z } from 'zod'

export const AssetTypeSchema = z.enum(['ICON', 'FONT', 'ILLUSTRATION', 'LOGO', 'TEMPLATE'])
export const AssetStatusSchema = z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'])
export const AssetFileFormatSchema = z.enum(['SVG', 'PNG', 'WEBP', 'ICO', 'TTF', 'OTF', 'WOFF', 'WOFF2'])
export const UserRoleSchema = z.enum(['USER', 'ADMIN'])

export const AssetCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120, 'Name must not exceed 120 characters'),
  type: AssetTypeSchema.default('ICON'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional().nullable(),
  category_id: z.string().uuid('Invalid Category ID').optional().nullable(),
  license_id: z.string().uuid('Invalid License ID').optional().nullable(),
  status: AssetStatusSchema.default('DRAFT'),
  is_featured: z.boolean().default(false),
  tag_ids: z.array(z.string().uuid()).optional().default([]),
  metadata: z.record(z.any()).optional().default({}),
}).refine((data) => {
  // Critical Business Rule: PUBLISHED assets require a license
  if (data.status === 'PUBLISHED' && !data.license_id) {
    return false
  }
  return true
}, {
  message: 'Published assets must be assigned a valid license',
  path: ['license_id'],
})

export const AssetUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: AssetTypeSchema.optional(),
  description: z.string().max(1000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  license_id: z.string().uuid().optional().nullable(),
  status: AssetStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.any()).optional(),
})

export const CategoryCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  is_active: z.boolean().default(true),
})

export const LicenseCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  url: z.string().url('Invalid license URL').optional().nullable(),
  commercial_use: z.boolean().default(true),
  redistribution: z.boolean().default(false),
  modification: z.boolean().default(true),
  attribution_required: z.boolean().default(true),
})

export const TagCreateSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
})

export const FileUploadSchema = z.object({
  asset_id: z.string().uuid(),
  format: AssetFileFormatSchema,
  file_name: z.string().min(1).max(255),
  file_size: z.number().positive().max(52428800, 'File size cannot exceed 50MB'),
  mime_type: z.string().min(1),
  content: z.string().min(1, 'File content cannot be empty'), // Base64 or raw string for SVG
})
