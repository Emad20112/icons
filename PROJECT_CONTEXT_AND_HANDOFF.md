# PROJECT CONTEXT & ENGINEERING HANDOFF

**منصة الأصول الرقمية — Digital Assets Platform**

- **نوع الوثيقة:** تقرير استلام هندسي (Onboarding / Handoff) مبني على فحص المستودع الفعلي.
- **تاريخ الفحص:** 2026-10-13
- **الفرع المفحوص:** `feature/phase-3-image-to-icon` (HEAD = `383fab1`)
- **المرجع الوحيد المعتمد:** الكود الفعلي + الاختبارات + سجل Git. لا تُعتمد أي حالة من محادثة سابقة.
- **حالة شجرة العمل:** نظيفة تمامًا (`nothing to commit, working tree clean`) — لا تغييرات غير محفوظة.
- **ملاحظة أمنية:** لا تحتوي هذه الوثيقة على أي أسرار أو Tokens أو مفاتيح خدمة. المفتاح الظاهر في `nuxt.config.ts` و`.github/workflows/ci.yml` هو قيمة وهمية (placeholder) وليس سرًّا حقيقيًا.

---

## 1. وصف المشروع ورؤيته

**Digital Asset Platform** — منصة تجمع أدوات إنشاء وتحويل الأيقونات مع مكتبة أصول رقمية قابلة للبحث والتنزيل، قابلة للتوسع إلى الخطوط وأدوات التصميم والذكاء الاصطناعي وخدمات المطورين.

**المبدأ المعماري الحاكم (Asset-First):** الكيان الأساسي هو `Asset` متعدد الأنواع (`ICON | FONT | ILLUSTRATION | LOGO | TEMPLATE`)، وليس "أيقونة" فحسب. هذا مثبت في `types/database.ts:3` وفي `supabase/migrations/20261008000001_initial_schema.sql`.

**مبادئ ملتزم بها فعليًا في الكود:**

- فصل بيانات الملفات عن محتواها: PostgreSQL للميتاداتا، وSupabase Storage للبايناري (مطبق في `server/services/storageService.ts`).
- التراخيص جزء من النظام: قيد قاعدة بيانات `chk_published_asset_must_have_license` + تحقق في `AssetService.createAsset`/`updateAsset`.
- الأمان بالتصميم: RLS على 10 جداول، تعقيم SVG، تنقية أسماء الملفات، Service Role على الخادم فقط.

---

## 2. التقنيات المستخدمة فعلًا وإصداراتها

مصدر الحقيقة: `package.json`, `pnpm-lock.yaml`, `.build-log.txt` (مخرجات بناء فعلية).

### 2.1 الإصدارات المُعلنة في `package.json`

| الحزمة                  | النطاق المعلن | الدور               |
| :---------------------- | :------------ | :------------------ |
| `nuxt`                  | `^3.15.4`     | الإطار الأساسي      |
| `vue`                   | `^3.5.13`     | طبقة العرض          |
| `vue-router`            | `^4.5.0`      | التوجيه             |
| `@supabase/supabase-js` | `^2.49.1`     | Auth / DB / Storage |
| `zod`                   | `^3.24.2`     | التحقق من المدخلات  |
| `lucide-vue-next`       | `^0.475.0`    | الأيقونات           |
| `@nuxtjs/tailwindcss`   | `^6.13.1`     | التنسيق             |
| `tailwindcss`           | `^3.4.17`     | Tailwind            |
| `typescript`            | `^5.7.3`      | الأنواع             |
| `vue-tsc`               | `^2.2.0`      | فحص الأنواع         |
| `vitest`                | `^2.1.8`      | الاختبارات          |

### 2.2 الإصدارات المُثبّتة فعليًا (من مخرجات البناء والاختبار)

- **Nuxt 3.21.11** — مع `Nitro 2.13.4`، `Vite 7.3.7`، `Vue 3.5.43`.
- **Vitest 2.1.9** (من مخرجات `vitest run`).
- **Node.js v22.17.1**، **npm 10.9.2** على جهاز الفحص.

### 2.3 ⚠️ ملاحظات بيئية حرجة (تناقضات يجب معرفتها)

1. **Nuxt 4 غير مُفعَّل فعليًا:** `nuxt.config.ts:8` يضبط `compatibilityVersion: 3` صراحةً، مع تعليق يوضح أن مصدر التطبيق في جذر المستودع (`pages/`, `components/`) وليس داخل `app/`. التوثيق (README/ARCHITECTURE/تقرير Phase 0) يعلن "Nuxt 4 mode / compatibilityVersion: 4" وهذا **غير مطابق للكود**. عمليًا يعمل المشروع بنمط Nuxt 3.
2. **`app/` موجود لكنه غير مستخدم فعليًا:** يحتوي فقط على `app/app.vue` و`app/assets/css/main.css`، بينما `nuxt.config.ts:16` يشير إلى `~/assets/css/main.css` (أي `assets/css/main.css` في الجذر). وجود `app/` مع `compatibilityVersion: 3` هو أثر انتقالي غير مكتمل.
3. **لا يوجد lockfile واحد موثوق:** المستودع يحتوي على **كلٍّ من** `pnpm-lock.yaml` و`bun.lock`. CI يستخدم pnpm (`pnpm/action-setup@v3`, version 10). وجود `bun.lock` مصدر غموض ويجب حسنه.
4. **pnpm غير مُثبّت على جهاز الفحص:** `pnpm` و`node` و`git` ليست في `PATH`. تم تشغيل كل الفحوص عبر مسارات مطلقة (`C:\Program Files\nodejs\node.exe`, `C:\Program Files\Git\cmd\git.exe`). هذا قيد بيئي وليس عيبًا في المستودع.
5. **Tailwind CSS v3** وليس v4، و`tailwind.config.ts` موجود في الجذر.
6. **shadcn-vue غير مستخدم:** المكونات في `components/ui/` مكتوبة يدويًا (Button, Input, Badge, Card, Modal, Toast, Dropdown, Table). لا توجد تبعية `shadcn-vue` ولا `radix-vue` في `package.json`.

### 2.4 ما هو غائب عن التقنيات المعتمدة

- **Playwright غير موجود:** لا تبعية ولا إعداد ولا مجلد e2e. الاختبارات كلها Vitest (وحدة + تكامل داخلية).
- **لا يوجد ESLint / Prettier:** لا إعداد linting في `package.json`، وCI لا يشغّل lint (رغم تسمية الـ job "Lint, Test, Typecheck & Build").
- **`vue-tsc` غير مُشغَّل في CI:** CI يشغّل `pnpm test` ثم `pnpm build` فقط، ولا يشغّل `pnpm typecheck`.

---

## 3. البنية الفعلية للمجلدات

```
h:\icons\
├── app/                        # (2 ملفات) app.vue + assets/css/main.css — غير مستخدم فعليًا
├── assets/css/main.css         # ملف CSS الفعلي المستخدم في nuxt.config
├── components/                 # 19 مكونًا
│   ├── ui/                     # Button, Input, Badge, Card, Modal, Toast (يدوية لا shadcn-vue)
│   ├── layout/                 # AppHeader, AppFooter, Container
│   ├── assets/                 # AssetCard, AssetFilter, AssetCreateModal
│   ├── admin/                  # FoundationStatus, CategoryManager, LicenseManager, AuditLogViewer
│   └── common/                 # EmptyState, ErrorState, LoadingState
├── composables/                # 7: useAssets, useAuth, useCategories, useLicenses, useTags, useAudit, useToast
├── database/migrations/        # 7 ملفات SQL — نسخة مطابقة (mirror) بالبايت لـ supabase/migrations
├── docs/adr/                   # 4 ADRs (001 asset-first, 002 supabase, 003 storage, 004 search)
├── features/image-converter/   # ⭐ ميز ملفات)
│   ├── types/converter.ts
│   ├── utils/                  # fileValidator, icoEncoder, zipEncoder
│   ├── services/               # imageConverterService
│   ├── composables/            # useImageConverter
│   └── components/             # ConverterUploadZone, PreviewStage, ControlPanel, ExportActions
├── layouts/                    # default.vue, admin.vue
├── lib/
│   ├── validation/schemas.ts   # مخططات Zod
│   ├── sanitizer/              # svgSanitizer, filenameSanitizer
│   ├── errors/AppError.ts      # ValidationError, AuthorizationError, NotFoundError, StorageError
│   └── logger/logger.ts
├── pages/                      # 10 صفحات (انظر القسم 8)
├── server/                     # Nitro
│   ├── api/v1/                 # 24 endpoint
│   ├── services/               # assetService, authService, storageService, auditService
│   └── utils/                  # supabaseClient, mockStore (InMemory DB)
├── supabase/migrations/        # 7 ملفات SQL (المصدر الحقيقي) + .temp/ (بيانات CLI)
├── tests/unit/                 # 6 ملفات اختبار Vitest
├── types/                      # database.ts, storage.ts, index.ts
├── .github/workflows/ci.yml
├── nuxt.config.ts, tsconfig.json, tailwind.config.ts, vitest.config.ts
├── ARCHITECTURE.md, DATABASE.md, SECURITY.md, DEVELOPMENT.md, README.md
├── PHASE_0_IMPLEMENTATION_PLAN.md / PHASE_0_COMPLETION_REPORT.md
├── PHASE_2_IMPLEMENTATION_PLAN.md / PHASE_2_COMPLETION_REPORT.md
├── PHASE_3_IMPLEMENTATION_PLAN.md / PHASE_3_COMPLETION_REPORT.md
└── ⚠️ مفقود: PHASE_1_IMPLEMENTATION_PLAN.md / PHASE_1_COMPLETION_REPORT.md
```

**ملاحظة مهمة:** لا توجد أي وثيقة خطة أو إنجاز للمرحلة الأولى (Phase 1 — Icon Library) رغم أن الوظائف المنتمية إليها موجودة في الكود ومُستشهد بها في تقرير Phase 2 كأساس مستقر.

---

## 4. Architecture للواجهة والخدمات والبيانات

### 4.1 نمط الوصول إلى البيانات — نمط مزدوج مع Fallback

هذا أهم قرار معماري لفهم المستودع:

```
Client (Vue 3 / Nuxt)
   │  $fetch + header  'x-user-role'  (محاكاة الدور)
   ▼
Nitro API  /api/v1/*
   │  getAuthContext(event)  ← server/utils/supabaseClient.ts
   ▼
AssetService / AuthService / StorageService / AuditService
   │
   ├─► (1) إن كان Supabase مُهيّأ فعليًا → getSupabaseAdminClient() → PostgreSQL + RLS
   └─► (2) وإلا → dbStore (InMemoryDatabaseStore) → منطق RLS مُعاد تنفيذه في TS
```

- `isSupabaseConfigured()` في `server/utils/supabaseClient.ts:31` يعتبر Supabase **غير مُهيّأ** إذا احتوى الـ URL على `mock-project`/`mock-ci` أو كان المفتاح `anon-token`/`ci-anon`. وبهذا يعمل المشروع محليًا بالكامل على `mockStore` دون أي خدمة خارجية.
- `mockStore.ts` (449 سطرًا) هو قاعدة بيانات في الذاكرة عالية الدقة: 10 كيانات، قيود علائقية، RLS، وبيانات أولية مطابقة لمهاجرة seed، مع Singleton على `globalThis`.

### 4.2 ⚠️ مخاطر معمارية مؤكدة في طبقة المصادقة (بالغة الأهمية)

هذه ليست ملاحظات أسلوبية — بل ثقوب صلاحيات فعلية:

1. **`getAuthContext` تعتمد على ترويسات يرسلها العميل:**
   `server/utils/supabaseClient.ts:87-88` تقرأ `x-user-id` و`x-user-role` من رأس الطلب، ثم تعيد `role: simulatedRole || profile.role` (سطر 118، 139). أي أن العميل يستطيع **تصعيد نفسه إلى ADMIN** بمجرد إرسال الترويسة.
2. **الرجوع الافتراضي إلى "Lead Admin":**
   `server/utils/supabaseClient.ts:134-142` — في حال عدم وجود أي هوية، تُعاد هوية `a0000000-...-0001` بدور `ADMIN`. أي أن **كل طلب مجهول يُعامل كمسؤول** ما دام `mockStore` يحوي هذا الملف الشخصي.
3. **تناقض بين الاثنين:** الواجهة ترسل `x-user-role` في كل الطلبات (`composables/useAssets.ts:68`، `pages/assets/[id].vue:33`)، لكن الـ endpoints لا تمرّر دورًا مُتحقَّقًا منه إلى الخدمة، بل تستخدم `auth.role` المأخوذ من الترويسة نفسها.

**الأثر:** كل ضمانات RLS المُعلنة في `DATABASE.md` و`SECURITY.md` **غير قابلة للإثبات على مسار HTTP الحالي**، لأن طبقة الخادم تُصدّق دور العميل قبل الوصول إلى قاعدة البيانات. اختبارات `permissions.test.ts` تختبر `AssetService` مباشرةً بتمرير الدور كوسيط — أي أنها تختبر منطق الخدمة وليس حدود المصادقة الحقيقية.

**ملاحظة توازن:** عند توصيل Supabase حقيقي مع Service Role، فإن RLS على قاعدة البيانات يعمل عند الاستعلام بـ anon/JWT. لكن الكود الحالي يستخدم **Service Role في كل مكان** (`getSupabaseAdminClient`) وهو يتجاوز RLS بحكم التعريف — وهو ما يخالف صراحةً قاعدة المشروع "لا تستخدم Service Role Key لتجاوز الصلاحيات التي يفترض أن تطبقها قاعدة البيانات". لم يُعثر على أي استدعاء لـ `getSupabaseAnonClient` في مسار الطلبات.

### 4.3 فصل منطق الأعمال عن الواجهة

جيد ومُثبت في Phase 3: المنطق كله في `features/image-converter/{types,utils,services,composables}`، والمكونات `.vue` عرضية بحتة تتعامل عبر `props`/`emits`. هذا النمط يجب الحفاظ عليه.

### 4.4 الأنواع

`types/database.ts` هو مصدر الحقيقة لأنواع الكيانات (114 سطرًا). `features/image-converter/types/converter.ts` مستقل تمامًا عن طبقة قاعدة البيانات — وهذا صحيح لأن الأداة تعمل بالكامل على العميل.

---

## 5. الجداول والعلاقات وMigrations

### 5.1 الجداول العشرة (مُثبتة في `20261008000001_initial_schema.sql` و`DATABASE.md`)

| الجدول                | الدور                             | علاقات أساسية                                                                                                |
| :-------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `profiles`            | ملف المستخدم، 1:1 مع `auth.users` | `id → auth.users(id)` ON DELETE CASCADE                                                                      |
| `categories`          | تصنيفات ديناميكية                 | —                                                                                                            |
| `licenses`            | شروط الاستخدام القانونية          | —                                                                                                            |
| `tags` + `asset_tags` | وسوم many-to-many                 | `asset_id → assets`, `tag_id → tags`                                                                         |
| `assets`              | الكيان متعدد الأنواع              | `author_id → profiles` (RESTRICT), `license_id → licenses` (RESTRICT), `category_id → categories` (SET NULL) |
| `asset_files`         | 1:N صيغ لكل أصل                   | `asset_id → assets` CASCADE, `UNIQUE(asset_id, format)`                                                      |
| `downloads`           | تتبع التنزيل                      | `asset_id`, `user_id`                                                                                        |
| `favorites`           | تفضيلات المستخدم                  | PK مركب `(user_id, asset_id)`                                                                                |
| `audit_logs`          | سجل تدقيق غير قابل للتغيير        | `actor_id → profiles`                                                                                        |

**قيد جوهري:** `chk_published_asset_must_have_license` = `CHECK (status != 'PUBLISHED' OR license_id IS NOT NULL)` — أي أصل منشور لا بد أن يملك ترخيصًا، على مستوى قاعدة البيانات لا على مستوى التطبيق فقط.

### 5.2 ملفات المهاجرة (7 ملفات)

| #   | الملف                                        | المحتوى                                            |
| :-- | :------------------------------------------- | :------------------------------------------------- |
| 001 | `20261008000001_initial_schema.sql`          | الجداول، الأنواع (enums)، القيود                   |
| 002 | `20261008000002_rls_policies.sql`            | تفعيل RLS + كل السياسات + دالة `public.is_admin()` |
| 003 | `20261008000003_indexes.sql`                 | الفهارس                                            |
| 004 | `20261008000004_storage_setup.sql`           | buckets `assets` و`temp-uploads` + سياسات التخزين  |
| 005 | `20261008000005_seed_data.sql`               | بيانات أولية (تصنيفات، تراخيص، وسوم، أصول)         |
| 006 | `20261009000001_phase2_search_discovery.sql` | فهارس بحث + وسوم تجارية + 4 أصول Shopping/Finance  |
| —   | `full_schema.sql`                            | دمج كل ما سبق (741 سطرًا)                          |

**تحقق فعلي:** تمت مقارنة كل ملف بين `database/migrations/` و`supabase/migrations/` عبر بصمة SHA — **جميعها متطابقة 100%**. المجلدان نسخة مرآة، و`DEVELOPMENT.md` يذكر 5 ملفات فقط (لا يذكر 006 ولا full_schema) وهو توثيق ناقص.

**ملاحظة:** `supabase/.temp/` مُتتبَّع في Git ويحتوي `project-ref` و`linked-project.json` و`pooler-url` — بيانات وصفية لربط مشروع Supabase. ليست مفاتيح سرية لكنها لا يجب أن تكون في المستودع (يفترض إضافتها إلى `.gitignore`).

---

## 6. المصادقة والصلاحيات وRLS

### 6.1 المصادقة (Auth)

- `server/services/authService.ts` + `server/api/v1/auth/{login,logout,register,user}.post/get.ts`.
- واجهات: `pages/auth/login.vue`، `pages/auth/register.vue`، `composables/useAuth.ts`.
- `useAuth` تدير دورًا تفاعليًا في الواجهة (`switchRole`, `selectProfile`, `availableProfiles`) — وهو **محاكي دور للعرض/التجربة**، وقد تحوّل إلى ثغرة عبر ترويسة `x-user-role` (القسم 4.2).
- مسار تحقق حقيقي موجود: `getAuthContext` يدعم `Authorization: Bearer <token>` عبر `admin.auth.getUser(token)` (سطر 91-111) — لكنه لا يعمل إلا عند توصيل Supabase حقيقي.

### 6.2 سياسات RLS (في `20261008000002_rls_policies.sql`)

- تفعيل RLS على الجداول العشرة.
- دالة `public.is_admin()` بـ `SECURITY DEFINER STABLE` تتحقق من دور المستخدم الحالي.
- مصفوفة السياسات كما هي مُثبتة في `DATABASE.md` القسم 2: الزائر المجهول يرى `PUBLISHED` فقط؛ المستخدم العادي يدير ملفه ومفضلاته ومسوداته فقط؛ المسؤول يرى ويعدّل كل شيء؛ `audit_logs` للقراءة للمسؤولين فقط.

**⚠️ تقييم:** السياسات مكتوبة بجودة عالية ومتسقة. لكن كفاءتها الفعلية معطّلة على مسار التطبيق الحالي بسبب استخدام Service Role (القسم 4.2). كذلك: لا يوجد أي اختبار يشغّل SQL حقيقيًا — لا `supabase start` ولا قاعدة اختبار. لذلك **RLS مُدَّعى عليه بالكود فقط، وليس مُتحقَّقًا منه تنفيذيًا**.

### 6.3 الأمان العام (مُثبت فعليًا)

- `lib/sanitizer/svgSanitizer.ts`: يحذف `<?xml?>`, `<!DOCTYPE>`, `<!ENTITY>` (XXE/Billion Laughs)، `<script>`، الوسوم الخطرة (`foreignObject`, `iframe`, `embed`, `object`, `style`, …)، أحداث `on*`، ومخططات `javascript:`/`vbscript:`/`data:text/html`. مغطى بـ 7 اختبارات.
- `lib/sanitizer/filenameSanitizer.ts`: يمنع `../` وبايتات null.
- `server/services/storageService.ts`: قائمة بيضاء لأنواع MIME، حد 50MB، تنقية المسار لكل مقطع، تعقيم SVG قبل الرفع.
- `nuxt.config.ts:58-68`: ترويسات أمان (`nosniff`, `X-XSS-Protection`, `Referrer-Policy`).
- Service Role Key يبقى على الخادم فقط عبر `runtimeConfig` الخاص (`nuxt.config.ts:42`) — مُثبت بشكل صحيح، ولم يُعثر على تسريب للمتصفح.

---

## 7. طريقة التعامل مع التخزين

- **التجريد:** `server/services/storageService.ts` يطبق `IStorageService` من `types/storage.ts`.
- **Buckets:** `assets` (عام)، `temp-uploads` (منطقة مؤقتة) — في `20261008000004_storage_setup.sql`.
- **المسار المنطقي:** `assets/{type}s/{asset_id}/{format}/{sanitized_filename}` (موثق في README، والبذور تستخدم `assets/icons/*.svg`).
- **نمط مزدوج:** رفع حقيقي إلى Supabase Storage إن كان مُهيّأً، وإلا fallback إلى `dbStore.storageBuckets` مع رابط `GET /api/v1/storage/raw?bucket=&path=`.
- **`getPublicUrl` / `getSignedUrl`:** يُنفَّذان عبر admin client أو يعودان لرابط داخلي.
- **تنبيه:** `storageService.getSignedUrl` غير مُستخدَم في أي مسار فعلي (لا يوجد مستهلك في الكود). راوت `storage/raw.get.ts` هو المسار المستخدم فعليًا.

---

## 8. الصفحات والميزات الموجودة

### 8.1 الصفحات (10)

| المسار                 | الملف                           | الوظيفة                                                                 |
| :--------------------- | :------------------------------ | :---------------------------------------------------------------------- |
| `/`                    | `pages/index.vue`               | كتالوج الأصول + بحث فوري + فلاتر + ترقيم صفحات + مزامنة URL             |
| `/assets/[id]`         | `pages/assets/[id].vue`         | تفاصيل الأصل، الملفات، التنزيل، تغيير الحالة (للمسؤول)، أيقونات ذات صلة |
| `/tools/image-to-icon` | `pages/tools/image-to-icon.vue` | ⭐ أداة Phase 3                                                         |
| `/auth/login`          | `pages/auth/login.vue`          | تسجيل الدخول                                                            |
| `/auth/register`       | `pages/auth/register.vue`       | إنشاء حساب                                                              |
| `/admin`               | `pages/admin/index.vue`         | لوحة الحكم + `FoundationStatus`                                         |
| `/admin/assets`        | `pages/admin/assets.vue`        | مراجعة/إشراف الأصول                                                     |
| `/admin/categories`    | `pages/admin/categories.vue`    | إدارة التصنيفات                                                         |
| `/admin/licenses`      | `pages/admin/licenses.vue`      | إدارة التراخيص                                                          |
| `/admin/audit`         | `pages/admin/audit.vue`         | سجل التدقيق                                                             |

### 8.2 الـ API (24 endpoint في `server/api/v1/`)

- `health.get.ts`
- `assets/`: `index.get`, `index.post`, `[id].get`, `[id].patch`, `[id].delete`, `[id]/related.get`
- `categories/`: `index.get`, `index.post`
- `licenses/`: `index.get`, `index.post`
- `tags/index.get.ts`
- `storage/`: `upload.post`, `raw.get`
- `audit/index.get.ts`
- `auth/`: `login.post`, `logout.post`, `register.post`, `user.get`

### 8.3 التبديل بين العربية والإنجليزية (i18n)

**الوضع:** ✅ مكتمل ومتحقق — التفاصيل الكاملة في `docs/plans/i18n-ar-en-plan.md`.

| العنصر | المكان |
| :----- | :----- |
| إعداد الوحدة | `nuxt.config.ts` → `i18n` (`@nuxtjs/i18n` 9.5.6، `strategy: 'no_prefix'`) |
| حزم الترجمة | `i18n/locales/en.json` (مصدر الحقيقة) و`i18n/locales/ar.json` |
| سجل اللغات (كود/لغة/اتجاه) | `i18n/locales.ts` → `SUPPORTED_LOCALES` |
| مبدّل اللغة | `components/i18n/LocaleSwitcher.vue` (في الهيدر، سطح المكتب + موبايل) |
| `lang`/`dir` + SEO | `app.vue` (`useLocaleHead({ seo: true })` + `hreflangLinks`) |
| الخط العربي | `assets/css/main.css` (`html[lang="ar"]` فقط) |
| الحراسة الآلية | `tests/unit/i18n_locales.test.ts`, `i18n_rtl.test.ts`, `i18n_hardcoded_copy.test.ts` |

**كيف يعمل التبديل:**

1. المستخدم يختار اللغة ← `setLocale('ar')` (بدون إعادة تحميل كاملة).
2. الوحدة تحفظ الاختيار في cookie `i18n_redirected` (`sameSite: lax`، سنة واحدة).
3. في الطلب التالي يقرأ السيرفر الـ cookie ويعرض `lang="ar-SA" dir="rtl"` من أول paint — لا وميض RTL.
4. لو لم يوجد cookie، يُستخدم `Accept-Language` ثم `en`.

**كيف تضيف مفتاح ترجمة:**

1. أضِفه إلى `i18n/locales/en.json` داخل الكائن المناسب (`catalog.*`, `filters.*`, `common.*` …).
2. أضِف نفس المفتاح إلى `i18n/locales/ar.json` — أي نقص يُسقِط `pnpm test`.
3. استخدمه في المكوّن: `const { t } = useI18n()` ثم `{{ t('catalog.hero.title') }}`.
4. للرسائل ذات المتغيرات: `{term}` في الملف + `t('key', { term })`، واختبار التطابق يتحقق من تطابق المتغيرات بين اللغتين.
5. للتوست: `success({ key: 'toast.categoryCreated', params: { name } })` بدل نص إنجليزي جاهز.

**قواعد RTL:**

- استخدم `ms/me/ps/pe/start/end/text-start/border-s/rounded-s` — لا `ml/mr/pl/pr/left/right`.
- الأيقونات الاتجاهية (`←`/`→`) تُقلَب بـ `rtl:rotate-180`.
- لا تكتب نصًا إنجليزيًا صلبًا في `placeholder`/`title`/`aria-label`/`alt`؛ الاختبار يرفضه.

**أخطاء يجب تجنبها (تمت مواجهتها فعليًا):**

- بدون `file: 'en.json'` داخل `locales` **لا تُضمَّن** أي ترجمة، و`pnpm build` ينجح بصمت وكل `t()` يطبع المفتاح الخام.
- `langDir` يُحلّ نسبةً إلى `rootDir`؛ مع `restructureDir: 'i18n'` القيمة الصحيحة `'locales'`.
- `useLocaleHead` يتجاهل `hreflang` في `strategy: 'no_prefix'` — تُولَّد يدويًا في `app.vue`.
- `baseUrl` مطلوب وإلا تُحذف `og:url`/`canonical` مع تحذير.
- للتحقق من SSR من PowerShell استخدم `curl.exe` (الـ cookie لا يُمرَّر بـ `Invoke-WebRequest -Headers` بشكل موثوق).

**لم يُترجم بعد (خارج النطاق):** بيانات السيرفر (أسماء التصنيفات/الوسوم/الوصف)، رسائل أخطاء API الجاهزة، صفحات `/auth/*`، وصفحة `/tools/image-to-icon` وكل مكوّنات `features/image-converter/`، و`components/admin/AuditLogViewer.vue`.

### 8.4 تفاصيل ميزة Phase 3 (Image to Icon Converter)

**خط المعالجة (client-side بالكامل، بلا رفع للخادم):**

1. **تحقق وتوقيع البايتات السحرية** (`fileValidator.ts`): PNG `89 50 4E 47`، JPEG `FF D8 FF`، WebP (RIFF…WEBP)، SVG (كشف نصي + تعقيم). حد 20MB، أبعاد 8..8192.
2. **فك الترميز** عبر `Image`/`URL.createObjectURL` مع تحرير تلقائي (`imageConverterService.loadImage`).
3. **القص**: نسب `1:1`, `4:3`, `3:4`, `free` — حساب قص مركزي (`applyDefaultCropForPreset`).
4. **الأشكال**: `square`, `rounded`, `circle` مع `cornerRadiusPercent` (مع fallback لـ `roundRect` على المتصفحات الأقدم).
5. **الهوامش والخلفية**: `paddingPercent` 0..50، خلفية شفافة/hex.
6. **Fit mode**: `contain` / `cover`.
7. **معاينة حية**: Canvas + debounce 40ms، رقعة شطرنج للشفافية.
8. **التصدير**: PNG، WebP (بجودة)، ICO (مشفّر ثنائي خاص)، ZIP (مُنشئ PKZIP خاص بـ CRC-32)، وICO متعدد الدقات (16→256).

**جودة التنفيذ:** `icoEncoder.ts` (98 سطرًا) و`zipEncoder.ts` (146 سطرًا) مكتوبان من الصفر بشكل صحيح: توقيعات `ICONDIR`/`ICONDIRENTRY` صحيحة، 256 تُرمَّز كـ 0، وحساب offsets صحيح؛ وPKZIP بـ Local Header + Central Directory + EOCD مع CRC-32 مُحسب مسبقًا في جدول. هذا تنفيذ عالي الجودة ومُختبر.

**⚠️ ملاحظات على Phase 3 (تفصيل في القسم 10):**

- `ConverterPreviewStage` و`ConverterControlPanel` يستقبلان/يُصدِران حدث `fit-mode`، لكن `useImageConverter` **لا يعرض** `fitMode` في الواجهة كتحكم صريح، و`ConverterControlPanel` لا يستقبل `fitMode` كخاصية (توقيع `defineProps` لا يتضمنه) — رغم أن الصفحة تربط `:fit-mode` بـ `ConverterPreviewStage`.
- `STANDARD_ICON_SIZES` تتضمن 1024، لكن مسار `exportBatchZip` يُنتج ICO بحجم `Math.min(256, size)` لكل حجم، ما يعني أن حزمة ICO بحجم 512/1024 تُنتج فعليًا إطارات 256 — ملفات بأسماء `-512x512.ico` تحتوي صورة 256. تضليل في التسمية.
- `ConverterControlPanel.vue` يستورد `StandardIconSize` دون استخدامه (استيراد ميت) — دليل على أن ربط الأنواع غير مُحكم.

---

## 9. المرحلة الحالية الفعلية

| المرحلة                          | الحالة الفعلية المُثبتة                                | الدليل                                                                                      |
| :------------------------------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Phase 0 — Foundation**         | ✅ مكتملة وظيفيًا                                      | جداول + RLS + Auth + Storage + Audit + 27 اختبار، `PHASE_0_COMPLETION_REPORT.md`            |
| **Phase 1 — Icon Library**       | ✅ موجودة في الكود لكن **بلا أي توثيق خطة/إنجاز**      | `pages/index.vue`, `pages/assets/[id].vue`, `AssetCard`, `AssetCreateModal` موجودة ومستخدمة |
| **Phase 2 — Search & Discovery** | ✅ مكتملة ومختبرة                                      | 19 اختبار في `search_discovery.test.ts`، مهاجرة 006، تقرير إنجاز                            |
| **Phase 3 — Image to Icon**      | ⚠️ **منجزة وظيفيًا، لكن مع فشل بناء مؤكد وثغرات نطاق** | انظر القسم 10                                                                               |

**الفرع الحالي:** `feature/phase-3-image-to-icon` — لم يُدمج في `main` (لا merge commit، و`main` لا يحتوي ملفات `features/image-converter`).

---

## 10. ما اكتمل وما لم يكتمل — مع الدليل

### 10.1 ✅ ما يعمل ومُثبت بالتشغيل

| البند                         | الدليل التنفيذي                                                                                                     |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **اختبارات الوحدة والتكامل**  | شُغّل `vitest run` فعليًا: **6 ملفات / 65 اختبارًا ناجحًا بنسبة 100%** في 6.39 ثانية                                |
|                               | `sanitizer` 7 ✓، `validation` 9 ✓، `image_converter` 19 ✓، `assets` 5 ✓، `permissions` 6 ✓، `search_discovery` 19 ✓ |
| **مشفّر ICO**                 | اختبارات تتحقق من `ICONDIR` (reserved=0, type=1)، الإزاحة 22، وتمثيل 256 كـ 0                                       |
| **مولّد ZIP**                 | اختبار يتحقق من التوقيع `0x04034B50` ووجود الأسماء في البايناري و CRC-32                                            |
| **تعقيم SVG**                 | 7 اختبارات تغطي `<script>`, `on*`, `javascript:`, `foreignObject`, XXE                                              |
| **حدود RLS على مستوى الخدمة** | 6 اختبارات: المؤلف يرى مسوداته، لا يعدّل أصول غيره، لا ينشر، المسؤول يفعل كل ذلك                                    |
| **البحث المتقدم**             | 19 اختبارًا: التسجيل بالصلة، التوكنات، التصفية متعددة الأوجه، عدم تسريب المسودات للعامة                             |
| **مكونات UI**                 | 19 مكونًا موجودًا، وحالات Loading/Empty/Error مطبقة فعليًا في `pages/index.vue:255-282`                             |

### 10.2 ❌ ما لا يعمل — عيوب مؤكدة بالتشغيل (Blocking)

**1. فشل البناء الإنتاجي — خطأ صرف (syntax) في `pages/index.vue`**

شُغّل `nuxt build` فعليًا وفشل:

```
ERROR  Build failed in 6.51s
Nuxi build error: RollupError: [vite:vue] [plugin vite:vue]
pages/index.vue?macro=true (269:15): Error parsing JavaScript expression:
Unterminated template. (1:19)
```

**السبب الجذري** (`pages/index.vue:269`):

```vue
:title="filters.search ? `No assets found for \"${filters.search}\"` : 'No
matching assets found'"
```

داخل قالب Vue، التسلسل `\"` لا يُنتج `"` — بل يُبقي الشرطة المائلة العكسية، فيصبح القالب غير مُنهى (`Unterminated template`). أدخلته الـ commit `570f975` (Phase 2) وتجاوزته المرحلة 3 دون إصلاح.

**التأثير:** هذا **يُبطل صراحةً** ادعاء `PHASE_3_COMPLETION_REPORT.md` (السطر 89: «تم تنفيذ `compile_applet` بنجاح — Build succeeded»). المشروع لا يُبنى للإنتاج على الفرع الحالي. هذا العيب موجود أيضًا في `main` لأن Phase 2 مدموجة هناك.

**2. `pnpm typecheck` يفشل بنفس الخطأ**

شُغّل `vue-tsc --noEmit` فعليًا:

```
pages/index.vue(269,78): error TS1005: ':' expected.
pages/index.vue(269,79): error TS1005: ',' expected.
pages/index.vue(269,82): error TS1005: ':' expected.
pages/index.vue(270,7): error TS1005: ',' expected.
```

أي أن معيار الجودة «TypeScript مضبوط دون إخفاء الأخطاء» **غير مُحقَّق حاليًا**. ولأن CI لا يشغّل `typecheck`، فإن CI سيكشف الفشل عند خطوة `build` فقط.

**3. ثغرة تصعيد الصلاحيات على مسار HTTP** (تفصيل القسم 4.2) — العميل يحدد دوره بنفسه.

### 10.3 ⚠️ ما هو ناقص أو جزئي

| البند                           | الحالة                         | الدليل                                                                                                                           |
| :------------------------------ | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| توثيق Phase 1                   | مفقود كليًا                    | لا يوجد `PHASE_1_*` في الجذر                                                                                                     |
| `DEVELOPMENT.md`                | قديم/ناقص                      | يشير لفرع `feat/phase-0-foundation` غير الموجود، ويذكر 5 مهاجرات فقط، ويستخدم `pnpm` غير المتاح                                  |
| `README.md`                     | يعلن Phase 0 كعنوان            | لا يعكس Phase 1/2/3                                                                                                              |
| `ARCHITECTURE.md`               | يعلن `compatibilityVersion: 4` | مخالف لـ `nuxt.config.ts:8`                                                                                                      |
| `AppHeader.vue:25`              | شعار "Phase 0" ثابت            | لا يعكس التقدم                                                                                                                   |
| Playwright / E2E                | غير موجود                      | لا تبعية ولا إعداد                                                                                                               |
| ESLint / lint                   | غير موجود                      | لا إعداد                                                                                                                         |
| `typecheck` في CI               | غير مُشغَّل                    | `.github/workflows/ci.yml:34-38`                                                                                                 |
| اختبار RLS على PostgreSQL حقيقي | غير موجود                      | كل الاختبارات على `mockStore`                                                                                                    |
| اختبارات Canvas/DOM الفعلية     | غير موجودة                     | `image_converter.test.ts` يستخدم `vi.fn()` للـ context، ولا يشغّل canvas حقيقيًا؛ ولا يوجد jsdom/happy-dom في `vitest.config.ts` |
| `shadcn-vue`                    | غير مستخدم                     | مكونات يدوية                                                                                                                     |
| `supabase/.temp/`               | مُتتبَّع في Git                | يجب استثناؤه                                                                                                                     |

---

## 11. آخر Branch وCommits ذات الصلة

**الفرع الحالي:** `feature/phase-3-image-to-icon` (HEAD `383fab1`) — متزامن مع `origin/feature/phase-3-image-to-icon`.

**الفروع:** `main`, `feature/phase-2-search-discovery`, `feature/phase-3-image-to-icon`.

**آخر 15 commit:**

| Hash      | الرسالة                                                                                            |
| :-------- | :------------------------------------------------------------------------------------------------- |
| `383fab1` | Merge remote-tracking branch 'origin/main' into feature/phase-3-image-to-icon                      |
| `f6bcfe9` | اضافه اعدادات التشغيل                                                                              |
| `69d29f3` | docs(phase-3): completion report                                                                   |
| `1a913de` | test(converter): unit test suite for image converter, ICO and ZIP                                  |
| `29e258e` | feat(converter): dedicated /tools/image-to-icon page and header link                               |
| `cdb59ae` | feat(converter): upload zone, preview stage, control panel, export actions                         |
| `8522d41` | feat(converter): reactive useImageConverter composable                                             |
| `65aa310` | feat(converter): core Canvas processing pipeline and export service                                |
| `c462cdf` | feat(converter): Windows ICO encoder and PKZIP archive generator                                   |
| `240b61a` | feat(converter): types and image signature validation                                              |
| `3015c8a` | docs(plan): phase 3 implementation plan                                                            |
| `a8b7df2` | docs(phase-2): completion report                                                                   |
| `2387ae3` | test(search): search, relevance, discovery integration tests                                       |
| `9d5d8fa` | feat(categories): dynamic asset count + filter pills                                               |
| `570f975` | feat(discovery): instant search UI, filter chips, URL sync, related icons ← **مصدر عيب السطر 269** |

**نمط الالتزام ممتاز:** commits صغيرة ذات رسائل Conventional Commits واضحة، مع فصل `docs`/`test`/`feat` — يجب الحفاظ على هذا النمط.

---

## 12. التغييرات غير المحفوظة التي يجب الحفاظ عليها

**لا يوجد.** شجرة العمل نظيفة تمامًا (`git status --porcelain` عاد فارغًا) ولا توجد ملفات غير متتبَّعة ولا تعديلات معلّقة. لم تُرصد أي تغييرات محلية غير معروفة، ولم يُنفَّذ أي أمر Git مُدمِّر.

**تنبيه للوكيل التالي:** لا تستخدم `git reset --hard` أو `git clean -fd` أو Force Push. الفروع الثلاثة غير مدموجة في `main`، و`main` لا يحتوي Phase 2 ولا Phase 3.

---

## 13. الأخطاء والمشكلات المعروفة

| #   | الخطورة     | المشكلة                                                                                                            | الموقع                                                       |
| :-- | :---------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | 🔴 **حاجب** | فشل بناء الإنتاج: قالب غير مُنهى                                                                                   | `pages/index.vue:269`                                        |
| 2   | 🔴 **حاجب** | `vue-tsc --noEmit` يفشل بنفس السبب                                                                                 | `pages/index.vue:269`                                        |
| 3   | 🔴 **أمني** | تصعيد صلاحيات: العميل يرسل `x-user-role`/`x-user-id` ويُصدَّق                                                      | `server/utils/supabaseClient.ts:87-88,118,139`               |
| 4   | 🔴 **أمني** | الافتراضي عند غياب الهوية = دور ADMIN                                                                              | `server/utils/supabaseClient.ts:134-142`                     |
| 5   | 🟠 معماري   | Service Role يُستخدم في كل المسارات ⇒ RLS مُتجاوَز                                                                 | `server/services/assetService.ts:49`, `storageService.ts:66` |
| 6   | 🟠 نطاق     | حزمة ICO بأسماء أحجام > 256 تحتوي فعليًا 256                                                                       | `imageConverterService.ts:339-346`                           |
| 7   | 🟡 تناسق    | `fitMode` مُشتق/مُتصدَّر لكن غير مربوط كتحكم في `ControlPanel`                                                     | `ConverterControlPanel.vue:11-19`                            |
| 8   | 🟡 تناسق    | استيراد ميت `StandardIconSize`                                                                                     | `ConverterControlPanel.vue:7`                                |
| 9   | 🟡 تناسق    | `STANDARD_ICON_SIZES` مُستوردة في الصفحة دون استخدام                                                               | `pages/tools/image-to-icon.vue` (استيرادات)                  |
| 10  | 🟡 توثيق    | ادعاء نجاح البناء غير صحيح                                                                                         | `PHASE_3_COMPLETION_REPORT.md:87-89`                         |
| 11  | 🟡 توثيق    | `compatibilityVersion: 4` مقابل `3` في الكود                                                                       | `ARCHITECTURE.md`, `PHASE_0_COMPLETION_REPORT.md`            |
| 12  | 🟡 توثيق    | `DEVELOPMENT.md` يذكر فرعًا غير موجود و5 مهاجرات فقط                                                               | `DEVELOPMENT.md:12,62-66`                                    |
| 13  | 🟡 CI       | لا يشغّل `typecheck` ولا lint                                                                                      | `.github/workflows/ci.yml`                                   |
| 14  | 🟡 نظافة    | `supabase/.temp/` مُتتبَّع                                                                                         | `.gitignore`                                                 |
| 15  | 🟡 نظافة    | وجود `bun.lock` و`pnpm-lock.yaml` معًا                                                                             | الجذر                                                        |
| 16  | 🟢 ملاحظة   | اختبار «رفض SVG خبيث» يتوقع `isValid === true` (لأن التعقيم ينجح) — التسمية مضللة، والاختبار لا يُثبت رفضًا فعليًا | `image_converter.test.ts:101-107`                            |
| 17  | 🟢 ملاحظة   | لا اختبار لـ Canvas حقيقي؛ الاختبارات تُحاكي الـ context                                                           | `image_converter.test.ts:230-256`                            |

---

## 14. الملفات والخدمات والمكونات التي يجب إعادة استخدامها

**لا تُعِد كتابة هذه — استخدمها كما هي:**

| الطبقة   | العنصر                                                   | السبب                                                                       |
| :------- | :------------------------------------------------------- | :-------------------------------------------------------------------------- |
| البيانات | `types/database.ts`                                      | مصدر الحقيقة الوحيد لأنواع الكيانات                                         |
| البيانات | `server/utils/mockStore.ts`                              | قاعدة اختبار/معاينة عالية الدقة — لا تستبدلها بمكتبة أخرى                   |
| الخدمات  | `server/services/assetService.ts`                        | منطق RLS + البحث بالصلة + الأيقونات ذات الصلة (675 سطرًا مُختبرة)           |
| الخدمات  | `server/services/storageService.ts`                      | التجريد الوحيد للتخزين                                                      |
| الخدمات  | `server/services/auditService.ts`                        | سجل التدقيق                                                                 |
| الأمان   | `lib/sanitizer/svgSanitizer.ts` + `filenameSanitizer.ts` | مُختبران، لا تكتب بديلًا                                                    |
| الأخطاء  | `lib/errors/AppError.ts`                                 | `ValidationError` / `AuthorizationError` / `NotFoundError` / `StorageError` |
| الواجهة  | `components/ui/*`                                        | نظام التصميم القائم (Button/Input/Badge/Card/Modal/Toast)                   |
| الواجهة  | `components/common/{Loading,Empty,Error}State.vue`       | حالات موحّدة — استخدمها في كل صفحة جديدة                                    |
| الواجهة  | `components/layout/{Container,AppHeader,AppFooter}.vue`  | الهيكل                                                                      |
| التركيب  | `composables/useAssets.ts`                               | يجسّد نمط AbortController + مزامنة URL — اتبعه                              |
| Phase 3  | `features/image-converter/utils/icoEncoder.ts`           | مشفّر ICO صحيح ومُختبر                                                      |
| Phase 3  | `features/image-converter/utils/zipEncoder.ts`           | مولّد PKZIP صحيح ومُختبر                                                    |
| Phase 3  | `features/image-converter/utils/fileValidator.ts`        | فحص التواقيع السحرية                                                        |

**قرارات معمارية يجب احترامها:** `docs/adr/001` (Asset-First)، `002` (Supabase كخلفية أساسية)، `003` (استراتيجية التخزين)، `004` (PostgreSQL للبحث — **لا تُضِف Meilisearch قبل إثبات الحاجة**).

---

## 15. المخاطر التقنية

| #   | الخطر                                                                              | الاحتمال         | الأثر               | التخفيف المقترح                                                       |
| :-- | :--------------------------------------------------------------------------------- | :--------------- | ------------------- | --------------------------------------------------------------------- |
| R1  | **توسيع البناء على عيب قائم** — أي ميزة جديدة تبقى غير قابلة للنشر                 | مؤكد             | حاجب                | إصلاح `pages/index.vue:269` أولًا                                     |
| R2  | **ثغرة التصعيد تُرسَّخ** إذا بنيت ميزات فوق `x-user-role`                          | مرتفع            | أمني بالغ           | اعتماد مصدر هوية واحد غير قابل للانتحال                               |
| R3  | **RLS غير مُتحقَّق منه تنفيذيًا** — ثقة زائفة في الأمان                            | مرتفع            | أمني                | إضافة اختبارات على PostgreSQL حقيقي أو على الأقل اختبارات حدود الطبقة |
| R4  | **غياب Playwright** — لا حماية من الانحدار في مسارات المستخدم (خصوصًا رفع الملفات) | متوسط            | جودة                | إضافة E2E لمسار المحوّل بعد إصلاح البناء                              |
| R5  | **لا lint + لا typecheck في CI** — الأخطاء الصرفية تصل إلى main                    | مؤكد (حدث فعلًا) | جودة                | إضافة `pnpm typecheck` إلى CI                                         |
| R6  | **تعارض Nuxt 3/4 في التوثيق** — قرار خاطئ في الملفات الجديدة                       | متوسط            | معماري              | حسم القرار وتوثيقه في ADR                                             |
| R7  | **lockfile مزدوج (pnpm + bun)** — بناء غير حتمي                                    | متوسط            | تشغيلي              | إزالة `bun.lock`                                                      |
| R8  | **لا اختبارات DOM/Canvas** — منطق المعالجة غير مُختبَر على بيئة حقيقية             | متوسط            | جودة                | إضافة jsdom/happy-dom أو `@nuxt/test-utils`                           |
| R9  | **الميتاداتا في `supabase/.temp/`**                                                | منخفض            | نظافة/تسريب معلومات | إضافتها إلى `.gitignore`                                              |

---

## 16. الخطوة التالية المقترحة ومعايير قبولها

### 16.1 المهمة التالية المقترحة (بترتيب إلزامي)

**الخطوة صفر — مهمة إصلاح عاجلة (Hotfix) قبل أي ميزة جديدة:**

> **إصلاح عيب البناء والأنواع في `pages/index.vue:269`، وإعادة الثقة إلى خط CI.**

**لماذا هذه أولًا؟**

1. المستودع **لا يُبنى** حاليًا — أي عمل جديد على Phase 4 سيبني على أساس مكسور.
2. تقرير Phase 3 يدّعي نجاح البناء، وهذا الادعاء **غير صحيح** — يجب تصحيحه في التوثيق.
3. الإصلاح صغير ومحدود (سطر واحد + إضافة خطوة CI) — أعلى نسبة قيمة/مخاطرة.
4. يجب أن يسبق أي إعلان بأن المرحلة الثالثة مكتملة.

**نطاق المهمة (لا شيء خارجها):**

- تصحيح التعبير في `pages/index.vue:269` (بإزالة الشرطة المائلة العكسية أو باستخدام `'… "' + filters.search + '"'`).
- إضافة خطوة `pnpm typecheck` إلى `.github/workflows/ci.yml` قبل البناء.
- تصحيح ادعاء البناء في `PHASE_3_COMPLETION_REPORT.md`.
- إضافة `.build-log.txt` و`supabase/.temp/` إلى `.gitignore` إن لزم.
- إنشاء فرع جديد `fix/build-and-typecheck` من `main` (لا تعدّل `main` مباشرة، ولا تدمج تلقائيًا).

**معايير القبول (قابلة للتحقق بأمر واحد):**

1. `pnpm typecheck` يعود بصفر أخطاء (لا `TS1005`).
2. `pnpm test` يعيد **65/65 ناجحًا** دون انحدار.
3. `pnpm build` يكتمل بنجاح ويُنتج `.output/server/index.mjs`.
4. `pages/index.vue` لا يحتوي أي `\"` داخل تعبيرات القوالب.
5. تحديث `PHASE_3_COMPLETION_REPORT.md` ليعكس نتيجة البناء الحقيقية.
6. commit مستقل واحد على الأقل برسالة `fix(discovery): resolve unterminated template in empty-state title`.

**المهمة التالية بعدها (مقترحة، لا تُنفَّذ الآن):**

> **إغلاق ثغرة تصعيد الصلاحيات** (`server/utils/supabaseClient.ts`) — إزالة الاعتماد على `x-user-role`/`x-user-id` من العميل، وإزالة الرجوع الافتراضي إلى ADMIN، وفصل مسار اختبار الدور ليكون محصورًا ببيئة التطوير عبر علامة صريحة. هذه مهمة أمنية بالغة ولا يجوز تأجيلها إلى ما بعد Phase 4.

### 16.2 هل المرحلة الثالثة مكتملة وفق معايير القبول؟

**لا. مكتملة وظيفيًا بنسبة عالية، لكنها غير مقبولة كمرحلة مُغلقة.**

مقارنة بمعايير القبول التسعة المعلنة في `PHASE_3_IMPLEMENTATION_PLAN.md` القسم 6:

| #   | المعيار                             | الحكم         | الدليل                                                         |
| :-- | :---------------------------------- | ------------- | -------------------------------------------------------------- |
| 1   | رفع PNG/JPEG/WebP/SVG مع رفض التالف | ✅ مُتحقَّق   | 8 اختبارات في `image_converter.test.ts`                        |
| 2   | قص 1:1 ونسب أخرى                    | ⚠️ منطق موجود | `applyDefaultCropForPreset` — لا اختبار مخصص للقص              |
| 3   | شفافية + أشكال (مربع/دائرة/حواف)    | ⚠️ جزئي       | منطق `applyShapeClipping` مُختبر بمُحاكاة فقط؛ لا canvas حقيقي |
| 4   | تصدير PNG صالح                      | ⚠️ غير مُثبت  | لا اختبار يتحقق من صحة بايتات PNG الناتجة                      |
| 5   | تصدير WebP صالح وعالي الجودة        | ❌ غير مُثبت  | لا اختبار إطلاقًا لمسار WebP                                   |
| 6   | ICO حقيقي متعدد الأحجام             | ✅ مُتحقَّق   | اختبارات `ICONDIR` + 256→0 + الإزاحات                          |
| 7   | حزمة ZIP صالحة                      | ✅ مُتحقَّق   | اختبار التوقيع + الأسماء + CRC-32                              |
| 8   | نجاح 100% لكل الاختبارات            | ✅ مُتحقَّق   | شُغّل فعليًا: **65/65**                                        |
| 9   | نجاح البناء دون أخطاء TypeScript    | ❌ **فاشل**   | `nuxt build` و`vue-tsc` يفشلان في `pages/index.vue:269`        |

**الخلاصة:** 4 معايير مُتحقَّقة بالكامل، 3 جزئية، **معيار حاجب واحد فاشل (رقم 9)**. لذلك: **Phase 3 تحتاج استكمالًا** — إصلاح حاجب + اختبارات تصدير حقيقية للمعايير 4 و5 — قبل إعلان الإغلاق والانتقال إلى Phase 4.

### 16.3 ما أنسب مهمة تالية ولماذا؟

**الأنسب:** مهمة إصلاح البناء والأنواع (16.1) — لأنها شرط مسبق لكل ما بعدها، ولأنها تُصلح ادعاءً غير صحيح في التوثيق. ثم إغلاق ثغرة الصلاحيات.

**⚠️ لا تبدأ Phase 4 (Vectorization) الآن.** التحويل إلى SVG متجهي حقيقي يتطلب خط معالجة جديد (tracing/contours)، ولا معنى لبنائه فوق أساس لا يُبنى ولا يُنشر.

### 16.4 الملفات والقرارات التي يجب الحفاظ عليها

**ملفات لا تُمَس:**
`types/database.ts` · `server/utils/mockStore.ts` · `server/services/{assetService,storageService,auditService,authService}.ts` · `lib/sanitizer/*` · `lib/errors/AppError.ts` · `components/ui/*` · `components/common/*` · `features/image-converter/utils/{icoEncoder,zipEncoder,fileValidator}.ts` · كل ملفات `supabase/migrations/*.sql` · `docs/adr/001..004`.

**قرارات لا تُنقَض:**

- Asset-First (ADR-001) — لا تربط النظام بالأيقونات وحدها.
- Supabase كخلفية أساسية (ADR-002) — لا تُضِف خلفية موازية.
- فصل التخزين عن قاعدة البيانات (ADR-003).
- PostgreSQL هو محرك البحث (ADR-004) — لا Meilisearch قبل إثبات حاجة بالقياس.
- قيد `chk_published_asset_must_have_license` — لا تتجاوزه.
- لا تُعطِّل RLS ولا تُعرِّض Service Role للمتصفح.

**قرارات تحتاج حسمًا موثقًا (لا تُنفَّذ صامتة):**

- Nuxt 3 أم Nuxt 4؟ (`compatibilityVersion: 3` حاليًا مقابل ادعاء التوثيق).
- هل يُنقل الكود إلى `app/` أم يُثبَّت `compatibilityVersion: 3` ويُحذف `app/`؟
- إزالة `bun.lock` أم `pnpm-lock.yaml`؟

---

## 17. ملحق: ملخص تنفيذي في سطور

**ما بنيناه:** منصة أصول رقمية بـ Nuxt/Vue 3/TypeScript + Supabase، بكيان `Asset` متعدد الأنواع، و10 جداول مع RLS، وتخزين منفصل للبايناري، وسجل تدقيق، ومكتبة أيقونات ببحث متقدم ثنائي اللغة، ومحوّل صور إلى أيقونات يعمل بالكامل على العميل بمشفّر ICO ومولّد ZIP مكتوبين من الصفر.

**ما يعمل ويُثبت:** 65/65 اختبارًا ناجحًا، تشغيل فعلي، منطق RLS مُختبر على مستوى الخدمة، تعقيم SVG مُختبر، بحث بالصلة مُختبر.

**ما لا يعمل:** البناء الإنتاجي **فاشل** (`pages/index.vue:269`)، فحص الأنواع **فاشل**، ومسار HTTP يُصدّق دور العميل (تصعيد صلاحيات).

**المرحلة الحالية:** Phase 3 مُنجزة وظيفيًا على فرع `feature/phase-3-image-to-icon`، غير مدموجة، وغير قابلة للبناء.

**المهمة التالية:** إصلاح عيب البناء + إضافة `typecheck` إلى CI + تصحيح تقرير Phase 3. ثم إغلاق ثغرة الصلاحيات. ثم إكمال اختبارات تصدير PNG/WebP لإغلاق Phase 3 رسميًا.

**القاعدة الحاكمة:** كل مرحلة تبني على السابقة — لا تبدأ Phase 4 قبل استقرار الأساس، ولا تعلن اكتمال مرحلة بغير دليل من الكود والاختبارات ومعايير القبول.
