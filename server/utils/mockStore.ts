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
    const tagSeeds = [
      { slug: 'minimal', name: 'Minimal' },
      { slug: 'outline', name: 'Outline' },
      { slug: 'solid', name: 'Solid' },
      { slug: 'vector', name: 'Vector' },
      { slug: 'modern', name: 'Modern' },
      { slug: 'dark-mode', name: 'Dark Mode' },
      { slug: 'shopping', name: 'Shopping' },
      { slug: 'cart', name: 'Cart' },
      { slug: 'store', name: 'Store' },
      { slug: 'ecommerce', name: 'Ecommerce' },
      { slug: 'security', name: 'Security' },
      { slug: 'cloud', name: 'Cloud' },
      { slug: 'finance', name: 'Finance' },
      { slug: 'database', name: 'Database' }
    ]
    for (let i = 0; i < tagSeeds.length; i++) {
      const tagId = `t1000000-0000-0000-0000-0000000000${(i + 1).toString().padStart(2, '0')}`
      this.tags.set(tagId, {
        id: tagId,
        name: tagSeeds[i].name,
        slug: tagSeeds[i].slug,
        created_at: new Date().toISOString()
      })
    }

    // 6. Initial Seed Assets (Foundation demo assets across multiple types: Icon, Font, Illustration)
    const mitId = 'l1000000-0000-0000-0000-000000000001'
    const cc0Id = 'l1000000-0000-0000-0000-000000000002'
    const techCatId = 'c1000000-0000-0000-0000-000000000005'
    const uiCatId = 'c1000000-0000-0000-0000-000000000011'
    const bizCatId = 'c1000000-0000-0000-0000-000000000001'
    const shopCatId = 'c1000000-0000-0000-0000-000000000003'
    const finCatId = 'c1000000-0000-0000-0000-000000000002'

    const initialAssets: Asset[] = [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        type: 'ICON',
        name: 'Cloud Security Shield',
        slug: 'cloud-security-shield',
        description: 'Scalable vector security shield with cloud perimeter icon for firewalls and data protection.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: mitId,
        category_id: techCatId,
        is_featured: true,
        download_count: 1342,
        favorite_count: 89,
        metadata: {
          grid: '24x24',
          strokeWidth: 2,
          aliases: ['cloud shield', 'security shield', 'firewall', 'protection', 'درع أمان', 'حماية سحابية', 'أمان'],
          keywords: ['security', 'cloud', 'cybersecurity', 'safe', 'حماية', 'سحابة']
        },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a1000000-0000-0000-0000-000000000002',
        type: 'ICON',
        name: 'Database Cluster',
        slug: 'database-cluster',
        description: 'Distributed PostgreSQL relational database cluster glyph for storage and backend infrastructure.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: cc0Id,
        category_id: techCatId,
        is_featured: true,
        download_count: 815,
        favorite_count: 45,
        metadata: {
          grid: '24x24',
          strokeWidth: 2,
          aliases: ['database', 'sql cluster', 'postgres', 'server', 'قاعدة بيانات', 'خادم بيانات'],
          keywords: ['data', 'storage', 'backend', 'table', 'بيانات', 'تخزين']
        },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a2000000-0000-0000-0000-000000000001',
        type: 'ICON',
        name: 'Shopping Cart',
        slug: 'shopping-cart',
        description: 'Streamlined modern shopping cart icon with rolling wheels and handle for e-commerce checkout and retail stores.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: mitId,
        category_id: shopCatId,
        is_featured: true,
        download_count: 2420,
        favorite_count: 580,
        metadata: {
          grid: '24x24',
          strokeWidth: 2,
          aliases: ['shopping cart', 'cart', 'trolley', 'checkout', 'store', 'buy', 'عربة تسوق', 'سلة تسوق', 'سلة'],
          keywords: ['ecommerce', 'retail', 'market', 'purchase', 'شراء', 'متجر', 'تسوق']
        },
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a2000000-0000-0000-0000-000000000002',
        type: 'ICON',
        name: 'Shopping Bag',
        slug: 'shopping-bag',
        description: 'Minimalist shopping tote bag icon for digital storefronts, purchase summaries, and product orders.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: cc0Id,
        category_id: shopCatId,
        is_featured: false,
        download_count: 1680,
        favorite_count: 315,
        metadata: {
          grid: '24x24',
          strokeWidth: 2,
          aliases: ['shopping bag', 'tote bag', 'order bag', 'bag', 'حقيبة تسوق', 'كيس تسوق'],
          keywords: ['shopping', 'retail', 'orders', 'fashion', 'boutique', 'تسوق', 'حقيبة']
        },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a2000000-0000-0000-0000-000000000003',
        type: 'ICON',
        name: 'Storefront Market',
        slug: 'storefront-market',
        description: 'Commercial storefront building with canopy roof for physical shops, local retail, and marketplace listings.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: mitId,
        category_id: shopCatId,
        is_featured: false,
        download_count: 1120,
        favorite_count: 240,
        metadata: {
          grid: '24x24',
          strokeWidth: 2,
          aliases: ['storefront', 'shop', 'market', 'outlet', 'متجر', 'دكان', 'محل'],
          keywords: ['shopping', 'commerce', 'store', 'business', 'تجارة', 'تسوق']
        },
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'a2000000-0000-0000-0000-000000000004',
        type: 'ICON',
        name: 'Credit Card Payment',
        slug: 'credit-card-payment',
        description: 'Contactless payment chip credit card icon for checkout billing, subscription management, and banking transactions.',
        status: 'PUBLISHED',
        author_id: adminId,
        license_id: mitId,
        category_id: finCatId,
        is_featured: true,
        download_count: 2890,
        favorite_count: 690,
        metadata: {
          grid: '24x24',
          strokeWidth: 2,
          aliases: ['credit card', 'payment', 'checkout', 'billing', 'بطاقة ائتمان', 'دفع إلكتروني', 'فيزا'],
          keywords: ['finance', 'shopping', 'visa', 'mastercard', 'money', 'أموال', 'دفع']
        },
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
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
        metadata: { weights: ['Regular', 'SemiBold', 'Bold'], glyphCount: 420, aliases: ['font', 'typeface', 'خط'] },
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
        metadata: { colors: ['#2563EB', '#38BDF8', '#0F172A'], aliases: ['delivery', 'truck', 'شاحنة', 'توصيل'] },
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
        license_id: null,
        category_id: bizCatId,
        is_featured: false,
        download_count: 0,
        favorite_count: 0,
        metadata: { aliases: ['draft', 'gateway'] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    for (const a of initialAssets) {
      this.assets.set(a.id, a)
    }

    // Associate Tags
    const tagMap = new Map<string, string>()
    for (const [id, t] of this.tags) {
      tagMap.set(t.slug, id)
    }

    const tagAssociations: Array<[string, string[]]> = [
      ['a1000000-0000-0000-0000-000000000001', ['security', 'cloud', 'vector', 'minimal']],
      ['a1000000-0000-0000-0000-000000000002', ['database', 'cloud', 'solid']],
      ['a2000000-0000-0000-0000-000000000001', ['shopping', 'cart', 'ecommerce', 'minimal']],
      ['a2000000-0000-0000-0000-000000000002', ['shopping', 'store', 'ecommerce', 'outline']],
      ['a2000000-0000-0000-0000-000000000003', ['store', 'shopping', 'ecommerce']],
      ['a2000000-0000-0000-0000-000000000004', ['finance', 'shopping', 'ecommerce', 'modern']]
    ]

    for (const [assetId, slugs] of tagAssociations) {
      for (const slug of slugs) {
        const tid = tagMap.get(slug)
        if (tid) {
          this.assetTags.push({ asset_id: assetId, tag_id: tid })
        }
      }
    }

    // Initial SVG Asset Files
    const svgContent1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    const svgContent2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`
    const svgCart = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`
    const svgBag = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
    const svgStore = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>`
    const svgCard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`

    const filesToSeed: Array<{ id: string; asset_id: string; name: string; content: string }> = [
      { id: 'f1000000-0000-0000-0000-000000000001', asset_id: 'a1000000-0000-0000-0000-000000000001', name: 'cloud-shield.svg', content: svgContent1 },
      { id: 'f1000000-0000-0000-0000-000000000002', asset_id: 'a1000000-0000-0000-0000-000000000002', name: 'db-cluster.svg', content: svgContent2 },
      { id: 'f2000000-0000-0000-0000-000000000001', asset_id: 'a2000000-0000-0000-0000-000000000001', name: 'shopping-cart.svg', content: svgCart },
      { id: 'f2000000-0000-0000-0000-000000000002', asset_id: 'a2000000-0000-0000-0000-000000000002', name: 'shopping-bag.svg', content: svgBag },
      { id: 'f2000000-0000-0000-0000-000000000003', asset_id: 'a2000000-0000-0000-0000-000000000003', name: 'storefront.svg', content: svgStore },
      { id: 'f2000000-0000-0000-0000-000000000004', asset_id: 'a2000000-0000-0000-0000-000000000004', name: 'credit-card.svg', content: svgCard }
    ]

    const bucket = this.storageBuckets.get('assets')!
    for (const f of filesToSeed) {
      const filePath = `assets/icons/${f.name}`
      this.assetFiles.set(f.id, {
        id: f.id,
        asset_id: f.asset_id,
        format: 'SVG',
        file_path: filePath,
        file_size: f.content.length,
        mime_type: 'image/svg+xml',
        width: 24,
        height: 24,
        metadata: { rawContent: f.content },
        created_at: new Date().toISOString()
      })
      bucket.set(filePath, { buffer: f.content, mimeType: 'image/svg+xml', size: f.content.length })
    }

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
