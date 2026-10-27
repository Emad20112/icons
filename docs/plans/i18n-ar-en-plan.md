# خطة تنفيذ ميزة التبديل بين العربية والإنجليزية (Internationalization)

> **الفرع:** `feat/i18n-ar-en`
> **نقطة البداية:** `origin/main` @ `1fb5f53` (Merge PR #2 `fix/build-and-typecheck`)
> **تاريخ الإعداد:** 2026-10-20
> **آخر تحديث:** 2026-10-27
> **الحالة العامة:** ✅ مكتملة بنسبة 100% ومتحققة (138/138 اختبارًا ناجحًا، فحص TypeScript دون أخطاء، بناء إنتاجي ناجح، وفحص SSR كامل لـ AR/RTL و EN/LTR).
> **النطاق المغطى:** شمل كل صفحات المنصة: الكتالوج، الفلاتر، تفاصيل الأصول، أداة تحويل الصور للأيقونات ومكوناتها، صفحات المصادقة، صفحات الإدارة والتدقيق، والهيدر والفوتر.

---

## 1. الهدف (Definition of Done)

1. المستخدم يستطيع التبديل بين `English (LTR)` و`العربية (RTL)` من هيدر التطبيق بضغطة واحدة.
2. الاختيار **محفوظ** (cookie) ويُطبّق أثناء العرض من السيرفر (SSR) — بدون «وميض» أو قفزة تخطيط عند التحميل.
3. `<html lang dir>` يتغيّر ديناميكيًا (`en`/`ltr` ⇄ `ar`/`rtl`)، ومعها `og:locale` وعنوان الصفحة.
4. واجهات التطبيق العامة (الهيدر، الفوتر، الفلاتر، حالتا الفراغ والخطأ، صفحة الكتالوج) مترجمة **بالكامل** بلا نصوص إنجليزية صلبة (hardcoded) في هذه النطاقات.
5. مفاتيح الترجمة **متطابقة** بين `en.json` و`ar.json` — يُمنع نقص أي مفتاح (يُفحص آليًا).
6. `pnpm test` + `pnpm typecheck` + `pnpm build` تمر بنجاح (نفس بوابة CI).
7. التوثيق محدّث في `PROJECT_CONTEXT_AND_HANDOFF.md`.

**خارج النطاق (Out of scope) في هذه المرحلة:** ترجمة بيانات السيرفر نفسها (أسماء التصنيفات/الوسوم/الوصف المخزّن في قاعدة البيانات)، وترجمة رسائل أخطاء API التي تصل كنص جاهز، وترجمة صفحات الأدمن الداخلية (تُذكر كـ Phase 2 للـ i18n).

---

## 2. قرارات معمارية (لماذا هذه الطريقة؟)

| القرار                                                                                                            | البديل المرفوض                              | السبب                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nuxtjs/i18n` v9 (وحدة رسمية متوافقة مع Nuxt 3 / `compatibilityVersion: 3`)                                      | وحدة i18n مكتوبة يدويًا (composable + JSON) | نحتاج **language negotiation على السيرفر**، و`<html lang/dir>` من SSR، و`useLocaleHead` للـ SEO، وحماية من أخطاء المفاتيح. البناء اليدوي يكرّر هذه الأجزاء ويصعب اختباره. |
| استراتيجية `no_prefix` (بدون `/ar/...`)                                                                           | `prefix_except_default`                     | لا نريد تغيير مسارات المشروع أو روابطه العميقة. اللغة = cookie + negotiation.                                                                                             |
| `defaultLocale: 'en'` + `detectBrowserLanguage` مع `cookieKey`                                                    | تخزين في `localStorage` فقط                 | `localStorage` غير متاح للسيرفر ⇒ وميض RTL/LTR عند أول رسم. الـ cookie قابل للقراءة في SSR.                                                                               |
| ملفات `i18n/locales/*.json` مسطّحة ومصنّفة بالميزة (`catalog.*`, `header.*`)                                      | ملف واحد ضخم أو ملفات `.ts` لكل صفحة        | يسهّل مراجعة الـ diff، ويجعل فحص تطابق المفاتيح بسيطًا.                                                                                                                   |
| دعم RTL عبر Tailwind **logical utilities** (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start/end`) | إبقاء `ml-*`/`mr-*` وإضافة تكرارات `rtl:`   | `ml/mr` لا تنعكسان تلقائيًا مع `dir=rtl`، فتنكسر المسافات والمحاذاة.                                                                                                      |
| مصدر الحقيقة للمفاتيح = `i18n/locales/en.json`                                                                    | الاعتماد على fallback الصامت                | لو نُسي مفتاح، سيظهر بالإنجليزية بصمت. الاختبار يفشل بدلًا من ذلك.                                                                                                        |

---

## 3. المهام (Tasks)

> **قاعدة إلزامية:** عند إنجاز كل مهمة ⇒ (أ) ضع `[x]` على عنوانها هنا، (ب) نفّذ commit واحدًا أو أكثر بنمط Conventional Commits يذكر رقم المهمة، (ج) `git push` إلى `origin/feat/i18n-ar-en`.
> ترتيب التنفيذ إلزامي (T2 تعتمد على T1، T6 تعتمد على T3… إلخ).

### ✅ T1 — إعداد الوحدة والبنية الأساسية

- [x] تثبيت `@nuxtjs/i18n` (`9.5.6`) وتحديث `pnpm-lock.yaml`.
- [x] إنشاء `i18n/locales/en.json` و`i18n/locales/ar.json` ببنية متطابقة.
- [x] ربط الوحدة في `nuxt.config.ts`:
  - `strategy: 'no_prefix'`, `defaultLocale: 'en'`, `locales` مع `dir` **و`file`** لكل لغة.
  - `detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' }`.
  - `app.head.htmlAttrs` كـ fallback سيرفري (`lang="en" dir="ltr"`).
- [x] تحديث `app.vue` لاستخدام `useLocaleHead({ seo: true })` + `hreflangLinks`.
- **ملاحظة تنفيذ (مهمة):** بدون `file: 'en.json'` على كل عنصر في `locales` لا تُضمَّن أي رسائل في البناء،
  وكل `t()` يطبع المفتاح الخام بينما ينجح `pnpm build` بصمت. `langDir` يُحلّ نسبةً إلى `rootDir`
  عندما يكون `restructureDir` مفعّلًا، لذا `langDir` الصحيح هو `'locales'` وليس `'i18n/locales'`.
- **التحقق:** ✅ `<html lang="en-US" dir="ltr">` افتراضيًا، و`lang="ar-SA" dir="rtl"` عند إرسال cookie اللغة العربية.
- **Commit:** `feat(i18n): set up @nuxtjs/i18n module with en/ar locale bundles`

### ✅ T2 — مكوّن مبدّل اللغة (LocaleSwitcher) في الهيدر

- [x] إنشاء `components/i18n/LocaleSwitcher.vue`:
  - قائمة منسدلة بأسماء اللغات الأصلية (`English`, `العربية`) + رمز قصير (`EN`/`ع`).
  - دعم لوحة المفاتيح (Enter/Space/Arrow/Escape) وإغلاق بالنقر خارج القائمة.
  - محاذاة القائمة بـ `end-0` ونص `text-start` (منطقية) لتعمل في RTL.
  - `aria-label` مترجم و`aria-expanded` صحيح.
- [x] دمج المكوّن في `components/layout/AppHeader.vue` (سطح المكتب + نسخة موبايل).
- [x] التبديل عبر `setLocale()` (بدون إعادة تحميل كاملة)؛ الوحدة تُزامن الـ cookie تلقائيًا.
- **التحقق:** التبديل يغيّر النص و`dir` فورًا، والاختيار يبقى بعد refresh.
- **Commit:** `feat(i18n): add accessible locale switcher to app header`

### ✅ T3 — استراتيجية RTL والتنسيق (Layout & Typography)

- [x] تحويل المسافات/المحاذاة/الحدود في `AppHeader`, `Container`, `AppFooter`, `EmptyState`, `ErrorState`, `AssetFilter`, `AssetCard`, `pages/index.vue`, `pages/assets/[id].vue` إلى **logical utilities** (`ms/me/ps/pe/start/end/text-start/border-s`).
- [x] تحميل `IBM Plex Sans Arabic` عبر `@font-face` مع `display: swap` و`unicode-range` عربي، ويُطبَّق فقط عند `html[lang="ar"]` (الزيارات الإنجليزية لا تنزّل ملف الخط).
- [x] ضبط `line-height: 1.8` و`letter-spacing: 0` للعربية في `main.css`.
- [x] انعكاس الأيقونات الاتجاهية بـ `rtl:rotate-180`.
- **التحقق:** فحص يدوي Desktop + Mobile في اللغتين.
- **Commit:** `fix(i18n): make layout and typography RTL-aware with logical utilities`

### ✅ T4 — ترجمة صفحة الكتالوج وحيّز البحث (`pages/index.vue`)

- [x] استخراج النصوص إلى `locales/*.json` تحت `catalog.*` و`filters.*` و`assetCard.*` و`common.*`.
- [x] رسالة الفراغ تستخدم `t('catalog.emptyState.searchTitle', { term })` بدل قالب JS داخلي.
- [x] ترجمة `components/assets/AssetFilter.vue` و`AssetCard.vue` و`AssetCreateModal.vue` (المُنتقي داخل `index.vue`).
- [x] منطق البحث لم يُمسّ (`tests/unit/search_discovery.test.ts` أخضر).
- **التحقق:** ✅ لا نص إنجليزي ظاهر في `ar`، ولا مفتاح خام متسرب في `en` أو `ar`.
- **Commit:** `feat(i18n): localize catalog page and search filters`

### ✅ T5 — الترجمة والـ SEO (ميتا + SSR للاتجاه)

- [x] تحديث `title`/`description`/`og:title`/`og:description` من الترجمة عبر `useHead` في `pages/index.vue`.
- [x] `og:locale` و`og:locale:alternate` و`og:url` و`canonical` عبر `useLocaleHead({ seo: true })` (يتطلب `baseUrl`).
- [x] `<link rel="alternate" hreflang>` لكل لغة عبر `hreflangLinks` في `app.vue` — **الوحدة لا تولّدها مع `strategy: 'no_prefix'`** (تتجاوزها صراحةً)، لذا تُبنى يدويًا من `i18n/locales.ts` + `runtimeConfig.public.siteUrl`.
- [x] `dir` يُضبط في SSR **قبل** أول paint (تم التحقق من HTML الخادم).
- **التحقق:** ✅ `curl -H 'Cookie: i18n_redirected=ar'` يعيد `dir="rtl"` + عنوان عربي + `og:locale=ar_SA` + بديلَي hreflang.
- **Commit:** `feat(i18n): add localized head metadata and RTL SSR attributes`

### ✅ T6 — صفحات تفاصيل الأصل ومدير الأدمن المشتركة

- [x] `pages/assets/[id].vue`: العناوين، `License`, `Tags`, `Related assets`, `Download`, رسائل الخطأ.
- [x] ترجمة تسميات `components/admin/CategoryManager.vue` و`LicenseManager.vue` و`layouts/admin.vue` و`FoundationStatus.vue`.
- [x] `composables/useToast.ts`: يقبل `{ key, params }` ويُترجم في `Toast.vue` وقت العرض.
- [x] `LoadingState.vue` و`Modal.vue` (`Close`) و`AssetCreateModal.vue` صارت مترجمة بالكامل.
- **التحقق:** لا `toast.success('English text')` جديد؛ الرسائل تظهر بالعربية.
- **Commit:** `feat(i18n): localize asset details and admin managers`

### ✅ T7 — الاختبارات الآلية

- [x] `tests/unit/i18n_locales.test.ts`: تطابق المفاتيح (recursive diff = 0)، لا قيم فارغة، تطابق `{placeholders}`.
- [x] `tests/unit/i18n_rtl.test.ts`: `dirMap` (ar ⇒ rtl، en ⇒ ltr)، قائمة اللغات، `og:locale`.
- [x] `tests/unit/i18n_hardcoded_copy.test.ts`: حارس ضد النصوص الصلبة في 11 ملفًا + تأكيد ربط كل لغة بملف JSON.
- [x] `pnpm typecheck` يغطي الملفات الجديدة (أصلح خطأ `addSeoAttributes` ← `seo` و`setLocale` النوعي).
- **التحقق:** ✅ `pnpm test` = 106/106 أخضر؛ حذف مفتاح من `ar.json` يُحمرّ الاختبار.
- **Commit:** `test(i18n): enforce locale parity and rtl direction rules`

### ✅ T8 — التوثيق والتحقق النهائي

- [x] تحديث `PROJECT_CONTEXT_AND_HANDOFF.md` بقسم «i18n».
- [x] تحديث هذه الخطة: تعليم المهام `[x]` + سجل commits.
- [x] تشغيل البوابة: `pnpm test` (138/138)، `pnpm typecheck` (0 أخطاء)، `pnpm build` (ناجح)، وفحص SSR بـ `curl`.
- [x] فحص يدوي نهائي في المتصفح: Desktop + Mobile × (en/ar) على `/`, `/assets/[id]`, `/tools/image-to-icon`, `/auth/*`, `/admin/*`.
- [x] جاهز لفتح Pull Request من `feat/i18n-ar-en` إلى `main`.

### ✅ T9 — تعميم الترجمة وتطبيقها بالكامل على كافة النصوص والمكونات والأدوات

- [x] ترجمة أداة تحويل الصور إلى أيقونات بالكامل (`pages/tools/image-to-icon.vue` وجميع مكونات `features/image-converter/*`).
- [x] ترجمة صفحات المصادقة (`pages/auth/login.vue`, `pages/auth/register.vue`).
- [x] ترجمة صفحات وحوكمة الإدارة (`pages/admin/index.vue`, `pages/admin/assets.vue`, `pages/admin/categories.vue`, `pages/admin/licenses.vue`, `pages/admin/audit.vue`) ومكون `AuditLogViewer.vue`.
- [x] ترجمة تسميات الأدوار في الهيدر والبطاقات (`t('roles.admin')`, `t('roles.user')`).
- [x] تحديث حارس منع النصوص الصلبة `tests/unit/i18n_hardcoded_copy.test.ts` وتوسيعه ليشمل 27 ملفًا وتمرير 56 اختبارًا بنجاح.
- [x] الهروب الصوتي والأمني للرموز الخاصة (`{'@'}`) في vue-i18n لتجنب تعارض الروابط الداخلية.
- [x] دعم RTL ديناميكي كامل وتحسين الأداء دون وميض تخطيطي في أول paint.
- **التحقق:** ✅ 138/138 اختبارًا أخضر + TypeCheck بدون أخطاء + Build ناجح + SSR مؤكد للغتين.

---

## 4. معايير المراجعة (Review Checklist)

- [x] لا نص إنجليزي صلب في النطاقات المترجمة (`grep` واختبار `i18n_hardcoded_copy.test.ts` على 27 ملفًا).
- [x] كل `aria-label` و`alt` و`placeholder` جديد مأخوذ من الترجمة.
- [x] لا استخدام `ml/mr/pl/pr/left/right` في المكونات المحدّثة إلا بمبرر موثّق (استخدام `ms/me/ps/pe/start/end`).
- [x] ملفات الترجمة مصنّفة (مفاتيح مرتبة ومتطابقة تمامًا بين `ar.json` و`en.json`).
- [x] لا أخطاء console في اللغتين عند التشغيل.

---

## 5. سجل الـ Commits

| #   | Commit                                                   | المهمة  | الحالة |
| --- | -------------------------------------------------------- | ------- | ------ |
| 1   | `docs(i18n): add ar/en localization implementation plan` | التخطيط | ✅     |
| 2   | `feat(i18n): add accessible locale switcher to app header` | T1–T2 | ✅ |
| 3   | `fix(i18n): make layout and typography RTL-aware with logical utilities` | T3 | ✅ |
| 4   | `feat(i18n): localize catalog page and search filters`   | T4      | ✅     |
| 5   | `feat(i18n): add localized head metadata and RTL SSR attributes` | T5 | ✅ |
| 6   | `feat(i18n): localize asset details and admin managers`  | T6      | ✅     |
| 7   | `test(i18n): enforce locale parity and rtl direction rules` | T7   | ✅     |
| 8   | `fix(i18n): bundle locale files and verify RTL server rendering` | إصلاح جذري بعد المراجعة | ✅ |
| 9   | `docs(i18n): document localization workflow and verify ci gates` | T8 | ✅ |
| 10  | `feat(i18n): complete full bilingual localization across all platform pages and tools` | T9 | ✅ |

---

## 6. المخاطر وخطط التعامل

| المخاطرة                                                | الأثر        | التخفيف                                                              |
| ------------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| تعارض إصدار `@nuxtjs/i18n` مع Nuxt الحالي               | فشل build    | تثبيت نسخة v9.x واختبار `pnpm build` فورًا في T1 قبل أي ترجمة.       |
| `detectBrowserLanguage` يعيد التوجيه ويكسر روابط الأدمن | UX سيئ       | `redirectOn: 'root'` فقط + اختبار `curl` لمسار `/admin`.             |
| نصوص API تصل كرسائل جاهزة                               | رسائل مختلطة | توثيق أنها خارج النطاق، أو تحويلها لاحقًا إلى `errorKey`.            |
| انعكاس الأيقونات الاتجاهية                              | تشوّه بصري   | قائمة مراجعة بـ `rtl:` ومقارنة لقطات في T3.                          |
| ترجمة كلمات البحث تُعطّل النتائج                        | تراجع وظيفي  | لا تُترجم منطق البحث — فقط النص الظاهر، وإعادة تشغيل اختبارات البحث. |

---

## 7. تعريف «الإنجاز» لكل مهمة (Task DoD)

مهمة تُعدّ منجزة فقط إذا: الكود مكتوب + يمر `typecheck` + لا نصوص صلبة متبقية في نطاقها + تعليمها `[x]` هنا + commit مدفوع إلى `origin/feat/i18n-ar-en`.
