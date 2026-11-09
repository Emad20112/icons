export interface IconifyIconData {
  body: string
  width?: number
  height?: number
  left?: number
  top?: number
  rotate?: number
  hFlip?: boolean
  vFlip?: boolean
}

export interface IconifyCollectionMeta {
  name: string
  total?: number
  author?: {
    name?: string
    url?: string
  }
  license?: {
    title?: string
    spdx?: string
    url?: string
  }
  samples?: string[]
  height?: number | number[]
  category?: string
  palette?: boolean
}

export interface IconifyCollectionsResponse {
  [prefix: string]: IconifyCollectionMeta
}

export interface IconifyCollectionDetails {
  prefix: string
  title: string
  total: number
  author?: {
    name?: string
    url?: string
  }
  license?: {
    title?: string
    spdx?: string
    url?: string
  }
  samples?: string[]
  height?: number | number[]
  categories?: Record<string, string[]>
  uncategorized?: string[]
  aliases?: Record<string, string>
}

export interface IconifySearchResponse {
  icons: string[]
  total: number
  limit: number
  start: number
  collections?: Record<string, IconifyCollectionMeta>
}

export interface SvgRenderOptions {
  color?: string
  size?: number
  width?: number
  height?: number
  download?: boolean
}
