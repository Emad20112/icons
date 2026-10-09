-- ==============================================================================
-- MIGRATION 005: SEED DATA FOR CATEGORIES, LICENSES, AND TAGS (PHASE 0)
-- ==============================================================================

-- 1. Insert Default Dynamic Categories
INSERT INTO public.categories (name, slug, description, icon, is_active)
VALUES
  ('Business', 'business', 'Enterprise, office, management, and commerce assets', 'Briefcase', true),
  ('Finance', 'finance', 'Banking, currency, investment, and crypto assets', 'DollarSign', true),
  ('Shopping', 'shopping', 'E-commerce, cart, retail, and payment assets', 'ShoppingCart', true),
  ('Food', 'food', 'Cuisine, dining, beverages, and culinary assets', 'Utensils', true),
  ('Technology', 'technology', 'Hardware, software, cloud, and computing assets', 'Cpu', true),
  ('Transportation', 'transportation', 'Vehicles, logistics, aviation, and transit assets', 'Truck', true),
  ('Communication', 'communication', 'Chat, messaging, audio, and network assets', 'MessageSquare', true),
  ('Education', 'education', 'Academic, school, science, and learning assets', 'GraduationCap', true),
  ('Medical', 'medical', 'Healthcare, medicine, hospital, and clinic assets', 'Activity', true),
  ('Social', 'social', 'Community, media, sharing, and profile assets', 'Users', true),
  ('UI', 'ui', 'User interface controls, arrows, badges, and layout primitives', 'Layout', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- 2. Insert Standard Digital Licenses
INSERT INTO public.licenses (name, slug, url, commercial_use, redistribution, modification, attribution_required)
VALUES
  (
    'MIT License', 
    'mit', 
    'https://opensource.org/licenses/MIT', 
    true, 
    true, 
    true, 
    true
  ),
  (
    'Creative Commons Zero (CC0 1.0)', 
    'cc0-1.0', 
    'https://creativecommons.org/publicdomain/zero/1.0/', 
    true, 
    true, 
    true, 
    false
  ),
  (
    'Creative Commons Attribution 4.0 (CC BY 4.0)', 
    'cc-by-4.0', 
    'https://creativecommons.org/licenses/by/4.0/', 
    true, 
    true, 
    true, 
    true
  ),
  (
    'Standard Platform Commercial License', 
    'platform-commercial', 
    'https://platform.example.com/licenses/commercial', 
    true, 
    false, -- No standalone redistribution
    true, 
    false
  ),
  (
    'Editorial / Personal Use Only', 
    'personal-editorial', 
    'https://platform.example.com/licenses/personal', 
    false, 
    false, 
    false, 
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  url = EXCLUDED.url,
  commercial_use = EXCLUDED.commercial_use,
  redistribution = EXCLUDED.redistribution,
  modification = EXCLUDED.modification,
  attribution_required = EXCLUDED.attribution_required;

-- 3. Insert Common Tags
INSERT INTO public.tags (name, slug)
VALUES
  ('Minimal', 'minimal'),
  ('Outline', 'outline'),
  ('Solid', 'solid'),
  ('Vector', 'vector'),
  ('Modern', 'modern'),
  ('Geometric', 'geometric'),
  ('Dark Mode', 'dark-mode'),
  ('Responsive', 'responsive'),
  ('Mobile', 'mobile'),
  ('Web', 'web')
ON CONFLICT (slug) DO NOTHING;
