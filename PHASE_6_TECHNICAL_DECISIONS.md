# PHASE 6 TECHNICAL DECISION RECORDS (TDR)

**Project:** Digital Assets & Font Management Platform  
**Branch:** `feature/phase-6-font-library`  
**Author:** Emad20112 <fyslbdh80@gmail.com>

---

## TDR 01: Binary Parsing Engine Choice (opentype.js vs fontkit)
- **Context:** We require font inspection in Node.js server environments for OTF, TTF, WOFF, and WOFF2 formats.
- **Decision:** Selected `opentype.js` supplemented with binary buffer sniffing.
- **Rationale:** `opentype.js` is fully written in JavaScript/TypeScript with no native binary bindings (C++ node-gyp) that could cause build fragility in containerized environments. It exposes direct table access (`name`, `head`, `OS/2`, `fvar`) and allows fast glyph contour evaluation.

## TDR 02: Arabic Font Taxonomy Architecture
- **Context:** Traditional western font systems classify fonts only as serif, sans-serif, display, script. Arabic calligraphy has rich, distinct historic and contemporary styles with specific structural rules.
- **Decision:** Built a dual-axis taxonomy system supporting 10 Arabic classifications (`naskh`, `kufi`, `ruqah`, `thuluth`, `diwani`, `nastaliq`, `modern`, `maghrebi`, `square_kufic`, `hybrid`) alongside standard Latin categories.
- **Rationale:** Crucial for designers searching specifically for Ruq'ah for titles, Naskh for readable body paragraphs, or Square Kufic for architectural/logo marks.

## TDR 03: Multimodal AI Classification Pipeline (Gemini 3.8 Flash)
- **Context:** Text metadata inside font files is often incomplete or misleading (e.g. foundry labeled Arabic font as "Sans Serif").
- **Decision:** Implemented a multimodal classifier that renders specimen text (both Arabic pangram and Latin uppercase/lowercase) to vector SVG, passing both the visual specimen image/svg and extracted OpenType table metrics to `@google/genai` using model `gemini-3.8-flash`.
- **Rationale:** Visual analysis captures the true calligraphic essence and stroke characteristics regardless of what metadata was embedded by the designer.

## TDR 04: ZIP Bomb & Malicious Upload Defense
- **Context:** Designers upload large family archives containing dozens of TTF/OTF files. Malicious actors could upload recursive zip bombs or disguised executables.
- **Decision:** Implemented strict decompression guardrails in `fontZipImportService.ts`:
  1. File size limit: 100MB input archive.
  2. Maximum uncompressed limit: 250MB.
  3. Compression ratio threshold: Max 12:1.
  4. Max file count: 1,000 files.
  5. Path sanitization: Any file containing `..`, absolute paths, or invalid characters is stripped.
  6. Binary Magic Bytes checking on every extracted stream.

## TDR 05: Mock Store & Supabase Hybrid Persistence
- **Context:** Platform runs in development/preview environments where Supabase credentials may not always be pre-provisioned, but must transition seamlessly to production Postgres.
- **Decision:** Implemented typed `mockStore.ts` for memory persistence that mirrors Supabase database tables (`font_families`, `fonts`, `font_ai_classifications`, `font_import_batches`, `font_licenses`).
- **Rationale:** Enables instant local testing and automated CI validation while maintaining full SQL migration compatibility via `database/migrations/20261103000001_phase6_font_library.sql`.
