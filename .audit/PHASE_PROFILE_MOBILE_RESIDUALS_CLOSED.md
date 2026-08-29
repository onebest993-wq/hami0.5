# إغلاق بقايا جاهزية الملف — هاتف/لوحية

**التاريخ:** 2026-08-13  
**قاعدة:** بلا إعادة تصميم بصري — إكمال وظيفة ناقصة + تحصين تقني

## ما أُغلق (كان معلناً كبقايا)

### 1) تكبير معاينة المعرض في وضع العرض
- أزرار تكبير/تصغير في وضع `view` (نفس صف الـ zoom الموجود في الضبط)
- عجلة الفأرة + قرص إصبعين (pinch) في العرض والضبط
- التكبير في العرض **جلسة فقط** — لا يُحفظ حتى يدخل المستخدم «ضبط الموضع»
- اختبار: `ProfileGalleryViewer.escape.test.tsx` — تكبير مؤقت دون `onSaveAdjust`

### 2) Keyboard.Body × visualViewport على Capacitor
- `useMobileKeyboardInset`: على `data-hami-native=1` يستمع لـ `@capacitor/keyboard` (`keyboardWillShow/Hide`)
- أثناء ارتفاع الإضافة لا يُخلط مع فجوة visualViewport (منع رفع مزدوج)
- الويب يبقى على visualViewport فقط
- اختبار: `useMobileKeyboardInset.native.test.ts`

### 3) تنظيف مهلة `waitForProfileUpdated`
- `finish()` يتحمّل هدم jsdom (`try/catch` حول clearTimeout/removeEventListener)

## تحقق
Vitest للموجة: **10/10** ناجح (معرض + كيبورد + layout سابق).

## تقييم

| البُعد | درجة |
|--------|------|
| موبايل | **مرتفع** |
| لوحية | مرتفع |
| صدق | مرتفع |

## الحد المتبقي
- لا دين شيفرة داخل الملف بخصوص مقياس الخط: `html` ثابت على `16px`؛ طوابق `44px` defense-in-depth.
- نشر Edge Function (fail-closed) على Supabase — حدّ Ops خارج المستودع.

**جاهز للانتقال:** نعم — بقايا جاهزية الملف القابلة للإغلاق أُغلقت.
