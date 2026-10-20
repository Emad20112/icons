# خطة تنفيذ ميزة التبديل بين العربية والإنجليزية (Internationalization)

> **الفرع:** `feat/i18n-ar-en`
> **نقطة البداية:** `origin/main` @ `1fb5f53` (Merge PR #2 `fix/build-and-typecheck`)
> **تاريخ الإعداد:** 2026-10-20
> **الحالة العامة:** ⬜ لم يبدأ التنفيذ

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

### ⬜ T1 — إعداد الوحدة والبنية الأساسية

- [ ] تثبيت `@nuxtjs/i18n` (نسخة متوافقة مع Nuxt الحالي) وتحديث `pnpm-lock.yaml`.
- [ ] إنشاء `i18n/locales/en.json` و`i18n/locales/ar.json` ببنية متطابقة (مفاتيح أولية للمنطقة العامة).
- [ ] ربط الوحدة في `nuxt.config.ts`:
  - `strategy: 'no_prefix'`, `defaultLocale: 'en'`, `locales: [{ code: 'en', dir: 'ltr' }, { code: 'ar', dir: 'rtl' }]`.
  - `detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' }`.
  - `app.head.htmlAttrs` كـ fallback سيرفري (`lang="en" dir="ltr"`).
- [ ] تحديث `app/app.vue` لاستخدام `useLocaleHead()` لتوليد `htmlAttrs` (`lang`, `dir`) + `link` alternates.
- **التحقق:** `pnpm dev` يفتح الصفحة، `<html lang="en" dir="ltr">` صحيح، وتغيير cookie اللغة يعطي `ar`/`rtl`.
- **Commit:** `feat(i18n): set up @nuxtjs/i18n module with en/ar locale bundles`

### ⬜ T2 — مكوّن مبدّل اللغة (LocaleSwitcher) في الهيدر

- [ ] إنشاء `components/i18n/LocaleSwitcher.vue`:
  - قائمة منسدلة بأسماء اللغات الأصلية (`English`, `العربية`) + رمز قصير (`EN`/`ع`).
  - دعم لوحة المفاتيح (Enter/Space/Escape) وإغلاق بالنقر خارج القائمة.
  - محاذاة القائمة بـ `start-0`/`end-0` (منطقية) لتعمل في RTL.
  - `aria-label` مترجم و`aria-expanded` صحيح.
- [ ] دمج المكوّن في `components/layout/AppHeader.vue` (قبل قسم المستخدم) مع نسخة موبايل مدمجة.
- **التحقق:** تبديل ⇄ في الهيدر يغيّر النص و`dir` دون إعادة تحميل كاملة، والاختيار يبقى بعد refresh.
- **Commit:** `feat(i18n): add accessible locale switcher to app header`

### ⬜ T3 — استراتيجية RTL والتنسيق (Layout & Typography)

- [ ] تحويل المسافات/المحاذاة في `AppHeader`, `Container`, `AppFooter`, `EmptyState`, `ErrorState`, `AssetFilter` إلى **logical utilities**.
- [ ] تحميل خط عربي مناسب (`IBM Plex Sans Arabic`) مع `display: swap`، وتطبيقه فقط عند `html[lang="ar"]` (بدون تحميل الخط للزيارات الإنجليزية).
- [ ] ضبط `line-height`/`letter-spacing` للعربية في `main.css`.
- [ ] التأكد أن الأيقونات الاتجاهية تنعكس عند الحاجة بـ `rtl:rotate-180`.
- **التحقق:** فحص يدوي Desktop + Mobile في اللغتين: لا تداخل عناصر، لا نصوص مقطوعة، الترتيب البصري منطقي.
- **Commit:** `fix(i18n): make layout and typography RTL-aware with logical utilities`

### ⬜ T4 — ترجمة صفحة الكتالوج وحيّز البحث (`pages/index.vue`)

- [ ] استخراج النصوص إلى `locales/*.json` تحت `catalog.*` (العنوان، الوصف، Loading/Error/Empty، أزرار Retry/Clear/Create).
- [ ] إصلاح رسالة الفراغ الحسّاسة للاتجاهين: `t('catalog.emptyState.searchTitle', { term })` **بدل** قالب JS داخلي (يلغي خطر `` ` `` و`"` نهائيًا — مصدر عطل البناء السابق).
- [ ] ترجمة `components/assets/AssetFilter.vue` و`AssetCard.vue` (النصوص الظاهرة فقط).
- [ ] التأكد أن منطق البحث لا يتأثر بالترجمة (`tests/unit/search_discovery.test.ts` يبقى أخضر).
- **التحقق:** تبديل اللغة يعيد رسم الصفحة بالكامل؛ لا نص إنجليزي ظاهر في `ar`.
- **Commit:** `feat(i18n): localize catalog page and search filters`

### ⬜ T5 — الترجمة والـ SEO (ميتا + SSR للاتجاه)

- [ ] تحديث `title`/`description`/`og:locale` من الترجمة عبر `useHead` + `tm()`.
- [ ] إضافة `<link rel="alternate" hreflang>` لكل لغة عبر `useLocaleHead`.
- [ ] التأكد أن `dir` يُضبط في SSR **قبل** أول paint.
- **التحقق:** `curl` للصفحة يعرض `dir="rtl"` عند إرسال cookie اللغة العربية.
- **Commit:** `feat(i18n): add localized head metadata and RTL SSR attributes`

### ⬜ T6 — صفحات تفاصيل الأصل ومدير الأدمن المشتركة

- [ ] `pages/assets/[id].vue`: العناوين، `License`, `Tags`, `Related assets`, `Download`, رسائل الخطأ.
- [ ] ترجمة تسميات `components/admin/CategoryManager.vue` و`LicenseManager.vue` (التسميات فقط، لا منطق).
- [ ] `composables/useToast.ts`: السماح برسائل مفاتيح (`{ key: 'toast.x' }`) وترجمتها في `Toast.vue` وقت العرض.
- **التحقق:** لا `toast.success('English text')` جديد؛ الرسائل الحالية تظهر بالعربية.
- **Commit:** `feat(i18n): localize asset details and admin managers`

### ⬜ T7 — الاختبارات الآلية

- [ ] `tests/unit/i18n_locales.test.ts`:
  - تطابق المفاتيح تمامًا بين `en.json` و`ar.json` (recursive diff = 0).
  - لا قيم فارغة، وكل قيمة نصية غير بيضاء.
- [ ] `tests/unit/i18n_rtl.test.ts`: `dirMap` (ar ⇒ rtl، en ⇒ ltr) وقائمة اللغات المدعومة.
- [ ] تأكيد أن `pnpm typecheck` يغطي الملفات الجديدة.
- **التحقق:** `pnpm test` أخضر؛ وفشل مقصود (حذف مفتاح) يجعل الاختبار أحمر.
- **Commit:** `test(i18n): enforce locale parity and rtl direction rules`

### ⬜ T8 — التوثيق والتحقق النهائي

- [ ] تحديث `PROJECT_CONTEXT_AND_HANDOFF.md` بقسم «i18n»: كيف تضيف مفتاحًا، استراتيجية RTL، وما لم يُترجم بعد.
- [ ] تحديث هذه الخطة: تعليم المهام `[x]` + سجل commits.
- [ ] تشغيل البوابة: `pnpm test`, `pnpm typecheck`, `pnpm build` وتوثيق النتائج.
- [ ] فحص يدوي نهائي: Desktop + Mobile × (en/ar) على `/`, `/assets/[id]`, `/tools/image-to-icon`.
- **Commit:** `docs(i18n): document localization workflow and verify ci gates`
- [ ] فتح Pull Request من `feat/i18n-ar-en` إلى `main` (لا دمج قبل مراجعة).

---

## 4. معايير المراجعة (Review Checklist)

- [ ] لا نص إنجليزي صلب في النطاقات المترجمة (`grep` على ملفات `.vue` المذكورة).
- [ ] كل `aria-label` و`alt` و`placeholder` جديد مأخوذ من الترجمة.
- [ ] لا استخدام `ml/mr/pl/pr/left/right` في المكونات المحدّثة إلا بمبرر موثّق.
- [ ] ملفات الترجمة مصنّفة (مفاتيح مرتبة داخل كل كائن) وتنتهي بسطر جديد.
- [ ] لا أخطاء console في اللغتين عند التشغيل الأول.

---

## 5. سجل الـ Commits

| #   | Commit                                                   | المهمة  | الحالة |
| --- | -------------------------------------------------------- | ------- | ------ |
| 1   | `docs(i18n): add ar/en localization implementation plan` | التخطيط | ✅     |

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
