# خطة تنفيذ تطوير منصة إدارة الخطوط والأيقونات والمستودعات
**المشروع:** منصة الأصول الرقمية (Digital Assets Platform)  
**الفرع المعتمد:** `yunis-fix-fonts-and-users`  
**التاريخ:** 2026-11-09  

---

## 1. الفحص الشامل للوضع الحالي وتحديد الفجوات

### 1.1 التقنيات والبنية الحالية
- **إطار العمل:** Nuxt 3 (Nitro Server + Vue 3 Composition API + Vite).
- **التصميم والواجهة:** Tailwind CSS v3، خطوط ودعم RTL أصيل عبر `@nuxtjs/i18n` (العربية والإنجليزية)، أيقونات Lucide Icons (`lucide-vue-next`).
- **المعالجة والخطوط:** `opentype.js` لقراءة وفحص ملفات الخطوط والأوزان والـ glyphs، `imagetracerjs` لتحويل الصور إلى SVG، `jszip` للتعامل مع الحزم المضغوطة، مكتبة تعقيم SVG `DOMPurify / custom svgSanitizer`.
- **قاعدة البيانات والتحكم بالوصول:** PostgreSQL 16 مدعوم بسياسات الأمان على مستوى الصفوف (Row Level Security - RLS)، وتخزين Supabase Storage منفصل (`assets/`, `fonts/`)، مع طبقة محاكاة عالية الدقة داخل الخادم (`server/utils/mockStore.ts`) تدعم التشغيل المحلي والـ Preview واختبارات الـ CI دون اعتماد صارم على سحابة خارجية.

### 1.2 ما هو موجود حالياً
1. كتالوج عام للأصول الرقمية مع محرك بحث هجين وفلاتر متقدمة ومحاذاة RTL كاملة.
2. أدوات معالجة رسومية: تحويل الصور لأيقونات (`/tools/image-to-icon`)، تحويل الصور لـ SVG (`/tools/image-to-svg`)، ومحرر أيقونات تفاعلي (`/tools/icon-editor`).
3. مكتبة خطوط أولية (`/fonts` و `/fonts/[slug]`) مع دعم استخراج أوزان OpenType وتدقيق التصنيف بالذكاء الاصطناعي.
4. نظام مصادقة أولي مبسط بالبريد الإلكتروني فقط (`email` login/register) دون دعم كلمات المرور، اسم المستخدم الفريد، أو تسجيل Google الفعلي، ودون روابط بروفايل عامة مثل `/@username`.
5. غياب تام لمفهوم **المستودعات (Repositories)**: لا توجد جداول أو واجهات تمكّن المستخدم من إنشاء مستودعات عامة/خاصة وجمع الخطوط والأيقونات فيها ومشاركتها والتحكم في خصوصيتها.
6. غياب لوحة تحكم مستخدم موحدة (`/dashboard` أو `/user/dashboard`) تجمع: مستودعاتي، خطوطي، أيقوناتي، المفضلة، إحصائيات الحساب، وإعدادات الحساب مع الصورة الشخصية واسم المستخدم والنبذة.

---

## 2. هيكلية التغييرات وخطة الوحدات المستقلة

تنفيذاً للتوجيهات، سيتم تقسيم العمل إلى وحدات عمل مستقلة (Phased Units)، يتم إنجاز كل وحدة وإجراء Commit منفصل لها وفق مواصفات **Conventional Commits**:

### الوحدة 1: البنية وقاعدة البيانات والمستودعات والملفات الشخصية
- **الهدف:** إضافة جداول وسياسات المستودعات (Repositories) وربط الأصول والمستخدمين بها، وتوسيع جدول الملفات الشخصية `profiles` لدعم `username`, `bio`, `password_hash`, `google_id`.
- **الملفات المعنية:**
  - `database/migrations/20261109000001_repositories_and_enhanced_profiles.sql`
  - `supabase/migrations/20261109000001_repositories_and_enhanced_profiles.sql`
  - `types/database.ts` و `types/repositories.ts`
  - `server/utils/mockStore.ts` (إضافة دعم المستودعات، بيانات تجريبية بالاسم الفريد، وفلاتر RLS للمستودعات الخاصة والعامة).
- **الـ Commit المقترح:**
  `feat(db): add repositories schema and profile username enhancements`

### الوحدة 2: نظام المستخدمين والمصادقة والملف الشخصي العام (/@username)
- **الهدف:** 
  1. دعم تسجيل الدخول بـ Google وباسم المستخدم / كلمة المرور.
  2. تدفق إلزامي لاختيار اسم مستخدم فريد عند أول تسجيل.
  3. صفحة إعدادات الحساب (الاسم الظاهر، اسم المستخدم، النبذة، الصورة الشخصية).
  4. صفحة عامة لكل مستخدم برابط `/@username` أو `/u/:username` تعرض مستودعاته العامة وخطوطه وأيقوناته وإحصاءاته.
- **الملفات المعنية:**
  - `server/services/authService.ts`
  - `server/api/v1/auth/google.post.ts`
  - `server/api/v1/auth/username-check.get.ts`
  - `server/api/v1/users/[username].get.ts`
  - `pages/auth/login.vue` و `pages/auth/register.vue`
  - `pages/@[username].vue`
  - `composables/useAuth.ts`
- **الـ Commit المقترح:**
  `feat(auth): add google and credential auth with username profile routes`

### الوحدة 3: محرك المستودعات (Repositories Engine) وإدارة الخصوصية
- **الهدف:**
  1. واجهات برمجة التطبيقات (APIs) لإنشاء وتعديل وحذف المستودعات.
  2. ضبط الخصوصية (عام Public أو خاص Private) ومنع وصول الزوار للمستودع الخاص نهائياً.
  3. إدارة محتويات المستودع (إضافة ونقل وحذف الأيقونات والخطوط من المستودع).
  4. صفحة استعراض المستودعات العامة للموقع `/repositories`.
  5. صفحة تفاصيل المستودع `/repositories/[slug]` أو `/@username/[repoSlug]`.
- **الملفات المعنية:**
  - `server/services/repositoryService.ts`
  - `server/api/v1/repositories/*`
  - `pages/repositories/index.vue`
  - `pages/repositories/[id].vue`
  - `composables/useRepositories.ts`
- **الـ Commit المقترح:**
  `feat(repositories): implement repository CRUD, privacy isolation, and discovery`

### الوحدة 4: إدارة الخطوط ومعاينتها التفاعلية الاحترافية
- **الهدف:**
  1. دعم كامل لرفع الصيغ (TTF, OTF, WOFF, WOFF2) وقراءة بياناتها مباشرة عبر `@font-face` و `opentype.js`.
  2. تعديل بيانات الخط وحذفه وربطه بمستودعات المستخدم.
  3. معمل معاينة حي تفاعلي:
     - كتابة نص حر مخصص باللغتين العربية والإنجليزية.
     - التحكم الفوري بحجم الخط ولونه.
     - التحكم بلون وخلفية العرض (Light, Dark, Slate, Cream, Transparent, Checkerboard).
     - تجربة جميع الأوزان المتاحة (100 إلى 900) والأنماط.
     - نسخ كود CSS الجاهز (`@font-face` و `font-family`) ونسخ الرابط المباشر.
- **الملفات المعنية:**
  - `server/services/fontStorageService.ts` و `server/services/fontMetadataService.ts`
  - `server/api/v1/fonts/*`
  - `pages/fonts/[slug].vue`
  - `components/fonts/InteractiveFontPlayground.vue`
- **الـ Commit المقترح:**
  `feat(fonts): enhance font playground with custom colors, canvas, weights, and css export`

### الوحدة 5: إدارة الأيقونات ومعاينتها ومعالجتها الآمنة
- **الهدف:**
  1. دعم رفع صيغ SVG, PNG, WebP وتعديل بياناتها وحذفها وتصنيفها وربطها بالمستودعات.
  2. شبكة معاينة مرنة (Grid) مع تحكم حي بالحجم والألوان والخلفيات للأيقونات المتجهة.
  3. تعقيم صارم لملفات SVG لمنع XSS والـ Script Injection عبر `svgSanitizer`.
  4. إمكانية نسخ كود SVG الصافي بنقرة واحدة ونسخ رابط الأيقونة المباشر.
- **الملفات المعنية:**
  - `server/services/assetService.ts` و `server/services/storageService.ts`
  - `pages/assets/[id].vue`
  - `components/assets/IconPreviewGrid.vue`
  - `components/assets/AssetCreateModal.vue`
- **الـ Commit المقترح:**
  `feat(icons): add icon management, multi-format upload, live preview, and secure svg copy`

### الوحدة 6: لوحة تحكم المستخدم الشاملة وتحديثات شريط التصفح
- **الهدف:**
  1. بناء لوحة تحكم موحدة `/dashboard` تتضمن علامات تبويب:
     - مستودعاتي (My Repositories) مع زر إنشاء سريع وتحديد الرؤية.
     - خطوطي (My Fonts).
     - أيقوناتي (My Icons).
     - المفضلة (Favorites).
     - إحصائيات الحساب (عدد المستودعات، التنزيلات، الإعجابات).
     - إعدادات الحساب (تحديث الاسم، الصورة، النبذة، كلمة المرور).
  2. تحديث شريط التنقل `AppHeader.vue` ليحتوي على روابط واضحة للوحة التحكم والمستودعات والملف الشخصي والخطوط والأيقونات.
  3. تمكين الزوار غير المسجلين من استعراض كافة المستودعات والخطوط والأيقونات العامة والبحث فيها دون تسجيل.
- **الملفات المعنية:**
  - `pages/dashboard/index.vue`
  - `components/layout/AppHeader.vue`
  - `i18n/locales/ar.json` و `i18n/locales/en.json`
- **الـ Commit المقترح:**
  `feat(dashboard): build comprehensive user dashboard and global navigation`

### الوحدة 7: الأمان والتحقق والتدقيق المكتبي
- **الهدف:**
  1. التحقق من حجم ونوع كل ملف مرفوع (MIME type sniffing + extension validation).
  2. تدقيق أمني على وصول المستودعات الخاصة والتأكد من إرجاع خطأ 403 / 404 لغير أصحابها.
  3. إضافة فحوصات وحدوية تغطي العمليات الجديدة (اختبارات RLS للمستودعات، واجهات المستخدمين، ومعالجة الخطوط).
- **الملفات المعنية:**
  - `tests/unit/repositories.test.ts`
  - `tests/unit/user_profile.test.ts`
- **الـ Commit المقترح:**
  `test(repositories): add unit tests for repository privacy and profile security`

### الوحدة 8: رفع التغييرات إلى GitHub والتقرير النهائي
- **الهدف:**
  1. دفع الفرع `yunis-fix-fonts-and-users` إلى المستودع البعيد `origin`.
  2. إنشاء تقرير الإنجاز المفصل `IMPLEMENTATION_REPORT_AR.md`.
- **الـ Commit المقترح:**
  `docs: add detailed implementation report and architectural overview`

---

## 3. مصفوفة التحقق والأمان (Security & Quality Assurance)
- **لا وجود لبيانات شكلية:** جميع الصفحات ترتبط بـ endpoints حقيقية تخزن في `mockStore` وتتعامل مباشرة مع جداول PostgreSQL عند تفعيل بيئة Supabase.
- **الحفاظ على هوية الموقع الحالية:** لن يتم حذف أي صفحات أو أدوات حالية (مثل `/tools/icon-editor`, `/tools/image-to-icon`, `/tools/image-to-svg`, `/admin`).
- **العزل الأمني للفرع:** العمل ينفذ بالكامل على فرع `yunis-fix-fonts-and-users` دون المساس بفرع `main`.
