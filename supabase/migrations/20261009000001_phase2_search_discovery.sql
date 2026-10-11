-- ==============================================================================
-- MIGRATION 006: PHASE 2 ADVANCED SEARCH & DISCOVERY
-- ==============================================================================

-- 1. Performance Indexes for Sorting & Filtering
CREATE INDEX IF NOT EXISTS idx_assets_download_count ON public.assets(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_assets_name_lower ON public.assets(lower(name));
CREATE INDEX IF NOT EXISTS idx_asset_tags_composite ON public.asset_tags(tag_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_categories_name_lower ON public.categories(lower(name));
CREATE INDEX IF NOT EXISTS idx_tags_name_lower ON public.tags(lower(name));
CREATE INDEX IF NOT EXISTS idx_assets_metadata_gin ON public.assets USING gin(metadata);

-- 2. New Tags for E-commerce & Discovery
INSERT INTO public.tags (name, slug)
VALUES
  ('Shopping', 'shopping'),
  ('Cart', 'cart'),
  ('Store', 'store'),
  ('Ecommerce', 'ecommerce'),
  ('Security', 'security'),
  ('Cloud', 'cloud'),
  ('Database', 'database'),
  ('Arrows', 'arrows'),
  ('Media', 'media'),
  ('Finance', 'finance')
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed Comprehensive Professional Icons for Shopping, Cart, Commerce, Cloud, Security
INSERT INTO public.assets (
  id, type, name, slug, description, status, author_id, license_id, category_id, is_featured, download_count, favorite_count, metadata
)
VALUES
  (
    'a2000000-0000-0000-0000-000000000001',
    'ICON',
    'Shopping Cart',
    'shopping-cart',
    'Streamlined modern shopping cart icon with rolling wheels and handle for e-commerce checkout and retail stores.',
    'PUBLISHED',
    'a0000000-0000-0000-0000-000000000001',
    'l1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003', -- Shopping category
    true,
    1420,
    380,
    '{"aliases": ["shopping cart", "cart", "trolley", "checkout", "store", "buy", "عربة تسوق", "سلة تسوق", "سلة"], "keywords": ["ecommerce", "retail", "market", "purchase", "شراء", "متجر"], "strokeWidth": 2, "viewBox": "0 0 24 24"}'::jsonb
  ),
  (
    'a2000000-0000-0000-0000-000000000002',
    'ICON',
    'Shopping Bag',
    'shopping-bag',
    'Minimalist shopping tote bag icon for digital storefronts, purchase summaries, and product orders.',
    'PUBLISHED',
    'a0000000-0000-0000-0000-000000000001',
    'l1000000-0000-0000-0000-000000000002', -- CC0
    'c1000000-0000-0000-0000-000000000003',
    false,
    980,
    215,
    '{"aliases": ["shopping bag", "tote bag", "order bag", "bag", "حقيبة تسوق", "كيس تسوق"], "keywords": ["shopping", "retail", "orders", "fashion", "boutique", "تسوق"], "strokeWidth": 2, "viewBox": "0 0 24 24"}'::jsonb
  ),
  (
    'a2000000-0000-0000-0000-000000000003',
    'ICON',
    'Storefront Market',
    'storefront-market',
    'Commercial storefront building with canopy roof for physical shops, local retail, and marketplace listings.',
    'PUBLISHED',
    'a0000000-0000-0000-0000-000000000001',
    'l1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    false,
    650,
    142,
    '{"aliases": ["storefront", "shop", "market", "outlet", "متجر", "دكان", "محل"], "keywords": ["shopping", "commerce", "store", "business", "تجارة", "تسوق"], "strokeWidth": 2, "viewBox": "0 0 24 24"}'::jsonb
  ),
  (
    'a2000000-0000-0000-0000-000000000004',
    'ICON',
    'Credit Card Payment',
    'credit-card-payment',
    'Contactless payment chip credit card icon for checkout billing, subscription management, and banking transactions.',
    'PUBLISHED',
    'a0000000-0000-0000-0000-000000000001',
    'l1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000002', -- Finance category
    true,
    1890,
    490,
    '{"aliases": ["credit card", "payment", "checkout", "billing", "بطاقة ائتمان", "دفع إلكتروني"], "keywords": ["finance", "shopping", "visa", "mastercard", "money", "أموال"], "strokeWidth": 2, "viewBox": "0 0 24 24"}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

-- 4. Associate Tags with newly seeded assets
INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT a.id, t.id
FROM public.assets a, public.tags t
WHERE a.slug = 'shopping-cart' AND t.slug IN ('shopping', 'cart', 'ecommerce', 'minimal')
ON CONFLICT DO NOTHING;

INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT a.id, t.id
FROM public.assets a, public.tags t
WHERE a.slug = 'shopping-bag' AND t.slug IN ('shopping', 'store', 'ecommerce')
ON CONFLICT DO NOTHING;

INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT a.id, t.id
FROM public.assets a, public.tags t
WHERE a.slug = 'storefront-market' AND t.slug IN ('store', 'shopping', 'ecommerce')
ON CONFLICT DO NOTHING;

INSERT INTO public.asset_tags (asset_id, tag_id)
SELECT a.id, t.id
FROM public.assets a, public.tags t
WHERE a.slug = 'credit-card-payment' AND t.slug IN ('finance', 'shopping', 'ecommerce')
ON CONFLICT DO NOTHING;
