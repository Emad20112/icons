# خطة تنفيذ المرحلة الرابعة: تحويل الصور إلى SVG متجهي حقيقي (PHASE 4: TRUE IMAGE-TO-SVG VECTORIZATION)
**منصة الأيقونات والأصول الرقمية — Digital Assets Platform**

- **المسؤول المعماري:** Senior Full-Stack Engineer & Software Architect
- **الفرع المخصص:** `feature/phase-4-vectorization`
- **التاريخ:** أكتوبر 2026
- **الحالة:** معتمدة للتنفيذ الفوري

---

## 1. تحليل الجاهزية وتدقيق المرحلة الثالثة (Task 1: Readiness Audit)

### حالة المرحلة السابقة (Phase 3: Image to Icon Converter):
1. **الفرع والـ Git:**
   - تم التحقق من نجاح دمج المرحلة الثالثة وتحسينات اللغة في `origin/main` عبر commit `392a659`.
   - تم إنشاء الفرع المستقل `feature/phase-4-vectorization` انطلاقاً من أحدث إصدار معتمد في `origin/main`.
2. **الاختبارات الآلية:**
   - تم تشغيل `vitest run` وكانت النتيجة: **138 اختباراً ناجحاً بنسبة 100% (138 passed across 10 test files)**.
   - اختبارات تحويل الصور `image_converter.test.ts` اجتازت 19/19 اختباراً.
   - اختبارات الصلاحيات والبحث والأمان وi18n كلها تعمل دون أي تراجع.
3. **فحص الأنواع والبناء:**
   - `vue-tsc --noEmit` يعمل بصفر أخطاء (`0 errors`).
   - خادم البناء يكمل بنجاح (`Build succeeded`).
4. **الخلاصة:** المرحلة الثالثة جاهزة ومستقرة تماماً، وبوابة الجاهزية تعطي الضوء الأخضر لبدء المرحلة الرابعة دون أي موانع.

---

## 2. تقييم محركات Vectorization واختيار المحرك (Task 2: Engine Evaluation)

### المعايير الهندسية:
- **تحويل متجهي حقيقي (True Vectorization):** يجب أن يولد مخرجات تحتوي على عناصر `<path d="...">` و `<polygon>` و منحنيات بيزييه حقيقية، وليس مجرد غلاف SVG يحتوي على صورة نقطية مضمّنة `<image xlink:href="data:image/png;base64,...">`.
- **معالجة محلية بالكامل (Client-side / Browser & SSR):** لا نعتمد على خدمات خارجية مدفوعة أو إرسال صور المستخدمين لسيرفرات طرف ثالث احتراماً للخصوصية والأداء.
- **التوافق مع بيئة Nuxt 4 وNode:** دعم التشغيل داخل المتصفح (Web Canvas / ImageData / Web Workers) وفي بيئة الاختبارات.
- **الترخيص القانوني:** تجنب التراخيص المقيدة الصارمة (مثل GPL الصارم في بعض مخرجات Potrace إذا تطلبت ربط كود تجاري).
- **دعم الألوان:** دعم الألوان المتعددة (Multi-color)، والتدرج الرمادي (Grayscale)، والأبيض والأسود (Black & White).

### مقارنة المحركات:
| المحرك | جودة المنحنيات | الألوان المتعددة | دعم المتصفح بدون إضافات ثقيلة | الترخيص | التقييم |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **node-potrace** | ممتازة للأبيض والأسود | ضعيف (يحتاج تجزئة ألوان خارجية) | يعتمد على `jimp` وثنائيات Node | GPL-2.0 | غير ملائم لبيئة المتصفح الخفيفة |
| **vtracer (wasm)** | فائقة | ممتازة | يحتاج ملف WebAssembly كبير (2MB+) | MIT | ثقيل على التحميل الأولي ومعقد في الحزم |
| **imagetracerjs** | ممتازة ومتوازنة جداً | مدمج كامل (Color Quantization & Layering) | نقي 100% بدون أي تبعات خارجية (Zero Deps) | **Unlicense (Public Domain)** | **الخيار الفائز (Selected)** |

### قرار الاختيار:
تم اعتماد **ImageTracerJS** لمحرك التتبع الرياضي، مع إضافة طبقة هندسية شاملة (`VectorizationService`):
1. **Pre-processing:** معالجة عتبة الأبيض والأسود (B&W Thresholding)، وضبط التباين، وتحجيم الأبعاد الآمن للصور الكبيرة لمنع استنزاف الذاكرة.
2. **Quantization & Palette:** تكميم الألوان (Color Quantization) بين 2 إلى 32 لوناً، مع خوارزميات التجميع اللوني.
3. **Curve Fitting & Optimization:** تنعيم الحواف، إزالة الشوائب (`pathomit` / speckle removal)، وضبط دقة الإحداثيات لتقليل حجم ملف الـ SVG الناتج.
4. **Post-processing & Sanitization:** تطهير المحول الناتج بواسطة `sanitizeSvg` لمنع أي هجمات XSS، مع إضافة فاحص آلي `validateTrueVectorSvg` لضمان عدم وجود وسوم `<image>` والتأكد من وجود مسارات متجهية و`viewBox` قياسي.

---

## 3. المعمارية وهيكل الملفات (Proposed Architecture)

```
features/
└── vectorization/
    ├── types/
    │   └── vectorization.ts             # إعدادات التحويل، إحصاءات SVG، الحالات والخيارات
    ├── services/
    │   └── vectorizationService.ts      # خط المعالجة، تكميم الألوان، وتوليد مسارات بيزييه
    ├── utils/
    │   └── svgValidator.ts              # التحقق من أن الـ SVG حقيقي وخالٍ من الصور النقطية
    ├── composables/
    │   └── useVectorization.ts          # إدارة الحالة التفاعلية، الإلغاء، التراجع، ومراقبة الذاكرة
    └── components/
        ├── VectorizationUploadZone.vue   # رفع وسحب الصور والتحقق من التوقيع والأبعاد
        ├── VectorizationControlPanel.vue# لوحة الخيارات: أنماط الألوان، العتبة، التنعيم، الشوائب
        ├── VectorizationPreviewStage.vue# معاينة SVG الحية مع التكبير الفائق (Zoom 100% - 800%)
        ├── VectorizationComparisonView.vue # مقارنة قبل/بعد (Split slider / Side-by-side)
        └── VectorizationExportActions.vue# تنزيل ملف SVG، نسخ الكود، وتفاصيل الإحصائيات
```

### المسارات وشاشات الواجهة:
- **الصفحة:** `/tools/image-to-svg` (`pages/tools/image-to-svg.vue`)
- **رابط الهيدر:** إضافة أداة "تحويل إلى SVG" في `components/layout/AppHeader.vue`.

---

## 4. خيارات التحويل المدعومة (Conversion Options)

1. **نمط الألوان (Color Mode):**
   - **Black & White (أبيض وأسود):** تحويل ثنائي عالي التباين للأيقونات والرسومات الخطية.
   - **Grayscale (تدرج رمادي):** تمثيل متدرج بظلال الرمادي للصور المعقدة.
   - **Multi-color (ألوان متعددة):** تتبع طبقات لونية متوازية أو متسلسلة بدقة عالية.
2. **العتبة (Threshold):**
   - قابلة للضبط من 0 إلى 255 لنمط الأبيض والأسود.
3. **عدد الألوان (Number of Colors):**
   - متاح في نمط الألوان المتعددة والتدرج الرمادي (من 2 إلى 32 لوناً).
4. **مستوى التفاصيل وإزالة الشوائب (Speckle Removal / Detail):**
   - إهمال المسارات الدقيقة التي تقل عن مساحة محددة لتنظيف الضوضاء وتصغير حجم الملف (`pathomit`).
5. **تنعيم المنحنيات (Smoothing & Curve Tolerance):**
   - ضبط دقة المنحنيات وتخفيف الزوايا الحادة لإنتاج رسومات ناعمة ونظيفة (`qtres`, `ltres`, `blur`).
6. **تحسين المسارات وتقريب الإحداثيات (Path Optimization):**
   - تقريب إحداثيات النقاط إلى رقم عشري واحد لخفض حجم الملف حتى 40% دون فقدان ملحوظ للجودة.
7. **إعدادات مسبقة سريعة (Presets):**
   - `Icon / Logo` (أيقونة وشعار مسطح)
   - `Line Art / Sketch` (رسم خطي وأبيض وأسود)
   - `Detailed Graphic` (رسم بياني وتفصيلي)
   - `Custom` (تخصيص يدوي حر)

---

## 5. ضوابط الأمان والأداء والذاكرة (Security & Performance)

1. **الأمان ومنع الثغرات:**
   - فحص امتداد وتواقيع الملفات السحرية قبل المعالجة (Magic Bytes).
   - تطهير مخرجات الـ SVG عبر `sanitizeSvg` لمنع أي وسم `<script>` أو أحداث `on*` أو روابط خبيثة.
   - فحص سلامة الـ XML وهيكل `<svg>` ووجود `viewBox`.
   - منع استخدام وسوم `<image>` للتأكد بنسبة 100% أن الناتج رسم متجهي حقيقي وليس تضميناً احتيالياً.
2. **حدود الذاكرة وحماية المتصفح:**
   - الحجم الأقصى للصورة: 15 ميجابايت.
   - الأبعاد القصوى: 4096 × 4096 بكسل. الصور الأكبر حجماً يتم تحجيمها بنسب متناسقة لتفادي إجهاد معالج المتصفح وتجميد الواجهة.
   - تنظيف كائنات `URL.revokeObjectURL` فور الانتهاء أو تبديل الصورة لمنع أي تسريب للذاكرة.
   - إتاحة إلغاء العمليات الجارية وعزل النتائج القديمة في حال قيام المستخدم بتغيير الإعدادات سريعاً.

---

## 6. دعم اللغتين العربية والإنجليزية وRTL/LTR (Localization)

- إضافة مفاتيح الترجمة الموازية في `i18n/locales/ar.json` و `en.json`.
- تشمل الترجمة: العناوين، شارات التحكم، خيارات الألوان، رسائل الخطأ، إرشادات أفضل الممارسات، ونصوص أزرار التصدير والمقارنة.
- دعم كامل لاتجاه الصفحة RTL للعربية وLTR للإنجليزية مع التبديل السلس دون إعادة تحميل الصفحة.

---

## 7. تقسيم المهام والـ Commits المتتابعة

- **Task 1 & 2:** التحقق من جاهزية المرحلة 3 واختيار المحرك وتوثيق الخطة (Commit: `docs(phase-4): add vectorization implementation plan and engine evaluation`).
- **Task 3:** بناء النماذج وخدمة التتبع المتجهي `VectorizationService` (Commit: `feat(vectorization): implement vectorization service and curve fitting engine`).
- **Task 4:** بناء فاحص الـ SVG الحقيقي والأمان `svgValidator` (Commit: `feat(vectorization): add true vector validation and svg sanitization`).
- **Task 5:** بناء الـ Composable التفاعلي `useVectorization` (Commit: `feat(vectorization): implement reactive useVectorization composable with memory management`).
- **Task 6:** بناء مكونات واجهة المستخدم وأدوات التحكم والمعاينة والمقارنة (Commit: `feat(vectorization): add upload zone, control panel, preview stage, and comparison views`).
- **Task 7:** بناء صفحة الأداة `/tools/image-to-svg` وربطها في شريط التنقل (Commit: `feat(vectorization): add image-to-svg tool page and header navigation`).
- **Task 8:** تعريب الأداة بالكامل في `ar.json` و `en.json` (Commit: `feat(i18n): localize image to svg vectorization tool in Arabic and English`).
- **Task 9:** كتابة وتوسيع الاختبارات الآلية الشاملة (Commit: `test(vectorization): add comprehensive unit tests for vectorization engine and svg validation`).
- **Task 10:** الفحص النهائي للأنواع والبناء وإعداد تقرير الإنجاز (Commit: `docs(phase-4): document phase 4 completion report and quality assurance`).
