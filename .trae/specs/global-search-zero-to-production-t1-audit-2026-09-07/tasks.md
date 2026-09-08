# Hami Global Search Tier-1 Zero-to-Production Honest Audit — Implementation Plan

## Task 1: فحص وتصحيح هوك useGlobalSearchShellLifecycle (الدورة الحياة الرئيسية للصدفة + الحرس ضد Stale Closure)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة سطر بسطر [useGlobalSearchShellLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle.ts)
  - التحقق من وجود نمط الحارس الموحد ثلاثي الأجزاء: `sessionIdCounter` على مستوى الملف + `sessionIdRef/activeSessionIdRef` داخل الهوك + حارس مقارنة `if (sessionIdRef.current !== activeSessionIdRef.current) return;` في كل async callback أو setTimeout أو onFulfill من index build
  - في حال غياب نمط الحارس في أي مكان: إضافته جراحيًا مع الحفاظ على ZVF 100% (لا يغير أي DOM/state ظاهر)
  - تشغيل `useGlobalSearchShellLifecycle.test.ts` الرسمي مع حالة اختبار جديدة إن لزم: reopen سريع بعد close (Stale Closure Rejection)
- **Acceptance Criteria Addressed**: AC-1, AC-14
- **Test Requirements**:
  - `rule` TR-1.1: نمط الحارس الثلاثي موجود في الهوك → Pass عند Read فعلي + grep matches لأرقام الأسطر
  - `rule` TR-1.2: `vitest run .../useGlobalSearchShellLifecycle.test.ts` → exit 0 وعدد الاختبارات PASSED = مجموع الاختبارات في الملف
  - `rubric` TR-1.3: بعد الإصلاح، لا توجد أي callback stale تتجاوز الحارس وتُبلغ عن مقياس قديم. المقاس: عدد الاختبارات reopen التي PASSED / إجمالي reopen tests. Scale 1–5, pass >= 4, Evidence: TR-1.2 output
- **Notes**: هذا هو الجزء الأكثر حرجًا لتلوث تقارير الأداء عند reopen سريع للبحث؛ يُبدأ به قبل أي شيء آخر.

## Task 2: فحص وتصحيح useGlobalSearchHostLifecycle + Open Flow (Arm Focus + Clear Marks قبل Open)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - قراءة سطر بسطر [useGlobalSearchHostLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle.ts) + [globalSearchShellOpenFlow.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow.ts)
  - التحقق من: (أ) `clearGlobalSearchPerfMarks()` أول سطر قبل أي علامة open-request في الدالة الرسمية commitGlobalSearchShellOpen (ب) وجود الحارس Threesome داخل كل closure في HostLifecycle (ج) وجود `cleanupActiveGuards` عند unmount / rearm ترقيم الجلسة
  - أي غياب: إصلاح جراحي + تحديث ملفات الاختبار (mock الـ sessionIdRef + حالتين اختبار جديدتين: (1) build index يُلغى عند close قبل الانتهاء؛ (2) focus arm لا يُنفّذ للجلسة القديمة)
  - تشغيل `globalSearchShellOpenFlow.test.ts` الرسمي
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-2.1: `clearGlobalSearchPerfMarks()` قبل `markGlobalSearchPerfPhase('open-request')` داخل الدالة الرسمية ترتيبيًا → Read سطور فعلي
  - `rule` TR-2.2: كل useEffects / callbacks غير متزامنة داخل HostLifecycle فيها حارس جلسة
  - `rule` TR-2.3: `vitest run .../globalSearchShellOpenFlow.test.ts` → exit 0، المجموع PASSED = عدد الاختبارات الرسمي
- **Notes**: Clear Marks خطأ شائع في أقسام البحث عند إعادة الفتح (يمزج المقاييس القديمة مع الجديدة).

## Task 3: فحص طبقة المقاييس globalSearchPerfMetrics + globalSearchPerfBudget (آخر علامة + Fallback واقعي)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - قراءة [globalSearchPerfMetrics.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/search/globalSearchPerfMetrics.ts) + [globalSearchPerfBudget.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/search/globalSearchPerfBudget.ts)
  - التحقق من: (أ) استخدام `entries[entries.length - 1]` في جميع دوال الحصول على delta (ب) وجود fallback واقعي ≥180ms في حال غياب العلامة (ج) أن budget ≤ 400ms لـ NFR-3 (د) وجود timeout لـ index build داخل الـ executor لا يتركني ينتظر بلا نهاية
  - أي انحراف عن: تعديل + حالات اختبار لـ reopen (2 علامة + قراءة الثانية فقط)
  - تشغيل `globalSearchPerfMetrics.test.ts` + `globalSearchPerfBudget.test.ts`
- **Acceptance Criteria Addressed**: AC-4, AC-14
- **Test Requirements**:
  - `rule` TR-3.1: grep لـ `entries.length - 1` داخل دوال delta في metrics = عدد دوال delta
  - `rule` TR-3.2: budget `openToInteractive <= 400`
  - `rule` TR-3.3: `vitest run .../globalSearchPerfMetrics.test.ts .../globalSearchPerfBudget.test.ts` → exit 0، 5/5 PASSED على الأقل
- **Notes**: استخدام علامة بدلاً من الأخيرة يخلّصنا تقارير وهمية عند reopen؛ دائمًا use latest mark.

## Task 4: فحص الإغلاق الجراحي الصديق (Cancel Index Build + Blur Input + Snap + Refs)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - قراءة [globalSearchShellExit.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellExit.ts) + [useGlobalSearchOverlayExit.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayExit.ts) + [searchIndexBuildExecutor.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildExecutor.ts)
  - التحقق من 6 مبادئ الإغلاق الصحيح: (1) AbortController لـ index build الجاري (2) focusBack / blur input field (3) Snap DOM (runtime منع إعادة تشغيل animations) (4) تصفير reportedRef (5) تصفير query و ui state (6) إزالة inert للصفحة
  - أي نقص: إصلاح جراحي + اختبار جديد للـ Abort
  - تشغيل 5 ملفات اختبار: `globalSearchShellExit.test.ts` + `useGlobalSearchOverlayDismiss.test.tsx` + `globalSearchSectionCloseHonesty.test.ts` + `GlobalSearchInstantPaintCover.test.tsx` (paint cache يعمل للإغلاق) + `searchIndexBuildExecutor.test.ts` (مرحلة abort عند إغلاق)
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-4.1: وجود AbortController أو مكافئ في searchIndexBuildExecutor يتم استدعاء abort() قبل onClose أو قبل rearm الجلسة
  - `rule` TR-4.2: `vitest run` للأخر الاختبارات الخمسة → exit 0 و 11/11 PASSED على الأقل
  - `rubric` TR-4.3: جودة الإغلاق الإجمالي. Scale 1–5, pass ≥4. Evidence: TR-4.2 exit 0 + Read لأسطر الإغلاق
- **Notes**: Cancel build index أثناء الإغلاق خطأ شائع جداً في أقسام البحث → يسبب CPU spike 3-4 ثواني بعد الخروج.

## Task 5: فحص الواجهات الخمس (Idle/RecentSearches/ScopeChips/ResultsPanel/ResultRow) + الأمن + HTML Escape
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - قراءة سطر بسطر ResultRow.tsx + RecentSearchesPanel.tsx + SearchScopeChipList.tsx + SearchResultsPanel.tsx + SearchIdlePanel.tsx
  - التحقق من: (أ) كل واجهة لها اختبار render + keyboard nav (ب) HTML escape صحيح داخل الـ highlight (CSP / escapeHtml موجود) (ج) لا تخزن recent sensitive في `readGlobalSearchRecentSearchesSync` عبر شرط `searchIsSensitiveResult`
  - أي غياب: إصلاح (مثل تسريب sensitive إلى recent أو highlight بدونه escape) + اختبار جديد
  - تشغيل 6 اختبارات رسمية: `globalSearchHighlightPattern.test.ts` + `globalSearchNavigateSecurity.test.ts` + `globalSearchQuerySecurity.test.ts` + `searchUiState.test.ts` + `flattenGroupedResults.test.ts` + اختبار ResultRow إن وجد
- **Acceptance Criteria Addressed**: AC-6, AC-8
- **Test Requirements**:
  - `rule` TR-5.1: ResultRow.tsx يمرّر النص إلى دالة escape قبل استخدامها في dangerouslySetInnerHTML أو innerHTML، أو يستخدم React فقط بدنه
  - `rule` TR-5.2: النتيجة sensitive يتم إيقاف إضافتها في RecentSearches عبر guard شرطي صريح
  - `rule` TR-5.3: `vitest run` للاختبارات الستة → exit 0 و ≥23/23 PASSED (مجموعها الرسمي المتوقع)
- **Notes**: XSS في النتائج الحساسة = ثغرة حرجة (P0) حتى لو كان مدير الصفحة هو المستخدم نفسه.

## Task 6: فحص الأمن — WIFE BFF + No supabase.from في الكلاينت + Navigate Security + RecentSearches Filter
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - grep فعلي لـ `supabase\.from\(` داخل GlobalSearchOverlay + services/search + hooks/lawyerDashboard/globalSearch
  - قراءة [globalSearchNavigateSecurity.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/search/globalSearchNavigateSecurity.ts) + [globalSearchQuerySecurity.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/search/globalSearchQuerySecurity.ts)
  - التحقق من: (أ) 0 نتائج supabase في الكلاينت (ب) ≥4 مناطق حساسة مغطاة بـ verify قبل التنقل (Criminal / VaultProtected / FileSensitive / Execution)
  - تشغيل 4 اختبارات: `globalSearchNavigateSecurity.test.ts` + `globalSearchQuerySecurity.test.ts` + `globalSearchCriminalOwnership.test.ts` + `globalSearchShellOrchestration.test.ts`
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-6.1: grep `supabase\.from\(` في 3 مجلدات البحث = 0 matches (مستثنى فقط api dir / cloud dir)
  - `rule` TR-6.2: grep `globalSearchNavigateSecurity` في ResultRow + ResultsBody + keyboard nav execute = ≥4 matches
  - `rule` TR-6.3: `vitest run` الأربع اختبارات → exit 0 و 23/23 PASSED على الأقل
- **Notes**: هذه الـ ACs هي ثغرات أمنية حقيقية، لا تُعتبر complete إلا بعد grep فعلي 0 results.

## Task 7: فحص جودة الكود (بادئات الأخطاء [search:opcode] + Session Guard في build index)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - grep فعلي لعدد throw / Promise.reject داخل مجلدات البحث الثلاثة ما عدا tests
  - إحصاء نسبة البادئة `[search:` في بداية الرسالة
  - في case كانت النسبة < 95%: إضافة البادئة جراحيًا مع الحفاظ على نفس النص المعلوماتي (ZVF)
  - فحص خاص: وجود Session Guard + AbortSignal داخل searchIndexBuildExecutor قبل استدعاءات Fuse بنين
  - تشغيل 5 اختبارات: `globalSearchCodeQualityCloseHonesty.test.ts` (إن وجد) + `searchIndexBuildExecutor.test.ts` + `globalSearchIndexFileEntries.test.ts` + `globalSearchIndexLawsuitStages.test.ts` + `globalSearchIndexPure.test.ts`
- **Acceptance Criteria Addressed**: AC-9, AC-14
- **Test Requirements**:
  - `rule` TR-7.1: عدد throw مطابق للبادئة / الإجمالي ≥ 95%
  - `rule` TR-7.2: في searchIndexBuildExecutor: AbortSignal.aborted مرتكزة داخل build loop أو قبل بناء أي Fuse index ثقيل
  - `rule` TR-7.3: `vitest run` الخمسة اختبارات → exit 0، المجموع PASSED ≥43/45 (عند وجود code quality honesty formal)
  - `rubric` TR-7.4: نظافة كود build plan/executor (لا تكرار جذري قابل للإزالة). Scale 1–5, pass ≥4. Evidence: Read السطور + TR-7.3 output

## Task 8: فحص النظافة واختبارات الأمانة (Honesty Tests) — لا Dead Imports / Exports / Latent Bugs
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - تشغيل مجموعة اختبارات الأمانة الرسمية للبحث: (1) globalSearchCleanlinessHonesty.test.ts (2) globalSearchLatentBugsHonesty.test.ts (3) globalSearchRemainingCompletionHonesty.test.ts (4) globalSearchRemainingGapsHonesty.test.ts إن وجدت (5) globalSearchSectionCloseHonesty.test.ts (6) globalSearchPerformanceCloseHonesty.test.ts إن وجدت (7) globalSearchSecurityCloseHonesty.test.ts إن وجدت (8) globalSearchVisualLightnessHonesty.test.ts (9) globalSearchOpenSizeHonesty.test.ts إن وجدت (10) globalSearchWiringCoverage.test.ts إن وجدت (11) globalSearchScenarioCoverage.test.ts إن وجدت
  - أي فشل: إصلاح جراحي أو توثيق كـ WONTFIX بمبرر تقني صادق
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `rule` TR-8.1: تشغيل كل اختبارات honesty الرسمية الموجودة، النسبة PASSED ≥ 9/10 (أو ≥ 80% عند أقل من 10)
  - `rule` TR-8.2: grep لـ `console\.(log|debug|info)\(` داخل 3 مجلدات البحث الإنتاجية = 0
- **Notes**: هذه الاختبارات الصادقة هي أفضل مقياس لـ "الصدقة" في العمل، لا يتم تجاوزها أبدًا.

## Task 9: فحص استعداد الموبايل وملفات الإعدادات UI/UX (Gesture Dismiss + Safe Areas + Focus Arm + Mobile Suspend)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - قراءة 5 ملفات: (1) useGlobalSearchOverlayDismiss.ts (2) useGlobalSearchInputFocus.ts (3) useGlobalSearchFocusArm.ts (4) GlobalSearchOverlaySheetBody.tsx أو LayerFrame (5) GlobalSearchInstantSheetChrome.test.tsx
  - grep safe-area / touch-action / overscroll-behavior / contain داخل ملفات css/classes للبحث (globalSearchOverlayChromeClasses / searchInstantChromeClasses / globalSearchOverlayLayout / globalSearchOverlayMedia)
  - اختبار وجود Inert / Portal + Escape Stack LIFO + focus trap في input عند الفتح + سحب لأسفل dismiss velocity threshold (>2000px/s يُغلق فورًا)
  - تشغيل 6 اختبارات رسمية: `useGlobalSearchOverlayDismiss.test.tsx` + `useGlobalSearchInputFocus.test.tsx` + `GlobalSearchInstantSheetChrome.test.tsx` + `GlobalSearchInstantPaintCover.test.tsx` + `globalSearchVisualDensity.test.ts` + `globalSearchOverlayMedia.test.ts` (mobile breakpoints)
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `rule` TR-9.1: وجود velocity threshold أو swipe distance في dismiss gesture (من خلال Read فعلي لأسطر useGlobalSearchOverlayDismiss.ts)
  - `rule` TR-9.2: grep لـ `safe-area-inset-` داخل ملفات CSS/classes للبحث ≥ 1 match على الأقل
  - `rule` TR-9.3: `vitest run` للاختبارات الستة → exit 0 و 17/17 PASSED على الأقل
  - `rubric` TR-9.4: جودة استعداد الموبايل الكلية. Scale 1–5, pass ≥4. Evidence: TR-9.1-3 + Read CSS classes
- **Notes**: أمر hàm input focus arm للوحة مفاتيح الهاتف ضروري جداً حتى لا تتأخر الكتابة 200ms على أجهزة منخفضة.

## Task 10: تشغيل بوابة الإنتاج الرسمية للبحث + TypeScript Diagnostics لكل الملفات المعدلة
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 9
- **Description**:
  - تشغيل `node scripts/global-search-production-gate.mjs` فعليًا وتسجيل جميع مخرجاتها رقميًا
  - تشغيل `GetDiagnostics` على workspace بالكامل للتأكد من = []
  - في حال فشل البوابة: إصلاح كل فشل عملي قابل للإصلاح، وتوثيق أي WONTFIX للبيئة فقط (مثل VMM timing flake ب≤ 50ms في اختبار واحد فقط)
  - إعادة تشغيل البوابة حتى Exit 0 + Gate=PASSED
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `rule` TR-10.1: exit code command `global-search-production-gate.mjs` = 0، مع طباعة Gate result = PASSED و Test Files N و Tests N جميعها PASSED (العدد المتوقع ≥ 30 ملف اختبار، ≥ 150 اختباراً)
  - `rule` TR-10.2: `GetDiagnostics` = [] (empty array) لجميع الملفات المعدلة + workspace بالكامل
  - `rubric` TR-10.3: إجمالي نجاح الـ 730+ اختبارًا (من قسم الإعدادات السابقة + البحث الحالي) بدون أي regression. Scale 1–5, pass ≥4. Evidence: TR-10.1 output + GetDiagnostics.
- **Notes**: هذه هي البوابة الرسمية الأخيرة ولا تُصنف المهمة مكتملة إلا بعد exit code 0 فعلي.
