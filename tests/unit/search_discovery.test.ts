import { describe, it, expect, beforeEach } from 'vitest'
import { AssetService } from '../../server/services/assetService'
import { dbStore } from '../../server/utils/mockStore'
import type { Asset } from '../../types/database'

describe('Phase 2: Advanced Search & Discovery Suite', () => {
  const adminId = 'a0000000-0000-0000-0000-000000000001'
  const regularUserId = 'u0000000-0000-0000-0000-000000000001'

  beforeEach(() => {
    // Ensure clean known state in in-memory store
  })

  describe('1. Text Search & Weighted Relevance Engine', () => {
    it('ranks exact name match highest in search results', async () => {
      const res = await AssetService.listAssets(
        { search: 'Shopping Cart', sort: 'relevance' },
        null,
        null
      )

      expect(res.total).toBeGreaterThan(0)
      expect(res.assets[0].name).toBe('Shopping Cart')
      expect(res.assets[0].slug).toBe('shopping-cart')
    })

    it('finds assets by metadata aliases and Arabic keywords (عربة تسوق / سلة)', async () => {
      // Search in Arabic for "عربة تسوق"
      const arabicRes = await AssetService.listAssets(
        { search: 'عربة تسوق' },
        null,
        null
      )

      expect(arabicRes.total).toBeGreaterThan(0)
      const names = arabicRes.assets.map(a => a.name)
      expect(names).toContain('Shopping Cart')

      // Search for "سلة"
      const basketRes = await AssetService.listAssets(
        { search: 'سلة' },
        null,
        null
      )
      expect(basketRes.total).toBeGreaterThan(0)
      expect(basketRes.assets[0].name).toBe('Shopping Cart')
    })

    it('matches multi-word queries with tokenization ("shopping cart", "storefront market")', async () => {
      const res = await AssetService.listAssets(
        { search: 'shopping cart' },
        null,
        null
      )

      expect(res.assets.length).toBeGreaterThan(0)
      expect(res.assets[0].name).toBe('Shopping Cart')
    })

    it('handles search queries with extraneous whitespaces and case-insensitivity', async () => {
      const res = await AssetService.listAssets(
        { search: '   sHoPpInG    cArT   ' },
        null,
        null
      )

      expect(res.assets.length).toBeGreaterThan(0)
      expect(res.assets[0].name).toBe('Shopping Cart')
    })

    it('finds assets by matching category name and description keywords', async () => {
      const res = await AssetService.listAssets(
        { search: 'PostgreSQL relational' },
        null,
        null
      )

      expect(res.total).toBeGreaterThan(0)
      expect(res.assets.some(a => a.slug === 'database-cluster')).toBe(true)
    })

    it('returns empty list for non-matching queries without throwing', async () => {
      const res = await AssetService.listAssets(
        { search: 'nonexistent-xyz-qwerty-super-icon-999' },
        null,
        null
      )

      expect(res.total).toBe(0)
      expect(res.assets).toEqual([])
    })
  })

  describe('2. Taxonomy & Multi-Faceted Filtering', () => {
    it('filters assets by category slug (Shopping)', async () => {
      const res = await AssetService.listAssets(
        { categorySlug: 'shopping' },
        null,
        null
      )

      expect(res.total).toBeGreaterThan(0)
      expect(res.assets.every(a => a.category?.slug === 'shopping')).toBe(true)
    })

    it('filters assets by single tag slug ("cart")', async () => {
      const res = await AssetService.listAssets(
        { tagSlugs: ['cart'] },
        null,
        null
      )

      expect(res.total).toBeGreaterThan(0)
      expect(res.assets.some(a => a.name === 'Shopping Cart')).toBe(true)
    })

    it('filters assets by multiple tags ("shopping", "ecommerce")', async () => {
      const res = await AssetService.listAssets(
        { tagSlugs: ['shopping', 'ecommerce'] },
        null,
        null
      )

      expect(res.total).toBeGreaterThan(0)
      res.assets.forEach(asset => {
        const tagSlugs = (asset.tags || []).map(t => t.slug)
        const hasAny = tagSlugs.includes('shopping') || tagSlugs.includes('ecommerce')
        expect(hasAny).toBe(true)
      })
    })

    it('filters assets by license slug ("cc0" or "mit")', async () => {
      const res = await AssetService.listAssets(
        { licenseSlug: 'cc0' },
        null,
        null
      )

      expect(res.total).toBeGreaterThan(0)
      expect(res.assets.every(a => a.license?.slug?.startsWith('cc0'))).toBe(true)
    })

    it('combines search query, category, tags, and license simultaneously', async () => {
      const res = await AssetService.listAssets(
        {
          search: 'bag',
          categorySlug: 'shopping',
          tagSlugs: ['shopping'],
          licenseSlug: 'cc0'
        },
        null,
        null
      )

      expect(res.total).toBe(1)
      expect(res.assets[0].name).toBe('Shopping Bag')
      expect(res.assets[0].license?.slug).toBe('cc0-1.0')
      expect(res.assets[0].category?.slug).toBe('shopping')
    })
  })

  describe('3. Sorting & Popularity Discovery', () => {
    it('sorts assets by popularity (most downloaded)', async () => {
      const res = await AssetService.listAssets(
        { sort: 'downloads' },
        null,
        null
      )

      expect(res.assets.length).toBeGreaterThan(1)
      for (let i = 0; i < res.assets.length - 1; i++) {
        expect(res.assets[i].download_count).toBeGreaterThanOrEqual(res.assets[i + 1].download_count)
      }
    })

    it('sorts assets alphabetically (name_asc)', async () => {
      const res = await AssetService.listAssets(
        { sort: 'name_asc' },
        null,
        null
      )

      expect(res.assets.length).toBeGreaterThan(1)
      for (let i = 0; i < res.assets.length - 1; i++) {
        expect(res.assets[i].name.localeCompare(res.assets[i + 1].name)).toBeLessThanOrEqual(0)
      }
    })

    it('sorts assets alphabetically reverse (name_desc)', async () => {
      const res = await AssetService.listAssets(
        { sort: 'name_desc' },
        null,
        null
      )

      expect(res.assets.length).toBeGreaterThan(1)
      for (let i = 0; i < res.assets.length - 1; i++) {
        expect(res.assets[i].name.localeCompare(res.assets[i + 1].name)).toBeGreaterThanOrEqual(0)
      }
    })

    it('sorts assets by newest creation date by default when no search query is present', async () => {
      const res = await AssetService.listAssets(
        { sort: 'newest' },
        null,
        null
      )

      expect(res.assets.length).toBeGreaterThan(1)
      for (let i = 0; i < res.assets.length - 1; i++) {
        const t1 = new Date(res.assets[i].created_at).getTime()
        const t2 = new Date(res.assets[i + 1].created_at).getTime()
        expect(t1).toBeGreaterThanOrEqual(t2)
      }
    })
  })

  describe('4. Pagination & Slicing Engine', () => {
    it('returns requested page and respects limit', async () => {
      const limit = 2
      const page1 = await AssetService.listAssets(
        { page: 1, limit },
        null,
        null
      )

      expect(page1.assets.length).toBe(limit)
      expect(page1.page).toBe(1)
      expect(page1.limit).toBe(limit)
      expect(page1.totalPages).toBeGreaterThanOrEqual(2)

      const page2 = await AssetService.listAssets(
        { page: 2, limit },
        null,
        null
      )

      expect(page2.assets.length).toBeLessThanOrEqual(limit)
      expect(page2.page).toBe(2)
      // Items on page 1 and page 2 must be distinct
      const page1Ids = page1.assets.map(a => a.id)
      const page2Ids = page2.assets.map(a => a.id)
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false)
    })
  })

  describe('5. Related Icons & Discovery Algorithm', () => {
    it('recommends icons sharing category and tags, strictly excluding the source icon itself', async () => {
      const targetIcon = Array.from(dbStore.assets.values()).find(a => a.slug === 'shopping-cart')!
      expect(targetIcon).toBeDefined()

      const related = await AssetService.getRelatedAssets(targetIcon.id, 4)

      expect(related.length).toBeGreaterThan(0)
      // Must NOT contain itself
      expect(related.some(r => r.id === targetIcon.id)).toBe(false)
      // Top related items should be shopping-related icons (Shopping Bag, Storefront Market, etc.)
      const relatedSlugs = related.map(r => r.slug)
      expect(relatedSlugs.some(s => s.includes('shopping') || s.includes('store'))).toBe(true)
    })

    it('returns empty array if target asset is not found', async () => {
      const related = await AssetService.getRelatedAssets('non-existent-uuid-999', 4)
      expect(related).toEqual([])
    })
  })

  describe('6. Security & Row Level Security (RLS) Compliance in Search', () => {
    it('never leaks DRAFT or PENDING assets to public / anonymous search', async () => {
      const uniqueName = `Secret Unpublished Icon ${Date.now()}`
      const draft = await AssetService.createAsset({
        name: uniqueName,
        type: 'ICON',
        status: 'DRAFT'
      }, regularUserId, 'USER')

      // Anonymous public search
      const publicSearch = await AssetService.listAssets(
        { search: uniqueName },
        null,
        null
      )
      expect(publicSearch.total).toBe(0)
      expect(publicSearch.assets.some(a => a.id === draft.id)).toBe(false)

      // Author search can find their own draft
      const authorSearch = await AssetService.listAssets(
        { search: uniqueName },
        regularUserId,
        'USER'
      )
      expect(authorSearch.total).toBe(1)
      expect(authorSearch.assets[0].id).toBe(draft.id)

      // Admin search can also find all assets
      const adminSearch = await AssetService.listAssets(
        { search: uniqueName },
        adminId,
        'ADMIN'
      )
      expect(adminSearch.total).toBe(1)
    })
  })
})
