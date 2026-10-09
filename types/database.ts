export type UserRole = 'USER' | 'ADMIN'

export type AssetType = 'ICON' | 'FONT' | 'ILLUSTRATION' | 'LOGO' | 'TEMPLATE'

export type AssetStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'

export type AssetFileFormat = 'SVG' | 'PNG' | 'WEBP' | 'ICO' | 'TTF' | 'OTF' | 'WOFF' | 'WOFF2'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface License {
  id: string
  name: string
  slug: string
  url: string | null
  commercial_use: boolean
  redistribution: boolean
  modification: boolean
  attribution_required: boolean
  created_at: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface AssetFile {
  id: string
  asset_id: string
  format: AssetFileFormat
  file_path: string
  file_size: number
  mime_type: string
  width: number | null
  height: number | null
  metadata: Record<string, any>
  created_at: string
}

export interface Asset {
  id: string
  type: AssetType
  name: string
  slug: string
  description: string | null
  status: AssetStatus
  author_id: string
  license_id: string | null
  category_id: string | null
  is_featured: boolean
  download_count: number
  favorite_count: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string

  // Joined relations for UI
  author?: Profile
  license?: License | null
  category?: Category | null
  tags?: Tag[]
  files?: AssetFile[]
  is_favorited?: boolean
}

export interface Download {
  id: string
  asset_id: string
  user_id: string | null
  format: AssetFileFormat
  ip_hash: string | null
  created_at: string
}

export interface Favorite {
  user_id: string
  asset_id: string
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, any>
  ip_address: string | null
  created_at: string
  actor?: Profile | null
}
