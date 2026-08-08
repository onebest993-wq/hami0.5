# تصميم صفحات/واجهات: إعادة هيكلة نافذة «التبليغ/مذكرة الإخبار»

## Global Styles (Desktop-first)
- Background: #0B0F1A (داكن) أو حسب ثيم المشروع الحالي.
- Surface/Card: #111827 مع حدود #1F2937.
- Text: أساسي #E5E7EB، ثانوي #9CA3AF.
- Accent/Primary: #3B82F6.
- Danger: #EF4444.
- Typography: 14–16px للنصوص، 18–20px للعناوين داخل النافذة.
- Buttons:
  - Primary: خلفية Accent + hover أغمق 8%.
  - Secondary: حدود فقط.
  - Disabled: opacity 0.45 + منع النقر.

---

## 1) صفحة التفاصيل (حيث يُستدعى المودال)

### Layout
- تخطيط عمودي (Stack) مع شريط علوي ثابت (إن وُجد) ومحتوى تفاصيل.
- زر/أيقونة «تبليغ/مذكرة الإخبار» يظهر قرب عنوان الهدف أو ضمن قائمة إجراءات.

### Meta Information
- Title: "تفاصيل" + اسم/معرّف الهدف.
- Description: وصف مختصر للهدف (إن وُجد).

### Page Structure
- Header: عنوان الهدف + أزرار إجراءات.
- Body: تفاصيل الهدف.

### Sections & Components
- Action Button: زر "التبليغ" يفتح النافذة على وضع «تبليغ عادي» افتراضياً.
- Optional Shortcut: عنصر UI صغير لفتح "مذكرة الإخبار" مباشرة (إن كان Premium) وإلا يفتح النافذة على تبويب مذكرة مع حالة minimal.

---

## 2) نافذة «التبليغ/مذكرة الإخبار» (Modal)

### Layout
- Modal centered بعرض 640px (Desktop) وارتفاع تلقائي مع حد أقصى 80vh + scroll داخلي للمحتوى.
- Grid/Stack داخلي:
  - صف علوي: عنوان + إغلاق.
  - صف تبويبات/مبدّل نوع.
  - محتوى النموذج.
  - صف أزرار الإجراء (إرسال/إلغاء).

### Meta Information
- لا تغيّر Meta الصفحة (Modal overlay).

### Page Structure
1. Modal Header
2. Mode Switch (تبويب/Segmented control)
3. Context Block (تلخيص الهدف)
4. Form Area (حسب النوع)
5. Status/Feedback Area
6. Footer Actions

### Sections & Components (تفصيلي)

#### 2.1 Modal Header
- Title: "التبليغ" أو "مذكرة الإخبار" بحسب التبويب.
- Close (X): يغلق النافذة.
- سلوك الإغلاق:
  - إغلاق يعيد تهيئة state لكلا النموذجين (لتقليل الالتباس) ما لم يقرر المنتج خلاف ذلك.

#### 2.2 Mode Switch (فصل الـstate)
- عنصر Segmented control بگزئين:
  - "تبليغ عادي"
  - "مذكرة الإخبار"
- القاعدة الأساسية: كل تبويب يملك state مستقل 100%:
  - draft values
  - validation errors
  - isSubmitting
  - lastResult (success/error)
  - cooldownInfo
- عند التبديل بين التبويبات:
  - لا يُمسح draft للتبويب الآخر.
  - لا تُنقل الأخطاء/الرسائل بين التبويبات.

#### 2.3 Context Block (ملخص الهدف)
- Card صغير أعلى النموذج:
  - اسم/عنوان الهدف.
  - معرّف مختصر.
  - تنبيه نصي صغير: "سيُطبّق حد الإرسال مرة كل 7 أيام لكل نوع".

#### 2.4 نموذج «تبليغ عادي» (Report Form)
- الحقول (minimal):
  - Textarea: "وصف التبليغ" (إلزامي).
- Validation:
  - منع الإرسال إذا كان فارغاً.
- Actions:
  - زر "إرسال التبليغ".

#### 2.5 نموذج «مذكرة الإخبار» (News Memo Form)
- حالات Premium minimal (3 حالات فقط لتقليل التعقيد):
  1) Premium: عرض النموذج وزر الإرسال.
  2) غير Premium: إخفاء/تعطيل النموذج واستبداله ببطاقة locked state.
  3) Premium لكن ضمن تبريد 7 أيام: عرض النموذج مقفول مع رسالة تبريد.

- Locked state (غير Premium):
  - Icon قفل + عنوان: "ميزة Premium".
  - نص: "مذكرة الإخبار متاحة لمشتركي Premium فقط".
  - CTA: زر ثانوي "اعرف المزيد" (يربط لمسار الترقية الحالي إن وُجد، أو يكتفي بإغلاق النافذة).

- الحقول (minimal عندما Premium):
  - Textarea: "نص المذكرة" (إلزامي).

#### 2.6 قاعدة 7 أيام (Cooldown UI)
- تُطبق بشكل منفصل على:
  - (المستخدم + الهدف + تبليغ)
  - (المستخدم Premium + الهدف + مذكرة)
- تمثيل الواجهة:
  - Banner داخل التبويب النشط عند المنع:
    - نوع: warning/danger حسب نظام التصميم.
    - نص مختصر: "لا يمكنك الإرسال مرة أخرى قبل مرور 7 أيام".
    - سطر صغير: "متبقي تقريباً: X أيام" (إن توفر الحساب).
  - زر الإرسال Disabled.

#### 2.7 Status/Feedback Area (Submitting/Success/Error)
- Submitting:
  - Spinner + "جارٍ الإرسال..." داخل زر الإرسال.
- Success:
  - رسالة نجاح قصيرة + زر "إغلاق".
- Error:
  - رسالة فشل قصيرة + زر "إعادة المحاولة".
- كل ما سبق مستقل لكل تبويب.

### Responsive behavior
- Tablet/Mobile:
  - modal يأخذ 92vw مع padding أقل.
  - أزرار footer تتحول إلى عمود.

### Interaction/Transitions
- Fade overlay 120–180ms.
- Slide-up خفيف للمودال 120–180ms.
- لا تستخدم مؤثرات ثقيلة لتفادي التشتيت.