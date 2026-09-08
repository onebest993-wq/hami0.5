# Hami Notifications Section — Tier-1 Zero-to-Production Audit PRD

## Overview
- **Summary**: إجراء تدقيق ذري مجهري من الصفر لقسم الإشعارات (NotificationPanel + Services + Shell Hooks) وفق أعلى معايير Tier-1 الإنتاجية، مع الحفاظ التام على ZVF 100% وضمان Console نظيف و `#problems_and_diagnostics = []` قبل الإغلاق الرسمي.
- **Purpose**: ضمان جاهزية قسم الإشعارات للإنتاج الفعلي مع فحص واختبار كل ميزة بميزة وسطر بسطر، وتصحيح أي ثغرات في دورة الحياة، الأداء، الأمن، جودة الكود، واستعداد الموبايل.
- **Target Users**: مهندسو الإنتاج Hami v10.5-tier1-hardened، وقسم ضمان الجودة، والمستخدم النهائي في لوحة المحامي (Lawyer Dashboard).

## Goals
- تطبيق نمط Session Guard Pattern في جميع هوكات دورة حياة الصدفة للإشعارات لمنع ثغرات Stale Closure وتلوث تقارير الأداء بين الجلسات.
- ضمان دقة مقاييس الأداء (latestPerfMark) وعدم وجود تسريب في علامات الـ Performance عند إعادة فتح القسم.
- إغلاق جراحي احترافي للإشعارات عند الخروج: إيقاف Background Sync + إلغاء Keep-Alive List Live + blur أي عنصر نشط + تصفير refs.
- التأكد من خلو كود الكلاينت من استدعاءات `supabase.from()` المباشرة (نمط WIFE BFF) مع وجود ≥ 4 مناطق Navigate Security.
- ضمان تطابق بادئة `[notification:opcode]` في ≥ 95% من جميع throw statements المنطقية للإشعارات.
- خلو جميع جذور قسم الإشعارات الإنتاجية من `console.log` و `debugger` و imports/exports ميتة أو مكررة.
- اجتياز جميع اختبارات Honesty الرسمية (≥ 7 اختبارات) بنسبة ≥ 90% Pass.
- استعداد الموبايل الكامل: safe-area insets، touch-action، contain، inert، escape-stack، swipe-to-dismiss، تعليق background sync عند suspend.
- تشغيل بوابة الإنتاج الرسمية `scripts/notifications-production-gate.mjs` مع exit code 0.
- تشغيل GetDiagnostics على كامل الـ workspace مع نتيجة `[]` (صفر أخطاء TypeScript + Problems = []).
- Console نظيف 100%: لا console.error/console.warn غير المخطط لها أثناء تشغيل الاختبارات.

## Non-Goals
- لا تغيير في DOM الظاهر أو CSS أو السلوك الوظيفي للمستخدم النهائي (ZVF 100% ملزم).
- لا إعادة تصميم واجهة NotificationPanel أو تغيير شكل البطاقات أو التبويبات.
- لا تعديل في منطق FCM Server Push أو migrations Supabase (فقط قراءة وتأكيد الوجود).
- لا تغيير في بنية Inbox Storage أو NotificationRepository (فقط قراءة وتصحيح دورة حياة).

## Background & Context
- تم إغلاق قسم الإعدادات والبحث بنفس نموذج Tier-1 Zero-to-Production مع تحقيق PASS في كلا القسمين (539 اختبار + 258 اختبار على التوالي).
- قسم الإشعارات له طبيعة خاصة: FCM Push Notifications، OS Tap Routing عند النقر على إشعار نظام، Background Sync متقطع، Keep-Alive List Live أثناء فتح القسم، Inbox Persistence في SecureStore + IndexedDB، Chime/Sound عند الوصول، DND/Mute Policy، Escape Stack مع باقي أقسام اللوحة.
- بوابة الإنتاج الرسمية موجودة بالفعل: `scripts/notifications-production-gate.mjs` تشغّل 20+ حزمة اختبار (services + stores + infrastructure + hooks + components + runtime).
- القيود الملزمة من المستخدم: لا تنهي العمل بدون التأكد من أن الكونسول نظيف أو وجود مشاكل `#problems_and_diagnostics = []`.

## Functional Requirements
- **FR-1**: دورة حياة الصدفة: `useNotificationShellLifecycle` يجب أن يطبق نمط Session Guard 3-أجزاء (file-level counter + sessionIdRef + activeSessionIdRef + guard أول سطر في كل async closure).
- **FR-2**: flow الفتح `notificationShellOpenFlow` يجب أن يطبق نمط flow-level dual guard (flowIdCounter + showNotificationPanelRef) داخل 3 مناطق async على الأقل.
- **FR-3**: مقاييس الأداء `notificationPerfMetrics.getLatestPerfMark` تقرأ دائمًا آخر علامة `entries[entries.length - 1]` ولا تعيد علامات جلسات سابقة بعد `clearNotificationPerfMarks()`.
- **FR-4**: الإغلاق الجراحي `notificationShellExit` يلغي على الأقل: (1) Background Sync polling، (2) Keep-Alive List Live subscription، (3) blur أي input/activeElement داخل panel، (4) تصفير أي draft/transient refs، (5) snap DOM عبر data-closing flag.
- **FR-5**: HTML Escape في عرض نص الإشعار (title + body) يمنع XSS عبر استبعاد أي `<[^>]*>` قبل عرضه.
- **FR-6**: Navigate Security قبل أي push إلى Criminal/Lawsuit/Forum يجب أن يمر عبر سلسلة: sanitizeNotificationNavigate → isOwnedXxxId → hasLocalAppSession → clampNotificationLabel قبل الكتابة في storage.
- **FR-7**: عند فتح Panel + أول background sync أو أول FCM وصول أثناء فتح Panel، يتم تشغيل sound/chime فقط إذا كان AlertPolicy يسمح (DND/Mute).

## Non-Functional Requirements
- **NFR-1 (ZVF)**: جميع التعديلات داخلية فقط (دورة حياة/حراس/علامات أداء/إلغاء عمليات) — لا تغيير في الواجهة أو السلوك الوظيفي المرئي.
- **NFR-2 (Console Clean)**: `grep -r "console\.\(log\|warn\|error\)"` في جذور الإشعارات الإنتاجية (غير الاختبارات) = 0 results.
- **NFR-3 (Problems/Diagnostics)**: `GetDiagnostics()` على كامل الـ workspace = `[]` صفر أخطاء.
- **NFR-4 (Session Guard)**: جميع هوكات دورة الحياة في الإشعارات تطبق نمط الحارس الموحد 3-أجزاء مع file-level counter.
- **NFR-5 (WIFE BFF)**: `grep "supabase\.from"` في جذور الإشعارات الإنتاجية (كلاينت فقط) = 0 results.
- **NFR-6 (Mobile Ready)**: CSS في NotificationPanel يحتوي على safe-area insets (4 جهات) + touch-action manipulation/none + overscroll-behavior contain + contain:layout style.
- **NFR-7 (Surgical Close Test Coverage)**: ≥ 6 مبادئ إغلاق جراحي مغطاة باختبارات وحدة.

## Constraints
- **Technical**: Node 22+, Vitest v1+, TypeScript 5.4+، الالتزام التام بـ React 18 StrictMode.
- **Business**: ZVF 100% ملزم — لا تغيير في UX أو UI تحت أي ظرف.
- **Dependencies**: تستخدم الاختبارات الـ test utilities الموجودة بالفعل (vitest + @testing-library/react + @testing-library/jest-dom) بدون إضافة مكتبات جديدة.

## Assumptions
- افتراض أن بوابة الإنتاج الرسمية `scripts/notifications-production-gate.mjs` تم إنشاؤها من قبل فريق QA وتغطي جميع الاختبارات الرسمية للإشعارات.
- افتراض أن ملفات migrations الواردة في بوابة الإنتاج موجودة بالفعل في مجلد `supabase/migrations/`.
- افتراض أن حزم اختبار Honesty الرسمية للإشعارات موجودة بالفعل تحت `NotificationPanel/__tests__` (تم اكتشاف 10 اختبارات honesty عبر Glob).

## Acceptance Criteria

### AC-1: Session Guard في useNotificationShellLifecycle
- **Type**: `rule`
- **Given**: ملف `src/app/hooks/lawyerDashboard/useNotificationShellLifecycle.ts`
- **When**: يتم تشغيل الاختبارات الرسمية للملف عبر `vitest run useNotificationShellLifecycle.test.ts` (أو بديله الرسمي)
- **Then**: (أ) يوجد `let notificationSessionIdCounter = 0;` على مستوى الملف قبل الهوك. (ب) يوجد `sessionIdRef` + `activeSessionIdRef` داخل الهوك. (ج) داخل كل async closure يوجد حارس أول سطر يقارن sessionId === activeSessionIdRef.current. (د) جميع اختبارات الوحدة للملف تمر بـ exit 0.
- **Pass Condition**: vitest run exit 0 + 4 شرط أعلاه مستوفاة عبر grep/read فعلي.
- **Evidence**: Read L1-L60 للملف + output أمر vitest.

### AC-2: Flow-level Dual Guard في notificationShellOpenFlow
- **Type**: `rule`
- **Given**: ملف `src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts`
- **When**: يتم قراءة الملف + تشغيل اختباراته الرسمية
- **Then**: (أ) يوجد `let flowSessionIdCounter = 0;` + `flowActiveSessionIdRef` على مستوى الملف. (ب) داخل 3 مناطق async على الأقل (queueMicrotask + dynamic import.then + بعد await أي مكالمة) يوجد حارس مزدوج (flowId === ref.current === true + showNotificationPanelRef.current === true). (ج) جميع اختبارات الوحدة للملف تمر بـ exit 0.
- **Pass Condition**: vitest run exit 0 + 3 شرط أعلاه مستوفاة.
- **Evidence**: grep "flowSessionIdCounter" + Read في async regions + vitest output.

### AC-3: Perf Metrics — Latest Mark + restoreAllMocks
- **Type**: `rule`
- **Given**: ملف `notificationPerfMetrics.ts` + `notificationPerfMetrics.test.ts`
- **When**: تشغيل اختبارات Perf الرسمية عبر `vitest run notificationPerfMetrics.test.ts`
- **Then**: (أ) `getLatestInteractive()` تعيد `entries[entries.length - 1]` وليس `entries[0]`. (ب) `beforeEach` في ملف الاختبار يستدعي `vi.restoreAllMocks()` قبل أي spy جديد. (ج) اختبار الحالة "لا علامات موجودة → تعيد null" يمر. (د) اختبار "بعد clearMarks → تعيد null" يمر.
- **Pass Condition**: 5/5 اختبارات في ملف الاختبار PASSED exit 0.
- **Evidence**: vitest run output + Read L1-L30 من ملف الاختبار.

### AC-4: الإغلاق الجراحي — 6 مبادئ على الأقل
- **Type**: `rule`
- **Given**: `notificationShellExit.ts` + `useNotificationHostLifecycle.ts` + `useNotificationStoreSync.ts` + `notificationPanelListLive.ts`
- **When**: قراءة كاملة لسلسلة الإغلاق + تشغيل اختبارات الإغلاق الرسمية (notificationShellExit.test + SurgicalCloseHonesty + keepAliveListLive test)
- **Then**: الإغلاق ينفذ بالتتابع: (1) إلغاء BackgroundSync polling (AbortController أو cancelled flag). (2) إلغاء Keep-Alive List Live subscription. (3) blur أي activeElement داخل .ntf-panel + تصفير أي input focus. (4) snap DOM عبر data-ntf-closing=true + clearOverlayEnterSettle. (5) تصفير any transient draft refs + reportedPerfRef. (6) تصفير sync interval timers + hushed listeners.
- **Pass Condition**: 14/14 اختبار إغلاق جراحي PASSED exit 0 على الأقل (من جميع ملفات الاختبار ذات الصلة).
- **Evidence**: vitest run لملفات الإغلاق الثلاثة + grep لكل مبادئ الستة.

### AC-5: HTML Escape + Navigate Security + Console Clean
- **Type**: `rule`
- **Given**: NotificationCard + notificationInboxSanitize + notificationNavigateSecurity + notificationOwnedNavigate + 3 جذور الإنتاج
- **When**: (أ) grep `<[^>]*>` في منطق sanitize. (ب) grep isOwned + hasLocalAppSession في منطق الـ navigate. (ج) تشغيل الاختبارات الرسمية لهذه الملفات.
- **Then**: (أ) notificationInboxSanitize يزيل HTML tags قبل العرض. (ب) Navigate Security يحتوي على ≥ 4 مناطق فحص (sanitize → ownership → session → clamp label). (ج) Console Clean: grep console.log/warn/error في جذور الإنتاج = 0.
- **Pass Condition**: 27/27 اختبار PASSED exit 0 + grep نتائج مطابقة.
- **Evidence**: vitest run لملفات الاختبار ذات الصلة + grep outputs.

### AC-6: الأمن — WIFE BFF (0 supabase.from في كلاينت)
- **Type**: `rule`
- **Given**: جذور الإشعارات الإنتاجية الثلاثة (NotificationPanel + services/notifications [غير .server.ts] + hooks/notifications [غير useLawyerDashboardNotifications إذا كان يمر عبر BFF])
- **When**: تنفيذ أمر `grep -r "supabase\.from("` على جذور الثلاثة مع استبعاد ملفات __tests__ + ملفات .server.ts
- **Then**: عدد النتائج = 0 بالضبط. جميع المكالمات إلى البيانات تمر عبر BFF API Routes (`/api/notifications/*` الموجودة في criticalPaths لبوابة الإنتاج).
- **Pass Condition**: grep count = 0 + Navigate Security ≥ 4 مناطق مستوفاة في AC-5.
- **Evidence**: أمر grep output بالعدّاد.

### AC-7: جودة الكود — بادئة [notification:opcode] ≥ 95%
- **Type**: `rule`
- **Given**: جميع ملفات جذور الإشعارات الإنتاجية (غير الاختبارات)
- **When**: (أ) grep عدد كل `throw new` statements. (ب) grep عدد الـ throw statements التي تحتوي على البادئة `[notification:opcode]`. (ج) استبعاد: React Context invariant و DOMException('Abort','AbortError') و Supabase errors من المكتبات.
- **Then**: (عدد throw مع البادئة / إجمالي throw المنطقي للإشعارات) ≥ 0.95.
- **Pass Condition**: نسبة البادئة ≥ 95%.
- **Evidence**: grep count commands output.

### AC-8: النظافة + Honesty Tests + Console = 0 + Problems = []
- **Type**: `rule`
- **Given**: (أ) 10 ملفات اختبار Honesty الرسمية تحت NotificationPanel/__tests__ (تم اكتشافها). (ب) جذور الإنتاج للإشعارات. (ج) كامل الـ workspace.
- **When**: (أ) تشغيل جميع اختبارات Honesty عبر vitest run. (ب) grep console.log/debugger في جذور الإنتاج. (ج) GetDiagnostics على الـ workspace.
- **Then**: (أ) 9/10 على الأقل من اختبارات Honesty PASSED. (ب) grep console.log/debugger في جذور الإنتاج = 0 results. (ج) GetDiagnostics = `[]` صفر أخطاء.
- **Pass Condition**: 90%+ Honesty pass + grep 0 + Diagnostics = [].
- **Evidence**: vitest honesty output + grep output + GetDiagnostics output.

### AC-9: استعداد الموبايل + Gestures + Background Suspend
- **Type**: `rule`
- **Given**: NotificationPanel styles/*.css + useNotificationMobileSuspend.ts + notificationEscapeStack.ts
- **When**: (أ) grep safe-area/touch-action/overscroll/contain في ملفات CSS. (ب) grep inert/escape-stack/swipe pointerdown في المكونات والهوكات. (ج) تشغيل اختبارات الموبايل الرسمية للإشعارات.
- **Then**: (أ) CSS يحتوي على safe-area-inset-{top,bottom,left,right} + touch-action manipulation + overscroll-behavior contain + contain:layout style. (ب) Escape Stack مُربوط مع لوحة المحامي. (ج) useNotificationMobileSuspend يوقف Background Sync عند دخول background. (د) ≥ 10/12 اختبارات الموبايل PASSED.
- **Pass Condition**: جميع خصائص CSS موجودة + Escape Stack + Suspend logic + 83%+ tests pass.
- **Evidence**: grep CSS output + Read hooks + vitest mobile output.

### AC-10: بوابة الإنتاج الرسمية exit 0
- **Type**: `rule`
- **Given**: `scripts/notifications-production-gate.mjs`
- **When**: تشغيل الأمر `node scripts/notifications-production-gate.mjs`
- **Then**: (أ) exit code = 0. (ب) آخر سطر قبل exit = `PASSED`. (ج) جميع migrations موجودة + جميع API routes موجودة + جميع criticalPaths موجودة + جميع env keys موثقة + اختبارات الإشعارات الرسمية كلها PASSED.
- **Pass Condition**: exit code 0 + آخر سطر PASSED.
- **Evidence**: تشغيل الأمر فعليًا مع exit code.

### AC-11: Boot Warm Up + Chunk Lazy Load Integrity
- **Type**: `rule`
- **Given**: notificationPanelLazyModules.ts + notificationDashboardLazyImports.ts + runtime notificationInstantPaint.test.ts
- **When**: تشغيل اختبارات التسخين الرسمية + grep lazy imports
- **Then**: (أ) جميع imports الثقيلة للـ Panel داخل dynamic import (ليست static top-level). (ب) warm intent يبني prefetch للـ Chunk قبل open الفعلي. (ج) اختبار Instant Paint يمر exit 0.
- **Pass Condition**: 3/3 شرط مستوفاة + اختبار Runtime PASSED.
- **Evidence**: Read لملفات الـ lazy + vitest runtime test output.

### AC-12: وضوح وفهم دورة حياة الإشعارات (Rubric)
- **Type**: `rubric`
- **Dimension**: وضوح معمارية دورة الحياة للإشعارات من لحظة الضغط على أيقونة الإشعارات → فتح → تسخين → live updates → إغلاق وتنظيف كامل.
- **Scale**: 1-5
- **Anchors**: 1 = دورة حياة مبعثرة بدون حراس واضحة، تسرب ذاكرة متوقع عند reopen سريع. 3 = حراس أساسية موجودة ولكن gaps في الإغلاق الجراحي أو تلوث تقارير الأداء. 5 = دورة حياة خطية واضحة، حراسات 3-أجزاء في جميع الهوكات، إغلاق 6-مبادئ جراحي، تسريب صفري معقول، تقارير أداء دقيقة عند reopen متعدد.
- **Pass Threshold**: >= 4
- **Evidence**: قراءة تسلسلية لـ useNotificationShellLifecycle → notificationShellOpenFlow → keep-alive → notificationShellExit + نتائج اختبارات Reopen.

### AC-13: قوة تحصين الأمن والهروب من XSS/Navigation (Rubric)
- **Type**: `rubric`
- **Dimension**: قوة طبقات الحماية ضد XSS في عرض نصوص الإشعارات + Unauthorized Navigation عبر رابط في إشعار.
- **Scale**: 1-5
- **Anchors**: 1 = لا sanitization، أضغط على إشعار يفتح أي criminalId بدون فحص ملكية. 3 = sanitization جزئي + فحص ملكية ولكن بدون clamp label أو session check. 5 = 4 طبقات حماية مترابطة (sanitize regex + ownership guard + session validity + clamp storage write) + HTML escape في كل بطاقة عرض.
- **Pass Threshold**: >= 4
- **Evidence**: قراءة notificationInboxSanitize → notificationNavigateSecurity → notificationOwnedNavigate → NotificationCard عرض نص.

### AC-14: صدق وإتقان الإغلاق — Console Clean + Problems = 0 (Rubric)
- **Type**: `rubric`
- **Dimension**: الصدق المطلق في إغلاق القسم — لا مشاكل مخفية في console أو diagnostics أو dead code.
- **Scale**: 1-5
- **Anchors**: 1 = console.logs منتشرة + أخطاء TypeScript + dead imports كثيرة. 3 = Console نظيف ولكن Diagnostics يحتوي على تحذيرات أو dead code غير مستخدم. 5 = Console 100% نظيف أثناء الاختبارات، Diagnostics = []، لا console.log/debugger في الإنتاج، no unused/dead code في 3 جذور.
- **Pass Threshold**: >= 4
- **Evidence**: تشغيل بوابة الإنتاج مع ملاحظة console output + GetDiagnostics = [] + grep console.log/debugger = 0.

## Open Questions
- [ ] هل يوجد ملف اختبار رسمي لـ `useNotificationShellLifecycle.test.ts` أم تم دمجه في ملفات أخرى؟ (سوف يتم اكتشافه في Task 1).
- [ ] هل يوجد `notificationPerfBudget.test.ts` رسمي مُنفصل أم يتم تغطيته ضمنيًا في perf metrics؟ (سوف يتم اكتشافه في Task 3).
