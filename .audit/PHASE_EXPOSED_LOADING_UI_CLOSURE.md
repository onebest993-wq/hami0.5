# واجهات التحميل المكشوفة — إغلاق صادق

> **تذييل ٣٠ آب ٢٠٢٦ (لاحق):** مساحة الدعاوى على OverlayHosts لم تعد `fallback={null}` للفتح المرئي — غطاء preload-aware في `PHASE_REMAINING_AFTER_CHROME_SURFACES_CLOSURE.md`. شبكة الأرشيف الحيّة أثناء فك التشفير صُمِتت في `PHASE_LAWSUIT_GRID_HYDRATE_AND_FORUM_ACTIONS_CLOSURE.md`. حدود هذا الملف تصف لحظة إغلاق السبب ٩ فقط.

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** السبب التاسع فقط — Suspense و`LawyerLazyFallback` («جاري التحميل») بدل غطاء InstantPaint على مسارات فتح الأقسام.  
**سابق:** تقسيم، حجم، تحليل، بيانات، تأخير، خفيف، شبكة، نية DEV.  
**ليس نطاقاً:** أقسام داخل القسم كسولة بعد أن يُرسم الهيكل (سبب ١٠)، تغيير ألوان/خطوط، دمج الحزمة.

## القرار

لا شاشة نص «جاري التحميل» عند فتح القسم. إن علّقت الكِسرة يُرسم **InstantPaint الموجود أصلاً** (هيكل الرأس + فتحات صامتة أو طلاء DOM). النية/الـ preload-aware تبقى. لا تصميم جديد. لا دمج في الإقلاع.

## ما أُنجز

- الجزائي: `CriminalDashboardInstantPaintCover` على OverlayHosts (إطار BootChrome فوري). البوابة الداخلية تستخدم نفس الإطار. بلا lazy متداخل و`fallback={null}`.
- البحث: `GlobalSearchOverlaySuspenseCover` — إن اكتمل preload يُرسم الغطاء؛ وإلا طلاء DOM.
- المنتدى / المعاملات / المستودع: أغلفة DOM InstantPaint كـ Suspense fallback. استيراد `ForumInstantPaintCover` على OverlayHosts (كان JSX بلا import).
- دعوى جديدة: هيكل صامت (`NewCaseInstantPaintSlots`) بدل سبينر؛ غطاء على OverlayHosts (`lawyer-new-case-overlay-paint-cover` حتى لا يتكرر testid الصدفة).
- إنشاء تنفيذ: `ExecutionCreationBootShell` كغطاء OverlayHosts.
- أرشيف غير التنفيذ: `ArchiveHubInstantShell` بلا جملة «جاري فتح».
- مهام الميدان: OverlayHosts يعرض `FieldTasksSheetOpenInstantChrome` أو `TasksManagerOpenInstantChrome`؛ داخل الـ Entry الأجندة لم تعد `fallback={null}`.
- `LawyerLazyFallback` ميت (`null`) — بلا نص تحميل (الملف باقٍ لصدق الإعدادات).
- تسخين الجزائي يستدعي `LazyCriminalDashboardBootChrome.preload`.
- طلب مستعجل: هيكل صامت بدل بطاقة تحميل نصية.

## التقييم

| البُعد | الدرجة | ملاحظة |
|---|-----|----|
| أداء | ٨ / ١٠ | أول إطار فتح = هيكل القسم لا فراغ/سبينر على المسارات الحية |
| نظافة | ٨ / ١٠ | إطار جزائي واحد؛ LawyerLazyFallback بلا UI ميت |
| أمان | ٩ / ١٠ | بلا توسيع شبكة؛ الأغطية محلية |
| جودة كود | ٨ / ١٠ | نمط واحد: Cover على OverlayHosts |
| موبايل | ٨ / ١٠ | أزرار ٤٤px في الأغطية الموجودة؛ safe-area كما كان |
| صدق | ٩ / ١٠ | دعاوى OverlayHosts ما زالت `null` لأن الفتح ينتظر المقطع؛ داخل القسم بقي نص تحميل |

## الحدود

- مساحة الدعاوى: `fallback={null}` على OverlayHosts — `loadLawsuitsOverlayEntry` قبل `show`. InstantChrome داخل الـ Entry (`LawsuitsWorkspaceInstantChrome`). صدق الجذع يمنع استيراد ذلك الكروم على سطح MainView.
- شريط التوحيد (نادر): `fallback={null}`.
- الإعدادات/الإشعارات: طلاء DOM قبل التركيب؛ بوابة الإعدادات تبقى `fallback={null}` عمداً (بلا SettingsInstantShell — حُذف).
- داخل القسم بعد الهيكل: «تحميل المزيد» في المنتدى، `DossierOpeningFallback`، مسجّل الصوت، استوديو الخلفية، تبويبات جزائية داخلية — سبب ١٠.
- `aria-label` على بعض بوابات النماذج ما زال «جاري فتح النموذج» (رادار) — ليست بوابة القسم.

## الموقع

جاهز للانتقال إلى السبب التالي: **نعم** — السبب ١٠ (أقسام داخل القسم تُركَّب كسلاً).

## المصداقية

لم يُدَّعَ أن كل `fallback={null}` اختفى. لم يُغيَّر شكل InstantPaint الموجود. لم تُدمج كِسَر BootChrome في الإقلاع كاستيراد ساكن لـ `CriminalDashboardBootChrome` من OverlayHosts. لم تُشغَّل اختبارات المتصفح هنا — الصدق عبر Vitest على المسارات.
