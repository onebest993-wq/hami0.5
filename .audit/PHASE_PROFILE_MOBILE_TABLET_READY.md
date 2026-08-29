# جاهزية الملف المهني — هاتف + لوحية

**التاريخ:** 2026-08-13  
**نقطة الدخول:** `HeaderProfileTrigger` (`data-testid=header-profile-trigger`) → فتح الملف  
**قاعدة:** بلا إعادة تصميم بصري — طوابق تقنية / قياس فقط

## حكم
**جاهز تقنياً للهاتف واللوحية** ضمن الحدود أدناه. **صفر P0.** فجوات P1 + P2-CSS أُغلقت في هذه الجولة.

## ما كان مغلقاً مسبقاً (لا يُعاد فتحه)
| البند | دليل |
|-------|------|
| لمس ≥٤٤px (تعديل/استوديو/متابعة/تكبير) | `profileTouchTargetFloors.test.ts` |
| عمود الصفحة 32.5rem + safe-area | `profileChrome.css` + layout test |
| فتح سريع من الهيدر | `continueOpenAfterPaint` + snappiness test |
| هيدر: min-h 48 + avatar 44 + tap-highlight | `HeaderProfileTrigger.tsx` |
| قفل تمرير / reduceMotion / Android overscroll | موجود ومغطّى |

## ما أُغلق الآن
1. **P1** ورقة الاستوديو كانت full-bleed على اللوحية → `max-w-[min(100%,32.5rem)] mx-auto` (+ هيكل التحميل).
2. **P1** استوديو بلا safe-area أفقي → `ps/pe` بـ `env(safe-area-inset-left/right)`.
3. **P2** عارض المعرض: padding أفقي ثابت → أربعة اتجاهات `env(safe-area-inset-*)`.
4. **P2** مسرح المعرض قصير أفقياً على اللوحية → `@media (min-width: 768px) and (orientation: landscape)` → `min(70dvh, 28rem)`.

ثوابت: `PROFILE_SHEET_MAX_WIDTH_CSS` / `PROFILE_TABLET_MIN_WIDTH_PX` في `profileTouchTargets.ts`.

## تحقق
Vitest: `profileMobileTabletLayout` + touch floors + chrome layout + open gesture + touchTargets — **5 ملفات / 19 اختباراً — ناجح**.

Canvas: `profile-mobile-tablet-readiness.canvas.tsx`

## تقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| موبايل (هاتف) | مرتفع | طوابق لمس + safe-area + لوحة مفاتيح موصولة |
| لوحية | مرتفع | سقف عرض الاستوديو = عمود الصفحة؛ مسرح معرض أطول أفقياً |
| أداء/استقرار فتح | مرتفع | مسار الهيدر كما هو |
| صدق | مرتفع | بقايا P2 معلنة |

## حدود متعمدة
- ~~تكبير معاينة المعرض في وضع العرض فقط~~ → **أُغلق** (جلسة + pinch/عجلة/أزرار؛ لا حفظ).
- ~~تطابق Keyboard.Body مع visualViewport~~ → **أُغلق تقنياً** عبر مسار Capacitor Keyboard على الأصلي (تحقق ميداني ما زال مُستحسناً لا مانعاً).
- `--hami-user-font-scale` على `html` جذري خارج القسم (طوابق الملف مغلقة محلياً).

**جاهز للانتقال:** نعم — لنطاق جاهزية الهاتف/اللوحية التقنية.
