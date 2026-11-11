import type { Profile, Asset } from './database'
import type { FontFamily } from './fonts'

export type RepositoryVisibility = 'PUBLIC' | 'PRIVATE'

export interface Repository {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  visibility: RepositoryVisibility
  created_at: string
  updated_at: string

  // Joined / Computed relations
  owner?: Profile
  asset_count?: number
  font_count?: number
  items_count?: number
  assets?: Asset[]
  fonts?: FontFamily[]
}

export interface RepositoryItem {
  id: string
  repository_id: string
  item_type: 'ASSET' | 'FONT'
  item_id: string
  created_at: string
}
