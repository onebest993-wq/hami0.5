# Hami Royal Transactions + FOC Section Tier-1 — Implementation Plan (10 Tasks تسلسلية)

## Task 1: Session Guard 3-أجزاء في transactionsShellOrchestration + Transactions Lifecycle
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة سطر بسطر لـ: `src/app/services/transactions/transactionsShellOrchestration.ts` + `transactionsShellSnap.ts` + `transactionsShellNavigation.ts` + `src/app/components/lawyer/TransactionsThreading/hooks/useTransactionsListScreen.ts` + `src/app/components/lawyer/TransactionsThreading/hooks/useTransactionsHubSessionHydration.ts` + `TransactionsThreadingHost.tsx`
  - توثيق GAPs إن وجدت في نمط الحارس 3-أجزاء:
    1. file-level `transactionsOpenFlowSessionCounter` + `lastActiveTransactionsFlowId` قبل الهوك/الفلو.
    2. `sessionIdRef` + `activeSessionIdRef` داخل الهوك.
    3. dual guards في ≥ 5 async closures: warmDiskCache.then → cloudLoader.then → chunk `import()` then → querySession iteration → persistQueue.finally → (أي غيرها: prefetch transactionTile، details reveal).
  - **Placement Rule ملزم (درس من الإشعارات+الملف الشخصي)**: تصفير `activeSessionIdRef` فقط في return-cleanup function للـ useEffect الرئيسي — NO تصفير في بداية effect body.
  - في حال غياب الحارس: إضافته جراحيًا مع ZVF 100%.
- **Acceptance Criteria Addressed**: AC-1, AC-12
- **Test Requirements**:
  - `rule` TR-1.1: `npx vitest run src/app/services/transactions/__tests__/transactionsShellOrchestration.test.ts src/app/services/transactions/__tests__/transactionsShellSnap.test.ts src/app/components/lawyer/TransactionsThreading/__tests__/TransactionsThreadingHost.test.tsx src/app/components/lawyer/TransactionsThreading/hooks/__tests__/useTransactionsOpenInteractionGuard.test.ts` → exit 0.
  - `rule` TR-1.2: grep `SessionCounter` أو `lastActiveTransactionsFlowId` أو `ActiveTransactionsFlowId` في ملفات الفلو/الهوك = ≥ 2 نتائج file-level.
  - `rule` TR-1.3: عدد مناطق dual guard (`sessionId === activeSessionIdRef.current`) داخل async closures = ≥ 5 في المجموع.
  - `rule` TR-1.4: Placement Rule تحقق: تصفير activeSessionIdRef موجود في return cleanup فقط (ليس في بداية الفلو) — Read تأكيد سطر بسطر.
  - `rubric` TR-1.5: Lifecycle clarity في 6 ملفات أساسية؛ مقياس 1-5 كـ AC-12؛ عتبة ≥ 4؛ أدلة = نتائج الاختبار + قراءة الأسطر الحرجة.

## Task 2: الإغلاق الجراحي 8-مبادئ Surgical Close — tearDown + Event Dispatch + ≥ 5 Call Sites
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - قراءة سطر بسطر لـ: `hooks/lawyerDashboard/transactions/transactionsShellExit.ts` + `components/lawyer/TransactionsThreading/transactionsEscapeStack.ts` + `components/lawyer/TransactionsThreading/hooks/useTransactionsEscapeStack.ts` + `components/lawyer/FinancialOperationsCenter/unifiedLedgerLock.ts` + `services/transactions/persistTransactionsSecure.ts` + `services/transactions/transactionsShellSnap.ts`
  - توثيق GAPs إن وجدت في 8 مبادئ الإغلاق:
    1. Dispose Ledger Lock + abort cloud persist via disposed flag / AbortController.
    2. Unsubscribe Task Thread Node observers + Transaction Details dialog listeners.
    3. Blur activeElement + inputs + مسح window transients ببادئة `__hamiTxn*` (مسودة مشاركة، مسودة قالب، draft add-txn).
    4. Remove non-passive touch listeners لـ Foc pointer prefetch + Task Thread Overlay drag.
    5. Release Idle Ledger / Fx resources (unifiedLedgerLite ref / Settlement context unsub).
    6. Reset transactionsListQuerySession refs + shareProcedure draft + importTemplate temps.
    7. Dispatch `TRANSACTIONS_TEARDOWN_EVENT` CustomEvent لتنظيف الأبناء (Task / Foc / Sheets / Dialogs).
    8. Snap `data-*` closing flag via transactionsShellSnap + release overlay settle refs.
  - إنشاء/تحديث دالة `tearDownTransactionsFloatingState()` داخل `transactionsShellExit.ts` تشمل (3) + (7) + مسح الـ transients. استدعاؤها ≥ 5 مواقع (early returns + finish + idle before release + close flow).
- **Acceptance Criteria Addressed**: AC-2, AC-12
- **Test Requirements**:
  - `rule` TR-2.1: `npx vitest run src/app/hooks/lawyerDashboard/transactions/__tests__/transactionsShellExit.test.ts src/app/components/lawyer/TransactionsThreading/__tests__/transactionsEscapeStack.test.ts src/app/components/lawyer/TransactionsThreading/hooks/__tests__/useTransactionsEscapeStack.test.ts src/app/components/lawyer/FinancialOperationsCenter/__tests__/focLedgerGuards.test.ts src/app/runtime/__tests__/transactionsRouteTileSectionSurgicalCloseHonesty.test.ts src/app/components/lawyer/TransactionsThreading/__tests__/transactionsSecurityCloseHonesty.test.ts` → exit 0 (6 ملفات).
  - `rule` TR-2.2: عدد مبادئ الإغلاق المغطاة = ≥ 7 مبادئ (grep لكل مبدأ).
  - `rule` TR-2.3: دالة `tearDownTransactionsFloatingState` (أو ما يعادلها) مستدعاة ≥ 5 مرات في مواقع الإغلاق الرسمية.
  - `rule` TR-2.4: dispatch `TRANSACTIONS_TEARDOWN_EVENT` مؤكد في سطر على الأقل + paired removeEventListener cleanup في أبناء FOC / TaskThread.
  - `rubric` TR-2.5: Surgical Close clarity مقياس 1-5 كـ AC-12 عتبة ≥ 4.

## Task 3: أداء مقاييس latestPerfMark = Last Entry + restoreAllMocks + ≥ 2 null scenarios
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (متوازي مع Task 2 إن أمكن)
- **Description**:
  - اكتشاف ملف مقاييس الأداء الرسمية للمعاملات عبر: grep `performance.mark.*transactions` و `getLatestInteractive` أو `getLatestTransactions` داخل services/transactions و components/TransactionsThreading و modules/transactionsThreading.
  - التأكد من `last = entries[entries.length - 1]` وليس أول.
  - قراءة ملفات اختبار perf (أي `*transactionsPerf*test` أو داخل `__tests__` للخدمات). التحقق من `beforeEach` يحتوي على `vi.restoreAllMocks()` + `vi.clearAllMocks()`.
  - تأكد من ≥ 2 null scenarios: (1) لا علامة interactive تعيد null، (2) علامة واحدة فقط بدون interactive تعيد null، (3) زمن منعكس تعيد null (اختياري لتجاوز ≥ 2).
  - إن غابت أي حالة: إضافتها جراحيًا.
- **Acceptance Criteria Addressed**: AC-3, AC-12
- **Test Requirements**:
  - `rule` TR-3.1: `npx vitest run src/app/components/lawyer/TransactionsThreading/__tests__/transactionsPerformanceCloseHonesty.test.ts src/app/runtime/__tests__/transactionsNetworkIsolationHonesty.test.ts` (أو ملفات الاختبار الفعلية للـ perf إن تم اكتشاف مسارات أخرى) → exit 0.
  - `rule` TR-3.2: `getLatest*Interactive` في الملف يقرأ `entries.length - 1` (grep + Read تأكيد).
  - `rule` TR-3.3: `beforeEach` في الاختبارات الرسمية للـ perf يحتوي `vi.restoreAllMocks()` إن وجد ملف اختبار للـ perf.
  - `rule` TR-3.4: ≥ 2 حالات null scenario في الاختبارات (مؤكدة عبر Read سطر بسطر).
  - `rule` TR-3.5: thresholds موثقة إن وجدت ملف budget.

## Task 4: الأمن 4 طبقات + WIFE BFF — 0 supabase.from + At Rest Encryption + PII Scrub
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - grep دقيق `supabase\.from\(` على 6 جذور الإنتاج الرسمية للمعاملات (غير الاختبارات):
    1. `components/lawyer/TransactionsThreading/**/*.{ts,tsx}`
    2. `services/transactions/**/*.{ts,tsx}`
    3. `modules/transactionsThreading/**/*.{ts,tsx}`
    4. `hooks/lawyerDashboard/transactions/**/*.{ts,tsx}`
    5. `components/lawyer/dashboard/TransactionsInstantPaintCover.tsx` + `LawyerDashboardTransactionsOverlayEntry.tsx`
    6. `components/lawyer/FinancialOperationsCenter/**/*.{ts,tsx}`
  - التأكيد على النتيجة: 0 matches بالضبط (نمط WIFE BFF سليم عبر services/cloud/lawyerTransactionsCloud.ts).
  - توثيق وتشغيل اختبارات الأمن الرسمية 4 طبقات: (1) cross-tenant isolation في lawyerTransactionsCloud (2) settlementGuarantorGate + focLedgerGuards + write guards (3) PII scrub via scrubTransactionSharePii + sanitizeTransactionForSharing (4) transactionsInputSecurity clamp + path traversal block `../` في import templates + documents paths.
- **Acceptance Criteria Addressed**: AC-4, AC-13
- **Test Requirements**:
  - `rule` TR-4.1: grep `supabase\.from\(` count = 0 بالضبط في 6 جذور الإنتاج (غير الاختبارات).
  - `rule` TR-4.2: تشغيل اختبارات الأمن الرسمية: `npx vitest run src/app/services/transactions/__tests__/transactionsAtRestEncryption.test.ts src/app/services/transactions/__tests__/sanitizeTransactionsThreadingPersist.test.ts src/app/services/transactions/__tests__/sanitizeTransactionForSharing.test.ts src/app/services/transactions/__tests__/transactionsInputSecurity.test.ts src/app/services/transactions/__tests__/persistTransactionsSecure.test.ts src/app/components/lawyer/FinancialOperationsCenter/__tests__/settlementGuarantorGate.test.ts src/app/components/lawyer/FinancialOperationsCenter/__tests__/focLedgerGuards.test.ts src/app/services/cloud/__tests__/lawyerTransactionsCloudLocalOnly.test.ts src/app/services/transactions/__tests__/importTaskTemplateToTransaction.test.ts` → exit 0 (9 ملفات أمن).
  - `rule` TR-4.3: ≥ 4 طبقات أمن مؤكدة.
  - `rubric` TR-4.4: Security Strength مقياس 1-5 كـ AC-13 عتبة ≥ 4.

## Task 5: XSS Defense-in-depth 5 طبقات مكيّفة للمعاملات
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - قراءة سطر بسطر لـ: `sanitizeTransactionsThreadingPersist.ts` + `transactionsInputSecurity.ts` + `sanitizeTransactionForSharing.ts` + `scrubTransactionSharePii.ts` + `importTaskTemplateToTransaction.ts` + `procedureGuideNavigation.ts`.
  - توثيق GAPs إن وجدت في 5 طبقات:
    1. React auto-escape (افتراضي دائمًا).
    2. Explicit HTML-strip regex `</?[a-z][^>]*>` أو script block regex `<script[\s\S]*?<\/script>` صريح في وظيفة تنظيف واحدة على الأقل.
    3. Clamp length على all text fields (وصف / ملاحظة / قالب / اسم مستند / نص مشاركة / إجراء).
    4. PII redact قبل المشاركة + procedure guide navigation allowlist URLs (http/https فقط).
    5. `../` path traversal block عند import templates / add document paths.
  - إن وجد Gap في explicit regex strip: إضافته جراحيًا داخل relevant sanitize/clamp function مع الحفاظ على ZVF 100%.
- **Acceptance Criteria Addressed**: AC-5, AC-13
- **Test Requirements**:
  - `rule` TR-5.1: `npx vitest run src/app/services/transactions/__tests__/sanitizeTransactionsThreadingPersist.test.ts src/app/services/transactions/__tests__/transactionsInputSecurity.test.ts src/app/services/transactions/__tests__/sanitizeTransactionForSharing.test.ts src/app/services/transactions/__tests__/importTaskTemplateToTransaction.test.ts src/app/services/transactions/__tests__/procedureGuideNavigation.test.ts` → exit 0 (5 ملفات sanitizer).
  - `rule` TR-5.2: ≥ 5 سيناريوهات sanitize/path مستوفاة.
  - `rule` TR-5.3: explicit HTML tag strip regex موجود صريحًا في ملف الإنتاج sanitize أو clamp على الأقل واحد (defense-in-depth).
  - `rubric` TR-5.4: XSS Strength مقياس 1-5 كـ AC-13 عتبة ≥ 4.

## Task 6: جودة الكود — بادئة [transactions:opcode] / [foc:opcode] / [txn:*:*] ≥ 95%
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - grep `throw new (Error|TypeError|RangeError|Foc\w+Error|Txn\w+Error|Settlement\w+Error|Ledger\w+Error)` في 6 جذور الإنتاج الرسمية للمعاملات (غير الاختبارات).
  - grep فرعي للبادئات: `\[transactions:|\[foc:|\[txn_|\[persist_txn:|\[ledger:|\[settlement:`
  - استثناءات WONTFIX: (أ) React Context invariant "must be used within Provider"، (ب) DOMException('Aborted','AbortError') لـ AbortController الاسم النظامي، (ج) أخطاء من مكتبات خارجية import محض بدون تعديل.
  - حساب النسبة (البادئة / الإجمالي المنطقي). إن كانت < 95%: إضافة البادئات جراحيًا مع الحفاظ على نص الخطأ الأساسي للتشخيص.
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-6.1: (عدد throw مع البادئة / عدد throw المنطقي) ≥ 0.95.
  - `rule` TR-6.2: لا يوجد أي throw منطقي للمعاملات (غير استثناءات WONTFIX الثلاثة) بدون بادئة.
  - `rule` TR-6.3: بعد التعديل تشغيل حزمة سريعة: `npx vitest run src/app/services/transactions/__tests__/persistTransactionsSecure.test.ts src/app/components/lawyer/FinancialOperationsCenter/__tests__/settlementGuarantorGate.test.ts src/app/components/lawyer/FinancialOperationsCenter/__tests__/focLedgerGuards.test.ts` → exit 0 (3 ملفات تحمل throw sites أساسية).

## Task 7: النظافة والصدق — Honesty Tests ≥ 90% + Console/debugger grep = 0
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - اكتشاف جميع اختبارات Honesty الرسمية للمعاملات عبر:
    * `src/app/components/lawyer/TransactionsThreading/__tests__/*Honesty*.test.*` (موجودة فعليًا: 7 ملفات من البحث الشامل — Security / Performance / Mobile / CodeQuality / Cleanliness / VisualLightness + Android/Close if any)
    * `src/app/components/lawyer/FinancialOperationsCenter/__tests__/*Honesty*.test.*` (2 ملفات: focLiveWeight + focNestedModalMobile)
    * `src/app/runtime/__tests__/*transactions*Honesty*` (2 ملفات: surgicalClose + networkIsolation)
  - تشغيل جميعها → حساب نسبة PASS. إن < 90%: تشخيص + إصلاح جراحي إن كان في كود الإنتاج (لا تعديل أسس الاختبار إلا خلل أنواع واضح مثل vi.fn generic).
  - grep نهائي لـ `console\.(log|debug|info|warn|error|trace|dir)` + `debugger;` في 6 جذور الإنتاج الرسمية للمعاملات (غير الاختبارات) → count = 0 لكل منهما. أي console عاري → إزالة أو إحالة إلى Sentry الرسمي إن وجد.
- **Acceptance Criteria Addressed**: AC-7, AC-10 (9 Honesty close integrity tests المذكورة في الـ AC)
- **Test Requirements**:
  - `rule` TR-7.1: ≥ 90% من جميع اختبارات Honesty الرسمية PASSED + ≥ 8 من 9 الحزمة المذكورة في AC-10 PASS.
  - `rule` TR-7.2: grep console.* count = 0 + debugger count = 0 في 6 جذور الإنتاج (غير الاختبارات).
  - `rubric` TR-7.3: صدق الإغلاق مقياس 1-5 كـ AC-14 عتبة ≥ 4.

## Task 8: أول GetDiagnostics = [] (متوسط العمل قبل البوابة) + CSS×4 Mobile + EscapeStack
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - **Part A (Mobile CSS + EscapeStack من AC-9)**:
    - اكتشاف ملفات CSS/styled للمعاملات/FOC عبر glob + grep 4 خصائص:
      1. `safe-area-inset-{top,bottom,left,right}` كلها 4
      2. `touch-action`
      3. `overscroll-behavior`
      4. `contain`
    - قراءة `useTransactionsEscapeStack.ts` + فتح زر Escape 4 طبقات: TransactionDetails → TaskThreadDialog → FOC Modal → Exit Transactions
    - فحص Mobile Suspend: `visibilitychange` / `pagehide` listeners للإيقاف مؤقت لعمليات الكتابة الثقيلة (persist queue/ledger/import).
    - non-passive listeners لـ foc pointer prefetch + task thread drag: remove مطابق في cleanup.
  - **Part B (أول GetDiagnostics)**:
    - تشغيل أداة GetDiagnostics. إن لم يكن `[]`: إصلاح جراحي للأنواع داخل نطاق المعاملات أولاً ثم خارج نطاقها إن لزم (نفس نمط أقسام سابقة: vi.fn 1 generic، literal widening، Timeout→number، Window→unknown→Record، PerformanceMark cast). إعادة تشغيل حتى = [].
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-8.1: `npx vitest run src/app/components/lawyer/TransactionsThreading/__tests__/transactionsMobileCloseHonesty.test.ts src/app/components/lawyer/FinancialOperationsCenter/__tests__/focNestedModalMobileHonesty.test.ts src/app/components/lawyer/TransactionsThreading/__tests__/TransactionsMobile.test.tsx src/app/components/lawyer/TransactionsThreading/hooks/__tests__/useTransactionsEscapeStack.test.ts src/app/components/lawyer/TransactionsThreading/__tests__/transactionsEscapeStack.test.ts src/app/components/lawyer/TransactionsThreading/taskThread/__tests__/useTaskThreadController.escape.test.ts` → exit 0 (6 ملفات موبايل).
  - `rule` TR-8.2: 4/4 خصائص CSS إلزامية موجودة جميعها (grep 4 نتائج مختلفة).
  - `rule` TR-8.3: Escape Stack ≥ 3 طبقات مؤكدة (≥ 3 سيناريوهات في الاختبارات).
  - `rule` TR-8.4: GetDiagnostics الأول → `[]` بعد الإصلاحات إن لزم.
  - `rubric` TR-8.5: Mobile Readiness مقياس 1-5 عتبة ≥ 4.

## Task 9: إنشاء + تشغيل بوابة الإنتاج الرسمية transactions-production-gate.mjs — exit 0 + PASSED
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 8 (GetDiagnostics أول = [] قبل البوابة)
- **Description**:
  - إن لم تكن البوابة موجودة (glob فعلي: no match حاليًا) — إنشاؤها جراحيًا بنفس نمط `profile-production-gate.mjs` مع:
    (أ) Pre-flight criticalPaths: ≥ 30 ملف رسمي للمعاملات/FOC/hooks/modules.
    (ب) TXN_SHADOW_STUB anti-bomb check: لا ملف `TransactionsThreading.tsx` بجانب مجلد TransactionsThreading/ (إيجاده = fail the gate).
    (ج) تشغيل حزمة اختبارات الوحدة الرسمية للمعاملات (أي اختبارات داخل services/transactions/__tests__ + modules/transactionsThreading/__tests__ + TransactionsThreading/__tests__ الرسمية).
    (د) Exit 0 + آخر سطر `=== Gate result === PASSED`.
  - تشغيل فعلي للبوابة: `node scripts/transactions-production-gate.mjs` + مراقبة stdout/stderr بدقة.
  - التأكيد على: exit 0 + PASSED + stderr خالي تمامًا من أي warn/error من كود المعاملات الإنتاجي (تحذيرات act من testing-library مسموحة فقط بيئيًا). أي تحذيرات من كود المعاملات → إصلاح جراحي + إعادة تشغيل البوابة حتى exit 0.
- **Acceptance Criteria Addressed**: AC-10 (آخر ضمان Honesty)، AC-11، AC-14 (Console Clean جزء البوابة)
- **Test Requirements**:
  - `rule` TR-9.1: `node scripts/transactions-production-gate.mjs` → exit 0 + آخر سطر PASSED.
  - `rule` TR-9.2: TXN_SHADOW_STUB check داخل البوابة ناجح (لا ملف شيطاني).
  - `rule` TR-9.3: Chunk Deferral Integrity + Cloud Loader tests داخل البوابة جميعها PASSED (لا chunk load error حقيقي).
  - `rule` TR-9.4: stderr خالي من أي warn/error من كود المعاملات الإنتاجي (فقط testing-library act hints أو غيرها من بيئة الاختبار العامة).

## Task 10: GetDiagnostics نهائي = [] + Review Phase كتابة review.md → PASS 14/14
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 9 (البوابة PASSED exit 0 أولًا)
- **Description**:
  - **إلزامي المستخدم**: تشغيل `GetDiagnostics` النهائي → **يجب أن تكون = []** صراحة. إن لم تكن: إصلاح جراحي للأنواع حتى تصبح فارغة.
  - مرحلة مراجعة مستقلة Review Phase:
    1. استرجاع 14 AC من spec.md + جمع الأدلة الرقمية لكل AC (vitest exit codes / grep counts / GetDiagnostics / stderr captures / glob empty / call sites).
    2. تقييم 3 Rubrics AC-12 (Lifecycle) + AC-13 (Security Hardening) + AC-14 (Closure Honesty) مقياس 1-5 كلها مع الأساس والمرجع.
    3. كتابة `review.md` رسمي داخل مجلد المواصفات للمعاملات يحتوي على: Scope + Standard + ZVF + User Mandate Honored. جدول 14 AC: نتيجة كل AC + الأدلة PATH:LINE. Rubric Scores كلها ≥ 4 + سبب. جدول التعديلات الجراحية لكل ملف (رقم / ملف / التعديل / مصدق اختباري). النتيجة النهائية **PASS Tier-1 PRODUCTION READY** + ختم.
- **Acceptance Criteria Addressed**: AC-8 (جزء Diagnostics الثاني)، AC-14 (Rubric النهائي)، Overall PASS
- **Test Requirements**:
  - `rule` TR-10.1: GetDiagnostics النهائي → `[]` صفر أخطاء + صفر تحذيرات + صفر suggestions.
  - `rule` TR-10.2: ملف review.md منشأ داخل مجلد المواصفات الرسمي ويتضمن أدلة لكل 14 AC مع PATH:LINE.
  - `rule` TR-10.3: النتيجة النهائية = PASS (14/14 AC مستوفاة + 3 Rubrics جميعها ≥ 4 + البوابة exit 0 PASSED + Console grep=0 + GetDiagnostics مرتين = []).
  - `rubric` TR-10.4: Closure Honesty النهائي مقياس 1-5 كـ AC-14 عتبة ≥ 5 (عتبة قصوى إذا تحقق جميع الشروط بدون WONTFIX غير مبررة).
