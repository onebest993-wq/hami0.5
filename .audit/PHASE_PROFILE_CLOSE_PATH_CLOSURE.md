# مسار إغلاق الملف المهني — إغلاق صادق

**التاريخ:** ٢٩ آب ٢٠٢٦  
**النطاق:** العودة من الملف إلى الرئيسية القابلة للنقر (بلاطة المنتدى). بلا إعادة تصميم بصري.

## الحكم

**مسار الإغلاق إلى الرئيسية مغلق.**  
`e2e/lawyer-profile.spec.ts` chromium: **٨/٨**.  
`e2e/lawyer-profile-header.spec.ts` chromium: **٢/٢** (هوية البلاطة بعد الحفظ).

`expectProfileTabClosed` ما زال يشترط بلاطة `home-dock-forum-profile` **ظاهرة** — لم يُضعَف إلى snap-only.

**جاهز للانتقال:** نعم — لهذا المسار. حدود القسم الأوسع معلنة أدناه وليست «لاحقاً داخل نفس الإغلاق».

---

## ما كان مكسوراً (واقع القياس لا الانطباع)

بعد إغلاق الاستوديو بـ Escape أو بعد حفظ الاسم وإعادة الفتح:

| مؤشر | قبل | بعد |
|------|-----|-----|
| `data-hami-profile-open` | يُمسَح | يُمسَح |
| غطاء الرئيسية `is-active` | كان يُفقد إذا التبويب ليس home/profile | يبقى ما لم يُفتح التقويم |
| بلاطة المنتدى | `visibility: hidden` | ظاهرة وقابلة للنقر |

سلسلة DOM عند الفشل (قبل الإصلاح الأخير):

- غطاء `lawyer-dashboard-home-surface` = `visible` + `is-active`
- `home-main-zone` / `home-main-grid` = **`invisible`** (Tailwind) لأن `HomeMainGrid.visible === false`

الغطاء كان يُرسَم؛ **الشبكة داخله كانت مخفية**. لذلك نجح زر الرجوع البسيط أحياناً وفشل Escape/الحفظ: مسار الترقيع كان يصفّر `homeTabProps.visible` عندما `activeTab !== 'home'` حتى لو بقي الغطاء نشطاً.

---

## ما أُنجز

### ١) غطاء الرئيسية لا يُطفأ إلا للتقويم
`LawyerDashboardMainView`: `homeActive = homeTabProps.visible || !schedulePaintOpen`.

### ٢) تبويب الإشعارات ليس بديلاً للمنزل
`isLawyerDashboardHomeStackTab` يشمل `notifications`. الإشعارات طبقة فوق المنزل.

### ٣) شبكة المنزل تتبع الغطاء لا ترقيع الهيدر
- `LawyerDashboardHomeTab` يُمرَّر إليه `visible={homeActive}` حتى لا تبقى `HomeMainGrid` على `invisible` تحت غطاء نشط.
- `patchLawyerDashboardHeaderOverlayOpen` يستخدم `isLawyerDashboardHomeStackTab` بدل `activeTab === 'home'` فقط.

### ٤) إشعارات keep-alive لا تسرق الصفحة بعد إغلاق الـ snap
- React يُزامَن مع `data-hami-notifications-open` عبر `MutationObserver`.
- `aria-modal` / فخ Escape / قفل التمرير يتبعان السطح البصري (`surfaceOpen`) لا React وحده.

### ٥) عقد E2E صادق
`expectProfileTabClosed`: snap مغلق + بلا closing عالق + البلاطة ظاهرة. عند الفشل يُسجَّل: `homeClass`، `dockChain`، `htmlHami`، `notifDebug`.

---

## تحقق

| طبقة | نتيجة |
|------|--------|
| Vitest (ترقيع الهيدر + honesty الملف/الإشعارات + شبكة المنزل) | ناجح |
| Playwright `lawyer-profile.spec.ts` chromium | **٨/٨** (١٧٫٥ ث) |
| Playwright `lawyer-profile-header.spec.ts` chromium | **٢/٢** |
| `npm run gate:profile` | **لم يُشغَّل** في هذه الدفعة |
| `e2e/lawyer-profile-studio.spec.ts` | **لم يُشغَّل** (مهلة تصل ٢٤٠ ث — خارج مسار الإغلاق) |
| جهاز Capacitor حقيقي | **لم يُقَس** — الدليل من Chromium + CSS/React نفسه |

---

## تقييم الأبعاد

| البُعد | درجة | صدق |
|--------|------|------|
| أداء / استقرار مسار الإغلاق | **مرتفع** | ٨/٨ على العقد الصادق؛ ليست ميزانية فتح بارد جديدة |
| نظافة | **جيد** | إصلاحان في مصدر الحقيقة (ترقيع + `visible={homeActive}`)؛ dump E2E أطول عمداً للتشخيص |
| أمان | **بدون تغيير في هذه الدفعة** | لا مساس بـ KV / pageAccess / تعقيم الوسائط |
| جودة / تقسيم | **مرتفع لهذا المسار** | الغطاء ≠ شبكة المنزل كان الخلط؛ فُصل صراحة |
| موبايل (تحضير Capacitor) | **مرتفع تقنياً / غير مُقاس على جهاز** | `visibility` + safe-area كما هما؛ بلا تغيير بصري |
| صدق | **مرتفع** | النقص معلن؛ العقد لم يُضعَف |

---

## الحدود (ليست ديناً مؤجَّلاً داخل هذا المسار)

1. **شجرة مزدوجة حتى الاعتماد** — غطاء `ProfileOpenFirstPage` ثم حيّ. متعمَّد.
2. **Host يُفكَّك بعد خمول ١٢ ث** (`PROFILE_HOST_IDLE_RELEASE_MS`).
3. **الاستوديو ليس على الغطاء** — التعديل الحي من click؛ الغطاء يصفّر من pointerdown فقط.
4. **كتل مخصَّصة كسولة** — ليست في أول صفحة.
5. **Edge KV-proxy القديم** — fail-closed في المستودع؛ **النشر على Supabase قرار عمليات** لا يثبته هذا الإغلاق.
6. **`__hamiE2eLastProfileClose` ما زال `null` في حزمة الإغلاق** بينما `lastSnap` يُسجَّل — تشخيص فقط؛ الإغلاق نفسه يعمل.
7. **لوحة الإشعارات قد تبقى mounted (keep-alive)** بعد الإغلاق — مخفية بـ CSS + `aria-hidden`؛ لا تُفرَّغ من الذاكرة في هذه الدفعة.

---

## المصداقية — ما لم يُنفَّذ صراحةً

- لا بوابة إنتاج كاملة `gate:profile`.
- لا مرور استوديو الكتالوج/الرفع E2E.
- لا قياس على Android/iOS WebView.
- لا تغيير ألوان/تخطيط/خطوط.

**جاهز للانتقال:** نعم.
