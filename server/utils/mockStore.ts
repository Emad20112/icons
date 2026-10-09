import type {
  Asset,
  AssetFile,
  Category,
  License,
  Profile,
  Tag,
  AuditLog,
  UserRole,
  AssetStatus
} from '../../types/database'
import { ValidationError, AuthorizationError, NotFoundError } from '../../lib/errors/AppError'

/**
 * High-fidelity in-memory database store with PostgreSQL relational constraints,
 * RLS validation, and initial migration seed data.
 * Used for instant preview verification and unit/integration testing.
 */
class InMemoryDatabaseStore {
  public profiles: Map<string, Profile> = new Map()
  public categories: Map<string, Category> = new Map()
  public licenses: Map<string, License> = new Map()
  public tags: Map<string, Tag> = new Map()
  public assets: Map<string, Asset> = new Map()
  public assetFiles: Map<string, AssetFile> = new Map()
  public assetTags: Array<{ asset_id: string; tag_id: string }> = []
  public auditLogs: AuditLog[] = []
  public storageBuckets: Map<string, Map<string, { buffer: Buffer | string; mimeType: string; size: number }>> = new Map()

  constructor() {
    this.seedDefaults()
  }

  private seedDefaults() {
    // 1. Initial Storage Buckets
    this.storageBuckets.set('assets', new Map())
    this.storageBuckets.set('temp-uploads', new Map())

    // 2. Initial Admin & Test Profiles
    const adminId = 'a0000000-0000-0000-0000-000000000001'
    const regularUserId = 'u0000000-0000-0000-0000-000000000001'

    this.profiles.set(adminId, {
      id: adminId,
      email: 'admin@platform.example',
      display_name: 'Lead System Admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    this.profiles.set(regularUserId, {
      id: regularUserId,
      email: 'user@platform.example',
      display_name: 'Standard Creator',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop',
      role: 'USER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // 3. Initial Dynamic Categories (from migration 005)
    const categorySeeds = [
      { id: 'c1000000-0000-0000-0000-000000000001', name: 'Business', slug: 'business', description: 'Enterprise, office, and commerce assets', icon: 'Briefcase' },
      { id: 'c1000000-0000-0000-0000-000000000002', name: 'Finance', slug: 'finance', description: 'Banking, investment, and currency assets', icon: 'DollarSign' },
      { id: 'c1000000-0000-0000-0000-000000000003', name: 'Shopping', slug: 'shopping', description: 'E-commerce, cart, and payment assets', icon: 'ShoppingCart' },
      { id: 'c1000000-0000-0000-0000-000000000004', name: 'Food', slug: 'food', description: 'Dining, cuisine, and beverage assets', icon: 'Utensils' },
      { id: 'c1000000-0000-0000-0000-000000000005', name: 'Technology', slug: 'technology', description: 'Hardware, software, cloud, and computing assets', icon: 'Cpu' },
      { id: 'c1000000-0000-0000-0000-000000000006', name: 'Transportation', slug: 'transportation', description: 'Vehicles, logistics, and transit assets', icon: 'Truck' },
      { id: 'c1000000-0000-0000-0000-000000000007', name: 'Communication', slug: 'communication', description: 'Chat, messaging, and audio assets', icon: 'MessageSquare' },
      { id: 'c1000000-0000-0000-0000-000000000008', name: 'Education', slug: 'education', description: 'Academic, learning, and science assets', icon: 'GraduationCap' },
      { id: 'c1000000-0000-0000-0000-000000000009', name: 'Medical', slug: 'medical', description: 'Healthcare, clinic, and medicine assets', icon: 'Activity' },
      { id: 'c1000000-0000-0000-0000-000000000010', name: 'Social', slug: 'social', description: 'Community, media, and profile assets', icon: 'Users' },
      { id: 'c1000000-0000-0000-0000-000000000011', name: 'UI', slug: 'ui', description: 'User interface controls and layout primitives', icon: 'Layout' }
    ]

    for (const cat of categorySeeds) {
      this.categories.set(cat.id, {
        ...cat,
        is_active: true,
        created_at: new Date().toISOString()
      })
    }

    // 4. Initial Licenses (from migration 005)
    const licenseSeeds = [
      {
        id: 'l1000000-0000-0000-0000-000000000001',
        name: 'MIT License',
        slug: 'mit',
        url: 'https://opensource.org/licenses/MIT',
        commercial_use: true,
        redistribution: true,
        modification: true,
        attribution_required: true
      },
      {
        id: 'l1000000-0000-0000-0000-000000000002',
        name: 'Creative Commons Zero (CC0 1.0)',
        slug: 'cc0-1.0',
        url: 'https://creativecommons.org/publicdomain/zero/1.0/',
        commercial_use: true,
        redistribution: true,
        modification: true,
        attribution_required: false
      },
      {
        id: 'l1000000-0000-0000-0000-000000000003',
        name: 'Standard Commercial License',
        slug: 'platform-commercial',
        url: 'https://platform.example.com/licenses/commercial',
        commercial_use: true,
        redistribution: false,
        modification: true,
        attribution_required: false
      }
    ]

    for (const lic of licenseSeeds) {
      this.licenses.set(lic.id, {
        ...lic,
        created_at: new Date().toISOString()
      })
    }

    // 5. Initial Tags
    const tagSeeds = ['minimal', 'outline', 'solid', 'vector', 'modern', 'dark-mode']
    for (let i = 0; i < tagSeeds.length; i++) {
      const tagId = `t1000000-0000-0000-0000-00000000000${i + 1}`
      this.tags.set(tagId, {
        id: tagId,
        name: tagSeeds[i].charAt(0).toUpperCase() + tagSeeds[i].slice(1),
        slug: tagSeeds[i],
        created_at: new Date().toISOString()
      })
    }

    // 6. Initial Seed Assets (Foundation demo assets across multiple types: Icon, Font, Illustration)
    const mitId = 'l1000000-0000-0000-0000-000000000001'
    const cc0Id = 'l1000000-0000-0000-0000-000000000002'
    const techCatId = 'c1000000-0000-0000-0000-000000000005'
    const uiCatId = 'c1000000-0000-0000-0000-000000000011'
    const bizCatId = 'c1000000-0000-0000-0000-000000000001'

    const initialAssets: Asset[] = [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        type: 'ICON',
        name: 'Cloud Security Shield',
        slug: 'cloud-security-shield',
        description: 'Scalable vector security shield with cloud perimeter icon.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: mitId,
        category_id: techCatId,
        is_featured: true,
        download_count: 342,
        favorite_count: 89,
        metadata: { grid: '24x24', strokeWidth: 2, tags: ['security', 'cloud', 'vector'] },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a1000000-0000-0000-0000-000000000002',
        type: 'ICON',
        name: 'Database Cluster',
        slug: 'database-cluster',
        description: 'Distributed PostgreSQL relational database cluster glyph.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: cc0Id,
        category_id: techCatId,
        is_featured: true,
        download_count: 215,
        favorite_count: 45,
        metadata: { grid: '24x24', strokeWidth: 2 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a1000000-0000-0000-0000-000000000003',
        type: 'FONT',
        name: 'Interplex Display Sans',
        slug: 'interplex-display-sans',
        description: 'Geometric modernist display typeface with multilingual glyph support.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: mitId,
        category_id: uiCatId,
        is_featured: true,
        download_count: 512,
        favorite_count: 120,
        metadata: { weights: ['Regular', 'SemiBold', 'Bold'], glyphCount: 420 },
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a1000000-0000-0000-0000-000000000004',
        type: 'ILLUSTRATION',
        name: 'Autonomous Delivery Fleet',
        slug: 'autonomous-delivery-fleet',
        description: 'Isometric vector illustration of modern autonomous logistics.',
        status: 'PUBLISHED',
        author_id: regularUserId,
        license_id: cc0Id,
        category_id: bizCatId,
        is_featured: false,
        download_count: 140,
        favorite_count: 32,
        metadata: { colors: ['#2563EB', '#38BDF8', '#0F172A'] },
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a1000000-0000-0000-0000-000000000005',
        type: 'ICON',
        name: 'Draft Payment Gateway',
        slug: 'draft-payment-gateway',
        description: 'Unpublished draft icon for upcoming checkout workflow.',
        status: 'DRAFT',
        author_id: regularUserId,
        license_id: null, // Drafts may lack license until publication
        category_id: bizCatId,
        is_featured: false,
        download_count: 0,
        favorite_count: 0,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    for (const a of initialAssets) {
      this.assets.set(a.id, a)
    }

    // Associate Tags
    this.assetTags.push(
      { asset_id: 'a1000000-0000-0000-0000-000000000001', tag_id: 't1000000-0000-0000-0000-000000000001' },
      { asset_id: 'a1000000-0000-0000-0000-000000000001', tag_id: 't1000000-0000-0000-0000-000000000004' },
      { asset_id: 'a1000000-0000-0000-0000-000000000002', tag_id: 't1000000-0000-0000-0000-000000000002' }
    )

    // Initial Sample Asset Files (SVG representation)
    const svgContent1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    const svgContent2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`

    this.assetFiles.set('f1000000-0000-0000-0000-000000000001', {
      id: 'f1000000-0000-0000-0000-000000000001',
      asset_id: 'a1000000-0000-0000-0000-000000000001',
      format: 'SVG',
      file_path: 'assets/icons/cloud-shield.svg',
      file_size: svgContent1.length,
      mime_type: 'image/svg+xml',
      width: 24,
      height: 24,
      metadata: { rawContent: svgContent1 },
      created_at: new Date().toISOString()
    })

    this.assetFiles.set('f1000000-0000-0000-0000-000000000002', {
      id: 'f1000000-0000-0000-0000-000000000002',
      asset_id: 'a1000000-0000-0000-0000-000000000002',
      format: 'SVG',
      file_path: 'assets/icons/db-cluster.svg',
      file_size: svgContent2.length,
      mime_type: 'image/svg+xml',
      width: 24,
      height: 24,
      metadata: { rawContent: svgContent2 },
      created_at: new Date().toISOString()
    })

    // Store in virtual bucket
    const bucket = this.storageBuckets.get('assets')!
    bucket.set('assets/icons/cloud-shield.svg', { buffer: svgContent1, mimeType: 'image/svg+xml', size: svgContent1.length })
    bucket.set('assets/icons/db-cluster.svg', { buffer: svgContent2, mimeType: 'image/svg+xml', size: svgContent2.length })

    // Initial Audit Log
    this.auditLogs.push({
      id: 'aud-0000-0000-0000-000000000001',
      actor_id: adminId,
      action: 'SYSTEM_BOOTSTRAP',
      entity_type: 'SYSTEM',
      entity_id: 'phase-0-foundation',
      metadata: { version: '0.1.0', modules: ['RLS', 'Storage', 'Audit', 'Assets'] },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString()
    })
  }

  // Row Level Security Query Filter for Assets
  public filterAssetsByRLS(currentUserId: string | null, currentUserRole: UserRole | null): Asset[] {
    const list = Array.from(this.assets.values())
    return list.filter((asset) => {
      // Admin sees everything
      if (currentUserRole === 'ADMIN') return true
      // Published assets are public
      if (asset.status === 'PUBLISHED') return true
      // Authors see their own drafts and pending review assets
      if (currentUserId && asset.author_id === currentUserId) return true
      return false
    })
  }
}

// Global Singleton for in-memory persistence during the server lifecycle
const globalStoreKey = Symbol.for('digital.assets.store')
const globalScope = globalThis as any

if (!globalScope[globalStoreKey]) {
  globalScope[globalStoreKey] = new InMemoryDatabaseStore()
}

export const dbStore: InMemoryDatabaseStore = globalScope[globalStoreKey]
