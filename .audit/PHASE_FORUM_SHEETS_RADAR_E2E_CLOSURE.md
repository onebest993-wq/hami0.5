# أوراق المنتدى وبوابة الرادار وPlaywright/TTFI — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** المتبقي من إغلاق بوابة الجلسة: أوراق نشر/تعليق/بحث/ملف/مستودع المنتدى، نسخة «جاري» في كروم الرادار، تشغيل Playwright للمنتدى، قياس TTFI بما هو متاح.  
**ليس نطاقاً:** دمج حزمة الإقلاع، استيراد `SmartLegalRadar` إلى `schedule/`، قياس هاتف في اليد، استبدال `fallback={null}` في بوابة الرادار بعظام فوق قائمة اليوم.

## القرار

أوراق المنتدى الباردة: InstantPaint من ثيم الورقة الحي (`FORUM_PANEL` / `FORUM_SHEET` / `FORUM_MODAL`) بلا جملة «جاري» وبلا `Loader2`.  
بوابة الرادار: InstantChrome **هو** الصفحة؛ `fallback={null}` يبقى حتى لا تُستبدل قائمة اليوم أثناء تعليق الجسم الحي. نُسخت «جاري تجهيز التفاصيل» إلى «رادار المواعيد» في `sr-only`.

## ما أُنجز

- `ForumOverlayInstantCovers.tsx`: أغلفة نشر، تعليق، مجموعة، تعديل، بحث، ملف، مودال المستودع — 44px، safe-area، إغلاق بالخلفية.
- `CommunityScreenComposeOverlays` / `BrowseOverlays` / `LegalRepositoryModals`: بلا `fallback={null}`.
- ملف الزميل: `ForumProfileOverlayBodySlots` بدل `ProfileLoadingState` (حُذف كميت).
- `RadarOpenInstantChrome`: بلا «جاري»؛ `schedule-tab-loading` يبقى. `ScheduleRadarPaintGate` يوثّق أن الكروم هو الصفحة.
- اختبار بوابة الرادار يزرع كاش التقويم حتى يُرفع `data-handoff` بعد استقرار اللقطة.
- E2E: أوراق البحث/النشر/التعليق لا تحتوي «جاري» إن ظهرت.
- Playwright (حزمة `build:e2e` + preview `:8090`): 4/4 — فتح من الرئيسية، طرح استشارة، تعليقات، زمن تفاعل (`hami:forum:*`). ضد `npm run dev` تظهر بوابة تسجيل الدخول كما هو متوقع.
- TTFI إقلاع: محاكاة Pixel 7 عبر Playwright على حزمة E2E (`VITE_SHELL_AUTH_OPEN` / `data-hami-demo-boot`) — **ليس** هاتفاً ولا عقد إنتاج. `dashboard-interactive` **256 ms**، FCP **64 ms** (`perf-reports/e2e-bundle-pixel7.json`).

## التقييم

| البُعد | الدرجة | ملاحظة |
|---|-----|----|
| أداء | ٨ / ١٠ | أغلفة الأوراق في مقطع المنتدى لا الجذع؛ TTFI المختبر سريع على سطح المكتب |
| نظافة | ٨ / ١٠ | أوراق المنتدى المدرجة بلا `null`؛ `ProfileLoadingState` الميت حُذف |
| أمان | ٩ / ١٠ | بلا توسيع شبكة؛ البوابة عبر `getForumOverlayPortalRoot` |
| جودة كود | ٨ / ١٠ | أغلفة مسمّاة؛ عزل الرادار عن `SmartLegalRadar` بقي |
| موبايل | ٨ / ١٠ | 44px وsafe-area على الأغطية؛ لم يُقَس جهاز |
| صدق | ٩ / ١٠ | Playwright على preview E2E نجح؛ TTFI محاكى لا جهاز |

## الحدود

- `ScheduleRadarPaintGate` يبقى `fallback={null}` عمداً (InstantChrome هو الغطاء).
- `RequestMarginAddButton` / مودال الهامش ما زالا `null`.
- `LawsuitArchiveChrome` ما زال فيه مسار `fallback={null}` غير شبكة الملف.
- `LawyerDashboardMainView` ما زال يلف تبويبات/إشعارات بـ `fallback={null}`.
- معاينة المستودع الحية قد تُظهر `animate-spin` بعد تركيب المقطع (ليس غطاء Suspense).
- Playwright الكامل (`test:e2e:forum` بلا grep) لم يُشغَّل كله هنا.
- TTFI: لا CPU throttle، لا شبكة بطيئة، لا Capacitor، لا إنتاج بدون shell-auth المفتوح.

## الموقع

جاهز للانتقال: **نعم** — ضمن هذه الثلاثة. ليست «كل `fallback={null}` في التطبيق اختفت».

## المصداقية

لم يُستورد `LawsuitsWorkspaceInstantChrome` على MainView. لم يُستورد `SmartLegalRadar` من `schedule/`. لم تُدمج كِسَر الإقلاع. الصدق: Vitest (`forumGateUrgentMediaHonesty` + صدق الجدول) وPlaywright preview.
