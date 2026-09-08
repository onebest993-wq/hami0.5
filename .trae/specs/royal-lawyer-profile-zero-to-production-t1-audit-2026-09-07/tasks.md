# Hami Royal Lawyer Profile Tier-1 — Implementation Plan (10 Tasks تسلسلية)

## Task 1: فحص وتصحيح profileShellOpenFlow + useProfileLifecycle — نمط Session Guard 3-أجزاء
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة كاملة لسطر بسطر لـ: `profileShellOpenFlow.ts` + `profileOpenSession.ts` + `useProfileLifecycle.ts` (الهوك) + `profileLazyImports.ts` + `warmBootLawyerProfile.ts`.
  - التحقق من نمط Session Guard 3-أجزاء في كل فلو/هوك:
    1. file-level `let profileSessionIdCounter = 0;` قبل الهوك/الفلو.
    2. `sessionIdRef` + `activeSessionIdRef` داخل الهوك/الفلو.
    3. حارس أول سطر في ≥ 5 async closures (cloud loader.then → warm cache callback → idle release timeout → avatar prime decode → lazy import chunk.then).
  - في حال غياب أي جزء: إضافة الحارس جراحيًا مع الحفاظ على ZVF 100%.
  - في حال وجود خلل في تصفير activeSessionIdRef (مثل مشكلة الإشعارات السابقة: تم وضعه في cleanup العام بدلاً من return-cleanup): تصحيح الموضع جراحيًا.
  - إضافة/تحديث حالة اختبار "3 مرات إعادة فتح متتالية سريعة عبر unmount/mount جديد → تقرير أداء واحد فقط للجلسة الأخيرة" إن لم تكن موجودة.
  - اختبار سيناريو زائر (Visitor Overlay) + Owner tab في نفس الجلسة → لا تداخل في session IDs.
- **Acceptance Criteria Addressed**: AC-1, AC-12
- **Test Requirements**:
  - `rule` TR-1.1: `npx vitest run src/app/hooks/lawyerDashboard/profile/__tests__/profileShellOpenFlow.test.ts src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileLifecycle.test.ts src/app/hooks/lawyerDashboard/profile/__tests__/profileOpenSession.test.ts src/app/services/profile/__tests__/warmBootLawyerProfile.test.ts` → exit 0.
  - `rule` TR-1.2: grep `profileSessionIdCounter` في الملفات الأربعة أعلاه = ≥ 2 نتيجة (file-level).
  - `rule` TR-1.3: عدد مناطق guard (sessionId === activeSessionIdRef.current) داخل async closures ≥ 5 في المجموع الكلي.
  - `rule` TR-1.4: اختبار "Visitor Overlay + Owner Tab في نفس الجلسة" يمر exit 0 إن وجد.
  - `rubric` TR-1.5: وضوح دورة الحياة في 4 ملفات؛ مقياس 1-5 كـ AC-12؛ عتبة ≥ 4؛ أدلة = قراءة الملفات + نتائج الاختبار.

## Task 2: فحص profileShellCloseFlow + profileShellExit — 7 مبادئ إغلاق جراحي (Idle Release + Studio Draft Reset + blur + non-passive cleanup)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - قراءة سطر بسطر لـ: `profileShellCloseFlow.ts` + `profileShellExit.ts` + `profileHostIdleRelease.ts` + `profileSaveTimeout.ts` + `profileSaveQueue.ts`.
  - توثيق Gaps إن وجدت في 7 مبادئ الإغلاق:
    1. Cancel Save Queue Polling + Media Upload via AbortController.
    2. Unsubscribe Gallery Viewer + Hero Tilt + Drag Session observers.
    3. Blur Studio Editors + inputs + تصفير Draft Query refs (window transients).
    4. Cancel Custom Blocks Drag Session → **remove non-passive touch listeners** (importante: منع تسريب الذاكرة/الإصبع بعد الإغلاق).
    5. Release Idle Resources → Canvas 2D/Offscreen contexts + FX Chunk decoder refs.
    6. Reset profileEditDraft + save timeout + retry queues.
    7. Snap DOM via `profileShellSnap` data-* closing flag + clear overlay enter settle.
  - إنشاء/تحديث دالة `tearDownProfileFloatingState()` مشابهة للإشعارات داخل `profileShellExit.ts` لتضمين: blur focusables + reset transient draft refs + remove custom blocks non-passive listeners. مستدعاة ≥ 6 مرات (أول exit + كل early return + داخل finish() قبل onDone).
  - في حال وجود gaps: إصلاح جراحي.
- **Acceptance Criteria Addressed**: AC-2, AC-12
- **Test Requirements**:
  - `rule` TR-2.1: `npx vitest run src/app/hooks/lawyerDashboard/profile/__tests__/profileShellExit.test.ts src/app/hooks/lawyerDashboard/profile/__tests__/profileShellCloseFlow.test.ts src/app/hooks/lawyerDashboard/profile/__tests__/profileHostIdleRelease.test.ts src/app/services/profile/__tests__/profileSaveQueue.test.ts src/app/services/profile/__tests__/profileSaveTimeout.test.ts src/app/runtime/__tests__/profileSectionSurgicalCloseHonesty.test.ts` → exit 0 (جميع 6 ملفات).
  - `rule` TR-2.2: عدد مبادئ الإغلاق المغطاة = ≥ 7 مبادئ (grep لكل مبدأ).
  - `rule` TR-2.3: دالة `tearDownProfileFloatingState` إن وجدت أو بديلها في exit → مستدعاة ≥ 5 مرات.
  - `rule` TR-2.4: إزالة non-passive listeners مؤكدة في cleanup داخل custom blocks drag.
  - `rubric` TR-2.5: وضوح دورة الإغلاق + Idle Release؛ مقياس 1-5 كـ AC-12؛ عتبة ≥ 4.

## Task 3: فحص profilePerfMetrics + Budget + latestPerfMark + 2 null scenarios + restoreAllMocks
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (متوازي مع Task 2 إن أمكن)
- **Description**:
  - قراءة `profilePerfMetrics.ts` → التأكد من أن `getLatestInteractive()` تستخدم `entries[entries.length - 1]` وليس `[0]`.
  - قراءة `profilePerfBudget.ts` → توثيق thresholds (WONTFIX إن كانت ضمن معايير Tier-1؛ target ≤ 2200ms, ciColdMax ≤ 6000ms قياسية).
  - قراءة `profilePerfMetrics.test.ts` + `profilePerfBudget.test.ts` → التحقق من:
    1. `beforeEach` يستدعي `vi.restoreAllMocks()` بالإضافة إلى `vi.clearAllMocks()` (منع spy leak).
    2. اختبار الحالة "لا علامات interactive موجودة → تعيد null" موجود.
    3. اختبار "بعد clearProfilePerfMarks → تعيد null" موجود.
  - إن غابت أي حالة: إضافتها جراحيًا.
  - قراءة `profileIntentWarm.test.ts` → التأكد من عدم تداخل علامات الأداء بين warm intent والجلسة الفعلية.
- **Acceptance Criteria Addressed**: AC-3, AC-12
- **Test Requirements**:
  - `rule` TR-3.1: `npx vitest run src/app/services/profile/__tests__/profilePerfMetrics.test.ts src/app/services/profile/__tests__/profilePerfBudget.test.ts src/app/hooks/lawyerDashboard/__tests__/profileIntentWarm.test.ts` → exit 0.
  - `rule` TR-3.2: `getLatestInteractive` في الملف يقرأ `entries.length - 1` (grep + Read تأكيد).
  - `rule` TR-3.3: `beforeEach` في الاختبار يحتوي على `vi.restoreAllMocks()`.
  - `rule` TR-3.4: ≥ 2 حالات اختبار للـ null scenario مستوفاة.
  - `rule` TR-3.5: thresholds في Budget مُوثقة (WONTFIX إن كانت معقولة).

## Task 4: فحص الأمن — 0 supabase.from في 3 جذور + 5 طبقات Access Control (Visitor/Owner/Privacy/Write/Upload)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - تنفيذ grep دقيق `supabase\.from\(` على 5 جذور إنتاجية للملف الشخصي (غير __tests__ وغير *.server.ts):
    1. `src/app/components/lawyer/RoyalLawyerProfile/**/*.{ts,tsx}`
    2. `src/app/services/profile/**/*.{ts,tsx}` (غير .server.ts)
    3. `src/app/hooks/lawyerDashboard/profile/**/*.{ts,tsx}`
    4. `src/app/components/lawyer/dashboard/profile/**/*.{ts,tsx}` + `LawyerDashboardProfileTab.tsx`
    5. `src/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay.tsx` + `ForumTileProfileQuarter.tsx`
  - التأكيد على أن جميع الوصولات تمر عبر BFF عبر `SecureAPIClient` أو `profileCloudLoader` الموجهة عبر `/api/profile/*`.
  - قراءة 5 طبقات الوصول + توثيق وجودها:
    1. `filterActionsForVisitor` → no edit buttons in visitor view.
    2. `profileWriteGuard` → cross-user write block.
    3. `profilePrivacyVisibility` → section filter based on customization.
    4. `buildProfileEditPersistPayload` → allowed keys only whitelist.
    5. `profileBlockUploadFlow` → MIME check + size cap + path traversal block (`../`).
- **Acceptance Criteria Addressed**: AC-4, AC-6, AC-13
- **Test Requirements**:
  - `rule` TR-4.1: grep `supabase\.from\(` count = 0 بالضبط في 5 جذور الإنتاج (غير الاختبارات وغير .server.ts).
  - `rule` TR-4.2: تشغيل اختبارات الأمن الرسمية: `npx vitest run src/app/services/profile/__tests__/filterActionsForVisitor.test.ts src/app/services/profile/__tests__/profileWriteGuard.test.ts src/app/services/profile/__tests__/profilePrivacyVisibility.test.ts src/app/services/profile/__tests__/profileMediaUploadSecurity.test.ts src/app/hooks/lawyerDashboard/RoyalLawyerProfile/hooks/__tests__/useProfilePageAccess.test.ts src/app/services/profile/__tests__/profilePageAccess.test.ts src/app/services/profile/__tests__/profileCloudViewerScope.test.ts` → exit 0.
  - `rule` TR-4.3: ≥ 5 طبقات Access Control مستوفاة.
  - `rubric` TR-4.4: قوة الأمن والوصول؛ مقياس 1-5 كـ AC-13؛ عتبة ≥ 4.

## Task 5: فحص XSS Defense-in-depth — URL Sanitize + Contact Input + Sanitizer + Orphan GC Paths
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - قراءة سطر بسطر لـ: `profileUrlSanitize.ts` + `profileContactInputSecurity.ts` + `profileSanitizer.ts` + `editDraftMediaPaths.ts` + `gcProfileEditOrphanMedia.ts`.
  - توثيق Gaps إن وجدت:
    1. `profileUrlSanitize`: تحظر `javascript:` scheme + `data:` non-image + URLs >2048 chars.
    2. `profileContactInputSecurity`: تزيل HTML tags explicit regex `</>` before storage.
    3. `profileSanitizer`: تزيل null chars `\u0000` + clamp text length.
    4. `editDraftMediaPaths`: تحظر `../` path traversal + مسارات آمنة فقط.
    5. `gcProfileEditOrphanMedia`: ينظف الملفات التي لم يتم حفظها بعد X دقائق (منع تسريب disk).
  - إن وجد gap في explicit HTML strip regex → إضافته جراحيًا مثل الإشعارات داخل clamp أو sanitize function (defense-in-depth حتى لو كان React auto-escapes output).
- **Acceptance Criteria Addressed**: AC-5, AC-13
- **Test Requirements**:
  - `rule` TR-5.1: `npx vitest run src/app/services/profile/__tests__/profileUrlSanitize.test.ts src/app/services/profile/__tests__/profileContactInputSecurity.test.ts src/app/services/profile/__tests__/profileSanitizer.test.ts src/app/services/profile/__tests__/editDraftMediaPaths.test.ts src/app/services/profile/__tests__/gcProfileEditOrphanMedia.test.ts src/app/hooks/lawyerDashboard/RoyalLawyerProfile/hooks/__tests__/profileBlockUploadTarget.test.ts` → exit 0.
  - `rule` TR-5.2: ≥ 5 سيناريوهات sanitize/path مستوفاة في الكود.
  - `rule` TR-5.3: explicit HTML tag strip regex `</>` موجود على الأقل في دالة تنظيف نص (defense-in-depth).
  - `rubric` TR-5.4: قوة XSS Defense؛ مقياس 1-5 كـ AC-13؛ عتبة ≥ 4.

## Task 6: جودة الكود — بادئة [profile:opcode] أو [services_profile:opcode] ≥ 95% في كل throw
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - تنفيذ grep لعدّ جميع `throw new (Error|TypeError|RangeError|DOMException)` في جذور القسم الإنتاجية (غير الاختبارات).
  - تنفيذ grep فرعي لعدّ ما يحتوي على البادئة: `\[profile:|\[services_profile:|\[profile_`.
  - استبعاد من الحساب: (أ) React Context invariant (`must be used within Provider`) → WONTFIX، (ب) DOMException('Aborted', 'AbortError') → WONTFIX (الاسم ثابت للـ catch)، (ج) أخطاء من مكتبات خارجية import محض.
  - حساب النسبة (البادئة / الإجمالي المنطقي للملف الشخصي). إن كانت < 95%: إضافة البادئة لجميع throw statements الناقصة جراحيًا مع الحفاظ على رسالة الخطأ الأصلية كافية للتشخيص.
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-6.1: (عدد throw مع البادئة / عدد throw المنطقي) ≥ 0.95.
  - `rule` TR-6.2: لا يوجد أي استثناء منطقي للملف الشخصي (غير Context/AbortError) بدون بادئة (grep تأكيد).
  - `rule` TR-6.3: بعد التعديل، تشغيل حزمة اختبارات سريعة 3 ملفات للتأكد من عدم كسر أي خطأ متوقع: `npx vitest run src/app/services/profile/__tests__/profileWriteGuard.test.ts src/app/services/profile/__tests__/profileCloudReconcile.test.ts src/app/services/profile/__tests__/profileMediaUploadSecurity.test.ts` → exit 0.

## Task 7: النظافة — Honesty Tests ≥ 90% + Console.log = 0 + 1st GetDiagnostics (mid-run)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - اكتشاف جميع اختبارات Honesty الرسمية: `RoyalLawyerProfile/__tests__/*Honesty*.test.*` + أي ملفات تحتوي على كلمة Honesty في المسارات المرتبطة بالملف الشخصي.
  - تشغيل جميعها عبر vitest run → حساب نسبة Pass. إن < 90%: تشخيص سبب الفشل + إصلاح جراحي إن كان في كود الإنتاج (لا تعديل أسس الاختبارات إلا إذا كان خللاً واضحًا في الـ spy typing مثل مشاكل الأنواع السابقة).
  - grep نهائي لـ `console\.(log|debug|info|warn|error|trace|dir)` على جميع جذور الإنتاجية للملف الشخصي (غير الاختبارات) → عدد = 0. إن وجدت نتائج: إزالتها أو إحالتها إلى Sentry الرسمي `profileSentryReporting` إن وجد (غير console.log العارية).
  - grep `debugger;` → عدد = 0.
  - **إلزامي من المستخدم**: تشغيل `GetDiagnostics` الأول (mid-run). إن لم يكن `[]`: إصلاح جميع الأخطاء TypeScript بشكل جراحي داخل نطاق القسم أولاً، ثم خارج نطاق القسم إن كانت متبقية من أقسام سابقة لم تصلح (نفس أسلوب قسم الإشعارات — التعديلات الأنواعية فقط vi.fn generic / literal widening / Timeout→number). بعد الإصلاحات، إعادة تشغيل GetDiagnostics حتى = [].
- **Acceptance Criteria Addressed**: AC-8, AC-14
- **Test Requirements**:
  - `rule` TR-7.1: ≥ 90% من جميع اختبارات Honesty الرسمية PASSED.
  - `rule` TR-7.2: grep console.log/debugger/info/warn/error في جذور الإنتاج = 0 results.
  - `rule` TR-7.3: بعد الإصلاحات الأنواعية إن لزم، GetDiagnostics الأول = `[]`.
  - `rubric` TR-7.4: صدق الإغلاق — Console Clean + Diagnostics=0؛ مقياس 1-5 كـ AC-14؛ عتبة ≥ 4.

## Task 8: استعداد الموبايل — CSS×4 (safe-area / touch / overscroll / contain) + EscapeStack 3-طبقات + MobileSuspend + Non-passive Drag Cleanup
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - اكتشاف جميع ملفات CSS للملف الشخصي (15+ ملف) + grep خصائص الأربعة:
    1. `safe-area-inset-{top,bottom,left,right}` → 4 جهات موجودة.
    2. `touch-action: manipulation` أو `touch-action: none` أو tailwind `touch-pan-y` في أزرار/بطاقات/مطاطة سحب الكتل.
    3. `overscroll-behavior: contain` أو `none` أو `overscroll-none` في مناطق التمرير (منع scroll chaining).
    4. `contain: layout style` أو `contain: paint` أو `contain: strict` في بطاقات/طبقات/الـ canvas backgrounds.
  - قراءة Escape Stack: `useProfileScreenEscape.ts` + `useProfileSettingsFocusTrap.ts` + `useProfileGalleryViewerFocusTrap.ts` → التأكد من 3 طبقات: Gallery Viewer زر Escape → أغلق Gallery → بعدها Escape → أغلق Settings Sheet → بعدها Escape → أغلق الصفحة/الواجهة.
  - قراءة `useProfileTabMobileSuspend.ts` + `useNonPassiveTouchPrevent.ts` + `useProfileCustomBlocksDrag.ts` → التأكد من: (أ) Suspend يوقف Save Queue + Media Uploads عند الخلفية، (ب) non-passive listeners لإزالتها فور cleanup في drag session (لا تسرب بعد الإغلاق).
  - إن وجد gaps جراحية صغيرة (مثل إضافة `safe-area-inset-top` في هيدر الورقة أو تحسين زوج escape guard): إصلاحها.
- **Acceptance Criteria Addressed**: AC-9, AC-14
- **Test Requirements**:
  - `rule` TR-8.1: `npx vitest run src/app/components/lawyer/RoyalLawyerProfile/__tests__/profileAndroidTouchHonesty.test.ts src/app/components/lawyer/RoyalLawyerProfile/__tests__/profileMobileTabletLayout.test.ts src/app/components/lawyer/RoyalLawyerProfile/__tests__/lawyerProfileFx-android.test.ts src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileScreenEscape.test.ts src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileSettingsFocusTrap.test.ts src/app/components/lawyer/RoyalLawyerProfile/components/__tests__/ProfileGalleryViewer.escape.test.tsx` → exit 0.
  - `rule` TR-8.2: 4 خصائص CSS موجودة جميعها (grep تأكيد لكل خاصية).
  - `rule` TR-8.3: Escape Stack 3 طبقات مؤكدة في السيناريوهات.
  - `rule` TR-8.4: Mobile Suspend listeners + non-passive drag cleanup مؤكدة.

## Task 9: تشغيل بوابة الإنتاج الرسمية node scripts/profile-production-gate.mjs — exit 0 PASSED + Console نظيف
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 7, 8 (الاثنان مكتملان قبل تشغيل البوابة)
- **Description**:
  - تشغيل فعلي لبوابة الإنتاج: `node scripts/profile-production-gate.mjs` ومراقبة stdout/stderr بدقة.
  - التأكيد على:
    (أ) exit code 0.
    (ب) آخر سطر = `PASSED`.
    (ج) جميع 37 criticalPaths موجودة (لا أي fail).
    (د) PROFILE_SHADOW_STUB (`RoyalLawyerProfile.tsx` بجانب مجلد نفس الاسم) غير موجود — security bomb check يمر.
    (هـ) stderr لا يحتوي على أي console.warn/error صادرة من كود الإنتاج للملف الشخصي. تحذيرات `act(...)` من testing-library وهمية بيئية فقط مسموحة. أي تحذيرات أخرى من profile code → تشخيص سببها + إصلاح جراحي + إعادة تشغيل البوابة حتى exit 0.
  - في حال فشل أي اختبار داخل البوابة: تشخيص السبب + إصلاح جراحي في كود الإنتاج (لا تعديل أساس الاختبار إلا إذا كان خللاً واضحًا في الأنواع) ثم إعادة تشغيل البوابة حتى exit 0.
- **Acceptance Criteria Addressed**: AC-10, AC-11, AC-14
- **Test Requirements**:
  - `rule` TR-9.1: بوابة الإنتاج `node scripts/profile-production-gate.mjs` → exit code 0 + آخر سطر PASSED.
  - `rule` TR-9.2: stderr لا يحتوي على أي console.warn/error من كود الإنتاج للملف الشخصي (فقط testing-library act hints أو غيرها من بيئة الاختبار العامة).
  - `rule` TR-9.3: Chunk/Fx/Lazy tests ضمن البوابة PASSED (تأكيد على كامل pre-flight).

## Task 10: GetDiagnostics النهائي = [] + Review Phase كتابة review.md → PASS
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 9 (البوابة مكتملة exit 0 أولاً)
- **Description**:
  - **إلزامي من المستخدم**: تشغيل `GetDiagnostics` النهائي على كامل الـ workspace → النتيجة **يجب أن تكون `[]`**. إن لم تكن: إصلاح الأخطاء المتبقية جراحيًا (أنواعية أو غيرها) حتى تصبح فارغة تمامًا.
  - مرحلة مراجعة مستقلة (Review Phase):
    1. استرجاع كل 14 AC من spec.md + جمع الأدلة الرقمية لكل منها (vitest exit codes، grep counts، output الأوامر).
    2. تقييم Rubrics AC-12 (Lifecycle Clarity) + AC-13 (Security Strength) + AC-14 (Closure Honesty) كلها على مقياس 1-5 مع الأساس والمرجع.
    3. كتابة `review.md` رسمي داخل مجلد المواصفات للملف الشخصي يحتوي على:
       - Scope + Standard + ZVF + User Mandate.
       - جدول 14 AC مع نتيجة كل AC (PASS/FAIL) + الأدلة سطر بسطر.
       - Rubric Scores AC-12/13/14 كلها ≥ 4 مع مرجع.
       - ملخص التعديلات الجراحية لكل ملف (جدول رقم / ملف / التعديل / مصدق اختباري).
       - النتيجة النهائية: **PASS** مع ختم "Tier-1 PRODUCTION READY" في حالة تحقق كل الشروط.
       - في حالة وجود مخاطر معقولة متبقية: توثيق WONTFIX مع سبب مقنع فقط إذا لم تكن تؤثر على الإنتاج.
- **Acceptance Criteria Addressed**: AC-8 (الجزء النهائي Diagnostics=[]), AC-14, Overall Pass
- **Test Requirements**:
  - `rule` TR-10.1: GetDiagnostics النهائي → `[]` (صفر أخطاء + صفر تحذيرات).
  - `rule` TR-10.2: ملف review.md منشأ داخل مجلد المواصفات الرسمي ويحتوي على الأدلة لكل 14 AC.
  - `rule` TR-10.3: التقييم النهائي = PASS (14/14 AC مستوفاة + 3 Rubrics جميعها ≥ 4 + بوابة الإنتاج exit 0 + Console نظيف + Diagnostics=[]).
  - `rubric` TR-10.4: صدق وإتقان الإغلاق العام للملف الشخصي؛ مقياس 1-5 كـ AC-14؛ عتبة ≥ 5 (يحقق الحد الأقصى في حال تحقق جميع الشروط المذكورة أعلاه بدون تصنيفات WONTFIX غير مبررة).
