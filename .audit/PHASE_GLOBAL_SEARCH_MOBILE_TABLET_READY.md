# Phase — Global Search Mobile + Tablet Readiness

تاريخ: 2026-08-13  
القسم: بحث شامل (`GlobalSearchOverlay` + InstantShell/PaintShell)

## الهدف

تأكيد جاهزية القسم للهواتف (تقني/برمجي) وللوحيات (أبعاد وكثافة)، وليس إعادة تصميم بصري.

---

## ما أُنجز (ملموس)

| فجوة | الإصلاح |
|------|---------|
| InstantShell بدون قفل تمرير الجسم | `useBodyScrollLock(Boolean(open))` في `GlobalSearchInstantShell` |
| وضع البطاقة عند `sm`/`640` فقط → يكسر أفق الهاتف | SSOT: `(min-width: 768px) and (min-height: 560px)` عبر `globalSearchOverlayMedia.ts` + CSS + Esc hint في `SearchHeader` |
| safe-area يسار/يمين ناقصة على الطبقة | `padding-left/right: env(safe-area-*)` على `.hami-gs-layer` |
| زر تثبيت النتيجة 40px | `ResultRow` → `44×44` |
| بطاقة لوحي + كيبورد: `88dvh` يتصادم مع طبقة مقصوصة | `data-keyboard-inset` → `align-items: flex-end`؛ الورقة `max-height: 100%` مع الكيبورد |
| ErrorBoundary ما زال على `sm:` | طبقات `.hami-gs-error-layer` / `.hami-gs-error-sheet` بنفس MQ البطاقة + safe-area أفقي |
| reduceMotion ناقص على السبينر/مقياس الضغط | `useReduceMotion` على Loader؛ CSS `prefers-reduced-motion` + `html.reduce-motion`؛ إزالة `active:scale` من recent chips |
| overscroll على الطبقة | `overscroll-behavior: none` على `.hami-gs-layer` |
| نطاق chips يعتمد Tailwind `sm:` | `.hami-gs-scope-rail` / `.hami-gs-scope-wrap` مربوطة بـ MQ البطاقة |

اختبار جديد: `globalSearchOverlayMedia.test.ts`  
Vitest (قسم البحث): **14 ملف / 54 اختبار — نجاح**.

---

## قائمة تحقق الإغلاق

| # | البُعد | التحقق |
|---|--------|--------|
| 1 | أداء | قفل تمرير على Instant+Host؛ بدون blur مكلف على native؛ لا regressions في الاختبارات |
| 2 | نظافة | نقطة واحدة لقرار البطاقة (`matchesGlobalSearchCardLayout`)؛ لا `640` لوضع البطاقة |
| 3 | أمان | لا تغيير منطق فهرسة/صلاحيات؛ إغلاق خطأ يبقى زر واضح 44+ |
| 4 | جودة كود | media helper + اختبار؛ ErrorBoundary متوافق مع layout |
| 5 | موبايل | safe-area 4 جهات؛ touch ≥44؛ input 16px؛ كيبورد يضغط الطبقة؛ أفق الهاتف = ورقة كاملة |
| 6 | صدق | لم يُختبر على جهاز Capacitor حقيقي في هذه الجلسة |

---

## التقييم (صادق)

| البُعد | الدرجة | ملاحظة |
|--------|--------|--------|
| أداء | 8.5/10 | قفل تمرير + overscroll؛ لم يُقاس إطار/IME على جهاز |
| نظافة | 9/10 | MQ موحّد؛ بقايا `sm:px`/`sm:text` للكثافة فقط (ليست وضع بطاقة) |
| أمان | 9/10 | سطح واجهة فقط |
| جودة كود | 8.5/10 | helper + اختبار؛ لا جهاز حقيقي |
| موبايل / لوحي | 8.5/10 | هاتف: ورقة كاملة؛ لوحي مرتاح: بطاقة؛ أفق قصير يبقى ورقة |
| صدق | — | جاهزية برمجية عالية؛ التحقق البصري على WebView يبقى على المالك |

---

## الحدود (معلَنة)

1. **لا اختبار جهاز حقيقي** (Android/iOS Capacitor) لهذه الجلسة — الكيبورد الحقيقي و notch قد يختلفان عن المحاكاة.
2. **سحب للإغلاق (swipe-down)** غير مضاف — الإغلاق عبر الزر / رجوع النظام كما هو.
3. **كثافة لوحي كبيرة جداً** (iPad Pro landscape): البطاقة `max-width: 36rem` مقصودة؛ ليست لوحة بحث بعرض كامل الشاشة.
4. بقايا Tailwind `sm:` على padding/نص الحقل = كثافة طباعة عند ≥640، **ليست** تحويل إلى وضع البطاقة.

---

## جاهز للانتقال؟

**نعم** — ضمن حدود التحقق البرمجي + الاختبارات. القسم مناسب للهواتف واللوحيات من ناحية التخطيط الآمن (safe-area، touch، كيبورد، تمييز بطاقة اللوحي عن أفق الهاتف).

**المصداقية:** ما لم يُنفَّذ = جلسة جهاز حقيقي + swipe-to-dismiss.
