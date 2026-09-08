# Hami Notifications Section — Tier-1 Implementation Plan

## Task 1: فحص وتصحيح useNotificationShellLifecycle — نمط Session Guard
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة كاملة لملف `useNotificationShellLifecycle.ts` سطر بسطر.
  - التحقق من وجود نمط Session Guard 3-أجزاء: (1) file-level `let notificationSessionIdCounter = 0;` قبل الهوك، (2) `sessionIdRef` + `activeSessionIdRef` داخل الهوك، (3) حارس أول سطر في كل async closure (useEffect callbacks، listeners، timers).
  - في حال غياب أي جزء: إضافة الحارس جراحيًا مع الحفاظ على ZVF.
  - إضافة/تحديث حالة اختبار "3 مرات إعادة فتح متتالية سريعة → تقرير أداء واحد فقط للجلسة الأخيرة".
- **Acceptance Criteria Addressed**: AC-1, AC-12
- **Test Requirements**:
  - `rule` TR-1.1: تشغيل `vitest run <ملف اختبار useNotificationShellLifecycle أو بديله الرسمي>` → exit 0.
  - `rule` TR-1.2: grep `notificationSessionIdCounter` في الملف = 1 نتيجة كحد أدنى (file-level).
  - `rule` TR-1.3: grep `activeSessionIdRef.current === sessionId` داخل closures غير متزامنة ≥ 2 نتائج.
  - `rubric` TR-1.4: وضوح دورة الحياة في useNotificationShellLifecycle؛ مقياس 1-5؛ مراسي 1/3/5 كـ AC-12؛ عتبة >= 4؛ أدلة = قراءة الملف + نتائج الاختبار.

## Task 2: فحص useNotificationHostLifecycle + notificationShellOpenFlow — flow guard
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - قراءة كاملة لـ `useNotificationHostLifecycle.ts` + `notificationShellOpenFlow.ts`.
  - التحقق من نمط flow-level dual guard: (1) `let flowSessionIdCounter = 0;` + `flowActiveSessionIdRef` على مستوى ملف الـ flow، (2) زوجي guard (flowId === ref + showPanelRef.current === true) داخل 3 مناطق async على الأقل: (a) queueMicrotask قبل بداية الـ transition، (b) الـ `.then` للـ dynamic import للـ chunk الثقيل، (c) بعد await أي مكالمة sync/setup داخل flow.
  - في حال غياب: إضافة الحارس جراحيًا.
  - إضافة/تحديث اختبار "فتح → إغلاق سريع قبل أن يحمل الـ chunk → لا يُفتح Panel تلقائيًا بسبب stale callback".
- **Acceptance Criteria Addressed**: AC-2, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-2.1: `vitest run src/app/hooks/lawyerDashboard/notifications/__tests__/notificationShellOpenFlow.test.ts` → exit 0.
  - `rule` TR-2.2: grep `flowSessionIdCounter` في notificationShellOpenFlow.ts = ≥ 1.
  - `rule` TR-2.3: عدد مناطق dual guard داخل closures ≥ 3.
  - `rule` TR-2.4: اختبار warm up/chunk prefetch في AC-11 يمر.

## Task 3: فحص notificationPerfMetrics + Budget — latest mark
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (متوازي مع Task 2 بامكان)
- **Description**:
  - قراءة `notificationPerfMetrics.ts` للتحقق من أن `getLatestInteractive()` تستخدم `entries[entries.length - 1]` وليس `[0]`.
  - قراءة `notificationPerfMetrics.test.ts` للتحقق من أن `beforeEach` يستدعي `vi.restoreAllMocks()` بالإضافة إلى `vi.clearAllMocks()` (لتجنب تسريب spy إلى حالات لاحقة).
  - إضافة حالتي اختبار جديدتين إن لم توجدا: (أ) "لا توجد علامات interactive → تعيد null". (ب) "بعد استدعاء clearNotificationPerfMarks → تعيد null".
  - قراءة `notificationPerfBudget.ts` وتوثيق thresholds (WONTFIX إذا كانت معقولة، لا تغيير).
- **Acceptance Criteria Addressed**: AC-3, AC-12
- **Test Requirements**:
  - `rule` TR-3.1: `vitest run src/app/services/notifications/__tests__/notificationPerfMetrics.test.ts` → exit 0.
  - `rule` TR-3.2: `getLatestInteractive` في الملف يقرأ `entries.length - 1` (grep + Read تأكيد).
  - `rule` TR-3.3: `beforeEach` في الاختبار يحتوي على `vi.restoreAllMocks()`.
  - `rule` TR-3.4: ≥ 2 حالات اختبار للـ null scenario مستوفاة.

## Task 4: فحص الإغلاق الجراحي — cancel background sync + keep-alive + blur + clear refs
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - قراءة سطر بسطر لـ: `notificationShellExit.ts` + `useNotificationHostLifecycle.ts cleanup` + `useNotificationStoreSync.ts unsubscribe` + `notificationPanelListLive.ts cancelKeepAlive` + `useNotificationBackgroundSync.ts abort`.
  - توثيق Gaps إن وجدت في مبادئ الإغلاق الستة: (1) cancel BackgroundSync polling (AbortController)، (2) cancel Keep-Alive List Live subscription، (3) blur activeElement داخل .ntf-panel، (4) snap DOM via data-ntf-closing + clearOverlayEnterSettle، (5) تصفير reportedPerfRef + transient draft refs، (6) تصفير timers + hushed listeners.
  - إصلاح أي gaps جراحيًا.
  - إنشاء/تحديث دالة `tearDownNotificationFloatingState()` مشابهة لقسم البحث داخل beginNotificationShellExit لتضمين blur + clear.
- **Acceptance Criteria Addressed**: AC-4, AC-12
- **Test Requirements**:
  - `rule` TR-4.1: `vitest run notificationShellExit.test.ts notificationPanelListLive.test.ts notificationHostKeepAlive.test.ts notificationsSectionSurgicalCloseHonesty.test.ts` → exit 0 (كلها 4 ملفات).
  - `rule` TR-4.2: عدد مبادئ الإغلاق المغطاة = ≥ 6 مبادئ (grep لكل مبدأ).
  - `rule` TR-4.3: دالة tearDownNotificationFloatingState موجودة ومستدعاة مرتين على الأقل (قبل transition + في settle/finish).
  - `rubric` TR-4.4: وضوح دورة الإغلاق؛ مقياس 1-5 كـ AC-12؛ عتبة >= 4.

## Task 5: فحص الواجهات + HTML Escape + Navigate Security + Console Clean
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - قراءة `notificationInboxSanitize.ts` للتحقق من Regex إزالة HTML tags: `<[^>]*>/g`.
  - قراءة `notificationNavigateSecurity.ts` + `notificationOwnedNavigate.ts` للتحقق من 4 مناطق: (1) sanitizeNotificationNavigate، (2) isOwnedXxxId، (3) hasLocalAppSession، (4) clampNotificationLabel قبل SecureStore write.
  - قراءة `NotificationCard.tsx` للتأكد من استخدام `sanitize` قبل عرض title/body.
  - تشغيل grep `console\.(log|warn|error|debug|info)` على جذور الإشعارات الثلاثة (غير الاختبارات)، وتصحيح أي نتائج بحذفها أو إحالتها إلى Sentry logger الرسمي إن وجد.
- **Acceptance Criteria Addressed**: AC-5, AC-13
- **Test Requirements**:
  - `rule` TR-5.1: `vitest run notificationInboxSanitize.test.ts notificationNavigateSecurity.test.ts notificationOwnedNavigate.test.ts NotificationPanelHost.test.ts notificationPanelSecurity.test.ts` → exit 0.
  - `rule` TR-5.2: عدد مناطق Navigate Security ≥ 4.
  - `rule` TR-5.3: grep console.log/warn/error في جذور الإنتاج (غير الاختبارات) = 0 results.
  - `rubric` TR-5.4: قوة تحصين الأمن؛ مقياس 1-5 كـ AC-13؛ عتبة >= 4.

## Task 6: فحص الأمن — grep supabase.from في 3 جذور + Navigate Security
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - تنفيذ أمر grep دقيق على جذور الإشعارات الإنتاجية الثلاثة:
    1. `src/app/components/lawyer/NotificationPanel/**/*.{ts,tsx}` (غير __tests__)
    2. `src/app/services/notifications/**/*.{ts,tsx}` (غير __tests__ و غير *.server.ts)
    3. `src/app/hooks/lawyerDashboard/**/notification*.{ts,tsx}` (غير __tests__)
  - النمط: `supabase\.from\(` مع عدّاد النتائج.
  - التأكيد على أن أي وصول لبيانات الإشعارات في الكلاينت يمر عبر BFF Routes (`/api/notifications/list`، `/api/notifications/append`، `/api/notifications/read-state`، إلخ) الموجودة في criticalPaths لبوابة الإنتاج.
- **Acceptance Criteria Addressed**: AC-6, AC-13
- **Test Requirements**:
  - `rule` TR-6.1: grep `supabase\.from\(` count = 0 بالضبط في 3 جذور الإنتاج (غير الاختبارات وغير .server.ts).
  - `rule` TR-6.2: Navigate Security ≥ 4 مناطق من Task 5 مستوفاة بالفعل (يعتمد على TR-5.2).
  - `rule` TR-6.3: ملفات BFF الثمانية المدرجة في بوابة الإنتاج (L23-L30) موجودة جميعها (يُتحقق ضمنيًا في Task 10 بوابة الإنتاج).

## Task 7: جودة الكود — بادئة [notification:opcode] ≥ 95% في كل throw
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - تنفيذ grep لعدّ جميع `throw new Error|throw new DOMException|throw new XxxError` في جذور الإشعارات الإنتاجية الثلاثة (غير الاختبارات).
  - تنفيذ grep فرعي لعدّ ما تحتوي على البادئة `[notification:opcode]`.
  - استبعاد من الحساب: (أ) React Context invariant (`useXxx must be used within Provider`) — WONTFIX، (ب) DOMException('Aborted', 'AbortError') — WONTFIX لأن اسم الخطأ يجب أن يبقى 'AbortError' ليلتقطه catch الصحيح، (ج) أخطاء من مكتبات خارجية import محض.
  - حساب النسبة (البادئة / الإجمالي المنطقي للإشعارات). إن كانت < 95%: إضافة البادئة لجميع throw statements الناقصة جراحيًا.
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-7.1: (عدد throw مع البادئة / عدد throw المنطقي للإشعارات) ≥ 0.95.
  - `rule` TR-7.2: لا يوجد أي استثناء منطقي للإشعارات (غير Context/AbortError) بدون البادئة (grep تأكيد).

## Task 8: النظافة + Honesty Tests + Console = 0 + Problems/Diagnostics = []
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - تشغيل جميع اختبارات Honesty الرسمية الموجودة تحت `NotificationPanel/__tests__` (تم اكتشاف 10 اختبارات honesty بالفعل).
  - إعادة grep `console\.(log|debugger|info)` على جذور الإنتاج الثلاثة للتأكيد الصفري النهائي.
  - فحص unused imports / dead exports عبر ESLint أو grep يدوي لسطح الملفات الكبيرة.
  - **خطوة إلزامية من المستخدم**: تشغيل `GetDiagnostics` على كامل الـ workspace للتأكد من `#problems_and_diagnostics = []`.
- **Acceptance Criteria Addressed**: AC-8, AC-14
- **Test Requirements**:
  - `rule` TR-8.1: ≥ 9 من 10 اختبارات Honesty PASSED (≥ 90% pass rate).
  - `rule` TR-8.2: grep console.log/debugger في جذور الإنتاج = 0 results (تأكيد نهائي).
  - `rule` TR-8.3: GetDiagnostics() على كامل الـ workspace = `[]` (صفر أخطاء TypeScript + Problems).
  - `rubric` TR-8.4: صدق الإغلاق Console Clean + Problems 0؛ مقياس 1-5 كـ AC-14؛ عتبة >= 4.

## Task 9: استعداد الموبايل + Gestures (safe-area, touch-action, inert, swipe, escape-stack)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8 (قابل للتوازي مع Task 10 في جزء الاختبارات فقط)
- **Description**:
  - قراءة ملفات CSS السبعة للـ NotificationPanel (notificationPanel.css + styles/*.css) والتحقق من وجود:
    - safe-area-inset-{top,bottom,left,right} في 4 جهات على الأقل
    - `touch-action: manipulation` أو `touch-action: none` في الأزرار والبطاقات
    - `overscroll-behavior: contain` أو `none` في منطقة التمرير
    - `contain: layout style` أو `contain: strict` في البطاقات/الطبقات
  - قراءة `notificationEscapeStack.ts` للتأكد من ربط Escape Stack مع لوحة المحامي (يعود Panel إلى خلفية الأقسام الأخرى عند Escape).
  - قراءة `useNotificationMobileSuspend.ts` للتأكد من إيقاف Background Sync عند دخول التطبيق إلى background.
- **Acceptance Criteria Addressed**: AC-9, AC-14
- **Test Requirements**:
  - `rule` TR-9.1: `vitest run notificationEscapeStack.test.ts notificationPanelAndroidFx.test.ts useNotificationMobileSuspend.test.ts notificationsMobileCloseHonesty.test.ts notificationPanelSheetArchitecture.test.ts notificationPanelKeyboardLayout.test.ts` → exit 0.
  - `rule` TR-9.2: 4 خصائص CSS الأعلى موجودة جميعها (grep لكل خاصية).
  - `rule` TR-9.3: useNotificationMobileSuspend يحتوي على `visibilitychange` أو `pause` listener يوقف sync.

## Task 10: بوابة الإنتاج الرسمية للإشعارات exit 0 + GetDiagnostics = []
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 8, 9
- **Description**:
  - تشغيل فعلي لبوابة الإنتاج: `node scripts/notifications-production-gate.mjs` (بدون --live).
  - التأكد من: (أ) exit code 0، (ب) آخر سطر PASSED، (ج) جميع migrations موجودة، (د) جميع API routes موجودة، (هـ) جميع criticalPaths موجودة، (و) جميع env keys موثقة، (ز) جميع اختبارات الإشعارات الرسمية PASSED.
  - إعادة تشغيل `GetDiagnostics` للتأكيد النهائي على صفريّة المشاكل قبل الانتقال لمرحلة Review.
  - تصحيح أي أخطاء نهائية ظهرت أثناء البوابة بشكل جراحي ثم إعادة تشغيلها حتى exit 0.
- **Acceptance Criteria Addressed**: AC-10, AC-11, AC-14
- **Test Requirements**:
  - `rule` TR-10.1: `node scripts/notifications-production-gate.mjs` → exit code 0 + آخر سطر PASSED.
  - `rule` TR-10.2: GetDiagnostics() → `[]`.
  - `rule` TR-10.3: اختبارات Boot Warm Up (Chunk Lazy + Instant Paint) PASSED ضمن بوابة الإنتاج.
  - `rubric` TR-10.4: صدق وإتقان الإغلاق العام؛ مقياس 1-5 كـ AC-14؛ عتبة >= 4.
