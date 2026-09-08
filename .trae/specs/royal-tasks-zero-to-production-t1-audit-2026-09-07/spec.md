# Tier-1 Zero-to-Production Audit — قسم المهام الملكي (Royal Tasks)

> نسخة: v1.0 | التاريخ: 2026-09-07 | قسم: المهام (Tasks Manager + Field Tasks Curtain)
> المنهج: Atomic Inspection من الصفر مع الحفاظ على ZVF (Zero Visual/Functional Change) 100%.

---

## 1. جذور قسم المهام الرسمية (7 جذور متكاملة)

| الرقم | المسار الرسمي | عدد الملفات التقريبي | الوظيفة |
| --- | --- | --- | --- |
| R1 | `src/app/components/lawyer/dashboard/tasksManager/` | 55 TS/TSX | TasksManager الرئيسي: Weekly Agenda / Fatal Deadlines / Distant / Completed Archive / Help Inbox / SubTasks / Document Requirements / Modals / Voice / Snooze |
| R2 | `src/app/components/lawyer/dashboard/fieldTasks/` | 16 TS/TSX + 1 CSS | ستارة المهام الميدانية (Field Curtain): Bottom Sheet / Drag Handle / Instant Paint / Fatal Dialog / Workspace Pin |
| R3 | `src/app/services/tasks/` + `src/app/services/taskHelp/` | 15 TS + 8 اختبار | خدمات المهام: taskSanitizer / inputGuard / agendaStatus / voiceAttachment / taskHelpApi / scenarios / localStore / serverSanitize |
| R4 | `src/app/context/QuantumTasksProvider.tsx` + `hooks/useQuantumTasks*.ts` | ~10 TS/TSX | محرك Quantum Tasks: multi-layer persistence / atomic flush / debounce / background / createLazy / context (3 Contexts) |
| R5 | `src/app/components/lawyer/dashboard/*.{tsx}` (Entry Points) | 7 TSX (overlay-level) | نقاط الدخول الرسمية: `TasksManagerOverlay.tsx`, `TasksManager.tsx`, `FieldTasksBottomSheet.tsx`, `TasksErrorBoundary.tsx`, `LawyerDashboardFieldTasksOverlayEntry.tsx`, `FieldTasksManagerHost.tsx`, `LawyerDashboardFieldTasksFeatureSurfaces.tsx` |
| R6 | `src/app/services/fieldTasks/` | ~5 TS | مقاييس الأداء الميداني + shell snap + curtain tasks: `fieldTasksPerfMetrics`, `fieldTasksShellSnap`, `fieldCurtainTasks` |
| R7 | `src/app/runtime/*tasks*.{ts,tsx}` | ~6 TS | تحميل + قشور فورية: `fieldTasksHubLoader`, `fieldTasksInstantPaint`, `fieldTasksInstantActions`, `tasksManagerInstantPaint` |

---

## 2. خصائص فريدة لقسم المهام (Tier-1 Differentiators)

تُطبّق جميع معايير القسم مع مراعاة هذه الخصائص **لا تنطبق على أقسام أخرى** ولا تُعفى منها:

| الرمز | الخاصية الفريدة | الشرح | تأثير على الـ AC |
| --- | --- | --- | --- |
| TP-01 | **نظام مزدوج (Dual Surface)** | TasksManager (أجندة كاملة) + FieldTasks (ستارة سريعة BottomSheet) يشاركان نفس الـ Quantum Engine. | Escape Stack 3 مستويات ×2؛ Session Guard منفصل لكل سطح. |
| TP-02 | **Quantum Tasks Engine** | نظام تخزين 3 طبقات: localStorage sync boot → SecureStore async hydration → Dossier Backup. | Session Guard داخل Hydration Provider + tearDown Flush Timers. |
| TP-03 | **Task Help + PII Scrub خماسي** | `taskSanitizer.redactPiiText`: Email / Iraqi 7xxxx / 10-16 digit / الموكل-المدعي pattern / رقم القضية pattern. | XSS Defense طبقة إضافية scrub قبل ANY outbound. |
| TP-04 | **Fatal Deadlines Non-Dismissible** | حوار FatalDialog يضغط Escape عبر `blockTasksOverlayEscape('field-fatal')`. | Surgical Close يُطلق أولاً فك حجب Fatal قبل أي Close العام. |
| TP-05 | **TaskPlanChain إجرائي** | سلسلة خطوات إجرائية (Plan Steps) لكل مهمة مع `planOpen` / `planSteps` state مدمجة في `weekAdd`. | Opcode Prefix: `[tasks:plan:*]` في تقييم السلسلة. |
| TP-06 | **Field Curtain Pin (Workspace)** | دبوس مهمة إلى workspace عبر `toggleTaskPinnedToFieldCurtain` + `unpinWorkspaceItem` عند الحذف. | Surgical Close يُفك التثبيت المعلّق (orphan pins). |
| TP-07 | **Weekly Location Bundle** | `addWeeklyLocationBundle` يضيف مجموعة مهام مرتبطة بموقع + يوم أسبوع واحد. | Opcode: `[tasks:weekbundle:opcode]`. |
| TP-08 | **Instant Paint ×2** | قشرة فورية منفصلة لكل من TasksManager (`removeTasksManagerInstantChrome`) و FieldTasks (`removeFieldTasksInstantChrome`). | Task3 Perf Reset يُزيل الاثنتين. |
| TP-09 | **3-Level Escape Stack مكيّف** | L1: Nested Modals (Edit/Delete/Fatal/Snooze/Postpone/Reminder/Help) → L2: FieldTasks Sheet / TasksManager → L3: Dashboard Overlay Host. | Escape Stack 4 طبقات (×2 للأسطح) بدل 3 في الأقسام الأخرى. |
| TP-10 | **Instant Complete Queue** | `FIELD_TASKS_INSTANT_COMPLETE_EVENT` + `drainFieldTasksInstantCompleteQueue` لتصريف عمليات الإنهاء المعلقة. | Surgical Close يصرف Queue قبل الإغلاق. |
| TP-11 | **Snoozed / Postpone / Reminder Trinity** | 3 منظمات زمنية مستقلة لكل مهمة مع حالة UI منفصلة (snoozePanelOpen / postponeDateYmd / reminderSnoozeCustom). | Session Guard يغطي الـ 3 state machines في `useTasksManagerUiState`. |
| TP-12 | **SubTasks + DocumentRequirements** | شجرتان فرعيتان داخل LegalTask مع منفصلين: `toggleSubTaskComplete` + `toggleDocumentRequirement`. | XSS Defense يمر على SubTask.title و Document.text. |
| TP-13 | **Voice Attachment + Playback** | `taskVoiceAttachment.ts` + `TaskVoicePlayback.tsx` مع تحميل chunk صوتي lazy. | AbortController عند إلغاء تحميل الصوت أثناء Close. |
| TP-14 | **Agenda Day Rollover** | `applyAgendaRollover` كل 60 ثانية via `useVisibilityAwareInterval` لتحديث أيام الأسبوع. | Surgical Close يُلغي Interval قبل teardown. |
| TP-15 | **Debounce AsyncPersist (500ms)** | `scheduleAsyncPersist` داخل QuantumTasksProvider يضبط مؤقت async flush. | tearDown يُلغي المؤقت وينفذ `flushPersist` الإجباري. |

---

## 3. 14 معيار قبول (Acceptance Criteria) — مهام مكيّفة

### القاعدة العامة (تُطبّق 100% ZVF)
جميع التعديلات في التدقيق التالي **داخلية فقط**: دورة حياة، حراسات جلسة، تصفير refs، علامات data-*، أحداث CustomEvent، أنواع TS casting، تصفية نصية، إرسال أحداث تنظيف. **ممنوع تماماً**: تغيير DOM/CSS/سلوك ظاهر/نصوص/ألوان/أحجام/تفاعلات واجهة.

---

### 3.1 قواعد إلزامية (11 Rule AC)

| الرمز | المعيار | حد القبول (Pass Threshold) | فحص الأدلة الرقمي (Atomic Evidence) |
| --- | --- | --- | --- |
| **AC-1** | Session Guard 3-أجزاء (R1-R5 × 4 هوكات) | 4 هوكات lifecycle مستهدفة تحقق نمط 3-أجزاء: (1) file-level counter قبل الهوك (2) sessionIdRef + activeSessionIdRef داخل الهوك (3) تصفير activeSessionIdRef **فقط في return-cleanup للـ useEffect** (Placement Rule) + dual guards `if (!isActiveFlow()) return;` داخل ≥ 5 async closures لكل هوك. | TR-1.1: عدد file-level counters ≥ 8 (4 هوكات × 2 counter each). TR-1.2: عدد dual guards ≥ 20 (4 هوكات × 5 minimum). TR-1.3: Placement Rule صحيح في ≥ 4/4 return cleanup functions. |
| **AC-2** | Surgical Close 8-مبادئ + موحد tearDown دالة | دالة موحدة `tearDownTasksFloatingState()` تحقق 8 مبادئ: (1) flushPersist + cleanup timers (2) unsubscribe observers / CustomEvent listeners (3) blurFocusWithin + مسح transients (detailPanel/weekAdd/snoozePanel/postpone/reminder/edit states) (4) remove non-passive keyboard listeners (5) release idle resources (Instant Complete Queue drain) (6) reset query refs (helpTarget/helpInbox/fatalOpen) (7) dispatch `TASKS_TEARDOWN_EVENT` CustomEvent (8) snap data-closing flag على layer root. الدالة مستدعاة في ≥ 5 مواقع call sites رسمية. | TC-2.1: `grep tearDownTasksFloatingState` matches ≥ 5 call sites (علاوة على definition). TC-2.2: 8/8 مبادئ داخل الدالة (grep كل مبدأ). TC-2.3: `TASKS_TEARDOWN_EVENT` dispatch موجود + data-* closing flag موجود. |
| **AC-3** | Perf Latest Mark + Null Scenarios (R6) | (أ) مقاييس الأداء تستخدم دائماً **آخر علامة** (latest mark via `entries[entries.length-1]`) في جميع قياسات الفتح-التفاعل ×2 للأسطح (Manager + Field). (ب) اختبارات تحقق null scenarios ≥ 2 حالة (باقي القسم بدون علامات / علامة ناقصة) مع `restoreAllMocks` بعد كل اختبار. | TM-3.1: `latestPerfMark` grep موجود في جميع metrics paths. TM-3.2: null scenarios ≥ 2 في tests/fieldTasksPerfMetrics.test + tasksManagerPerf. TM-3.3: beforeEach `restoreAllMocks/restore` في جميع ملفات اختبار الأداء للمهام. |
| **AC-4** | Security 4 طبقات + WIFE BFF (0 supabase.from) | 4 طبقات أمن: (1) Whitelist navigation (2) Session Ownership (userId من authSafe) (3) WIFE BFF Pattern: `grep supabase\.from` في 7 جذور المهام = **0 نتائج مطلقاً** (4) Ownership check: تحديث/حذف مهمة من نفس المستخدم فقط. PLUS: SecureStore hydration قبل أي merge (At-Rest). | SC-4.1: `grep -c "supabase\.from"` على 7 جذور EXACTLY 0. SC-4.2: `useAuthSafe` موجود في مسار أي outbound (TaskHelp request). SC-4.3: at-rest SecureStore path inside `QuantumTasksProvider` غير مسلك من البارد (local boot → SecureStore merge). |
| **AC-5** | XSS Defense 5 طبقات + explicit HTML strip regex | 5 طبقات تصفية مدخلات المهام: (1) `taskSanitizer` قبل عرض (2) `taskInputGuard` عند الإدخال (3) HTML strip regex صريح: `/<\/?[^>]+(>|$)/gi` (4) `sanitizeProfilePlainText` path لجميع نصوص المهمة التي تصل إلى منتدى/الملف الشخصي (5) PII Scrub 5 regex (TP-03) قبل ANY outbound share. | XS-5.1: HTML strip regex EXISTS في taskSanitizer أو مسار مشترك. XS-5.2: sanitizeProfilePlainText مستدعاة في ≥ 2 outbound مسارات. XS-5.3: PII 5 regex all موجود في redactPiiText. |
| **AC-6** | Opcode Prefix [tasks:opcode] / [taskHelp:opcode] / [fieldTasks:opcode] ≥ 95% من throw المنطقي | جميع رسائل `throw new Error(...)` و `throw new Error('NO_USER')` و CREATE_FAILED وما إلى ذلك داخل جذور الإنتاج للمهام تحمل بادئة صريحة مقسومة: `[tasks:*]` (للأجندة/weekend/subtasks)، `[taskHelp:*]` (للمساعدة)، `[fieldTasks:*]` (للميداني/القسائم)، `[quantum:*]` (للمحرك/التخزين). | OP-6.1: عدّاد throw messages في 7 جذور الإنتاج بدون tests = N. OP-6.2: عدد منها يحمل opcode prefixes = M. القاعدة: M / N ≥ 0.95. |
| **AC-7** | Honesty ≥ 90% + Console نظيف 100% في جذور الإنتاج | (أ) اختبارات الصدق الرسمية للمهام (tasksCleanlinessHonesty, tasksSecurityCloseHonesty, tasksLatentBugsHonesty, tasksMobileHonesty, tasksVisualDensity, tasksVisualLite + worldclassFieldTasksCloseHonesty + fieldTasksDockSectionSurgicalCloseHonesty) كلها PASS بنسبة ≥ 90% مجموع. (ب) `grep console\.(log\|warn\|error\|debug\|info\|trace) \| debugger;` في 7 جذور **الإنتاج فقط (بدون tests)** = 0 نتائج تماماً. | HN-7.1: N honest PASS / N honest total ≥ 0.90. HN-7.2: grep console/debugger EXACTLY 0 in prod-only glob. |
| **AC-8** | Mobile CSS×4 + Escape Stack 4-Level (TP-09) + أول GetDiagnostics=[] | (أ) 4 تحققات CSS للموبايل على الأقل: safe-area-inset-bottom/top، touch-manipulation، overscroll-behavior، inert/pointer-events في حالة الإغلاق. (ب) Escape Stack 4 طبقات للمهام: L0 Fatal/Modals → L1 Detail Panel → L2 FieldSheet/Manager → L3 Overlay Host. (ج) أول تشغيل `GetDiagnostics` للملفات المعدلة في هذه الجولة = فارغ تماماً `[]`. | MB-8.1: 4 CSS grep patterns موجودة في fieldTasksChrome.css + TasksManager overlay. MB-8.2: Escape Stack 4 طبقات منطقية عبر tasksEscapeCoordinator (Set) + closeArmedRef + data-open flags. MB-8.3: GetDiagnostics تشغيل أولي = [] (no TS errors, no unused). |
| **AC-9** | AbortController في عمليات المهام الثقيلة + Idle Release | (أ) `AbortController` موجود في ≥ 3 مسارات ثقيلة داخل المهام: (1) تحميل chunk الصوت لـ Voice Playback (2) استدعاء taskHelpApi outbound (3) prefetch load (warmCreate في FieldTasksManagerHost). (ب) Idle Release لـ scheduled `idleId` / `timeoutId` cleaned up في cleanup دائماً. | AB-9.1: `new AbortController()` grep counts ≥ 3 locations in 7 جذور الإنتاج. AB-9.2: cleanup always cancels timeout/idle/abort (grep cancel* في return cleanup matches ≥ 5). |
| **AC-10** | Placement Rule (الحراسة: عدم تصفير active قبل الجلسة) + Dual Guards in Nested UI State Machines | (أ) Placement Rule عام لجميع هوكات المهام: **لا يُصَفّر activeSessionIdRef أبداً في بداية جسد useEffect — فقط في return cleanup function** للـ useEffect حامل الجلسة. (ب) هوكات حالة متداخلة (useTasksManagerUiState / weekAdd / snoozePanel / postpone / reminder state) تحمي async closures الخاصة بها بنمط dual guard مشابه أو flag cancelled مدمج. | PL-10.1: grep `activeSessionIdRef.current = 0` — كلها تقع داخل return cleanup للـ useEffect (0 outside cleanup). PL-10.2: ≥ 5 state machine handlers في UiState تحمل cancelled/isActive guard. |
| **AC-11** | Quantum Tasks Provider Session-aware Hydration + Flush Honesty | (أ) Hydration داخل QuantumTasksProvider يحمل cancelled flag في return cleanup للـ hydration useEffect (لا merge stale blob بعد unmount). (ب) `flushPersist` مستدعاة في handleClose + teardown (لا orphan pending timers لـ 500ms debounce). (ج) Rollover Interval (60s) مسحوب (cleanup) عند teardown. | QT-11.1: `cancelled = true` في return cleanup hydration effect. QT-11.2: `flushPersist` موجود في close path + tearDown path. QT-11.3: cleanup function يلغي interval/rollover. |

---

### 3.2 معايير Rubric (3 Rubric AC)

| الرمز | المعيار Rubric | Ponderation | الدرجة الكاملة (5/5) عند |
| --- | --- | --- | --- |
| **RU-1 — Telemetry Integrity** | صدق التقارير الأدائية للمهام (Field + Manager) | 30% من مجموع Rubric | لا cross-session contamination عند إعادة الفتح 3 مرات متتالية في نفس الجلسة. `sessionIdRef` يمنع كتابة تقرير من جلسة سابقة. آخر mark دائماً يُستخدم (لا averaging). Tests: tasksPerfSessionIsolation.test PASS. |
| **RU-2 — Surgical Close Honesty Contract** | صدق الإغلاق الجراحي للمهام 9 أبعاد | 40% من مجموع Rubric | 9/9 أبعاد PASS في حزمة اختبارات close honesty: Security, Perf, Mobile, CodeQuality, Cleanliness, Visual (ZVF), EscapeStack, SurgicalClose, NetworkAbort. معدل إجمالي ≥ 8/9 = Pass (5/5 عند ≥ 9/9). |
| **RU-3 — Production Gate Exit 0 + Diagnostics=[] نهائي** | جاهزية الإنتاج الفعلية بعد التدقيق | 30% من مجموع Rubric | (1) بوابة الإنتاج `scripts/tasks-production-gate.mjs` (تنشأ في Task9) تسجل exit code 0 PASSED مع تحقق TASKS_SHADOW_STUB anti-bomb (لا ملف Tasks.tsx بجانب مجلد tasksManager). (2) GetDiagnostics ثاني + نهائي تشغيل بعد كل التعديلات = فارغ تماماً `[]`. (3) stderr البوابة خالية من ANY warn/error من كود قسم المهام. |

---

## 4. شروط إغلاق إضافية (ملزمة بلا استثناء)

هما شرطان لا تُعفى منهما القسم مهما كان أداء الـ 14 AC الجيد:

### E-1. Console نظيف 100% في جذور الإنتاج للمهام
```
grep pattern: console\.(log|warn|error|debug|info|trace)|\bdebugger\b
مساحات البحث (الإنتاج فقط — استبعاد __tests__):
  R1-R7 باستثناء: */__tests__/*, */specs/*
النتيجة المطلوبة: 0 matches تماماً.
```
- لا يُسمح بالـ `debug.log` حتى لو كان محاطاً بـ `import.meta.env.DEV` في **كود الإنتاج** للمهام (grep على الإنتاج — DEV guards محسوبة كـ "موجودة في الإنتاج" → تخالف الشرط).

### E-2. قائمة `#problems_and_diagnostics` فارغة تماماً GetDiagnostics=[]
```
تشغيل GetDiagnostics مرتين:
  (أ) بعد Task8 (معدّل / أولي).
  (ب) بعد Task10 (نهائي / بعد Production Gate).
النتيجة المطلوبة في كلتا الحالتين: [] فارغة.
في حال وجود خطأ TS (حتى unused import) → يتم إصلاح جراحي قبل الإعلان عن Tier-1.
```

---

## 5. نماذج العدّاد والصيغ المستخدمة في الأدلة الرقمية

| العدّاد المستهدف | الصيغة | حد النجاح |
| --- | --- | --- |
| file-level counters (AC-1) | `let tasksOpenFlowSessionCounter\|tasksManagerSessionGuardCounter\|\|lastActiveTasksFlowId =` | ≥ 8 |
| dual guards (AC-1) | `if \(!isActiveFlow\(\)\) return;` | ≥ 20 |
| call sites tearDown (AC-2) | `tearDownTasksFloatingState\(\)` | ≥ 5 uses (بجانب definition) |
| supabase.from (AC-4) | `supabase\.from\(` | = 0 (مطلقاً) |
| PII 5 regex (AC-5) | grep patterns: `@\|7\d{2}\|(\?:\\d[\\s-]?){10,16}\|الموكل\|رقم.*القضية` | ≥ 5 matches in 1 file |
| console/debugger prod (AC-7 / E-1) | grep مع `--exclude-dir=__tests__` | = 0 |
| AbortController instances (AC-9) | `new AbortController\(\)` | ≥ 3 locations |
| opcode prefix ratio (AC-6) | M / N (prefixes / total throws) | ≥ 0.95 |

---

## 6. 10 Tasks التسلسلية للتنفيذ (تُفصّل في tasks.md)

| Task | الهدف | المعايير المغطاة |
| --- | --- | --- |
| **Task1** | Session Guard 3-أجزاء في 4 هوكات مستهدفة للمهام | AC-1, AC-10, RU-1 |
| **Task2** | Surgical Close 8-مبادئ + tearDownTasksFloatingState + ≥5 Call Sites | AC-2, AC-11, RU-2 |
| **Task3** | Perf Latest Mark ×2 (Field+Manager) + restoreAllMocks + Null Scenarios ≥2 | AC-3, RU-1 |
| **Task4** | Security 4 طبقات + تأكيد WIFE BFF (0 supabase.from grep) + Ownership Checks | AC-4 |
| **Task5** | XSS Defense 5 طبقات + explicit HTML strip regex + sanitizeProfilePlainText wiring | AC-5 |
| **Task6** | Opcode Prefixes على الأقل 95% في throw messages للمهام ([tasks:*]/[taskHelp:*]/[fieldTasks:*]/[quantum:*]) | AC-6 |
| **Task7** | Honesty ≥90% + Console نظيف 100% (grep 0 in prod-only) | AC-7, E-1 |
| **Task8** | Mobile CSS×4 + EscapeStack 4 طبقات مكيّف (TP-09) + أول GetDiagnostics = [] | AC-8, AC-9, E-2(أول) |
| **Task9** | إنشاء + تشغيل بوابة الإنتاج `scripts/tasks-production-gate.mjs` exit 0 PASSED + TASKS_SHADOW_STUB anti-bomb | RU-3(1/3) |
| **Task10** | Diagnostics نهائي=[] + كتابة review.md الرسمي داخل مجلد المهام → إغلاق Tier-1 PRODUCTION READY (14/14 AC, 3/3 Rubrics 5/5/5) | RU-3(2/3, 3/3), E-2(نهائي), الكل |

---

**نهاية spec.md — قسم المهام الملكي. الموافقة على هذا الملف تعني قبول جميع الـ 14 AC + 2 شروط إغلاق + الأسلوب الذري ZVF 100%.**
