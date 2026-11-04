import { defineEventHandler, getQuery } from 'h3'
import { dbStore, type UserRole } from '~/server/utils/mockStore'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = query.q ? String(query.q).toLowerCase().trim() : ''
  const category = query.category ? String(query.category).toLowerCase() : undefined
  const arabicStyle = query.arabic_style ? String(query.arabic_style).toLowerCase() : undefined
  const language = query.language ? String(query.language).toLowerCase() : undefined
  const license = query.license ? String(query.license).toUpperCase() : undefined
  const sort = query.sort ? String(query.sort) : 'popular'
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
  const offset = Math.max(Number(query.offset) || 0, 0)

  // Auth / Role check for RLS
  const authHeader = event.node.req.headers.authorization
  let userRole: UserRole | null = null
  let userId: string | null = null

  if (authHeader?.includes('admin')) {
    userRole = 'ADMIN'
    userId = 'u1000000-0000-0000-0000-000000000001'
  }

  // Filter by RLS
  let families = dbStore.filterFontFamiliesByRLS(userId, userRole)

  // Search filter
  if (q) {
    families = families.filter(f => {
      const matchName = f.name.toLowerCase().includes(q) || (f.display_name && f.display_name.toLowerCase().includes(q))
      const matchDesc = f.description?.toLowerCase().includes(q)
      const matchDesigner = f.designer?.toLowerCase().includes(q) || f.foundry?.toLowerCase().includes(q)
      const matchTags = f.style_tags.some(t => t.toLowerCase().includes(q))
      const matchArabicStyle = f.arabic_style?.toLowerCase().includes(q)
      return matchName || matchDesc || matchDesigner || matchTags || matchArabicStyle
    })
  }

  // Category filter
  if (category && category !== 'all') {
    families = families.filter(f => {
      const primary = f.primary_category.toLowerCase().replace('-', '_')
      const target = category.replace('-', '_')
      return primary === target || f.secondary_categories?.some(sc => sc.toLowerCase() === target)
    })
  }

  // Arabic style filter
  if (arabicStyle && arabicStyle !== 'all') {
    families = families.filter(f => f.arabic_style?.toLowerCase() === arabicStyle)
  }

  // Language filter
  if (language && language !== 'all') {
    families = families.filter(f => f.language_support.includes(language))
  }

  // License filter
  if (license && license !== 'ALL') {
    families = families.filter(f => f.license_type.toUpperCase() === license)
  }

  // Sorting
  if (sort === 'name_asc') {
    families.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'name_desc') {
    families.sort((a, b) => b.name.localeCompare(a.name))
  } else if (sort === 'newest') {
    families.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else {
    // Default popular / confidence
    families.sort((a, b) => (b.ai_confidence || 0) - (a.ai_confidence || 0))
  }

  const total = families.length
  const paginated = families.slice(offset, offset + limit)

  // Enrich families with variant files summary
  const enriched = paginated.map(fam => {
    const files = Array.from(dbStore.fontFiles.values()).filter(file => file.family_id === fam.id)
    const weights = Array.from(new Set(files.map(file => file.weight))).sort((a, b) => a - b)
    const styles = Array.from(new Set(files.map(file => file.style)))
    const formats = Array.from(new Set(files.map(file => file.file_format)))
    const isVariable = files.some(file => file.is_variable)

    return {
      ...fam,
      files_count: files.length,
      weights,
      styles,
      formats,
      is_variable: isVariable,
      files: files.map(f => ({
        id: f.id,
        name: f.file_name,
        format: f.file_format,
        weight: f.weight,
        style: f.style,
        subfamily: f.subfamily_name,
      })),
    }
  })

  return {
    success: true,
    total,
    offset,
    limit,
    families: enriched,
  }
})
