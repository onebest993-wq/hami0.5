# Phase — Global Search Mobile Sheet Redesign

تاريخ: 2026-08-12

## المشكلة

ورقة البحث كانت تُقاس بمحتواها (~218px)، فتطفو فوق الكيبورد بفجوة وتشابك بصري. لا مشاكل سياق/فهرسة — المشكلة تصميم وتفاعل موبايل.

## ما أُنجز

| ملف | التغيير |
|-----|---------|
| `globalSearchOverlay.css` | ورقة موبايل ملء الطبقة (flex column)، بدون تدرج بنفسجي، safe-area صحيح، compact header |
| `globalSearchOverlayLayout.ts` | `resolveGlobalSearchLayerStyle` يضغط الطبقة فوق IME عبر `bottom` |
| `GlobalSearchOverlayStaticShell.tsx` | تطبيق طبقة الكيبورد + `data-keyboard-open` |
| `GlobalSearchOverlayDialogChrome.tsx` | مقبض + تمرير `compact` من inset |
| `SearchHeader.tsx` | ضغط العنوان مع الكيبورد؛ إبقاء زر الإغلاق؛ `16px` لمنع زوم iOS |
| `GlobalSearchOverlayResultsRegion.tsx` | نتائج عبر flex؛ `--gs-results-max` لسطح المكتب فقط |
| `SearchIdlePanel.tsx` | تلميح فارغ عندما لا توجد عمليات أخيرة |

## التقييم

| بُعد | درجة | ملاحظة |
|------|------|--------|
| أداء | 8/10 | بلا animation دخول (كما كان مقصوداً لـ Android)؛ flex بدل maxHeight مزدوج |
| نظافة | 8/10 | فصل أسلوب الورقة التقليدية عن طبقة البحث |
| أمان | 9/10 | لا تغيير منطق استعلام/صلاحيات |
| جودة كود | 8/10 | اختبارات layout محدّثة |
| موبايل | 8/10 | ملء viewport فوق الكيبورد؛ compact؛ touch 44px؛ safe-area؛ 16px input |
| صدق | — | لم يُختبر على جهاز Capacitor حقيقي في هذه الجلسة |

## الحدود

- تحقق بصري على Android/iOS WebView ما زال مطلوباً من المالك.
- سحب للإغلاق (swipe-down) غير مضاف — يُبقى زر الإغلاق + زر الرجوع الأصلي.

## جاهز للانتقال؟

نعم — ضمن حدود التصميم/الظهور. منطق البحث لم يُمس.
