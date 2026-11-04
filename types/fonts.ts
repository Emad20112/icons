/**
 * Phase 6: Professional Font Library - TypeScript Domain Interfaces
 */

export type FontFileFormat = 'TTF' | 'OTF' | 'WOFF' | 'WOFF2'
export type FontPublicationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'
export type FontAiClassificationStatus = 'pending' | 'processing' | 'ai_suggested' | 'needs_review' | 'approved' | 'rejected' | 'failed'
export type FontBatchStatus = 'uploaded' | 'extracting' | 'analyzing' | 'classifying' | 'completed' | 'partially_completed' | 'failed' | 'cancelled'
export type FontLicenseType = 'OFL' | 'Apache-2.0' | 'GPL' | 'MIT' | 'Public Domain' | 'Commercial' | 'Personal Use' | 'Custom License' | 'Unknown'

export interface VariableAxis {
  tag: string
  name: string
  min: number
  max: number
  default: number
}

export interface FontFile {
  id: string
  family_id: string
  file_name: string
  storage_path: string
  file_format: FontFileFormat
  file_size: number
  sha256_hash: string
  weight: number // 100 to 900
  style: 'normal' | 'italic' | 'oblique'
  subfamily_name?: string
  postscript_name?: string
  is_variable: boolean
  variable_axes?: Record<string, VariableAxis>
  character_count?: number
  unicode_ranges?: string[]
  technical_metadata?: Record<string, any>
  created_at: string
}

export interface FontFamily {
  id: string
  name: string
  slug: string
  display_name: string
  description?: string
  designer?: string
  foundry?: string
  primary_category: string
  secondary_categories: string[]
  arabic_style?: string
  language_support: string[]
  style_tags: string[]
  recommended_usage: string[]
  preview_image_path?: string
  preview_text_sample?: string
  license_type: FontLicenseType
  license_url?: string
  license_metadata?: Record<string, any>
  publication_status: FontPublicationStatus
  ai_classification_status: FontAiClassificationStatus
  ai_confidence?: number
  files?: FontFile[]
  weights_count?: number
  created_at: string
  updated_at: string
}

export interface FontImportBatch {
  id: string
  uploaded_by?: string
  original_file_name: string
  storage_path?: string
  total_files: number
  processed_files: number
  failed_files: number
  duplicate_files: number
  status: FontBatchStatus
  error_summary: string[]
  created_at: string
  started_at?: string
  completed_at?: string
}

export type FontCategory =
  | 'serif'
  | 'sans-serif'
  | 'sans_serif'
  | 'display'
  | 'handwriting'
  | 'script'
  | 'monospace'
  | 'arabic_calligraphy'
  | 'arabic_modern'

export type FontArabicStyle =
  | 'naskh'
  | 'kufi'
  | 'ruqah'
  | 'thuluth'
  | 'diwani'
  | 'nastaliq'
  | 'modern'
  | 'maghrebi'
  | 'square_kufic'
  | 'hybrid'

export interface ExtractedFontMetadata {
  familyName: string
  subfamilyName?: string
  fullName?: string
  postscriptName?: string
  weight: number
  weightName?: string
  style: 'normal' | 'italic' | 'oblique'
  isItalic?: boolean
  isVariable?: boolean
  variableAxes?: Array<{ tag: string; name: string; min: number; default: number; max: number }> | Record<string, VariableAxis>
  format?: FontFileFormat | string
  rawFormat?: FontFileFormat
  supportedScripts: string[]
  supportedLanguages: string[]
  isArabic?: boolean
  isLatin?: boolean
  hasArabicCoverage?: boolean
  hasLatinCoverage?: boolean
  numGlyphs?: number
  characterCount?: number
  unicodeRanges?: string[]
  designer?: string
  foundry?: string
  copyright?: string
  license?: string
  licenseUrl?: string
  category?: FontCategory
  arabicStyle?: FontArabicStyle
  description?: string
  sampleTextArabic?: string
  sampleTextLatin?: string
  technicalMetadata?: Record<string, any>
}

export interface FontAiJobResult {
  primary_category: string
  secondary_categories: string[]
  arabic_style?: string
  language_support: string[]
  style_tags: string[]
  recommended_usage: string[]
  confidence: number
  reasoning_summary: string
}

export interface FontAiJob {
  id: string
  font_family_id?: string
  family_id: string
  family_name?: string
  provider?: 'gemini' | 'mock' | 'custom'
  model?: string
  model_name?: string
  prompt_version?: string
  status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'NEEDS_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'MODIFIED'
  result?: FontAiJobResult
  predicted_category?: string
  predicted_arabic_style?: string
  confidence?: number
  confidence_score?: number
  style_tags?: string[]
  recommended_usage?: string[]
  raw_ai_response?: any
  reviewer_id?: string
  reviewed_at?: string
  attempts?: number
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface FontSearchFilter {
  category?: string
  arabicStyle?: string
  language?: string
  weight?: number
  isVariable?: boolean
  license?: string
  search?: string
  status?: FontPublicationStatus
  sort?: 'newest' | 'name_asc' | 'name_desc' | 'weights_count'
  page?: number
  limit?: number
}
