# Hami Royal Calendar Section — Tier-1 Zero-to-Production Atomic Audit Spec
**Date**: 2026-09-08  
**Standard**: Tier-1 World-Class Atomic Inspection from Scratch (Zero reliance on prior reports)  
**User Mandate VERBATIM**: فحص سطر سطر فعلياً مع ضمان: (1) الأداء/الخفة/الاستجابة (2) النظافة وحذف الكود الميت/المكرر (3) جودة الكود والبرمجة (4) جاهزية الموبايل بأعلى كفاءة (gestures/safe-area/inert/escape-stack) (5) من لحظة الضغط → التحميل → التسخين → الإغلاق والخروج (6) اختبار ميزة ميزة وسطر سطر وكل زر وخاصية.  
**Non-Goals**: تغيير UI سلسلة/UX/السلوك المرئي للمستخدم (ZVF 100% ملزم). جميع التعديلات داخلية فقط: lifecycle/guards/perf metrics/sanitizer/opcode prefixes/TS cleanups/theme constants strings/gate logic anti-bomb/tearDown + Abort wiring.

---

## 7 Official Calendar Production Roots (Audit Scope — CR-1..CR-7)
All grep/test/diagnostic runs SHALL execute ONLY against these 7 roots to avoid pollution from unrelated sections:

| # | Root Key | Path Pattern | Approx File Count | Audit Priority |
|---|----------|--------------|-------------------|----------------|
| **CR-1** | SmartLegalRadar (Main Calendar Surface) | `src/app/components/lawyer/SmartLegalRadar/` | ~70 (hooks + components + __tests__ + radarCss) | 🔴 Critical |
| **CR-2** | Calendar Services (Business Logic) | `src/app/services/calendar/` | ~75 (dossierSync/6 branches + bridge/3 + bridgePersistence/5 + __tests__/25) | 🔴 Critical |
| **CR-3** | Calendar Top-Level Services | `src/app/services/calendarTombstones.ts` + `calendarAuthenticity.ts` + `calendarBridge.ts` + `calendarBridgePersistence.ts` + `calendarDossierSync.ts` + `calendarModuleVisuals.ts` + `calendarDateSniffer.ts` + `useIncrementalCalendarSync.ts` + `useEntityCalendarEvents.ts` + `lawsuitTimelineCalendarMirror.ts` | 10 | 🔴 High |
| **CR-4** | Dashboard Schedule Integration (Tabs + InstantChrome ×4) | `src/app/components/lawyer/dashboard/schedule/` (~15: ScheduleTabHost + RadarOpenInstantChrome + RadarEventFormInstantCover + RadarOpenInstantDayList + RadarOpenInstantMonthGrid + ScheduleRadarPaintGate + scheduleRadarLivePaint) + `LawyerDashboardScheduleTab.tsx` | ~16 | 🟠 High |
| **CR-5** | Calendar Shell/Open Hooks (Lifecycle + Intent + Warm) | `src/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab.ts` + `schedule/scheduleShellOpenFlow.ts` + `schedule/scheduleLazyImports.ts` + `scheduleIntentWarm.ts` + `useLawyerDashboardCalendarCluster.ts` + `workspace/useCalendarRadar48h.ts` + `workspace/useCalendarEventsForClusterScan.ts` + `cloud/workCloudCheckpointCalendar.ts` | 8 | 🟠 High |
| **CR-6** | Calendar Runtime (Boot + Hydration + Instant Paint + Close Honesty) | `src/app/runtime/scheduleBootHydrator.ts` + `scheduleHubLoader.ts` + `scheduleShellPrime.ts` + `scheduleWarmCore.ts` + `calendarDockSectionSurgicalCloseHonesty.test.ts` + `worldclassCalendarCloseHonesty.test.ts` + `calendarNetworkIsolationHonesty.test.ts` + `calendarOpenGestureSnappiness.test.ts` | 8 | 🟡 Medium-High |
| **CR-7** | Calendar Reminders + Native OS Sync + Audio Alarms | `src/app/services/notifications/native/calendarNativeReminderScheduler.ts` + `useCalendarNativeReminderSync.ts` + `osTap/calendarAlarmPending.ts` + `calendarReminderOverlayGate.ts` + `calendarReminderFiredStore.ts` + `calendarReminderSnoozeStore.ts` + `calendarReminderAlarmSound.ts` + `calendarEventReminder.ts` | 8 | 🟡 Medium |

---

## 18 Unique Calendar Section Properties (CP-01 → CP-18)
All Acceptance Criteria SHALL be adapted to these unique characteristics (not generic):

| # | Property ID | Description | Implication on Audit |
|---|-------------|-------------|----------------------|
| 1 | **CP-01 Dual Paint Surface** | سطحان متزامنان: (أ) SmartLegalRadar الكامل داخل ScheduleTab (ب) Radar Instant Chrome ×4 داخل مجلد dashboard/schedule/ | Session Guards + tearDown مطلوب على الاثنين معاً؛ لا يُسمح ببقاء refs مهجورة من إحداهما عند فتح الأخرى |
| 2 | **CP-02 6-Stage Event Publish Pipeline** | eventFormModel → radarFormCritical validate → scheduleConflictDetector تعارضات + calendarEventAuthorship توقيع → calendarCloudLoader persist + bridgePersistence propagate → eventCardViewModel للعرض | XSS sanitizer مطلوب على *كل* مرحلة من المراحل الست لا فقط عند الـ UI submit |
| 3 | **CP-03 Dossier Sync 6-Branched Orchestrator** | dossierSync/orchestrator.ts ينسق 6 مسارات (lawsuitSync + criminalSync + executionSync + auxiliarySync + visitationCalendarSync + urgentSync) | AbortController مطلوب عند إغلاق الشاشة خلال السنك الثقيل؛ لا تداخل بين الجلسات |
| 4 | **CP-04 4× Radar Instant Paint Covers** | (1) RadarOpenInstantChrome (2) RadarOpenInstantDayList (3) RadarOpenInstantMonthGrid (4) RadarEventFormInstantCover | tearDown يجب أن ينظف كل الـ 4 refs و snap attrs بشكل متزامن |
| 5 | **CP-05 Bridge 3-Path Persistence Layer** | bridgePersistence/shared.ts + propagate.ts + lite.ts + executionPatch.ts | Close handlers يجب أن يضمنوا عدم orphan calendar events rows بعد الإغلاق؛ commit only بعد success |
| 6 | **CP-06 Arabic Schedule Conflict Detection** | scheduleConflictDetector.ts يكتشف تعارضات المواعيد + calendarArabicLabels.ts أسماء الأشهر/الأيام العربية كاملة | Input guards مطلوبة قبل تطبيق detector |
| 7 | **CP-07 Legal Deadline Engine** | legalDeadlineEngine.ts محرك استحقاقات المحاماة (ضريبة المواعيد القانونية) | Session Guard يتحقق من هويه صلاحيات في كل render |
| 8 | **CP-08 12-Month Live Handoff Context** | calendarLiveHandoffContext.ts يحافظ على سياق الانتقال بين الأشهر (viewYear/viewMonth/selectedDate) | لا يُسمح بفساد handoff عند إعادة الفتح؛ SessionId مطلوب |
| 9 | **CP-09 Warm Cache 8 Layers** | EventsCache + EventsWarm + LocalSnapshot + DossierFingerprint + CloudRuntime + RadarPrefetch + ReconcileScheduler + WeekStrip = 8 طبقات | warm cache handles يجب حذفها في tearDown + إلغاء pending network fetches |
| 10 | **CP-10 Native OS Calendar Dual Sync** | calendarNativeReminderScheduler + useCalendarNativeReminderSync → مزامنة مع تقويم Android/iOS الأصلي | Abort مطلوب أثناء sync مع Native عند الإغلاق |
| 11 | **CP-11 Tombstones Pruning System** | calendarTombstones.ts + criminalCalendarSyncPruning → إزالة صفوف المحذوفة (tombstones) من mirror الدعاوى والملفات | Prune operations يجب إلغاؤها إذا تم الإغلاق قبل الانتهاء |
| 12 | **CP-12 Authenticity Fingerprint Hashing** | calendarAuthenticity.ts + calendarDossierFingerprint → بصمة رقمية SHA256 لأحداث التقويم لمنع tampering | No any-casting؛ throw messages بدون fingerprint مسبوقة بـ opcode |
| 13 | **CP-13 Strongly-Typed Event Record IDs** | calendarEventRecord.ts + calendarEventAuthorship.ts + calendarEventForm.ts → TypeScript تمييز صريح EventId/ReminderId/ConflictId | No any-casting في المسارات الحرجة |
| 14 | **CP-14 Reconcile Scheduler Background** | calendarReconcileScheduler.ts + calendarTimeout.ts → عمليات خلفية للتوفيق بين Cloud و Local Snapshot (microtasks) | Session Guards يجب أن تلغي pending reconcile timers عند الإغلاق |
| 15 | **CP-15 Radar 4-Zone Grid Layout** | RadarShell → (Zone A: RadarMonthToolbar + WeekStrip) (Zone B: CalendarGridHost × Month Grid) (Zone C: RadarSelectedDaySection) (Zone D: EventCardsList + AddEventDock) + EventForm/ReminderModal overlays | Escape Stack و Clear Drafts و Perf Marks و Abort مطلوب لكل zone switch |
| 16 | **CP-16 Incremental Threaded Calendar Sync** | useIncrementalCalendarSync.ts + threadingBump.test → sync متدرج مقسم حسب الـ budget الزمني للـ frame | Abort via session close؛ لا تُسمح بتشغيل workers بعد unmount |
| 17 | **CP-17 Visitation Schedule Sync (Legal)** | visitationCalendarSync.ts داخل dossierSync CP-03 — مزامنة مواعيد زيارة السجناء/التنفيذ (خاص قانوني حيوي) | Ownership gate مطلوب على كل payload vis-sync |
| 18 | **CP-18 Radar 3-Gate Access Control** | (Gate1: RadarErrorBoundary) (Gate2: CalendarReminderOverlayGate × isCalendarInstantChromeActive/isCalendarPaintCoverInteractive) (Gate3: ScheduleRadarPaintGate) | BFF enforcement confirmed — No supabase.from في الكلاينت (verified 0 hits) |

---

## 14 Acceptance Criteria (11 rule + 3 rubric) + 2 Mandatory Closure Conditions (E1 + E2)

### Closure Conditions (USER MANDATE VERBATIM — لا تُعفى منهما أبداً)
| # | ID | Condition | Verifiable Pass State |
|---|----|-----------|-----------------------|
| E1 | **Calendar Console Zero** | جذور الإنتاج CR-1..CR-7 grep على `console\.(log\|debug\|info\|warn\|error\|trace\|dir)` + `debugger;` باستثناء `__tests__/**` = **0 matches** | Grep command output count = 0 |
| E2 | **Calendar Diagnostics =[] مرتين** | (1) أول تشغيل `GetDiagnostics` بعد Task8 = `[]` + (2) نهائي بعد Task10 = `[]` | Both independent runs return empty array |

---

### Rule-Type AC (11 Rules — objectively binary pass/fail with grep/test/exit-code evidence)

#### AC-1 (rule): Session Guard 3-part في ≥4 هوكات + ≥20 Dual Guards + Placement Rule
- **Thresholds**: (أ) ≥8 File-level counters (2 لكل هوك: open counter + lastActiveId) (ب) 3-part session guard (`sessionIdRef` + `activeSessionIdRef`) في كل هوك (ج) ≥20 dual-guarded async closures (warmCache.then / cloudLoader.then / queueMicrotask / catch / observer / timeout callbacks) (د) **Placement Rule**: `activeSessionIdRef` reset في **return cleanup ONLY** للـ useEffect، لا خارج return في أي نقطة أخرى
- **Coverage Hooks (4 required)**: (1) `SmartLegalRadar/hooks/useSmartLegalRadarLifecycle.ts` (2) `hooks/lawyerDashboard/schedule/scheduleShellOpenFlow.ts` (3) `dashboard/schedule/ScheduleTabHost.tsx` controller (4) `SmartLegalRadar/hooks/useSmartLegalRadarSchedule.ts` OR `SmartLegalRadar/hooks/useSmartLegalRadarForm.ts`
- **Evidence Sources**: grep for `SessionCounter` + `lastActive.*Id` (count ≥8) + grep for dual guard pattern `if (sessionIdRef.current !== activeSessionIdRef.current) return;` inside async closures (count ≥20) + grep for reset location: inside `return () => {...}` ONLY of useEffect = 4 hits, 0 hits outside
- **Test Requirement**: 4 hook test files → total tests ≥ 20 → exit code 0, all PASSED

#### AC-2 (rule): Surgical Close 8-مبادئ + tearDownCalendarFloatingState unified + ≥9 Call Sites
- **NEW Unified Function (DOES NOT EXIST NOW — grep confirmed zero hits)**: Must create `components/lawyer/SmartLegalRadar/tearDownCalendarFloatingState.ts` (8 Principles + **P3b Network Abort Extension**)
- **8 Mandatory Principles P1-P8 + P3b (all new)**:
  - (P1) Blur surface focusables + blur `document.activeElement`
  - (P2) Drain pending SaveQueue microtasks (Event form draft + scheduleConflict commit queue + dossierSync transient batches) → dispose/delete refs
  - (P3) Unblock Calendar/Schedule EscapeStack all layers (ReminderModal → InstantChrome → EventForm → ScheduleBack) via `unblockAllCalendarOverlayEscape()` (exported helper, new creation)
  - **(P3b Network Abort — CRITICAL)**: Call abortCalendarXxx() for ALL AbortController instances (CloudLoader / DossierSync Orchestrator / NativeSync / ReconcileScheduler) between P3 and P4
  - (P4) Dispatch `CALENDAR_TEARDOWN_EVENT` CustomEvent with `detail:{reason:'tearDown', targetSurface: 'radar'|'dashboardTab'}`
  - (P5) Delete 16+ transient `window.__hamiCalendar*` refs: saveQueueDraft / managerEnterSettle / warmCacheHandles×8 / sectionSwitchTimer / reminderObserver / rateLimitDebounceHandle / nativeSyncAbortHandle / notificationStreamSessionId / lastPerfReport / runtimeHydrationId / reconcileHandle / orphanSweepHandle
  - (P6) Snap DOM attrs: root SmartLegalRadar + ScheduleTabHost + OverlayHost setAttribute `data-closing=true` + `aria-busy=false`
  - (P7) Remove 4× Radar Instant Paint Chrome covers classes + `pointer-events:none` snap (4 covers per CP-04)
  - (P8) Clear scheduleOverlayEnterSettle timeout + delete ref
- **Threshold**: `tearDownCalendarFloatingState` occurrence grep ≥9 call sites: (1) SmartLegalRadar closeFlow (2) ScheduleTabHost unmount (3) RadarErrorBoundary fallback reset (4) LawyerDashboardScheduleTab exit (5) scheduleBootHydrator abort path (6) reduced-motion early return (7) post-animation finish (8) idleRelease 12s callback (9) lawyerDashboardOverlaysBundles unmount
- **Evidence Sources**: grep for `CALENDAR_TEARDOWN_EVENT` = 2 hits (const + dispatch) + grep for `tearDownCalendarFloatingState` = ≥9 occurrences + grep `data-closing` = ≥3 setAttribute hits + 8+1 principle grep checks each = ≥1 match
- **Test Requirement**: Calendar close-honesty files (calendarDockSectionSurgicalCloseHonesty + worldclassCalendarCloseHonesty + additional new honesty files) → total tests ≥ 26 → exit 0, all PASSED

#### AC-3 (rule): Perf Latest Mark ×2 Paths + restoreAllMocks + ≥4 Null Scenarios
- **Latest Mark Pattern**: كل من `services/calendar/calendarPerfMetrics.ts:getLatestCalendarInteractive()` AND SmartLegalRadar zone-switch performance tracker MUST use `performance.getEntriesByName(name)[entries.length - 1]` LATEST ENTRY (not first index [0] which causes reopen stale reports per CP-08, CP-15)
- **Null Scenario Tests**: 4 it blocks (≥2 threshold ×2): (A1) no marks at all → return null safe no-throw (A2) only start mark, null interactive → return null (B1) reversed time (interactive before start) → return null (B2) performance API missing (vitest env without marks API) + no marks → return null without throwing
- **Cleanup**: `beforeEach(() => { vi.restoreAllMocks(); if (typeof performance !== 'undefined') performance.clearMarks(); })` in BOTH perf test files (calendarPerfMetrics.test.ts + zone-switch perf scenario tests)
- **Evidence Sources**: grep `entries\[entries\.length - 1\]` on CR-2 + CR-1 roots = 2 matches + grep `restoreAllMocks` in both __tests__ files = ≥2 hits + grep for 4 `it('...null'` blocks → ≥4
- **Test Requirement**: `calendarPerfMetrics.test.ts` + SmartLegalRadar perf scenarios → total ≥8 tests → exit 0

#### AC-4 (rule): Security 4 طبقات + WIFE BFF (0 supabase.from on CR-1..CR-7)
- **4 Layers**:
  - (L1) Whitelist Navigation: grep `window\.location\s*=|history\.push|location\.href\s*=` على CR-1..CR-7 = 0 matches
  - (L2) Session Ownership Gate: `!userId` early return exists in calendarCloudLoader.load (from bridge/core resolveCalendarUserId) AND useSmartLegalRadarSchedule.hook + `CALENDAR_OWNERSHIP_GUARD` comment in core
  - (L3) WIFE BFF: grep `supabase\.from\(` على CR-1..CR-7 production roots = **0 matches** (confirmed baseline now 0; excluding __tests__/** + comment literals fixed to avoid false-positive). ALL operations routed through calendarBridge/* + bridgePersistence/* + dossierSync/* BFF services.
  - (L4) At-Rest SecureStore: `SecureStoreService.ensurePersistedReady()` called BEFORE `calendarLocalSnapshot.peek` hydration AND `calendarCloudRuntime.boot` AND `calendarBridgePersistence.commit` → ≥2 hits confirmed
- **Evidence Sources**: Commands `rg -n "supabase\.from\(" CR-paths | grep -v __tests__` → line count = 0 + same 0 for nav methods + ownership guard grep "!userId" ≥2 hits + ensurePersistedReady grep ≥2 hits
- **Permissions**: إن وجد `schedulePermissions.ts` أو ما شابه — 12 canXxx permissions; else compensated by 3× ReminderOverlayGate checks + RadarErrorBoundary + PaintGate = 5 gates
- **Test Requirement**: CalendarSecurity scenarios + networkIsolationHonesty + wife routes calendar coverage → ≥5 tests → exit 0

#### AC-5 (rule): XSS Defense 5 طبقات + explicit HTML strip regex + ≥2 outbound sanitizeProfilePlainText paths
- **XS-5.1 L1 inbound boundary**: `calendarEventForm.ts` eventFormInputGuard rejects length-attack / control-chars / non-string / malicious date strings
- **XS-5.2 L3 explicit HTML strip regex** (FIRST LINE before PII redact / event title normalization): `stripCalendarHtml(input)` regex `String(input ?? '').replace(/<\/?[^>]+(>|$)/gi, '')` called كأول سطر في دالة event title sanitize **AND** event description sanitize inside calendarEventForm AND radarFormCritical guard
- **XS-5.3 L2 PII 6/6 regexes** (إذا وجد PII redact للتقويم): (1) Emails (2) Iraq 7xxx / 07x mobile formats (3) 10-16 digit IDs/رقم قضايا (4) 1-3 Arabic compound names after الموكل/المدعي/الخصم patterns (5) القضية/الإضبارة/الوثيقة reference numbers (6) رقم الهاتف المنزلي/المكتبي patterns. إذا لم يوجد PII redact بعد — تعوّض بـ strict input clamp length × 6 fields (title/desc/location/contact/ref/notes) = 6/6
- **XS-5.4 L4 sanitizeProfilePlainText ≥2 outbound paths** (min 2 threshold): (Path A) SmartLegalRadar UI boundary `SmartLegalRadar/hooks/useSmartLegalRadarForm.ts` before draft→commit transition (Path B) calendar services central boundary `calendar/bridge/core.ts:buildSafeCalendarRequestParams()` OR `calendarCloudLoader.persist` — كلاهما يستدعي `sanitizeProfilePlainText` على title/description/location/contact fields قبل any network/BFF call
- **XS-5.5 L5 React auto-escape**: grep `dangerouslySetInnerHTML` على CR-1..CR-7 production roots = 0 (confirmed baseline now 0)
- **Evidence Sources**: `stripCalendarHtml` regex match =≥1; sanitizeProfilePlainText grep on CR-1..CR-7 ≥2 files; clamp length × 6 fields = 6; dangerouslySetInnerHTML 0
- **Test Requirement**: Input guard tests + clamp length tests + PII/redact tests if exists + eventForm tests → ≥15 tests → exit 0

#### AC-6 (rule): Opcode Throw Prefixes [calendar:*] / [schedule:*] / [radar:*] / [calendarBridge:*] / [calendarDossier:*] ≥ 95% Coverage
- **Methodology**: (1) Count total `throw new Error` / `throw 'string'` statements in CR-1..CR-7 excluding `__tests__/**` = N total (2) Count prefixed throws matching `\[(calendar|schedule|radar|calendarBridge|calendarDossier|calendarRem|calendarNative|calendarAuth):[a-z_:]+\]` = M prefixed (3) Ratio M/N ≥ 0.95 (95%)
- **Expected Prefixes**: `[calendar:input:length]`, `[calendar:form:conflict_detected]`, `[schedule:open:bff_sign_missing]`, `[calendarDossier:sync:no_session]`, `[radar:gate:chrome_not_ready]`, `[calendarBridge:persist:orphan_row]`, `[calendarRem:alarm:audio_failed]`, `[calendarAuth:fingerprint:bad_hmac]`, `[calendarNative:sync:permission_denied]` etc
- **Evidence Sources**: grep counts command output with N total + M prefixed + ratio% ≥95%
- **Test Requirement**: throw-site-bearing test files (RadarErrorBoundary + form guards + sync guards + bridge persistence) → ≥13 tests → exit 0

#### AC-7 (rule): Honesty ≥ 90% + Console=0 + First Diagnostics Pre-check
- **Honesty Threshold ≥90%**: worldclassCalendarCloseHonesty + calendarDockSectionSurgicalCloseHonesty + calendarNetworkIsolationHonesty + Radar Visual Lightness + RadarFormCritical + calendarOpenGestureSnappiness + RadarErrorBoundary + Mobile Honesty + CalendarCleanliness + HiddenBugsHonesty = total honesty tests / passing ≥ 0.90
- **Console=0 Prod-Only**: E1 condition confirmed (grep 0 matches). Any remaining console.* must be wrapped `if (import.meta.env.DEV)`
- **First Diagnostics Pre-check**: After Task8 edits → GetDiagnostics() on CR-1..CR-7 modified files → result = `[]` (zero TS diagnostic items)
- **Stability Run**: 13+ test files for Calendar Section (Honesty + Mobile + Perf bundles) executed in a single vitest run → ≥61 tests → all PASSED exit 0

#### AC-8 (rule): Mobile CSS×4 Safe-Area + EscapeStack 4+ Layers + AbortController ≥3
- **Mobile CSS×4 explicit env(safe-area-inset-*,0px) calc pattern**: Currently 3 occurrences confirmed (2 in radarOpenInstantChromeClasses + 1 in CalendarReminderModal). Must ADD 1 MORE → total ≥4. Target locations: RadarAddEventDock safe-area-bottom calc + FORUM_APPBAR-like (RadarMonthToolbar safe-area-top calc + SelectedDaySection safe-area-bottom + ReminderHost safe-area-top = 4 minimum)
- **EscapeStack 4+ طبقات Top-First Pop**: Upgrade useScheduleTabEscape.ts from simple boolean chain to **priority-layered Escape Stack** matching forumEscapeStack.ts design: (L0-surface priority=0) ScheduleTab back / (L1-sheet priority=1) CalendarReminderModal dismiss / (L2-popup priority=2) EventForm close / (L3-plan priority=3) RadarErrorBoundary fallback. Map-based priority with `peekCalendarEscapeTopLayer()` API. Keep backward compatible with existing callers (ZVF)
- **AbortController ≥3 locations** (ALL abort inside P3b of tearDownCalendarFloatingState): Currently 0 confirmed (baseline grep zero hits). Target locations: (Abort-1) calendarCloudLoader.ts — dossierSync orchestrator + warm cache 8× fetches (Abort-2) SmartLegalRadar Host zone load — reconcile scheduler + timeline merge workers (Abort-3) calendarNativeReminderScheduler.ts — OS sync/upload operations if close (Abort-4) dossierSync/orchestrator.ts 6-branch sync heavy pipeline = AT MINIMUM 3
- **Evidence Sources**: CSS×4 safe-area calc grep = ≥4 matches; Escape priority layers count ≥4 types; AbortController grep `new AbortController()` on CR-1..CR-6 ≥3 matches
- **Test Requirement**: SmartLegalRadarMobile.test + escape tests + abort-handler tests + calendarOpenGestureSnappiness → ≥34 tests exit 0

#### AC-9 (rule): Reminder CP-10 + NativeSync CP-10 + Tombstones CP-11 Clean Lifecycle
- **Native Reminder BFF Confirmed**: calendarNativeReminderScheduler routed through capacitor calendar plugin NOT client-side direct writes. Zero client-side supabase.from = already confirmed by AC-4 L3. Permission-denied path handled with opcode.
- **Tombstones + DossierFingerprint Cleanup**: pending prune/FP operations aborted at close via AbortController instances; orphan event commit queued ONLY AFTER successful persist bridgePersistence.commit; criminalCalendarSyncPruning.ts aborted at session end if still running
- **Evidence Sources**: grep for pruneHandle + fingerprintCalcHandle + reconcileAbort inside tearDownCalendarFloatingState P3b/P5 = ≥2 matches
- **Test Requirement**: calendarTombstones.test + calendarAuthenticity.test + calendarNativeReminderScheduler.test + requestCalendarDossierSyncNow.test → ≥8 tests exit 0

#### AC-10 (rule): Production Gate `scripts/calendar-production-gate.mjs` exit 0 + CALENDAR_SHADOW_STUB Anti-Bomb Clean
- **Gate Phases (UPGRADE existing 32-path gate to 56+ paths + anti-bomb phase)**:
  - (Phase 0 PRE-FLIGHT) CALENDAR_SHADOW_STUB check (4 shadow paths — targeting WRONG SUBFOLDERS not just case-diff to defeat Windows case-insensitive existsSync):
    1. `src/app/components/lawyer/SmartLegalRadar/components/SmartLegalRadar.tsx`
    2. `src/app/components/lawyer/dashboard/CalendarScheduleTile.tsx`
    3. `src/app/services/calendar/calendarBridge/calendarBridgeIndex.ts`
    4. `src/app/components/lawyer/dashboard/CalendarReminderHost.tsx`
    These 4 files if present in WRONG subfolders will shadow real modules security bomb → gate verifies 4/4 paths DO NOT exist (clean).
  - (Phase 1) Critical Paths Exists: 56+ Calendar CR-1..CR-7 production files verified present (UPGRADE existing 32 to 56+)
  - (Phase 2) Full Calendar Vitest Suite: ≥40 test files → ≥237 tests → 100% PASS
  - (Phase 3) Output final line `=== Gate result === PASSED` + process.exit(0)
- **Evidence Source**: Run `node scripts/calendar-production-gate.mjs` → exit code 0, stdout contains `PASSED`, stderr has NO production-code console.warn/error (only test-lib `act(...)` hints allowed)
- **Test Requirement**: Gate self-test passes; no failed gates in any phase

#### AC-11 (rule): Dual Surface CP-01 Session Isolation
- **Rule**: Opening Radar Instant Chrome (dashboard surface) MUST NOT pollute SmartLegalRadar telemetry/session IDs — and vice versa: closing ScheduleTab MUST NOT dispose radar active session if user returns through commandHub / HomeWidget
- **Mechanism**: Independent file-level session counter pairs for CR-1 (SmartLegalRadar `calendarRadarOpenSessionCounter` + `lastActiveRadarId`) VS CR-4 (Dashboard Schedule `scheduleTabOpenCounter` + `lastActiveScheduleTabSessionId`). TearDown is selective per surface id, NOT global.
- **Evidence Sources**: grep for 4 unique counters (2 per surface) → 4 matches; grep for selective teardown check `if (targetSurfaceSessionId !== currentActiveId) return;` inside tearDownCalendarFloatingState paths = 2 matches
- **Test Requirement**: dual-surface session isolation test file → ≥3 tests exit 0

---

### Rubric-Type AC (3 Rubrics — evaluative, numeric scale, pass threshold ≥4/5)

#### AC-12 (rubric): Lifecycle Clarity — 8-Stage Linear Pipeline + Dual Surface Isolation
**Scale 1-5, Pass Threshold ≥4/5**

| Score | Anchor | Evidence Required for Score |
|-------|--------|------------------------------|
| 5/5 | World-Class Tier-1 | Linear 8-stage proven by tests: (1) scheduleIntentWarm prefetch (2) scheduleShellOpenFlow 3-part session-guarded ≥5 async zones (3) useSmartLegalRadarLifecycle Placement Rule return-cleanup-only (4) calendarCloudLoader + access gate via bridge/core resolveCalendarUserId (5) Render + 8× warm cache (CP-09) + zone switch latest-mark perf (6) useSmartLegalRadarForm→draft→commit 6-stage pipeline XSS sanitized (7) calendarEscapeStack L0-L3 4-layer + ReminderModal/InstantChrome escape (8) tearDownCalendarFloatingState 9-principle surgical close + idleRelease 12s unmount. Dual Surface Isolation counters 4/4 independent. Cumulative tests ≥300 all PASS. Zero stale-closure telemetry at 3 reopen/close cycles. |
| 4/5 | Production-Grade | Minor gaps but no failures; lifecycle stages linear proven, dual isolation confirmed, tests ≥250 PASS |
| 3/5 | Adequate | Stages present but ≥1 minor leak in close; dual isolation still holds |
| 2/5 | Risky | Missing stages, cross-surface pollution, high test flake rate |
| 1/5 | Unacceptable | No lifecycle order, severe stale closure pollution |

#### AC-13 (rubric): Security Hardening — Defense-in-Depth Matrix 15× (Security4 × XSS5 × Opcode100% × AntiBomb)
**Scale 1-5, Pass Threshold ≥4/5**

| Score | Anchor | Evidence for Score |
|-------|--------|---------------------|
| 5/5 | Tier-1 Fortified | Tightly-coupled defense matrix verified: Security 4-layer (Whitelist nav 0 / Ownership 2 early-returns / BFF 0 supabase grep / SecureStore at-rest ≥2) × XSS 5-layer (formInputGuard L1 / 6-clamp-fields L2 / stripCalendarHtml first-line L3 / ≥2 outbound sanitizeProfilePlainText paths L4 / React no-dangerously L5) × Opcode prefixes M/N ≥95% actual ≥95% × CALENDAR_SHADOW_STUB anti-module-shadowing 4/4 clean paths. All security suites ≥40 tests PASS. No supabase.from literal ANYWHERE client calendar code. |
| 4/5 | Production Safe | All layers present, ≥95% opcodes, 0 supabase, small gaps no functional exploit |
| 3/5 | Acceptable | One layer weak but compensated |
| 2/5 | Weak | Multiple layer gaps, XSS sanitizer missing ≥1 path |
| 1/5 | Failed | Direct supabase.from found, no sanitizer, missing opcodes |

#### AC-14 (rubric): Closure Integrity — Console Zero + Diagnostics=[] ×2 Independent Runs
**Scale 1-5, Pass Threshold ≥4/5**

| Score | Anchor | Evidence for Score |
|-------|--------|---------------------|
| 5/5 | Tier-1 Perfect | Console grep CR-1..CR-7 = 0 matches (E1) ✅; Diagnostics×2 empty: (1) Task8 E-2 أولي=[] ✅ (2) Task10 E-2 نهائي=[] ✅; Production gate ≥237/237 tests exit 0 PASSED; stderr purely `act(...)` test-lib only; Honesty 100% ≥90% threshold PASS; All 11 rule AC binary passes with grep/exit evidence. |
| 4/5 | Production Clean | Same 5/5 but honesty 90-99% instead of 100%; all other thresholds perfect |
| 3/5 | Minor Gaps | ≤1 console.warn production-code OR diagnostics ≤2 items trivial non-blocking cast fixed post-hoc |
| 2/5 | Flaky | Multiple console emissions OR diagnostics TS errors OR gate exit non-zero |
| 1/5 | Failed | Console spam, gate fail, diagnostics red errors |

---

## Production Gate Artifact Location
Post-Approval, during Implement Task9 I SHALL UPGRADE `scripts/calendar-production-gate.mjs` (32 paths existing → 56+ paths + CALENDAR_SHADOW_STUB Phase 0 anti-bomb)

## Review Artifact Location (Review Only, not Spec/Plan)
Post-10 Tasks completed + Gate pass + Final Diagnostics empty I SHALL create:
`.trae/specs/royal-calendar-zero-to-production-t1-audit-2026-09-08/review.md`

---
End of Calendar Tier-1 Spec (AC: 11 rule + 3 rubric + 2 closure E1/E2; ZVF binding 100%)
