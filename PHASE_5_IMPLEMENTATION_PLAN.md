# خطة تنفيذ المرحلة الخامسة: محرر الأيقونات الاحترافي
# PHASE 5 IMPLEMENTATION PLAN: PROFESSIONAL ICON EDITOR

- **المسؤول المعماري:** Senior Full-Stack Engineer & Software Architect
- **الفرع:** `feature/phase-5-icon-editor`
- **المؤلف:** `Emad20112 <fyslbdh80@gmail.com>`
- **تاريخ البدء:** أكتوبر 2026
- **الحالة:** قيد التنفيذ (In Progress)

---

## 1. نتائج تدقيق الجاهزية قبل التنفيذ (Task 1: Pre-Execution Readiness Audit)
- **فحص Git والتفرع:**
  - الفرع الأساسي `main` نظيف ومحدث عند Commit `633398c` (تحديث `pnpm-lock.yaml` وتثبيت `packageManager` وإصلاح `shallowRef`).
  - تم إنشاء الفرع المستقل `feature/phase-5-icon-editor` انطلاقاً من `origin/main`.
- **جاهزية واستقرار المراحل السابقة (Phase 0 -> Phase 4):**
  - **Phase 0 & 1:** نظام الأصول الرقمية، RLS، الصلاحيات، التدقيق يعمل بنجاح.
  - **Phase 2:** محرك البحث والاكتشاف والترتيب الفوري يعمل بنجاح.
  - **Phase 3:** أداة محول الأيقونات وتصدير PNG وWebP وICO والحزم المضغوطة ZIP تعمل بنجاح (19/19 اختبار).
  - **Phase 4:** أداة التحويل المتجهي الحقيقي Image-to-SVG تعمل بنجاح (11/11 اختبار).
  - **الاختبارات الآلية الحالية:** 149/149 اختباراً ناجحاً عبر 11 ملف اختبار.
  - **فحص الأنواع والبناء:** `vue-tsc --noEmit` يجتاز بـ 0 أخطاء، و`nuxt build` ينجح بنسبة 100%.
- **الخدمات والمكتبات المعتمدة لإعادة الاستخدام:**
  - تعقيم الـ SVG: `lib/sanitizer/svgSanitizer.ts` و `features/vectorization/utils/svgValidator.ts` لمنع XSS والوسوم الضارة.
  - محول الصور وICO: `features/image-converter/utils/icoEncoder.ts` و `features/image-converter/services/imageConverterService.ts`.
  - أيقونات الواجهة: `lucide-vue-next`.
  - إدارة اللغات: `i18n` مع دعم كامل لـ RTL وLTR.

---

## 2. التصميم المعماري لمحرر الأيقونات (Architecture Design)

```
features/
└── editor/
    ├── types/
    │   └── editor.ts               # Document Model, Element Union Types, Tool Types, Canvas State
    ├── engine/
    │   ├── editorCore.ts           # Editor Core: Element CRUD, Selection, Hit-testing, Snapping, Bounds
    │   ├── commands.ts             # Command Pattern: Add, Remove, Move, Resize, Rotate, Style, Reorder
    │   ├── commandHistory.ts       # Undo/Redo Engine with action coalescing and memory bounds
    │   └── svgRenderer.ts          # Pure functional SVG renderer from Document Model
    ├── services/
    │   ├── editorImportService.ts  # Safe SVG & Image Parsing, DOM Sanitization, Path extraction
    │   └── editorExportService.ts  # SVG, PNG, WebP, ICO Export with custom scaling & transparency
    ├── composables/
    │   └── useIconEditor.ts        # Reactive bridge between Editor Core, Canvas, UI, and Keyboard Events
    └── components/
        ├── EditorTopToolbar.vue    # Project Name, Undo/Redo, Zoom, Grid, Snap, Preview, Export CTA
        ├── EditorLeftToolbar.vue   # Select, Move, Shapes, Pen, Text, Image/SVG Import
        ├── EditorCanvas.vue        # Interactive SVG Canvas, 8 Transform Handles, Rotation, Pan, Grid
        ├── EditorPropertiesPanel.vue # Dynamic Properties: Fill, Stroke, Geometry, Typography, Document
        ├── EditorLayersPanel.vue   # Layer List, Reordering, Lock, Visibility, Rename, Delete
        ├── EditorExportModal.vue   # Multi-format Export Dialog (SVG, PNG, WebP, ICO)
        └── EditorKeyboardShortcutsModal.vue # Quick shortcut cheat sheet
```

### 2.1 نموذج المستند (Document Model)
- المستند `EditorDocument`:
  - `id: string`
  - `name: string`
  - `width: number` (افتراضياً 64 أو 128 أو 256 أو 512 بكسل)
  - `height: number`
  - `viewBox: { minX, minY, width, height }`
  - `background: string` (شفاف أو لون مخصص)
  - `elements: EditorElement[]`
  - `version: 1`
  - `metadata: Record<string, unknown>`

### 2.2 أنواع العناصر (Element Union Types)
كل عنصر يرث الخصائص المشتركة:
`id`, `name`, `type`, `visible`, `locked`, `opacity`, `rotation`.

- **RectElement:** `x, y, width, height, rx, ry, fill, stroke, strokeWidth`
- **CircleElement:** `cx, cy, r, fill, stroke, strokeWidth`
- **EllipseElement:** `cx, cy, rx, ry, fill, stroke, strokeWidth`
- **LineElement:** `x1, y1, x2, y2, stroke, strokeWidth, strokeLinecap`
- **PolygonElement:** `points: Array<{x, y}>, fill, stroke, strokeWidth, sides`
- **PathElement:** `pathData: string, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin`
- **TextElement:** `text, x, y, fontSize, fontFamily, fontWeight, textAlign, fill, stroke, strokeWidth`
- **ImageElement:** `href, x, y, width, height, isReference` (للمراجع البصرية الآمنة)

### 2.3 نظام الأوامر والتراجع والإعادة (Command Pattern & History)
- كل عملية تطبق واجهة `EditorCommand`:
  - `execute(core: EditorCore): void`
  - `undo(core: EditorCore): void`
- الأوامر الأساسية:
  - `AddElementCommand`
  - `RemoveElementCommand`
  - `TransformElementCommand` (Move / Resize / Rotate)
  - `UpdateElementPropsCommand` (Fill, Stroke, Text, etc.)
  - `ReorderElementCommand` (Bring Forward, Send Backward, Front, Back)
  - `DuplicateElementCommand`
  - `BatchCommand`
- **دمج العمليات (Action Coalescing):** دمج حركات الماوس المستمرة أثناء السحب لتجنب استنزاف الذاكرة والحفاظ على تراجع سلس بنقرة واحدة.

### 2.4 محرك العرض SVG وتصدير الملفات (Rendering & Export)
- توليد كود SVG نظيف مستخرج مباشرة من `EditorDocument` بدون عناصر التحكم بالواجهة (`selection handles`, `guides`).
- دعم التصدير بصيغ:
  - **SVG:** كود متجهي نظيف وخالٍ من الوسوم غير الصالحة.
  - **PNG:** بدقات متعددة (1x, 2x, 4x) مع الحفاظ التام على الشفافية.
  - **WebP:** دقة عالية وضغط ممتاز.
  - **ICO:** أيقونات ويندوز متعددة الأحجام بالاستفادة من `features/image-converter/utils/icoEncoder.ts`.

### 2.5 استيراد SVG الآمن
- قراءة ملفات SVG وتحليلها عبر `DOMParser`.
- تطبيق `validateTrueVectorSvg` ومطهّر الـ SVG للتخلص من أي برمجيات خبيثة (`<script>`, `onload`, `javascript:`).
- تحويل وسوم SVG القياسية (`<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<path>`, `<text>`) إلى عناصر قابلة للتحرير بالكامل داخل `EditorDocument`.

---

## 3. خطة المهام التفصيلية (Task Breakdown)

- **Task 1 — التدقيق وتأسيس الفرع وخطة العمل** ✅
- **Task 2 — بناء نموذج المستند والأنواع (Editor Document Model & Types)**
- **Task 3 — بناء النواة الهندسية للمحرر (Editor Core)**
- **Task 4 — بناء نظام الأوامر والتراجع والإعادة (Command System & History)**
- **Task 5 — بناء محرك توليد وعرض الـ SVG الوظيفي (SVG Renderer)**
- **Task 6 — بناء خدمات الاستيراد والتصدير الآمنة (Import & Export Services)**
- **Task 7 — بناء الـ Composable التفاعلي (useIconEditor)**
- **Task 8 — بناء مسرح الرسم التفاعلي ومقابض التحويل (EditorCanvas)**
- **Task 9 — بناء شريط الأدوات العلوي وشريط أدوات الرسم (Top & Left Toolbars)**
- **Task 10 — بناء لوحة الخصائص المتقدمة (Properties Panel)**
- **Task 11 — بناء لوحة الطبقات والترتيب والقفل (Layers Panel)**
- **Task 12 — بناء نافذة التصدير المتعدد (Export Modal)**
- **Task 13 — اختصارات لوحة المفاتيح والـ Accessibility**
- **Task 14 — الصفحة الرئيسية للمحرر والتصميم المتجاوب (pages/tools/icon-editor.vue)**
- **Task 15 — تعريب المحرر بالكامل باللغتين العربية والإنجليزية (i18n & RTL)**
- **Task 16 — كتابة حزمة الاختبارات الآلية الشاملة (Unit Tests)**
- **Task 17 — فحص الأنواع والبناء والتحقق النهائي (Typecheck & Build)**
- **Task 18 — إعداد التقرير النهائي للمرحلة الخامسة (Completion Report & Push)**
