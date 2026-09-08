# Hami Royal Transactions + FOC Section Tier-1 Audit — Product Requirements Document (14 Acceptance Criteria)

## Overview
- **Summary**: تدقيق ذري Tier-1 Zero-to-Production من الصفر لقسم المعاملات ومركز العمليات المالي (FOC)، تطبيقًا لمنهج القسم-القسم الإلزامي من المستخدم مع الحفاظ على 100% ZVF (Zero Visual/Functional Change). يغطي جميع مسارات المعاملات الماليّة: خيوط المهام TaskThreading، بطاقات المعاملات TransactionCard، دفتر الأستاذ الموحد UnifiedLedger، حلول التسوية Settlement (القرض/النَفَقَة/الإخلاء/الغُرَمَاء/كفيل/الحسم)، مستودع المعاملات المستمر PersistentRepository، تشفير البيانات الراقدة (At-Rest Encryption)، مسارات الدفع والمصادقة الماليّة، ونوافذ شيت المعاملات Bottom Sheets.
- **Purpose**: ضمان جاهزية قسم المعاملات للإنتاج الفعلي بمستوى Tier-1 العالمي: (1) صفر Stale Closure عبر حراس الجلسة، (2) إغلاق جراحي 100% بدون تسريب ذاكرة/ديسك/إصبع non-passive، (3) أداء دقيق مع latest performance mark، (4) أمن صارم عبر نمط WIFE BFF وطبقات access control مترابطة + defense-in-depth XSS، (5) جودة كود 95%+ بادئات أوبكود، (6) صدق إغلاق كونسول 0 + diagnostics 0، (7) استعداد موبايل كامل مع escape stack 3 طبقات + gestures حديثة.
- **Target Users**: المستخدم النهائي (المحامي) في بيئة الإنتاج الفعلية + مسؤولي CI/CD.

## Goals
- إغلاق احترافي مثالي وقسم إنتاجي صادق وفق المنهج الإلزامي للمستخدم (Tier-1 World-Class)
- الحفاظ على ZVF 100% تمامًا: جميع التعديلات داخلية فقط (lifecycle / guards / sanitization / opcode prefixes / TS type-casts / cleanup refs)
- الوفاء الصريح بالشرط الإلزامي الدائم: "Console نظيف 100% + `#problems_and_diagnostics = []` مرتين (متوسط + نهائي)"
- اجتياز بوابة الإنتاج الرسمية `node scripts/transactions-production-gate.mjs` (مُنْشأة إن لم تكن موجودة قبل البوابة بنفس نمط الإشعارات/الملف الشخصي) بآخر سطر PASSED exit 0

## Non-Goals
- أي تغيير بصري/وظيفي ظاهر للمستخدم (ZVF ملزم 100%)
- إعادة تصميم واجهات FOC أو TransactionsThreading أو تغيير DOM/CSS
- إضافة ميزات جديدة أو تغيير منطق التسوية أو دفاتر الأستاذ
- تعديل منطق base64/encryption أو تغيير معالجات المفاتيح المشفرة

## Background & Context
4 أقسام سابقة أغلقت بنجاح بنفس المعيار: الإعدادات (539 اختبار PASS) + البحث (258) + الإشعارات (373) + الملف الشخصي (400 في البوابة + 441 عبر المهام) كلها GetDiagnostics=[] + Console Clean 100%. منهج 5 مراحل: Specify→Plan→Approve→Implement→Review مع 14 AC (11 rule + 3 rubric) + 10 Tasks تسلسلية.

**خصائص فريدة لقسم المعاملات مُكيّفة في الـ AC:**
 1. **خيوط المعاملات Transaction Threading**: Tree+Hierarchy مع optimistic patches + repository مستمر للقراءة/الكتابة.
 2. **مدفوعات متعددة**: تحصيل/صرف/رسوم/نفقات/قروض ضمان كفيل + حسم أجور + ضمان غُرَمَاء + أهلية نفقة مستمرة.
 3. **تشفير البيانات الراقدة (At-Rest Encryption)**: `persistTransactionsSecure` + `sanitizeTransactionsThreadingPersist` + `notifyTransactionsPersistFailure`.
 4. **صفحة شاشة المعاملات 3 تبويبات**: TaskThread View + DocumentsTabView + TransactionDetailsScreen.
 5. **مركز العمليات المالي FOC**: Modals عالية التعشيش + Disburse/Expense/Fees/Garnish/Ghuramaa sheets + Ledger lock + guarantor gate.
 6. **5 شيتات سفلية 2 حوارات إجراء**: AddTransactionBottomSheet / AddTaskBottomSheet / DocumentsDeleteDialog / SaveTemplateDialog / ImportTemplatesSheet / ShareProcedureModal + ClientReportDialog / CompleteTransactionDialog.
 7. **Idle Release بعد التخفي 15 ثانية** + Mobile Suspend في الخلفية.
 8. **Escape Stack 4 طبقات مكيّف**: TransactionDetails → TaskThreadDialog → FocModal → Exit (مُكيّف عن 3 طبقات الملف الشخصي بسبب تعشيش FOC).

## Constraints
- **Technical**: ZVF 100% ملزم — لا تغيير DOM/CSS/سلوك ظاهر تحت أي ظرف.
- **Technical**: منع `supabase.from` مباشر في كود الكلاينت (نمط WIFE BFF).
- **Technical**: استخدام `AbortController` + Disposed flags للعمليات الثقيلة (persist/import/cloud loader).
- **Technical**: حراس closures مزدوجة dual guards في كل async flows.
- **Business**: طبقة Access Control 4 طبقات مكيّفة للمعاملات: (1) Cross-Tenant transaction filter، (2) WriteGuard للمعاملات المحمية، (3) PII Scrub قبل المشاركة، (4) Input Sanitization clamp على الأوصاف + المبالغ.
- **Dependencies**: المعاملات تعتمد على `modules/transactionsThreading` (store runtime / repository / optimistic patches) + `services/cloud/lawyerTransactionsCloud` (WIFE BFF).

## Acceptance Criteria

### AC-1: Session Guard 3-أجزاء في transactionsShellOrchestration + useTransactionsListScreen
- **Type**: `rule`
- **Given**: 5 جذور الإنتاج الرسمية للمعاملات (TransactionsThreading + services/transactions + modules/transactionsThreading + hooks/lawyerDashboard/transactions + dashboard transactions entry + FOC)
- **When**: الفحص الذري لـ: `transactionsShellOrchestration.ts` + `useTransactionsListScreen.ts` + `transactionsLiteMenuOpen.ts` + `transactionsChunkLoadError.ts` + `TransactionsThreadingHost.tsx`
- **Then**: النمط 3-أجزاء مطبق: (1) file-level `transactionsSessionIdCounter` + `lastActiveTransactionsFlowId` قبل الهوك/الفلو (2) `sessionIdRef` + `activeSessionIdRef` داخل الهوك (3) dual guards داخل ≥ 5 async closures (warmDiskCache.then → cloudLoader.then → import() chunk.then → querySession.next → persistQueue.finally)
- **Pass Condition**: Session file-level counter موجود في ≥ 2 ملفات + dual guards exist in ≥ 5 async zones + Placement Rule "تصفير activeSessionIdRef فقط في return-cleanup للـ useEffect" مطبق (لا تصفير في بداية effect body)
- **Evidence**: grep `SessionCounter` count ≥ 2 + grep `lastActive.*FlowId` + grep `activeSessionIdRef.current === sessionId` count ≥ 5 + Read lines for placement rule

### AC-2: الإغلاق الجراحي 8-مبادئ (Surgical Close 8) — transactionsShellExit + TransactionsEscapeStack
- **Type**: `rule`
- **Given**: `transactionsShellExit.ts` + `transactionsEscapeStack.ts` + `useTransactionsEscapeStack.ts` + `useTransactionsOpenInteractionGuard.ts` + `unifiedLedgerLock.ts`
- **When**: الإغلاق عبر Back / Escape / Overlay dismiss / Idle timeout
- **Then**: 8 مبادئ إغلاق مغطاة: (1) dispose Ledger lock + abort any cloud persist via AbortController/disposed flag (2) unsubscribe task thread node observers + close details dialog listeners (3) blur active inputs + تصفير window transients ببادئة `__hamiTxn*` (4) remove non-passive listeners لـ FocPointerPrefetch + TaskThread drag (5) release Idle Ledger/Fx resources (6) reset transactionsListQuerySession refs + share procedure draft (7) dispatch `TRANSACTIONS_TEARDOWN_EVENT` CustomEvent لتنظيف أبناء (8) snap data-* closing flag via transactionsShellSnap
- **Pass Condition**: دالة `tearDownTransactionsFloatingState()` (أو موافقة وظيفية) مستدعاة ≥ 5 مرات في مواقع الإغلاق + ≥ 7 مبادئ مغطاة
- **Evidence**: grep `tearDown` + event dispatch + 5 call sites + grep `TRANSACTIONS_TEARDOWN_EVENT` + ≥ 7 principle grep hits

### AC-3: أداء مقاييس latestPerfMark = last entry + ≥ 2 null scenarios (actual threshold met)
- **Type**: `rule`
- **Given**: مقاييس الأداء الرسمية للمعاملات (أي ملف `transactionsPerf*.ts` أو داخل shell orchestration/snap)
- **When**: استدعاء `getLatestTransactionsInteractive()` أو موافقة وظيفية لاحصاء التفاعل الأول
- **Then**: آخر مدخل = `entries[entries.length-1]` وليس الأول؛ قبل كل اختبار `vi.restoreAllMocks()` موجود؛ ≥ 2 سيناريوهات null مغطاة (علامات مفقودة / زمن منعكس / بدون علامة interactive)
- **Pass Condition**: source reads `length-1`؛ ≥ 2 null scenarios في الاختبارات الرسمية، `beforeEach` يحتوي `restoreAllMocks`
- **Evidence**: Read line of latest-interactive + test file restoreAllMocks line + ≥ 2 null/undefined scenario tests

### AC-4: طبقات الأمن 4-Way للمعاملات + نمط WIFE BFF (0 supabase.from في كلاينت)
- **Type**: `rule`
- **Given**: 6 جذور الإنتاج الرسمية للمعاملات + FOC غير الاختبارات
- **When**: grep `supabase\.from\(` على جميع جذور الإنتاج
- **Then**: grep count = 0 تمامًا في كلاينت؛ 4 طبقات أمن مستوفاة: (1) Cloud scope cross-tenant isolation في lawyerTransactionsCloud (2) transactionsWriteGuard/settlementGuarantorGate/focLedgerGuards (3) scrubTransactionSharePii + sanitizeTransactionForSharing قبل أي مشاركة (4) transactionsInputSecurity clamp length+chars على الوصف/المبالغ + path traversal block `../` في import templates + documents paths
- **Pass Condition**: 0 supabase.from in 6 roots + ≥ 4 security sub-layers each verified by tests
- **Evidence**: grep count command 0 + 4 security layer each with test file exists + run security tests exit 0

### AC-5: XSS Defense-in-depth 5 طبقات مكيّفة للمعاملات
- **Type**: `rule`
- **Given**: `sanitizeTransactionsThreadingPersist.ts` + `transactionsInputSecurity.ts` + `sanitizeTransactionForSharing.ts` + `scrubTransactionSharePii.ts` + `procedureGuideNavigation.ts` + `importTaskTemplateToTransaction.ts`
- **When**: أي مدخل نصي (وصف معاملة/ملاحظة task / اسم قالب / اسم مستند / نص مشاركة / خط إجراء) قبل الحفظ أو المشاركة
- **Then**: 5 طبقات defense-in-depth: (1) React auto-escape على output الافتراضي (2) explicit HTML-strip regex `</?[a-z][^>]*>` أو script block explicit داخل sanitize/ clamp functions (3) clamp length على جميع الحقول النصية (4) sanitize transaction before sharing PII redact + URL allowlist (http/https فقط في الـ procedure guide links) (5) `../` traversal block عند import templates + add documents
- **Pass Condition**: explicit HTML-strip regex exists في ≥ 1 sanitize function + ≥ 5 defense scenarios covered across 5 files
- **Evidence**: Read regex in source + sanitizer tests exit 0 + explicit scenarios

### AC-6: جودة الكود — بادئة [transactions:opcode] أو [foc:opcode] أو [txn_*:*] ≥ 95% في كل throw منطقي
- **Type**: `rule`
- **Given**: جميع throw statements في 6 جذور الإنتاج الرسمية للمعاملات (غير الاختبارات وغير invariant context)
- **When**: حساب نسبة وجود البادئة مقارنة بالإجمالي
- **Then**: النسبة ≥ 95%
- **Pass Condition**: (مجموع throws ذات البادئة / إجمالي logical throws للمعاملات) ≥ 0.95. استثناءات مسموحة: (أ) invariant "must be used within Provider" من React Context (ب) DOMException AbortError لـ AbortController.
- **Evidence**: grep total throws / prefixed throws + ratio ≥ 95% + 3 verification tests exit 0

### AC-7: الصدق والنظافة — Honesty Tests ≥ 90% + Console.log = 0 في جذور الإنتاج
- **Type**: `rule`
- **Given**: جميع ملفات اختبارات Honesty الرسمية للمعاملات والموجودة في: `components/lawyer/TransactionsThreading/__tests__/*Honesty*` + `components/lawyer/FinancialOperationsCenter/__tests__/*Honesty*` + `runtime/__tests__/*transactions*Honesty*`
- **When**: تشغيل هذه الاختبارات الرسمية عبر vitest
- **Then**: نسبة PASSED ≥ 90%. grep `console\.(log|debug|info|warn|error|trace|dir)` بالإضافة إلى `debugger;` في جميع جذور الإنتاج الرسمية للمعاملات (غير الاختبارات) → count = 0.
- **Pass Condition**: Honesty ≥ 90% + console grep = 0 + debugger grep = 0
- **Evidence**: vitest run result exit 0 with ≥ 90% rate + two grep commands each output 0

### AC-8: 1st GetDiagnostics (متوسط العمل) بعد مهام 1-7 → GetDiagnostics = []
- **Type**: `rule`
- **Given**: GetDiagnostics على workspace بعد الانتهاء من المهام 1-7 (قبل البوابة)
- **When**: استدعاء GetDiagnostics
- **Then**: قائمة المشاكل فارغة تمامًا `[]` (0 errors، 0 warnings، 0 suggestions)
- **Pass Condition**: الحالة = [] صريحة من أداة GetDiagnostics
- **Evidence**: نتيجة أداة GetDiagnostics = [] + سجل إصلاحات جراحية لأي أخطاء أنواعية تم حلها (Window→Record / Timeout→number / vi.fn generic / literal widening / PerformanceMark cast)

### AC-9: استعداد الموبايل — CSS×4 + Escape Stack 4-طبقات مكيّف FOC + Mobile Suspend
- **Type**: `rule`
- **Given**: جميع ملفات CSS/Styling داخل TransactionsThreading + FOC + هوكات EscapeStack + Mobile Suspend listeners
- **When**: فحص الخصائص الأربعة + EscapeStack + Suspend + non-passive cleanup
- **Then**: 4 خصائص CSS إلزامية كلها موجودة: (1) `safe-area-inset-{top,bottom,left,right}` كاملة الأربع جهات (2) `touch-action` (3) `overscroll-behavior` (4) `contain`. Escape Stack 4 طبقات مكيّف FOC: Layer1 Transaction Details Modal → Layer2 TaskThreadDialog/Sheets → Layer3 FOC Modal → Layer4 Exit Transactions. Mobile Suspend في الخلفية عبر visibilitychange/pagehide يوقف عمليات الكتابة المستمرة. Task/Foc Drag non-passive listeners لها remove نظيف في cleanup.
- **Pass Condition**: 4/4 CSS properties exist + ≥ 3 layer escape stack confirmed via back-handler tests + suspend listener exists + cleanup listeners paired
- **Evidence**: 4 grep hits for each CSS property + escape stack tests exit 0 + pair listener grep

### AC-10: 9 Honesty Tests Close Integrity × 6 dimensions (2026-09-07 Tier-1 Contract)
- **Type**: `rule`
- **Given**: الحزمة الرسمية الجديدة من اختبارات الصدق لقسم المعاملات (9 Honesty tests): transactionsSecurityCloseHonesty, transactionsPerformanceCloseHonesty, transactionsMobileCloseHonesty, transactionsCodeQualityCloseHonesty, transactionsCleanlinessCloseHonesty, transactionsVisualLightnessHonesty, transactionsEscapeStack.test, transactionsRouteTileSectionSurgicalCloseHonesty, transactionsNetworkIsolationHonesty
- **When**: تشغيلها كحزمة قبل البوابة
- **Then**: عدد اجتياز ≥ 8 من 9 (≥ 89% يقترب من 90%) إن أمكن 9/9 كاملة
- **Pass Condition**: ≥ 8/9 Honesty Close Tests PASS
- **Evidence**: vitest run 9 files → count PASS / total ≥ 8

### AC-11: Chunk Deferral + Cloud Loader Integrity (Transactions + FOC)
- **Type**: `rule`
- **Given**: `TransactionsChunkGuard.tsx` + `transactionsFeatureLoader.ts` + `focOverlaySurfacesLazy.tsx` + `focLazySettlementChrome.tsx` + `focLedgerMotionLazy.ts`
- **When**: تحميل الصفحة أو فتح FOC
- **Then**: ثقيل FOC و thready/overlay modules محملة via dynamic `import()` — ZERO import ثابت للمكونات الثقيلة في top-level. Shadow Bomb Check absence: لا ملف `TransactionsThreading.tsx` بجانب مجلد TransactionsThreading.
- **Pass Condition**: dynamic `import()` calls exist for heavy chunks + shadow bomb file does not exist
- **Evidence**: grep `import(` count in 5 chunk loader files ≥ 3 + glob shadow module returns empty

### AC-12: Lifecycle Clarity — Owner View + Cross-Open Reopen 3× (Rubric)
- **Type**: `rubric`
- **Dimension**: وضوح خطية دورة حياة قسم المعاملات من لحظة الـ warmBoot إلى الـ tearDown النهائي مع حراس الجلسة + عدم تلويث تقارير الأداء عند إعادة الفتح السريع المتتالي 3 مرات
- **Scale**: 1-5
- **Anchors**: 1 = دورة حياة غير واضحة تسريب في تقرير الدعوى الثانية والثالثة من الجلسات السابقة 3 = حراس موجودة لكن نقص cleanup أو تصفير مبكر 5 = خطية 8 مراحل واضحة (warmDisk → orchestrate guard → mount → querySession → persist queue → 8-principle surgical close + idle release + teardown dispatch) بدون أي تداخل تقارير بين 3 جلسات متتالية سريعة
- **Pass Threshold**: >= 4
- **Evidence**: Session guard tests exit 0 + 3 reopen perf metrics one-report test passes + close honesty exit 0

### AC-13: Security Hardening — 4 Layers + At Rest Encryption + PII Scrub (Rubric)
- **Type**: `rubric`
- **Dimension**: قوة نظام الأمن للمعاملات مع تشفير بيانات راقدة + PII scrub قبل المشاركة + تحصين دفتر الأستاذ ضد تعديلات غير مصرح بها
- **Scale**: 1-5
- **Anchors**: 1 = لا تشفير راقد و PII ظاهر في exports 3 = تشفير موجود لكن gaps في الـ scrub أو الـ guard 5 = at-rest encryption tests passing (persistTransactionsSecure) + PII scrub tests passing + settlementGuarantorGate + focLedgerGuards + write guards + 0 supabase.from WIFE BFF سليم، جميعها tests verified exit 0
- **Pass Threshold**: >= 4
- **Evidence**: Security pack tests exit 0 (atRest + scrub + guards + inputSec + importSanitize) + 0 supabase grep

### AC-14: Closure Integrity — Console 100% Clean + Diagnostics=[] مرتين (Rubric)
- **Type**: `rubric`
- **Dimension**: صدق إغلاق كامل يفي بالشرط الإلزامي الدائم للمستخدم: كونسول نظيف 100% + قائمة مشاكل فارغة مرتين (متوسط Task 8 + نهائي Task 10)
- **Scale**: 1-5
- **Anchors**: 1 = console warnings/errors كثيرة من كود المعاملات أو Diagnostics غير فارغ 3 = كونسول نظيف لكن Diagnostics بها تحذيرات أقل من خطأ أو لم يتم تشغيل المرة الثانية 5 = Console grep 0 جذور الإنتاج + stderr البوابة خالية تمامًا من أي warn/error من كود المعاملات + GetDiagnostics [] مرتين متتاليتين (متوسط + نهائي) بدون أي استثناء
- **Pass Threshold**: >= 4
- **Evidence**: Console grep 0 results + stderr capture from gate contains no transactions warn/err + two GetDiagnostics runs both = []

## Open Questions
- [ ] هل توجد بوابة إنتاج رسمية موجودة فعليًا باسم `scripts/transactions-production-gate.mjs` أم سيتم إنشاؤها في بداية Task9 بنفس نمط `profile-production-gate.mjs` مع PROFILE_SHADOW_STUB الموافقة (TXN_SHADOW_STUB)؟ — حاليًا لا ملف من هذا النوع (glob أنجز بعدم الوجود: no match) → ستم إنشاؤها جراحيًا في Task9.
