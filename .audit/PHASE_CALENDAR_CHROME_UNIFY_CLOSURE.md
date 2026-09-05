# إغلاق مرحلة — توحيد كروم التقويم (صدفة حقيقية + جسم حي)

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** dockCalendar / رادار المواعيد. صدفة الفتح صارت الصفحة، والجسم الحي داخلها.  
**تغيير بصري:** لا إعادة تصميم. الغطاء لم يعد يخفي الصفحة فوق رادار ثانٍ.

---

## الحكم

ما أمكن داخل القسم نُفِّذ: كروم واحد ظاهر (`smart-legal-radar` + `data-schedule-instant`)، جسم حي `radar-live-body` بلا رأس/أسبوع/مرساة إضافة مكررة، بطاقة الصدفة بعدّاد مهلة وتسمية مصدر، فتح المصدر من الصدفة عبر نية لا تسحب الإضبارة إلى MainView.

مسار البذر E2E أُغلق: هوية الجلسة (`guest-lawyer-1`) تطابق التخزين، كاش العرض الفارغ لا يحجب leftover، والتسليم ينتظر بطاقات الصدفة قبل استبدال القائمة.

ما بقي قدرة لا تأجيل داخل الكروم: شجرة الرادار الحي ما زالت في RAM (keep-alive عمداً بعد الرجوع)، التشفير المحلي و`lawyerCalendarCloud` وhop `calendarCloudRuntime` لم تُمسّ، TTFI على هاتف غير مقيس.

---

## ما أُنجز

| المجال | السلوك |
|--------|--------|
| كروم دائم | `ScheduleRadarPaintGate` يبقي `RadarOpenInstantChrome` الصفحة. لا تلاشي `opacity:0` فوق رادار ثانٍ |
| جسم حي | `SmartLegalRadar embedInChrome` → `RadarShell` بـ `radar-live-body`. بلا `RadarHeader` / `MonthNav` / `RadarAddEventDock` |
| تسليم | قائمة الصدفة حتى يستقر الجسم؛ لا RAF cap عند بقاء بطاقات كاش؛ سقف أمان 360 إطاراً |
| إضافة | مرساة الصدفة تفتح `RadarOpenInstantAddHost` دائماً (لا تُسرَق داخل `hidden`) |
| تعديل حي | `requestCalendarShellEdit` بعد التسليم |
| مصدر | `calendarOpenSourceIntent` + اشتراك في `LawyerDashboardScheduleTab` → `openCalendarRadarSource` |
| مهلة/مصدر على بطاقة الصدفة | `describeLegalDeadlineForCalendarCard` + `calendarModuleVisual` في model الصدفة فقط — بلا صف تعديل/حذف للحي |
| هوية الكاش | `resolveCalendarUserId` في الصدفة — نفس مفتاح Host. الفتح يمرّر `userId` إلى `primeCalendarEventsCacheFromPeek` |
| كاش العرض | كاش ذاكرة فارغ لا يحجب leftover. لا تُزرع `[]` من لقطة أولية فارغة |
| keep-alive | الشجرة لا تُنقل بين أبوين عند إغلاق التبويب؛ `interactive={open}` حتى لا يُسرَق Cap من الرئيسية. إفلات خامل بعد 3–10 دقائق كما هو |
| بذر E2E | `E2E_CALENDAR_USER_ID = GUEST_LAWYER_ID`. leftover فقط (لا IndexedDB صريح). بعد الإقلاع `commitCalendarEventsSeed` عبر `__hamiE2eSecureStore.setItemSync` بهوية الجلسة |

ملفات رئيسة: `RadarOpenInstantChrome.tsx`, `ScheduleRadarPaintGate.tsx`, `SmartLegalRadar.tsx`, `RadarShell.tsx`, `LawyerDashboardScheduleTab.tsx`, `calendarOpenSourceIntent.ts`, `calendarLiveHandoffContext.ts`, `scheduleRadarLivePaint.ts`, `useScheduleRadarLivePaint.ts`, `calendarEventsWarm.ts`, `useCalendarData.ts`, `scheduleShellOpenFlow.ts`, `e2e/helpers/calendarFixtures.ts`.

---

## الاختبار

| الجناح | النتيجة |
|--------|---------|
| `npm run gate:calendar` | **PASSED** — 56 ملفاً، **243** اختباراً |
| Playwright `e2e/smart-legal-radar.spec.ts` على `build:e2e` + preview | **17/17**. الخمسة التي كانت فاشلة بالبذر نجحت. `npm run dev` بلا جلسة E2E يظهر بوابة الدخول |
| السيناريوهات | فتح فارغ، شبكة الشهر، إضافة، Escape، رجوع مع بقاء الموعد، زمن الفتح، cache محلي، زر اليوم، تنقّل الأشهر، تعديل/حذف مبذور، تعارض موقعين، مصدر مفقود، حذف مربوط مرفوض، فتح مصدر إلى إضبارة |
| `npx tsc --noEmit` | لم يُشغَّل كاملاً. ضوضاء repo خارج التقويم معروفة |
| قياس هاتف / Capacitor TTFI | لا جهاز. زمن الفتح مكتوب من performance marks على سطح المكتب في E2E |

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8.5/10 | فتح الكروم فوري. الجسم الحي في الخلف حتى التسليم. TTFI هاتف غير مقيس |
| نظافة | 8.5/10 | نية مصدر/نموذج مفصولة. لا JS `SmartLegalRadar` في جذع InstantChrome |
| أمان | 8/10 | التشفير المحلي كما هو. leftover لا يُسمَّ فوق unread. بذر E2E لم يعد يضع نصاً صريحاً في IndexedDB |
| جودة | 9/10 | embed / session / handoff / كاش العرض مفصولة ومختبرة |
| موبايل | 7.5/10 | 44px / safe-area / dvh. Escape/Cap على الصدفة. لا جهاز |
| صدق | 9/10 | البذر أُغلق. شجرتان في RAM وkeep-alive وTTFI هاتف معلنة كحدود قدرة |

---

## الحدود (ما توقّفنا عنده ولماذا)

| الحد | السبب |
|------|--------|
| شجرتان في RAM حتى يستقر الجسم | keep-alive Host بعد الرجوع **عمداً**. الظاهر كروم واحد. بعد التسليم قائمة الصدفة تُفكّ؛ الرأس/الأسبوع/الإضافة يبقون |
| بطاقة الصدفة أخف من EventCard | بلا صف أيقونات تعديل/حذف للحي. بعد التسليم القائمة الحية تحلّ محلها — وهذا ما يقيسه E2E بعد `data-handoff=1` |
| `lawyerCalendarCloud` / hop مزدوج / AES محلي | سياسة سابقة — ليست نقص كروم |
| Playwright على `npm run dev` | يحتاج `build:e2e` + preview لتجاوز بوابة الدخول |
| TTFI هاتف | لا جهاز في الجلسة. E2E سطح المكتب يسجّل open-request → interactive |

---

## الموقع

جاهز للانتقال إلى قسم آخر: **نعم** — التوحيد ومسار البذر داخل التقويم مغلقان بما يمكن الآن.

---

## المصداقية — ما لم يُنفَّذ

- دمج hop التحميل السحابي أو إلغاء التشفير المحلي  
- إخراج Host من RAM فوراً بعد مغادرة التقويم (الإفلات الخامل يبقى 3–10 دقائق)  
- قياس TTFI على Android/iOS  
- pentest / حملة wife:full  
