# قسم الإعدادات (Settings) — خطة التنفيذ العمقية (Spec Mode Deep Audit v10.5-tier1)

**مراجع أساسية (اقرأها أولًا قبل أي تعديل حرفيًا):**
- [spec.md](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.trae/specs/settings-deep-production-audit-2026-09-07/spec.md) — 9 محاور + 9 Acceptance Criteria الرسمية
- [settingsPerfBudget.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfBudget.ts) — budgets الأداء الرسمية
- [LawyerSettingsProvider.tsx](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/context/lawyerSettings/LawyerSettingsProvider.tsx) — حافظة الحالة الرئيسية
- [HamiSettingsApp.tsx](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/HamiSettingsApp.tsx) — مدخل مكونات UI
- [settingsShellOrchestration.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsShellOrchestration.ts) — orchestration فتح/إغلاق
- [verifySensitiveSettingsAction.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/verifySensitiveSettingsAction.ts) — بوابة العمليات الحساسة
- [.audit/tsc-baseline.json](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/tsc-baseline.json) (956) [lint](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/lint-baseline.json) (11) [test](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/test-ratchet-baseline.json) (21) [dead-exports](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/dead-exports-baseline.json) (1885) — الراتشيتات الثلاثية الأساسية

**نقطة البداية الفعلية NON-NEGOTIABLE:** HEAD=`3b608afd` improve/current clean 0 uncommitted. كل Task منفصل commit ذري bisectable. لا ترخي أي راتشيت. ZVF 100% ملزم لكل Task.

---

## المرحلة A: الأساسيات — المسح الجردي + إصلاحات جودة الكود + Button/Div Honesty (الأولوية العالية P1)

## Task 1: جرد شامل ذري لعيوب قسم الإعدادات (G1 + G3 + G4 — inventory أولي)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  1. إنتاج 3 تقارير جردية ذرية داخل مجلد temp work (لا تُرتَبِط commits بعد، تُستخدم كـ input لـ T2/T3/T4):
     - **G1 Code Quality Inventory**: مسح regex دقيق لجميع ملفات قسم الإعدادات PRODUCTION (غير __tests__) يخرج لكل hit تفاصيل: `path:line:type` حيث type ∈ {TODO, FIXME, HACK, XXX, XME, console.log, console.warn, console.error, throw-generic (رسالة < 60 chars بدون context)}.
     - **G3 Button Honesty Inventory**: مسح مخصص `div-button-audit.mjs` (جديد) على `HamiSettings/` و `RoyalLawyerProfile/components/settings/` يخرج قائمة بـ: `path:line:className:hasOnClick:hasOnKeyDown:hasRoleButton:hasTabIndex:cursorPointer`. يُصنف كل div إلى: (SAFE = wrapper presentation فقط، NEEDS-FIX = interactive div بدون button، WONTFIX-CANDIDATE = اختبار قد يعتمد عليه).
     - **G4 Semantic Div Inventory**: تشغيل `div-semantic-index.mjs` (من المرحلة السابقة) محصورًا على `**/HamiSettings/**` و `**/RoyalLawyerProfile/components/settings/**` فقط، مع إضافة category جديدة `tabpanel` (settings-tab-panel) و `dialog` (settings-shell-root).
     - **G5 Critical Paths (Security)**: قراءة يدوية لـ 9 ملفات أمنية حرجة وتسجيل كل مسار: (a) does it call verifySensitiveSettingsAction؟ (b) rollback/atomic guarantee؟ (c) error handling؟
  2. ملفات الجرد تُخزن في مجلد عمل مثل `.audit/settings-inventory/` لاستخدامها في T2/T3/T4.
- **Acceptance Criteria Addressed**: AC-01 (الجرد الأساسي للإصلاحات), AC-02 (button inventory), AC-03 (semantic div inventory), AC-04 (security inventory), AC-09 (مدخلات التقرير النهائي)
- **Test Requirements**:
  - `rule` TR-1.1: ملفات الجرد الأربعة موجودة في `.audit/settings-inventory/`: `code-quality-hits.csv`, `div-button-hits.csv`, `semantic-div-candidates.csv`, `security-critical-paths.md`. الدليل = `ls .audit/settings-inventory/`.
  - `rule` TR-1.2: عدد إجمالي الملفات التي تم فحصها في الجرد = الأعداد من spec.md (services/settings 75 + HamiSettings 52 + ProfileSettings 10 + hooks 3 + api 4 = 144 ملف). الدليل = `wc -l` من الجرد أو `find` count.
  - `rule` TR-1.3: `npm run guard:tsc` exit=0 و `npm run guard:lint` exit=0 بعد إنشاء ملفات الجرد (لا تعديلات على production code في هذا Task). الدليل = stdout الراتشيتين.
  - `rubric` TR-1.4: دقة وشمولية الجرد. Scale 1-5. Anchors: 1=30% فقط من الملفات فُحصت, 3=70% مع فراغات, 5=100% من 144 ملف، وكل hit به path:line دقيق + النص المصدر في عمود csv منفصل. Threshold ≥ 4.
- **Notes**: Task مسح فقط — 0 تعديلات على src/ code. لا commit إنتاجي بعد هذا Task إلا إذا أردنا حفظ أدوات الجرد فقط. الهدف: جمع بيانات إدخال لـ T2/T3/T4 بدقة تامة.

## Task 2: إصلاح عيوب جودة الكود في services/settings + UI (G1 — REMEDIATED vs WONTFIX)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (code-quality-hits.csv من الجرد — نعرف بالضبط ماذا نصلح قبل أن نصلح شيئًا)
- **Description**:
  1. لكل hit في code-quality-hits.csv (47 hit مبدئي في 10 ملفات services/settings)، يُصنف إلى REMEDIATED أو WONTFIX بناءً على القواعد التالية:
     - **REMEDIATED (يصلح)**: TODO/FIXME/HACK قديمة واضحة التنفيذ (≤ 15 سطر إصلاح). console.log / console.warn إنتاجي بلا سبب (مستخدمة في debug وليست structured logger). throw جديد ("رسالة قصيرة 5 كلمات") بدون Error subtype وبدون context.
     - **WONTFIX (يُوثق فقط)**: TODO معتمد كـ tech debt وُثق في tasks سابقة. console.error داخل حارس catch مُرسل بالفعل لـ Sentry بعدها. throw مخصصة (validation) لها رسالة محددة جيدًا.
  2. تنفيذ الإصلاحات ذرية لكل REMEDIATED hit مع الحفاظ على ZVF وتوافق الـ API الخارجي (لا تغيير signatures الدوال أو أنواع العودة).
  3. لكل WONTFIX: تسجيل path:line + 3 أسطر سبب في ملف work يُستخدم لاحقًا في التقرير النهائي AC-09.
- **Acceptance Criteria Addressed**: AC-01 (0 عيوب مفتوحة غير مصنفة), AC-00 (الراتشيتات ثابتة)
- **Test Requirements**:
  - `rule` TR-2.1: إعادة تشغيل مسح regex نفسها (المنفذة في T1) على الملفات المعدلة → عدد hits الجديد = عدد WONTFIX مصنفة فقط (صفر غير مصنف). الدليل = grep output بعد الإصلاح.
  - `rule` TR-2.2: 4/4 راتشيتات PASS (tsc ≤ 956, lint ≤ 11, tests ≤ 21, dead-exports ≤ 1885). الدليل = stdout الـ guards.
  - `rule` TR-2.3: اختبارات الملفات التي تم إصلاحها standalone (مثل: إذا أصلحنا deleteLawyerAccount.ts → `npx vitest run src/app/services/settings/__tests__/deleteLawyerAccount.test.ts`) exit=0. الدليل = stdout.
  - `rubric` TR-2.4: نسبة REMEDIATED من الإجمالي. Scale 1-5. Anchors: 1=<20% remediated, 3=40-60% remediated والباقي WONTFIX مبرر, 5=>80% remediated للأخطاء الحقيقية (console/throw)، وكل WONTFIX له سبب واضح 3 أسطر. Threshold ≥ 4.
- **Notes**: Commit messages منفصلة لنفس النوع: `chore(quality): remove stray console.log + throw context enrich in businessBackup*.ts`. **لا Visual Edits**. لات لمس أي className/style/children.

## Task 3: Button Honesty — تصحيح divs المستخدمة كـ interactive buttons (G3 + FR-1)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (div-button-hits.csv)
- **Description**:
  1. لكل div في قائمة NEEDS-FIX من div-button-hits.csv:
     - يُحاول تحويل <div onClick={...} className="..."> إلى <button type="button" onClick={...} className="..." style={{appearance:'none', background:'transparent', padding:0, border:0, ...existingInlineStyles}}> للحفاظ على ZVF 100%.
     - تُحذف div المغلقة وتُستبدل بـ </button>.
     - إن كان للعنصر role="button" tabindex="0" سابقًا → تُحذف role/tabindex وتُستبدل بالـ <button> الفعلي الذي يوفرها تلقائيًا.
     - إن كان للعنصر cursor-pointer → يبقى في className (button الافتراضي cursor:auto في بعض المتصفحات → نحافظ عليه ضمن ZVF).
  2. لكل div فشل التحويل (selector اختبار يعتمد عليه، أو هو جزء من مركب أكبر)، يُصنف WONTFIX مع سبب دقيق path:line.
  3. الاستثناءات التي يتم التخلي عنها WONTFIX مباشرة: AppearancePressButton (إذا كان يستخدم onClick + تحريكات معقدة على div)، و أي div يُستخدم كـ hotspot وله onMouseDown/onTouchStart بدون onClick مباشر (غالبًا gestures).
- **Acceptance Criteria Addressed**: AC-02 (0 interactive divs بلا تصنيف), AC-00 (راتشيتات ثابتة), AC-07 (اختبارات القسم)
- **Test Requirements**:
  - `rule` TR-3.1: إعادة تشغيل div-button-audit.mjs على القسم → عدد NEEDS-FIX = 0 (كلها إما REMEDIATED إلى button أو WONTFIX مصنف). الدليل = script output الجديد.
  - `rule` TR-3.2: `npm run guard:tsc && npm run guard:lint` exit=0 بعد التحويلات. الدليل = stdout.
  - `rule` TR-3.3: `npx vitest run src/app/components/lawyer/HamiSettings/__tests__` exit=0 (اختبارات UI قسم الإعدادات standalone — للتأكد من عدم كسر selector). الدليل = exit code.
  - `rubric` TR-3.4: جودة التحويلات وانسجامها مع ZVF. Scale 1-5. Anchors: 1=5+ تحويلات كسرت ZVF (تغير حجم/بكسل ظاهر)، 3=معظم التحويلات سليمة، 1-2 حالات edge، 5=كل التحويلات تحقق شرط ZVF بنسبة 100% (appearance:none + background:transparent + padding:0 + border:0 المضافة للـ button تحاكي div تمامًا). Threshold ≥ 4.
- **Notes**: Commit message: `a11y(settings): convert interactive div wrappers to native <button type="button"> in 5 settings cards — preserved ZVF via appearance:none inline reset`.

## Task 4: Semantic Div Honesty — استبدالات منخفضة المخاطرة + WONTFIX واعي (G3 FR-2)
- **Status**: `pending`
- **Priority**: medium 👈 يمكن ترقيته إلى high إذا كان لدينا ≥ 2 candidates آمنين 100%
- **Depends On**: Task 1 (semantic-div-candidates.csv)
- **Description**:
  1. من semantic-div-candidates.csv (المرشحون من داخل HamiSettings + ProfileSettings)، يتم تحديد الـ candidates التي تكون منخفضة المخاطر 100% بناءً على:
     - لا تعتمد على اختبارات querySelector التي تستخدم 'div > div' أو selector بناءً على div.
     - يكون دورها الدلالي واضح جدًا: (أ) SettingsShell outer div الذي يحمل data-settings-root مع role="dialog" هل يمكن أن يكون <dialog>؟ (إن كان يخلق مشاكل backdrop/modal behavior → WONTFIX). (ب) رؤوس الأقسام التي className تحتوي "settings-header" أو "settings-shell-header" — إلى `<header>`. (ج) tabpanel settings مع role="tabpanel" فعلاً → <section role="tabpanel"> إذا لم يكن role مكررًا مُضافًا للـ div.
  2. يتم تنفيذ الاستبدالات بنفس منهجية المرحلة السابقة (3 div→header): تغيير الاسم فقط، الحفاظ على className/style/attributes/children بالضبط.
  3. باقي الـ candidates (الغالبية، غالبًا > 90%) → تصنيف WONTFIX مع سببين موثقين: (أ) مخاطرة كسر اختبار selector تنازلي، (ب) دور ARIA مُضاف صراحة بالفعل على div (role="region" أو role="tabpanel") → استبدال بعنصر HTML5 قد يخلق تضاعف role في شجرة الوصولية (a11y double-role).
- **Acceptance Criteria Addressed**: AC-03 (rubric semantic div), AC-00 (ratchets ثابتة)
- **Test Requirements**:
  - `rule` TR-4.1: div-semantic-index re-run على القسم → total divs يتناقص بالضبط بعدد الاستبدالات (إذا استبدلنا 2 → -2 divs). الدليل = script output قبل وبعد.
  - `rule` TR-4.2: `npm run guard:tsc && npm run guard:lint && npm run guard:tests` (3 أساسيات) exit=0 بعد الاستبدالات. الدليل = stdout.
  - `rule` TR-4.3: `GetDiagnostics` للملفات المعدلة = []. الدليل = output أداة GetDiagnostics.
  - `rubric` TR-4.4: دقة قرارات WONTFIX و REMEDIATED. Scale 1-5. Anchors: 1=تم استبدال candidate عالي المخاطر، أو 10+ candidates بلا سبب WONTFIX, 3=1-2 استبدالات معتصفة، وثمة 20% candidates بتصنيف ضعيف, 5=≥ 1 استبدال آمن 100% منفذ، 100% من الباقي مصنف WONTFIX مع سببين واضحين لكل فئة. Threshold ≥ 4.
- **Notes**: Commit message لكل استبدال: `a11y(settings): promote settings shell header wrapper to native <header> — ZVF 0 class/style/children changes`.

---

## المرحلة B: الأمان + الأداء + الترطيب (P1/P2)

## Task 5: Critical Paths الأمنية — فحص عميق + standalone tests (G4 AC-04)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (security-critical-paths.md الجردي). موازي لـ Task 2/3/4 إذا ما توفرت الجرد مسبقًا.
- **Description**:
  1. قراءة تفصيلية + تدقيق كل من: deleteLawyerAccount, applicationWipe, wipeIndexedDatabases, businessBackupCrypto, businessBackupEncoding, businessBackupBuild, businessBackupImport, businessBackupExportPanel (UI), DataDangerZone (UI), verifySensitiveSettingsAction.
  2. لكل مسار حرج: التأكد من أنه: (أ) يتصل بـ verifySensitiveSettingsAction، (ب) له try/catch كامل على كامل async flow، (ج) أي خطأ midway يقوم rollback لما تم تغييره (أو يوضح أنه لا يمكن rollback بسبب طبيعة الحذف السحابي مع سبب)، (د) لا يعيد throw رسالة عامة فقط (مثلاً "خطأ" بدون operation id).
  3. تشغيل الاختبارات standalone لكل المسارات أمنية (list من spec.md AC-04).
  4. أي نقص يوجد → تصنيف REMEDIATED (إصلاح ذري) أو WONTFIX (أمان إضافي غير مطلوب في هذه المرحلة، مثل إضافة 2FA الآن) مع سبب مهني.
- **Acceptance Criteria Addressed**: AC-04 (critical paths security), AC-01 (security code defects), AC-07 (tests pass)
- **Test Requirements**:
  - `rule` TR-5.1: `npx vitest run src/app/services/settings/__tests__/deleteLawyerAccount.test.ts src/app/services/settings/__tests__/applicationWipe.test.ts src/app/services/settings/__tests__/wipeIndexedDatabases.test.ts src/app/services/settings/__tests__/businessBackup*.test.ts src/app/services/settings/__tests__/verifySensitiveSettingsAction.test.ts src/app/components/lawyer/HamiSettings/__tests__/SecuritySection.test.tsx src/app/components/lawyer/HamiSettings/data/__tests__/DataDangerZone.test.tsx` → exit=0. الدليل = stdout.
  - `rule` TR-5.2: 6/6 مسارات أساسية مصنفة PASS أو REMEDIATED أو WONTFIX (صفر غير مصنف). الدليل = security-critical-paths.md بعد التحديث.
  - `rule` TR-5.3: `npm run guard:tsc && npm run guard:lint` exit=0 بعد أي إصلاحات أمنية (REMEDIATED). الدليل = stdout.
  - `rubric` TR-5.4: صلابة مسارات الأمان الذرية. Scale 1-5. Anchors: 1=مساران يفتقران إلى try/catch أو verify gate, 3=كلها try/catch لكن 1-2 دون atomic rollback note, 5=كلها gate + try/catch + atomicity guarantee (أو وثيقة "cannot rollback cloud-delete due to idempotency") + context-rich errors. Threshold ≥ 4.
- **Notes**: أي REMEDIATED يُرسل في commit منفصل: `hardening(settings-security): enrich deleteLawyerAccount error context + verifySensitiveSettingsAction guard on export flow`.

## Task 6: فحص أداء قسم الإعدادات (static analysis + budgets) — G2 / AC-05
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None (يمكن تشغيله موازيًا في أي وقت بعد Task 1 أو بدونه)
- **Description**:
  1. قراءة [settingsPerfBudget.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfBudget.ts) + [settingsPerfMetrics.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfMetrics.ts) للتأكد من وجود thresholds رسمية.
  2. فحص static لـ code path الأداء في:
     - SettingsSectionRouter (هل Suspense + keep-alive فعلي؟ هل sections warm بشكل صحيح؟)
     - useLawyerSettingsRuntimeEffects (هل يوجد double-dispatch؟ عدد useEffect vs useLayoutEffect)
     - useSettingsLifecycle + useSettingsSectionWarm (هل trigger مرة واحدة فقط؟)
     - WallpaperEditorPanel (هل يوجد useEffect غير مقيد بمدخلاته قد يسبب re-render cascade؟)
  3. تشغيل اختبارات الأداء standalone: `npx vitest run src/app/services/settings/__tests__/settingsPerfMetrics.test.ts src/app/services/settings/__tests__/settingsPerfBudget.test.ts src/app/services/settings/__tests__/performanceSettingsDom.test.ts src/app/services/settings/__tests__/appearanceDomFastPath.test.ts`.
  4. تسجيل Rubric في الأدلة: النتيجة على مقياس 1-5 في AC-05.
- **Acceptance Criteria Addressed**: AC-05 (rubric أداء), AC-07 (tests pass)
- **Test Requirements**:
  - `rule` TR-6.1: اختبارات الأداء الأربعة standalone exit=0. الدليل = stdout.
  - `rule` TR-6.2: 3/3 النقاط من (TTFI, Re-render, Heap) لها تحقق من الكود أو من الاختبار (إثبات وجود وإنفاذ budget). الدليل = ملف تنفيذي يتضمن links لكل نقطة path:line.
  - `rule` TR-6.3: `npm run guard:boot-critical-weight` + `npm run guard:first-open-shared-tax` exit=0 (حراس weights الإجمالية، للتأكد من أن settings chunk لا يثقل weights). الدليل = stdout.
  - `rubric` TR-6.4: وفاء قسم الإعدادات بالـ budgets (rubric AC-05). Scale 1-5. Anchors: 1=لا budgets أو اختبارات فشلت, 3=budgets موجودة ونصفها يثبت من الكود, 5=TTFI + Re-render + Heap (أو static equivalent) كلها مثبتة + tests pass + weights ضمن guards. Threshold ≥ 4.
- **Notes**: 0 تعديلات إنتاجية متوقعة في هذا Task (إلا إن كان هناك خطأ واضح في dependency array useEffect — يُصنف REMEDIATED). يُعتبر Task مسح وتصنيف.

## Task 7: سلامة الترطيب وحافظة الحالة (Hydration + AutoSave) — G6 AC-06
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (موازي لـ T6)
- **Description**:
  1. فحص يدوي + اختبارات للـ hydration و auto-save order:
     - [useLawyerSettingsHydration](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/context/lawyerSettings/useLawyerSettingsHydration.ts) هل يضبط settingsHydrated=true بعد الخطوة الأخيرة؟
     - [LawyerSettingsProvider](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/context/lawyerSettings/LawyerSettingsProvider.tsx) L31-L40 (useAutoSave): هل يُمرّر settingsHydrated كـ guard، أم أن AutoSave قد يحفظ قبل الترطيب بسبب عدم وجود شرط؟
     - useLawyerSettingsRuntimeEffects: هل يوجد side effect يعمل قبل Hydrated؟
  2. تشغيل اختبارات الترطيب standalone: useAutoSave.settingsIntegrity + settingsCore + settingsShellOrchestration + settingsShellSnap + settingsSnapshotLiveStore.
  3. أي مخالفة order → REMEDIATED بشرط guard إضافي (مثل: شرط `settingsHydrated && autoSaveOn` في useEffect قبل الحفظ، إن لم يكن موجودًا).
- **Acceptance Criteria Addressed**: AC-06 (hydration/autosave integrity), AC-07 (tests pass)
- **Test Requirements**:
  - `rule` TR-7.1: الاختبارات الخمسة standalone exit=0. الدليل = output.
  - `rule` TR-7.2: دليل خطي أن AutoSave لا يحفظ قبل settingsHydrated. الدليل = path:line داخل LawyerSettingsProvider أو useAutoSave الذي يضمن هذا الشرط.
  - `rule` TR-7.3: `npm run guard:tsc && npm run guard:tests` exit=0 بعد أي إصلاحات. الدليل = output.
  - `rubric` TR-7.4: وضوح وسلامة pipeline الترطيب. Scale 1-5. Anchors: 1=hydration order غير واضح أو auto-save يطلق قبل الهيدر, 3=works لكن بلا guard صريح, 5=guard صريح + tests integrity تمر + 0 double dispatch. Threshold ≥ 4.
- **Notes**: إن اكتشفنا أن guard موجود بالفعل (أي التطبيق واعي للترتيب) → يُغلق Task بموجب PASS بلا تعديلات. فقط الأدلة.

---

## المرحلة C: اختبارات شاملة + بنية + تقرير نهائي مركزي (P1 — الإغلاق)

## Task 8: اختبارات قسم الإعدادات الشاملة + تأكيد أرشيتكشر + الراتشيتات الكلية
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2-7 (الإصلاحات الأساسية كلها مكتملة قبل التشغيل الكامل)
- **Description**:
  1. تشغيل اختبارات قسم الإعدادات standalone الكبيرة (أكثر من 50 اختبار تقريبًا):
     ```
     npx vitest run src/app/services/settings/__tests__ src/app/components/lawyer/HamiSettings/__tests__ src/app/hooks/lawyerDashboard/settings/__tests__ src/app/api/settings
     ```
  2. تشغيل الراتشيتات الأربعة الكلية: guard:tsc, guard:lint, guard:dead-exports, guard:tests (full global 11,916 tests) للتأكد 21 ثابت.
  3. تشغيل guard:architecture-boundaries + guard:import-closure (AC-08).
  4. أي timing-flake جديد مخصص لقسم الإعدادات → إضافته إلى allow-list (حسب قواعد الـ ratchet) مع سبب، أو إصلاح جذري.
- **Acceptance Criteria Addressed**: AC-00 (رتبية كية), AC-07 (اختبارات القسم), AC-08 (architecture/closure)
- **Test Requirements**:
  - `rule` TR-8.1: standalone tests exit=0. الدليل = exit code + stdout آخر 15 سطر.
  - `rule` TR-8.2: 4 الراتشيتات الكلية exit=0، وvalues tsc ≤ 956, lint ≤ 11, dead-exports ≤ 1885, tests ≤ 21. الدليل = stdout كل حارس.
  - `rule` TR-8.3: guard:architecture-boundaries exit=0 (services ≤ 129, total ≤ 244) + guard:import-closure exit=0 (0 broken). الدليل = stdout.
  - `rubric` TR-8.4: استقرار الاختبارات وعدم وجود flakes جديدة في القسم. Scale 1-5. Anchors: 1=2+ اختبارات قسم الإعدادات فشلت بشكل غير موثق, 3=1 flake ضمن السقف 13, 5=0 flakes جديدة، وجميع الاختبارات 3 مرات PASS متتالية (إن شُغّل 3 مرات). Threshold ≥ 4.
- **Notes**: يتم حفظ الـ stdout للراتشيتات في الأدلة النهائية لاستخدامها مباشرة في AC-09 التقرير.

## Task 9: كتابة تقرير نهائي مركزي SETTINGS-DEEP-PRODUCTION-AUDIT.txt + ملخص عربي
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1-8 (كل المهام السابقة مكتملة وجميع الأدلة متوفرة)
- **Description**:
  1. كتابة ملف `.audit/SETTINGS-DEEP-PRODUCTION-AUDIT-2026-09-07.txt` يحتوي على الأقسام 11 التالية (كلها حسب spec.md AC-09):
     - §0 Executive Summary (ملخص رقمي إجمالي + Verdict العام: Production Ready Pass مع عدد أي إصلاحات)
     - §1 Code Quality Axis (G1): عدد الأولي من hits, عدد REMEDIATED, عدد WONTFIX, 0 UNCLASSIFIED, قائمة بـ 3 أسطر لكل WONTFIX
     - §2 Button Honesty Axis (G3 AC-02): عدد الأولي من divs interactive, عدد REMEDIATED إلى <button>, عدد WONTFIX مع سبب, 0 UNCLASSIFIED, قائمة REMEDIATED files
     - §3 Semantic Div Honesty Axis (G3 AC-03 rubric): عدد المرشحين, عدد REMEDIATED (استبدالات), عدد WONTFIX مع سببين لكل فئة, score rubric 1-5
     - §4 Security Critical Paths Axis (G4 AC-04): 9 مسارات + حالة كل مسار (PASS/REMEDIATED/WONTFIX) + الملاحظات
     - §5 Performance Axis (G2 AC-05 rubric): TTFI/re-renders/heap status + score rubric 1-5 + exit tests perf
     - §6 Hydration + AutoSave Axis (G6 AC-06): verdict (integrity exists / missing + remediated) + دليل path:line + score
     - §7 Tests Axis (AC-07): عدد اختبارات التي تم تشغيلها standalone, PASS count + timing-flakes count
     - §8 Architecture/Closure Axis (AC-08): values breakdown services=X, total=Y, 0 broken closure
     - §9 WONTFIX Roster (المفصل): لكل case → path:line + 3 أسطر سبب مهني (1-2 صفحات)
     - §10 Acceptance Criteria Evidence: لكل AC من AC-00..AC-09 → Pass/Fail + دليل (stdout ref)
  2. (للمستخدم العربية) إرسال ملخص عربي قصير في النهاية (Task 9 completion summary message) مع الأرقام ومسار التقرير.
- **Acceptance Criteria Addressed**: AC-09 (تقرير نهائي), AC-00..AC-08 (تجميع الأدلة)
- **Test Requirements**:
  - `rule` TR-9.1: الملف موجود على المسار الصحيح، و 11/11 أقسام موجودة بعناوينها الدقيقة (grep `^§` → 11 matches). الدليل = ls + grep output.
  - `rule` TR-9.2: كل قسم من الأقسام يحتوي على أرقام صريحة واضحة وليس نصوصًا مجردة (مثل: "REMEDIATED 12" وليس "عدد قليل"). الدليل = قراءة أول 20 سطر لكل قسم.
  - `rule` TR-9.3: قائمة WONTFIX §9 لا تحتوي على أي case بدون سبب 3 أسطر. الدليل = grep على "WONTFIX" count matches == count مسارات السبب أدناه.
  - `rubric` TR-9.4: اكتمال وموثوقية التقرير للمراجعة الخارجية. Scale 1-5. Anchors: 1=5 أقسام فقط موجودة, 3=كل الأقسام لكن فراغات في الأرقام, 5=11/11 أقسام + 0 فراغات + لكل AC دليل + كل رقمي قابل للتأكد. Threshold ≥ 4.
- **Notes**: ملف التقرير باللغة الإنجليزية (تنسيق التقارير الرسمية للمشروع). الملخص العربي للنهاية في رسالة التسليم إلى المستخدم.

---

## مؤشرات إغلاق الدورة (تطبق بعد Task 9 فقط)
1. جميع المهام Status=completed أو cancelled بموافقة المستخدم.
2. جميع الراتشيتات الأساسية ثابتة (no regression).
3. ملف `.audit/SETTINGS-DEEP-PRODUCTION-AUDIT-2026-09-07.txt` موجود و 11 أقسام = PASS.
4. تحضير `review.md` للمرحلة Review المستقلة بقرار pass/fail/blocked.
