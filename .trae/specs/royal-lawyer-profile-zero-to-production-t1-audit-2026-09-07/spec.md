# Hami Royal Lawyer Profile Section — Tier-1 Zero-to-Production Audit PRD

## Overview
- **Summary**: إجراء تدقيق ذري مجهري من الصفر لقسم الملف الشخصي / الملف المهني للمحامي (RoyalLawyerProfile + services/profile + lawyerDashboard/profile shell hooks) وفق أعلى معايير Tier-1 الإنتاجية، مع تكييف كامل مع طبيعة القسم الفريدة (Studio Editor مخصص للنصوص والصور / Custom Blocks قابلة للسحب والإفلات / Gallery Viewer مع Zoom / Canvas Background / Hero Avatar Tilt / Visitor vs Owner Access Dual View / Save Queues / Media Upload Security / Orphan Media GC / Privacy Visibility / Geolocation / Share Text / Idle Resource Release). الالتزام التام بـ ZVF 100% و **Console نظيف 100% + `#problems_and_diagnostics = []` قبل الإغلاق الرسمي**.
- **Purpose**: ضمان جاهزية قسم الملف الشخصي للإنتاج الفعلي مع فحص واختبار كل ميزة بميزة وسطر بسطر، وتصحيح أي ثغرات في دورة الحياة (Open → Warm → Studio Edit → Draft → Save Queue → Gallery → Close + Idle Release)، الأداء، الأمن، جودة الكود، واستعداد الموبايل.
- **Target Users**: مهندسو الإنتاج Hami v10.5-tier1-hardened، وقسم ضمان الجودة، والمحامي (Owner View) + زائر (Visitor View من المنتدى أو حصة الملف).

## Goals
1. تطبيق نمط **Session Guard 3-أجزاء** في جميع هوكات دورة حياة الصدفة للملف الشخصي (open/close/idle release) لمنع ثغرات Stale Closure وتلوث تقارير الأداء بين الجلسات.
2. ضمان دقة مقاييس الأداء (`profilePerfMetrics.getLatestInteractive` = آخر علامة) وعدم وجود تسريب في علامات الـ Performance عند إعادة فتح الصفحة أو الانتقال من/إلى زائر.
3. **إغلاق جراحي احترافي 7-مبادئ** للملف الشخصي عند الخروج/السكون: (1) إيقاف Save Queue polling + Media Upload (AbortController)، (2) إلغاء Gallery Viewer subscriptions + Hero Tilt observers، (3) blur أي input/studio editor focus + تصفير Draft Query refs، (4) reset Custom Blocks drag session، (5) release Idle Resources في `profileHostIdleRelease.ts`، (6) تصفير `profileEditDraft` و save timeout timers، (7) snap DOM عبر `profileShellSnap` + clear overlay enter settle.
4. التأكد من خلو كود الكلاينت من استدعاءات `supabase.from()` المباشرة (نمط WIFE BFF) مع وجود ≥ 5 طبقات Access Control: Visitor View Filter → Owner Only Edit Gates → Privacy Visibility Guard → `profileWriteGuard` → Media Upload Security (MIME/size/orphan path).
5. ضمان تطابق بادئة `[profile:opcode]` (أو `[services_profile:opcode]`) في ≥ 95% من جميع throw statements المنطقية للملف الشخصي.
6. خلو جميع جذور قسم الملف الشخصي الإنتاجية من `console.log` و `debugger` و imports/exports ميتة أو مكررة.
7. اجتياز جميع اختبارات Honesty الرسمية للملف الشخصي (≥ 5 اختبارات على الأقل) بنسبة ≥ 90% Pass.
8. استعداد الموبايل الكامل: safe-area insets 4 جهات، touch-action manipulation/none، overscroll-behavior contain، contain layout style، inert للطبقات الخلفية، Escape Stack 3-طبقات (Gallery Viewer → Settings Sheet → Close Profile)، non-passive touch prevent في Custom Blocks Drag Session، تعليق Media Upload + Save Queue عند Mobile Suspend.
9. تشغيل بوابة الإنتاج الرسمية `scripts/profile-production-gate.mjs` مع **exit code 0 + آخر سطر PASSED + Console نظيف (لا warn/error غير مخطط لها)**.
10. تشغيل **GetDiagnostics على كامل الـ workspace مرتين (متوسط + نهائي)** مع نتيجة `[]` (صفر أخطاء TypeScript + Problems = فارغ تمامًا).

## Non-Goals
1. لا تغيير في DOM الظاهر أو CSS أو السلوك الوظيفي للمستخدم النهائي (ZVF 100% ملزم).
2. لا إعادة تصميم واجهة RoyalLawyerProfile أو تغيير شكل Hero / Studio / Custom Blocks / Gallery / Settings Sheet.
3. لا تعديل في منطق Profile Cloud Server (Supabase/KV migrations) — فقط قراءة وتأكيد الوجود + تحسين دورة حياة الكلاينت.
4. لا تغيير في بنية Edit Draft Schema أو Custom Blocks Mutations — فقط تصفير refs و cleanup و reset و orphan GC.

## Background & Context
- تم إغلاق 3 أقسام سابقة بنفس نموذج Tier-1 Zero-to-Production: الإعدادات (539 اختبار PASS) + البحث (258 اختبار PASS) + الإشعارات (373 اختبار PASS). جميعها مع `GetDiagnostics=[]` نهائي + Console نظيف.
- طبيعة الملف الشخصي فريدة تختلف عن الأقسام السابقة: **Dual View (Owner / Visitor)** مع gates مزدوجة في كل ميزة؛ Studio Editor مخصص مع text/image blocks + inline styling + Canvas Background 8-tap Reveal effects + Petal/Stardust/MistSwipe visual FX؛ Save Queue مع timeout + optimistic UI + draft sync؛ Media Upload مع MIME/size/orphan gc + transient paths؛ Gallery Viewer مع focus trap + zoom commit؛ Hero Avatar 3D tilt + floating portrait؛ Access Control 5 طبقات (visitor/owner/privacy/write/upload)؛ Idle Resource Release بعد 30 ثانية من السكون لخفض استهلاك الذاكرة في الأجهزة الضعيفة؛ Forum Tile Profile Quarter + Forum Member Profile Overlay.
- بوابة الإنتاج الرسمية موجودة بالفعل: `scripts/profile-production-gate.mjs` تشغّل criticalPaths 37 مسارًا رسميًا + اختبارات الوحدة الرسمية + pre-flight shadow stub anti-bomb check + `PROFILE_SHADOW_STUB` safety check.
- القيود الملزمة من المستخدم (VERBATIM): "الى الملف الشخصي او ملف المحامي وبنفس الشروط والصرامة وحبحسب طبيعته مميزاته وخصائصه" + الإلزام الدائم: **"لا اريد ان تنهي عمل بدون التاكد من ان الكونسول نظيف او وجود مشاكل `#problems_and_diagnostics`"**.

## Functional Requirements (مكيّفة لطبيعة الملف الشخصي)
- **FR-1 (دورة حياة الصدفة)**: `profileShellOpenFlow.ts` + `useProfileLifecycle.ts` يجب أن يطبق نمط Session Guard 3-أجزاء: (1) file-level counter (`let profileSessionIdCounter=0;` قبل الهوك/الفلو)، (2) `sessionIdRef + activeSessionIdRef` داخل الهوك/الفلو، (3) حارس أول سطر في كل async closure (warm cache callbacks, cloud loader promise.then, idle release timeout, prime decode avatars).
- **FR-2 (إغلاق جراحي 7-مبادئ)**: `profileShellCloseFlow.ts` + `profileShellExit.ts` + `profileHostIdleRelease.ts` يجب أن ينفذ بالتتابع: (a) AbortController لـ media upload + save queue polling، (b) unsubscribe gallery viewer/hero tilt/drag session، (c) blur inputs/studio editors + تصفير draft query refs، (d) cancel custom blocks drag session + remove non-passive listeners، (e) release idle resources (Canvas 2D contexts + FX loader chunks)، (f) reset profileEditDraft + save timeout timers، (g) snap DOM عبر `profileShellSnap` data-* closing flag.
- **FR-3 (مقاييس الأداء)**: `profilePerfMetrics.getLatestInteractive()` تقرأ دائمًا آخر علامة `entries[entries.length - 1]`، ويجب أن يعيد `null` عند (a) لا علامات موجودة، (b) بعد `clearProfilePerfMarks()`.
- **FR-4 (أمن الوصول 5-طبقات)**: قبل أي تعديل في الملف الشخصي يجب أن يمر عبر: (1) `filterActionsForVisitor` — علامات زائر لا تظهر أزرار تعديل، (2) `profileWriteGuard` — يتحقق من ownership + write capability، (3) `profilePrivacyVisibility` — يفلتر الأقسام حسب التخصيص، (4) `buildProfileEditPersistPayload` — يفلتر الحقول المسموح بكتابتها فقط، (5) `profileBlockUploadFlow` — MIME type check + size cap + safe path (no `../` escape).
- **FR-5 (XSS Defense-in-depth)**: `profileUrlSanitize.ts` + `profileContactInputSecurity.ts` + `profileSanitizer.ts` يجب أن يزيل: (1) `javascript:` scheme، (2) HTML tags `</>` explicit regex strip، (3) null chars `\u0000`، قبل أي عرض أو تخزين في SecureStore/Cloud.
- **FR-6 (Save Queue + Upload)**: أي تعديل في Studio Editor / Custom Blocks / Hero Avatar / Background Canvas يتم تخزينه أولاً في Draft محلي ثم يُرسل عبر `profileSaveQueue` مع retry مع backoff؛ عند close/idle يتم `flush()` فوري للإعدادات ثم إلغاء جميع الـ pending timers.
- **FR-7 (Mobile Suspend + Idle Release)**: `useProfileTabMobileSuspend.ts` يوقف Save Queue Polling + Media Uploads + FX Chunk decode عند visibility=hidden أو pagehide أو app-state inactive. `profileHostIdleRelease.ts` يحرر الذاكرة (contexts + refs + draft) بعد >30 ث من عدم التفاعل.

## Non-Functional Requirements
- **NFR-1 (ZVF)**: جميع التعديلات داخلية فقط (دورة حياة/حراسات/علامات أداء/إلغاء عمليات/تصفير refs/cleanup/defense-in-depth regex) — NO تغيير في DOM الظاهر أو CSS أو سلوك وظيفي للمستخدم النهائي تحت أي ظرف.
- **NFR-2 (Console Clean)**: `grep -r "console\.\(log\|warn\|error\|debug\|info\|trace\|dir\)"` في جذور الملف الشخصي الإنتاجية (غير الاختبارات) = 0 results.
- **NFR-3 (Problems/Diagnostics)**: `GetDiagnostics()` على كامل الـ workspace مرتين (متوسط + نهائي) = `[]` صفر أخطاء + صفر تحذيرات + صفر hints مؤثرة (hints غير مؤثرة فقط مسموحة إذا كانت خارج نطاق القسم ولم تكن موجودة قبل تدقيق القسم).
- **NFR-4 (Session Guard)**: جميع هوكات دورة الحياة في القسم تطبق نمط الحارس الموحد 3-أجزاء مع file-level counter.
- **NFR-5 (WIFE BFF)**: `grep "supabase\.from\("` في جذور القسم الإنتاجية (كلاينت فقط = غير .server.ts/غير __tests__) = 0 results.
- **NFR-6 (Mobile Ready)**: CSS في RoyalLawyerProfile يحتوي على safe-area insets (4 جهات) + touch-action manipulation/none + overscroll-behavior contain/none + contain:layout style.
- **NFR-7 (Surgical Close Coverage)**: ≥ 7 مبادئ إغلاق جراحي مغطاة باختبارات وحدة رسمية.

## Constraints
- **Technical**: Node 22+, Vitest v3+, TypeScript 5.4+، الالتزام التام بـ React 18 StrictMode. استخدام `AbortController` في جميع عمليات Upload / Save Queue Polling / FX Chunk Decode لمنع تسريب الذاكرة. استخدام `non-passive` touch listeners فقط في Custom Blocks Drag Session (منع default) مع إزالتها فورًا في cleanup.
- **Business**: ZVF 100% ملزم — لا تغيير في UX أو UI تحت أي ظرف. لا إزالة أي visual FX (Canvas tap reveal petal/stardust) إلا إذا كانت سبب تسريب ذاكرة حقيقي مثبت اختباريًا.
- **Dependencies**: تستخدم الاختبارات الـ test utilities الموجودة بالفعل (vitest + @testing-library/react + @testing-library/jest-dom) بدون إضافة مكتبات جديدة.

## Assumptions
1. افتراض أن بوابة الإنتاج الرسمية `scripts/profile-production-gate.mjs` تم إنشاؤها من قبل فريق QA وتغطي جميع الاختبارات الرسمية للملف الشخصي.
2. افتراض أن PROFILE_SHADOW_STUB المذكور في بوابة الإنتاج هو سيناريو فشل محتمل (إذا وجد ملف `RoyalLawyerProfile.tsx` بجانب مجلد بنفس الاسم) — سنؤكد عدم وجوده في Task 9 أثناء تشغيل البوابة.
3. افتراض أن اختبارات Honesty الرسمية للملف الشخصي موجودة تحت `RoyalLawyerProfile/__tests__` (تم اكتشاف `profileAndroidTouchHonesty.test.ts` رسميًا؛ سيزيد العدد في الاستكشاف).

## Acceptance Criteria (≥ 14 AC)

### AC-1: Session Guard 3-أجزاء في profileShellOpenFlow + useProfileLifecycle
- **Type**: `rule`
- **Given**: ملفات `profileShellOpenFlow.ts` و `useProfileLifecycle.ts` و `profileOpenSession.ts` و `profileLazyImports.ts`
- **When**: (أ) قراءة سطر بسطر للملفات + grep لـ counter/ref. (ب) تشغيل حزمة الاختبارات الرسمية: `profileShellOpenFlow.test.ts` + `useProfileLifecycle.test.ts` + `profileOpenSession.test.ts`.
- **Then**: (أ) يوجد file-level `let profileSessionIdCounter=0;` على الأقل في 2 من 4 ملفات الفلوات. (ب) يوجد `sessionIdRef + activeSessionIdRef` داخل كل هوك/فلو. (ج) داخل ≥ 5 async closures (cloudLoader.then, warmCache callback, idle timeout, avatar prime, lazy import) حارس أول سطر يقارن sessionId === active. (د) جميع اختبارات الوحدة للملفات الثلاثة تمر بـ exit 0.
- **Pass Condition**: vitest run exit 0 + 4 شروط مستوفاة.
- **Evidence**: Read L1-L80 للملفات + output أمر vitest.

### AC-2: الإغلاق الجراحي 7-مبادئ في profileShellCloseFlow/Exit + Idle Release
- **Type**: `rule`
- **Given**: ملفات `profileShellCloseFlow.ts` + `profileShellExit.ts` + `profileHostIdleRelease.ts` + `profileSaveTimeout.ts` + `profileSaveQueue.ts`
- **When**: (أ) قراءة سلسلة الإغلاق كاملة + grep لكل مبدأ. (ب) تشغيل اختبارات الإغلاق الرسمية: `profileShellExit.test.ts` + `profileShellCloseFlow.test.ts` + `profileHostIdleRelease.test.ts` + اختبارات SurgicalClose الرسمية.
- **Then**: الإغلاق ينفذ ≥ 7 مبادئ: (1) AbortController لـ media/upload/save queue، (2) unsubscribe gallery/hero/drag، (3) blur inputs/studio + تصفير draft query refs، (4) cancel custom blocks drag + remove non-passive listeners، (5) release idle canvas/FX contexts + chunks، (6) reset profileEditDraft + save timers، (7) snap DOM closing flag + clear overlay settle.
- **Pass Condition**: ≥ 20/20 اختبار إغلاق جراحي PASSED exit 0 على الأقل (من جميع ملفات الاختبار ذات الصلة).
- **Evidence**: vitest run لملفات الإغلاق + grep لكل مبدأ.

### AC-3: Perf Metrics — Latest Mark + restoreAllMocks + 2 null scenarios
- **Type**: `rule`
- **Given**: ملفات `profilePerfMetrics.ts` + `profilePerfBudget.ts` + `profilePerfMetrics.test.ts` + `profilePerfBudget.test.ts`
- **When**: تشغيل اختبارات Perf الرسمية عبر `vitest run profilePerfMetrics.test.ts profilePerfBudget.test.ts`
- **Then**: (أ) `getLatestInteractive()` تعيد `entries[entries.length - 1]` وليس `entries[0]`. (ب) `beforeEach` في ملف الاختبار يستدعي `vi.restoreAllMocks()`. (ج) اختبار الحالة "لا علامات → تعيد null" يمر. (د) اختبار "بعد clearMarks → تعيد null" يمر. (هـ) thresholds في Budget معقولة (WONTFIX إذا كانت ضمن HAMi tier1 standards).
- **Pass Condition**: ≥ 5/5 اختبارات في حزمة الـ perf PASSED exit 0.
- **Evidence**: vitest run output + Read L1-L40 من ملف الاختبار.

### AC-4: 5 طبقات Access Control (Visitor/Owner/Privacy/Write/Upload)
- **Type**: `rule`
- **Given**: ملفات `filterActionsForVisitor.ts` + `profileWriteGuard.ts` + `profilePrivacyVisibility.ts` (أو نفسها داخل profileVisitorView/PageAccess) + `buildProfileEditPersistPayload.ts` + `profileBlockUploadFlow.ts`
- **When**: (أ) grep لكل طبقة + قراءة السيناريوهات. (ب) تشغيل اختبارات الأمن الرسمية: `profileCloudViewerScope.test.ts` + `profileWriteGuard.test.ts` + `profileMediaUploadSecurity.test.ts` + `profilePageAccess.test.ts` + `filterActionsForVisitor.test.ts`
- **Then**: كل طبقة من 5 موجودة ومغطاة باختبار: (1) Visitor View gates no edit buttons، (2) profileWriteGuard يرفض cross-user writes، (3) privacy visibility يفلتر الأقسام حسب التخصيص، (4) buildPayload يفلتر إلى allowed keys فقط، (5) upload flow blocks non-image/non-safe MIME + size cap + `../` path escape.
- **Pass Condition**: ≥ 12/12 اختبارات أمن PASSED exit 0.
- **Evidence**: vitest run output + grep results.

### AC-5: XSS Defense-in-depth — URL Sanitize + Contact Input + Sanitizer + Orphan GC Paths
- **Type**: `rule`
- **Given**: `profileUrlSanitize.ts` + `profileContactInputSecurity.ts` + `profileSanitizer.ts` + `gcProfileEditOrphanMedia.ts` + `editDraftMediaPaths.ts`
- **When**: (أ) grep لـ `javascript:` + `</>` + `\u0000` + `\.\./`. (ب) تشغيل اختبارات Sanitize الرسمية: `profileUrlSanitize.test.ts` + `profileContactInputSecurity.test.ts` + `profileSanitizer.test.ts` + `editDraftMediaPaths.test.ts` + `gcProfileEditOrphanMedia.test.ts`.
- **Then**: (أ) URL Sanitize يحظر `javascript:` scheme + `data:` non-image + URLs > 2048 chars. (ب) Contact Input Sanitize يزيل HTML tags explicit regex. (c) Sanitizer يزيل null chars + clamp text length. (d) Media paths تحظر `../` escape + path traversal defense. (هـ) Orphan GC ينظف ملفات لم يتم حفظها بعد X دقائق.
- **Pass Condition**: ≥ 15/15 اختبارات sanitize/path PASSED exit 0.
- **Evidence**: vitest run output + grep results.

### AC-6: WIFE BFF — 0 supabase.from في الكلاينت
- **Type**: `rule`
- **Given**: جذور القسم الثلاثة: RoyalLawyerProfile/ (غير __tests__) + services/profile/ (غير __tests__ وغير *.server.ts) + hooks/lawyerDashboard/profile/ (غير __tests__) + مجلدات dashboard/profile/ + ForumMemberProfileOverlay + ForumTileProfileQuarter.
- **When**: تنفيذ `grep -r "supabase\.from\("` على جميع الجذور أعلاه.
- **Then**: عدد النتائج = 0 بالضبط. جميع المكالمات إلى بيانات الملف الشخصي تمر عبر BFF Routes (موجودة ضمنيًا في cloud loader التي تستخدم SecureAPIClient أو profileCloudLoader الموجه عبر /api/profile/*).
- **Pass Condition**: grep count = 0 في جميع الجذور الإنتاجية.
- **Evidence**: أمر grep output بالعدّاد لكل جذر على حدة.

### AC-7: جودة الكود — بادئة [profile:opcode]/[services_profile:opcode] ≥ 95%
- **Type**: `rule`
- **Given**: جميع ملفات جذور القسم الإنتاجية (غير الاختبارات)
- **When**: (أ) grep عدد كل `throw new (Error|TypeError|RangeError)`. (ب) grep عدد ما يحتوي على `[profile:` أو `[services_profile:`. (ج) استبعاد: React Context invariant + AbortError DOMException + Cloud errors من مكتبات خارجية.
- **Then**: (عدد throw مع البادئة / إجمالي throw المنطقي للملف الشخصي) ≥ 0.95.
- **Pass Condition**: نسبة البادئة ≥ 95%.
- **Evidence**: grep count commands output.

### AC-8: النظافة — Honesty Tests ≥ 9/10 + Console = 0 + 1st Diagnostics = []
- **Type**: `rule`
- **Given**: اختبارات Honesty الرسمية للملف الشخصي تحت `RoyalLawyerProfile/__tests__/*Honesty*.test.*` + جميع جذور الإنتاج + كامل الـ workspace.
- **When**: (أ) تشغيل جميع اختبارات Honesty. (ب) grep console.log/debugger/info/warn/error في جذور الإنتاج. (ج) تشغيل GetDiagnostics الأول (متوسط العمل).
- **Then**: (أ) ≥ 90% من اختبارات Honesty PASSED. (ب) grep console/debugger في جذور الإنتاج = 0 results. (ج) **GetDiagnostics = `[]` (أو أي تبقى من المشاكل خارج نطاق القسم يتم إصلاحها جراحيًا مثل الإشعارات السابقة)**.
- **Pass Condition**: 90%+ Honesty + grep 0 + Diagnostics after fixes = [].
- **Evidence**: vitest honesty output + grep output + GetDiagnostics output.

### AC-9: استعداد الموبايل + Gestures + Escape Stack + Suspend + Non-passive Drag
- **Type**: `rule`
- **Given**: ملفات CSS لـ RoyalLawyerProfile (15+ ملف CSS) + `useProfileScreenEscape.ts` + `useProfileSettingsFocusTrap.ts` + `useProfileGalleryViewerFocusTrap.ts` + `useProfileTabMobileSuspend.ts` + `useNonPassiveTouchPrevent.ts` + `useProfileCustomBlocksDrag.ts`
- **When**: (أ) grep خصائص CSS الأربعة. (ب) grep inert/Escape/keydown/Suspend/non-passive. (ج) تشغيل اختبارات الموبايل الرسمية: `profileAndroidTouchHonesty.test.ts` + `profileMobileTabletLayout.test.ts` + `lawyerProfileFx-android.test.ts` + `useProfileScreenEscape.test.ts` + `useProfileSettingsFocusTrap.test.ts` + `useProfileGalleryViewer.escape.test.tsx`.
- **Then**: (أ) CSS يحتوي على safe-area-inset-{top,bottom,left,right} (4 جهات) + touch-action manipulation/none + overscroll-behavior contain/none + contain layout/style/paint. (ب) Escape Stack 3 طبقات: Gallery Viewer → Settings Sheet → Close Profile. (ج) Mobile Suspend يوقف Save Queue + Uploads عند visibilitychange/pagehide/app-inactive. (د) Custom Blocks Drag يستخدم non-passive listener + إزالته فور cleanup. (هـ) ≥ 10/12 اختبارات موبايل PASSED.
- **Pass Condition**: جميع خصائص CSS موجودة + Escape 3-طبقات + Suspend + ≥ 83% tests pass.
- **Evidence**: grep CSS output + Read hooks + vitest mobile output.

### AC-10: بوابة الإنتاج الرسمية exit 0 PASSED + Console نظيف
- **Type**: `rule`
- **Given**: `scripts/profile-production-gate.mjs`
- **When**: تشغيل الأمر `node scripts/profile-production-gate.mjs` ومراقبة stdout/stderr بدقة.
- **Then**: (أ) exit code = 0. (ب) آخر سطر قبل exit = `PASSED`. (ج) جميع 37 criticalPaths موجودة + PROFILE_SHADOW_STUB غير موجود (no shadow bomb). (د) جميع اختبارات الملف الشخصي الرسمية PASSED. (هـ) stderr لا يحتوي على console.warn/error من كود القسم الإنتاجي (فقط testing-library act warnings مسموحة لأنها بيئة).
- **Pass Condition**: exit code 0 + آخر سطر PASSED + Console نظيف (لا كود إنتاجي يطبع warn/error).
- **Evidence**: تشغيل الأمر فعليًا مع exit code + آخر 30 سطرًا من stdout/stderr.

### AC-11: Boot Warm + Lazy Load Integrity + Chunk Deferral (Studio/Canvas/FX Chunks)
- **Type**: `rule`
- **Given**: `profileLazyImports.ts` + `warmBootLawyerProfile.ts` + `profileCanvasFxLoader.ts` + `profileAndroidFxLoader.ts` + `useProfileCanvasBackgroundEditorChunk.ts` + `useProfileStudioEditorChunk.ts` + اختبارات `profileCanvasFxLoader.test.ts` + `warmBootLawyerProfile.test.ts` + `useProfileCanvasBackgroundEditorChunk.test.ts` + `useProfileStudioEditorChunk.test.ts`
- **When**: grep dynamic import + تشغيل اختبارات Chunk الـ 4.
- **Then**: (أ) جميع imports الثقيلة للـ Studio Editor / Canvas Background / 8 FX Effects داخل dynamic import (ليست static top-level). (ب) warm intent يبني prefetch للـ Chunk قبل الفتح الفعلي للصفحة. (ج) chunk tests exit 0.
- **Pass Condition**: 3/3 شروط مستوفاة + اختبارات Chunk 4/4 PASSED.
- **Evidence**: Read لملفات الـ lazy + vitest runtime test output.

### AC-12: وضوح دورة الحياة كاملة للملف الشخصي — Owner + Visitor Dual View (Rubric)
- **Type**: `rubric`
- **Dimension**: وضوح معمارية دورة الحياة من لحظة الضغط على تبويب الملف الشخصي أو فتح زائر Overlay → Warm Cache → Open Flow (session guard) → Load Cloud/Remote → Owner/Visitor Gate → Render + FX Chunk defer → Save Queue + Draft Mutations → Gallery Viewer + Custom Blocks Drag → Close Flow (7 مبادئ) + Idle Release Resources بعد السكون.
- **Scale**: 1-5
- **Anchors**: 1 = دورة حياة مبعثرة بدون حراسات واضحة، تسرب ذاكرة متوقع عند reopen/close. 3 = حراسات أساسية + 4 مبادئ إغلاق ولكن gaps في Idle Release أو Stale Closure في visitor overlay promises. 5 = دورة حياة خطية واضحة، حراسات 3-أجزاء في جميع الفلوات/الهوكات، إغلاق 7-مبادئ جراحي، Idle Release صحيح، تقارير أداء دقيقة عند reopen متعدد و Owner/Visitor dual view.
- **Pass Threshold**: >= 4
- **Evidence**: قراءة تسلسلية لـ warmBoot → openFlow → useProfileLifecycle → gallery/settings focus traps → closeFlow → exit → idle release + نتائج اختبارات Reopen/Visitor Dual/Idle.

### AC-13: قوة تحصين الأمن والوصول 5 طبقات + XSS Defense (Rubric)
- **Type**: `rubric`
- **Dimension**: قوة طبقات الحماية ضد: (1) XSS في Hero name / Custom Block Text / Gallery Caption / Contact URLs، (2) Unauthorized Edit عبر زائر، (3) Privacy leak لقسم مخفي، (4) path traversal في Media Upload، (5) Orphan Media leak.
- **Scale**: 1-5
- **Anchors**: 1 = لا sanitization، زائر يقدر يعدل الملف، privacy مخفية ولكن API تسترجعها كلها، upload تقبل أي ملف. 3 = sanitization جزئي + owner gate ولكن بدون privacy guard أو upload defense أو path clamp. 5 = 5 طبقات مترابطة (filter visitor → write guard → privacy visibility → allowed payload keys → upload MIME/size/path clamp) + defense-in-depth HTML/URL/contact sanitizer + Orphan GC بعد timeout.
- **Pass Threshold**: >= 4
- **Evidence**: قراءة filterVisitor → writeGuard → privacyVis → buildPayload → uploadFlow + Sanitize files + اختبارات الأمن 12+ PASSED.

### AC-14: صدق وإتقان الإغلاق — Console 100% نظيف + Problems/Diagnostics = [] (Rubric)
- **Type**: `rubric`
- **Dimension**: الصدق المطلق في إغلاق القسم — لا مشاكل مخفية في console أو diagnostics أو dead code أو تسريب non-passive listeners.
- **Scale**: 1-5
- **Anchors**: 1 = console.logs منتشرة + أخطاء TypeScript + dead imports + non-passive touch listeners لا تُزال عند close. 3 = Console نظيف ولكن Diagnostics يحتوي على تحذيرات أو dead code غير مستخدم أو idle release لا يحرر Canvas contexts. 5 = Console 100% نظيف أثناء الاختبارات والبوابة، Diagnostics = []، لا console.log/debugger في الإنتاج، no unused/dead code في 3 جذور، idle release يحرر 100% من resources + non-passive listeners تُزال في cleanup مع verify cleanup في الاختبارات.
- **Pass Threshold**: >= 4
- **Evidence**: تشغيل بوابة الإنتاج مع ملاحظة console output + GetDiagnostics = [] + grep console/debugger = 0 + idle release cleanup verified.

## Open Questions
- [ ] هل يوجد ملف اختبار رسمي إضافي `profileChromeHonesty.test.ts` أو `profileCloseHonesty.test.ts` أم تم دمجه في ملفات أخرى؟ (سوف يتم اكتشافه في Tasks 7/8).
- [ ] هل يوجد `profileSaveQueue.ts` اختبار رسمي منفصل أم يتم تغطيته ضمن `profileWriteGuard`؟ (سوف يتم اكتشافه في Task 2/4).
