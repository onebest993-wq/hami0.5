# إغلاق قسم — الإشعارات: تنحيف الحجم والتصميم

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** جرس الهيدر → `NotificationPanel` + `NotificationShell` + قشرة الطلاء الفوري + CSS الورقة/البطاقات/Android.  
**خارج النطاق:** `ForumNotificationsPanel`، إشعارات التنفيذ/الورثة، منتج caseShare خارج بطاقات اللوحة.  
**الإذن:** بصري صريح من المالك — خفّة واحتراف، مع الإبقاء على أهداف لمس 44px وsafe-area وreduceMotion وسحب الإغلاق.

لا تغيير على عقد الشبكة/KV/FCM.

---

## ما أُنجز

### حجم JS (مقطع الوارد)

- حركات Motion ميتة حُذفت من `useNotificationPanelChrome` و`index` و`NotificationPanelSheet` (`overlayTransition` / `sheetEnterTransition` / `sheetInitial` / `sheetExit` لم تكن تُستهلك).
- `NotificationPanelRoot` بلا `AnimatePresence` ولا استيراد `overlayMotionRuntime` — الظهور من `html[data-hami-notifications-open]`.
- بطاقة الإشعار `<button>` أصلي بدل `motion.button`.
- حُذف `pickTypeIcon.ts` و`TYPE_ICON_MAP` وأيقونات التبويب غير المعروضة. الثيم: أيقونة تصنيف واحدة.
- `reduceMotion` لم يعد يُمرَّر لوهم إلى منطقة التمرير.

### تصميم (كثافة بلا زخرفة)

- الورقة: `border-radius: 0.75rem`، ظل `0 -6px 18px`، تعتيم أخف، مقبض أنحف، أزرار هيدر `rounded-xl`.
- البطاقات: حشو `px-3 py-2.5`، avatar 36px، سطر تفصيل واحد، نقطة غير مقروء ذهبية بلا شارة «جديد»، `contain-intrinsic-size` **76px**.
- الهيدر/التبويب/التمرير: `px-3` وفجوات أضيق (`space-y-3`).
- المنبثق ومشاركة الإضبارة وحدود الخطأ: `rounded-xl`، بلا `backdrop-blur`، زر الخطأ 44px.
- قشرة الطلاء الفوري متطابقة مع الورقة الحيّة (`#0b1021`، `0.75rem`، عنوان 600).

**ثُبِّت:** `translate3d(0, 28%, 0)`، `z-[200]`، لمس 44px، `font-size: 16px` لحقول التاريخ، `touch-action`، Android بلا blur، عتبة السحب `offset.y > 108`.

---

## الاختبار

| الجناح | النتيجة |
|--------|---------|
| `NotificationPanel` + instant paint + surgical + overlay isolation | **108** نجحت |
| خدمات/مخزن/هوكات الإشعارات (مسار البوابة) | **188** نجحت (تتقاطع جزئياً مع surgical) |
| منتدى/FCM جسر الإشعارات + prefetch الهيدر | **49** نجحت |
| Playwright / جهاز / قياس `dist` gzip | **لم تُشغَّل** |
| تحقق متصفح حيّ (لا أدوات تصفح في الجلسة) | **لم يُنفَّذ** — `npm run dev` يعمل محلياً |
| `tsc --noEmit` كامل / `npm run gate:notifications` كعملية واحدة | **لم يُشغَّل** كعملية واحدة؛ vitest أعلاه يغطي قائمة البوابة تقريباً |

قفل الكثافة: `notificationsVisualDensity.test.ts`.

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8/10 | Motion ميت وأيقونات زائدة خرجت من مقطع الوارد؛ contain أنحف. بلا Lighthouse أو gzip مقطع إنتاجي. |
| نظافة | 8/10 | `pickTypeIcon` والحركات الميتة حُذفت. CSS الإخفاء ما زال مكرراً بين `lawyerHomeFx-critical.css` والطبقة (أول طلاء). |
| أمان | 8/10 | لم تُمسّ المسارات/الختم. ليست pen-test. |
| جودة | 8/10 | Chrome/Root أرفع؛ الورقة ما زالت تحتاج Motion للسحب من الهيدر. |
| موبايل | 8/10 | 44px / safe-area / لوحة مفاتيح 16px / قفل تمرير / reduceMotion / سحب 108 كما هي. الكثافة في الحشو لا في أهداف اللمس. |
| صدق | 9/10 | الحدود أدناه. |

**جاهز للانتقال:** نعم لهذه المرحلة البصرية.  
**المصداقية — ما لم يُنفَّذ:** قياس جهاز، E2E Playwright، `tsc` كامل، دمج طبقتي CSS للإخفاء، إلغاء الجسر الفوري، تحويل سحب الورقة بعيداً عن Motion.

---

## الحدود

| الحد | السبب |
|------|--------|
| `motion.div` على الورقة | سحب الإغلاق من الهيدر ما زال يحتاج `overlayMotionRuntime` |
| جسر الطلاء الفوري + Host React | الكشف اللحظي؛ لم يُدمَج في شجرة واحدة |
| تكرار قواعد الإخفاء في `lawyerHomeFx-critical.css` | أول طلاء قبل مقطع اللوحة |
| زر «مسح المستند» داخل زر البطاقة | **أُصلح لاحقاً** في موجة العلل الخفية: البطاقة `role="button"` والمسح زر مستقل |
| `ForumNotificationsPanel` | قسم المنتدى لا لوحة الجرس |
