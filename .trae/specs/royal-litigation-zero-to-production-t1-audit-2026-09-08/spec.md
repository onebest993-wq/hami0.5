# Hami Royal Litigation Section (قسم الدعاوى) — Tier-1 Zero-to-Production Atomic Audit Spec
**Date**: 2026-09-08  
**Standard**: Tier-1 World-Class Atomic Inspection from Scratch (Zero reliance on prior reports)  
**User Mandate VERBATIM**: اكبر قسمين يجب التعامل معهم باحترافية وهي اولا الدعاوى + فحص سطر سطر فعلياً مع ضمان: (1) الأداء/الخفة/الاستجابة (2) النظافة وحذف الكود الميت/المكرر (3) جودة الكود والبرمجة (4) جاهزية الموبايل بأعلى كفاءة (gestures/safe-area/inert/escape-stack) (5) من لحظة الضغط → التحميل → التسخين → الإغلاق والخروج (6) اختبار ميزة ميزة وسطر سطر وكل زر وخاصية.  
**Non-Goals**: تغيير UI سلسلة/UX/السلوك المرئي للمستخدم (ZVF 100% ملزم). جميع التعديلات داخلية فقط: lifecycle/guards/perf metrics/sanitizer/opcode prefixes/TS cleanups/theme constants strings/gate logic anti-bomb/tearDown + Abort wiring.

---

## 7 Official Litigation Production Roots (Audit Scope — CR-1..CR-7)
All grep/test/diagnostic runs SHALL execute ONLY against these 7 roots to avoid pollution from unrelated sections:

| # | Root Key | Path Pattern | Approx File Count | Audit Priority |
|---|----------|--------------|-------------------|----------------|
| **CR-1** | Lawsuit Domain Nucleus (Logic / State / Durability) | `src/app/domain/lawsuit/` | ~68 files (~24 __tests__ + ~44 production): durability gates / lifecycle index / persistence flush / file repository / party roles / jurisdiction / workspace recovery / write journal / file mutations / search haystack / judicial referrals | 🔴 Critical |
| **CR-2** | Lawsuit & CaseShare Services (Business Layer) | `src/app/services/*lawsuit*` (alerts/timeline) + `services/caseShare/` (~13 production + ~15 tests) + `services/calendar/dossierSync/lawsuitSync.ts` | ~38 | 🔴 Critical |
| **CR-3** | Litigation UI Components (User Surfaces) | `src/app/components/lawyer/LawyerNewCase/` (form + parties + save + validation) + `components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx / lawsuitArchiveSmartStatus.ts / lawsuitArchiveEnrichment.ts / lawsuitArchiveInstantLayout.ts` + `components/lawyer/criminal-system/case*.ts` (~52) + `components/lawyer/smart-modal/smartFile/*case*` (~15) | ~85 | 🔴 Critical |
| **CR-4** | Lawsuit Lifecycle Hooks (Open / Save / Hydrate / Link) | `src/app/hooks/lawsuitNewCaseSave.ts` + `hooks/lawsuitNewCaseLinking.ts` + `hooks/lawsuitFilesHydrateCycle.ts` + `hooks/lawsuitArchiveHydrateDeclaration.ts` + `hooks/lawsuitPersistDeferred.ts` + `hooks/lawsuitCommitWarn.ts` + `hooks/caseLinkingRuntime.ts` | 7 | 🟠 High |
| **CR-5** | Case / Litigation State Stores + Persistence | `src/app/stores/caseStore.ts` + `infrastructure/persistence/caseStorePersist.ts` + `types/common/caseFile.ts` + `types/common/court.ts` | 4 | 🟠 High |
| **CR-6** | Litigation Utils + Helpers (Trash / Tombstones / Storage) | `src/app/utils/lawsuitTrash.ts` + `utils/lawsuitFilesStorage.ts` + `utils/lawsuitDossierTombstones.ts` + `components/lawyer/ArchivePortal/utils/lawsuitArchiveHearing.ts` + `components/lawyer/ArchivePortal/hooks/lawsuitArchivePortalFiltering.ts` | 5 | 🟡 Medium-High |
| **CR-7** | Litigation Runtime (Boot / Hydration / Warm / E2E Probe / Open Contract) | `src/app/runtime/lawsuitWorkspaceWarm.ts` + `runtime/lawsuitWorkspaceEvents.ts` + `runtime/lawsuitsOverlayEntryLoader.ts` + `runtime/lawsuitOpenContract.ts` + `runtime/lawsuitFilesEagerHydrate.ts` + `runtime/lawsuitLifecycleE2eProbe.ts` + `runtime/lawsuitVaultCommitHold.ts` + `runtime/lawsuitDecryptBlockedFlag.ts` + `workspace/lawsuitWorkspacePin.ts` | 9 + 6 tests | 🟡 Medium-High |

---

## Baseline Audits (7 أنواع — Phase Specify Pre-Edit Snapshot)
Executed 2026-09-08 against CR-1..CR-7 production paths excluding `__tests__/**`:

| Audit # | L# / Name | Pattern | Baseline Result (pre-Task edits) | Target Correction Task |
|---|---|---|---|---|
| A1 | **WIFE BFF L3 Anti-direct-Client-DB** | `supabase.from(` on CR-1..CR-7 excluding tests | **0 hits** ✅ FREE (no Task4 L3 edits needed beyond re-verify) | Re-verify Task4 TR-4.3 only |
| A2 | **XSS 5-Layer L5 HTML injection surface** | `dangerouslySetInnerHTML` on CR-1, CR-3 | **0 hits** ✅ FREE (Task5 compensated by ≥2 outbound sanitize only) | Task5 TR-5.2 ≥2 outbound |
| A3 | **Lifecycle Abort Heavy-op coverage** | `new AbortController(` on CR-1/CR-7 | **0 hits** | Task8 TR-8.2 ≥3 Abort singletons |
| A4 | **Mobile Safe-Area Environment reads** | `safe-area-inset` / `env(safe-area` on CR-3 + runtime | **0 hits** | Task8 TR-8.1 ≥8 hits × 4 dirs |
| A5 | **Throw Opcode Prefix Coverage (M/N)** | `throw new Error` / `throw Error` on CR1 + CR2 + CR7 | **N=3 hits, M=1 prefixed correctly `[domain_lawsuit:…]` → 33% coverage** | Task6 TR-6.1 ≥95% = 3/3 |
| A6 | **Production Console Contamination Honesty** | `console.(log\|warn\|error\|info\|debug\|trace\|dir)` + `debugger;` on CR-1..CR-7 | **1 hit** in `domain/lawsuit/lawsuitSegmentPersist.ts` | Task7 TR-7.2 wrap with `import.meta.env.DEV` |
| A7 | **Hook Placement + Closure Freshness (eyeball)** | useRef counters + dual guard pattern pre-Task1 | **0 counters / 0 dual-guards** (standard per section launch baseline) | Task1 TR1.1 → 1.4 full upgrade |

---

## 18 Unique Litigation Section Properties (CP-01 → CP-18)
All Acceptance Criteria SHALL be adapted to these unique characteristics (not generic):

| # | Property ID | Description | Implication on Audit |
|---|-------------|-------------|----------------------|
| 1 | **CP-01 4-Surface User Paint** | (a) LawyerNewCase (form + parties) (b) ArchivePortal/LawsuitArchiveChrome (list) (c) criminal-system/*case* (procedural) (d) smart-modal/smartFile/*case* (cross-link) | Session Guard + tearDown مطلوب على الـ 4 surfaces معاً + 3× Placement Rule cleanups |
| 2 | **CP-02 Lawsuit Durability 5-Gate Fence** | lawsuitActiveDurability → durabilityGate → durabilityOverlay → durabilityVerify + lawsuitPersistFlush = 5 بوابات ديمومة كتابة | Write-journal microtask queue drain required P2 tearDown; no silent wipe allowed (CP-010 explicit) |
| 3 | **CP-03 CaseShare 11-Module Collaboration Surface** | caseShareSession + caseShareAccessControl + caseShareMasking + caseShareVisibility + caseShareDossierOwnership + caseShareDossierRevocation + caseSharePeekLite + caseShareCatalogBuilder + caseShareExtractors + caseShareNetworkGuard + caseShareApiService | Session Guard per collaboration sessionId; Abort 3b critical between P3/P4 tearDown for network guards |
| 4 | **CP-04 7-Path Criminal Case Merge Pipeline** | criminal-system/caseMergeMigration (prepare/validate/parties/apply/revert + types + timeline + tests ×3) = 7 خطوات دمج قضائية جزائية | EscapeStack L0..L3 priority during merge; Ownership gate userId before EVERY mutation |
| 5 | **CP-05 Lawsuit Workspace Pin + 12h Warm Cache** | lawsuitWorkspaceWarm.ts + lawsuitWorkspacePin.ts + lawsuitWorkspaceEvents.ts + lawsuitsOverlayEntryLoader.ts = workspace ecosystem | tearDown P5 must delete `__hamiLitWorkspace*` transient keys ≥12 |
| 6 | **CP-06 Eager Hydration 4-Tier Files** | lawsuitFilesEagerHydrate + lawsuitFilesHydrateCycle + lawsuitArchiveHydrateDeclaration + lawsuitFilesStorage = 4 طبقات تحميل ملفات دعاوى | SecureStore L4 ensurePersistedReady before every tier; AbortController on tiers during close |
| 7 | **CP-07 No Silent Wipe Contract (litigation-specific legal)** | lawsuitNoSilentWipe.contract.test + lawsuitNucleus.contract.test + fileMutationGuard + lawsuitDurabilityOverlay test ×3 = 9 إلزامية قانونية | All throw paths MUST have `[litigation:<submod>:<opcode>]` prefix; no bare Error(msg) allowed |
| 8 | **CP-08 Dual Lifecycle Index + Search Haystack** | lawsuitLifecycleIndex.ts + lawsuitIndexSearchHaystack.ts + tests ×2 = فهرس الحياة + البحث الدلالي للقضایا | latest-mark index pattern (entries[last]) NOT [0] to avoid reopen stale reports |
| 9 | **CP-09 9-Route Judicial Outcome Transformation Engine** | criminal-system/caseTransform* (JudicialOutcome + List + PersonalStage + ProceduralRoute + JourneyLifecycle + InvestigationReferral + DraftSeed + Severance + GuardsTrash) = 9 محركات تحويل نتيجة قضائية | Session-ownership guards on every route; no cross-party contamination allowed |
| 10 | **CP-10 Write-Journal + Pending-Create atomicity** | lawsuitWriteJournal.ts + lawsuitPendingCreateStore.ts + tests ×2 = دفتر اليومية الكتابية + متجر الإنشاءات المعلقة | P2 Drain microtasks journal flush on tearDown BEFORE P3 escape unblock; preserve legal atomicity |
| 11 | **CP-11 2-Path Segment Persist + Encrypt Limit** | lawsuitSegmentStorage + lawsuitSegmentPersist + lawsuitFileSegments + lawsuitFilesSegmentMutations + tests ×3 + segmentEncryptLimitWarn = 2 مسارات أجزاء ملفات تشفير | SecureStore L4 before every write; console wrap DEV-only (A6 baseline 1 hit) |
| 12 | **CP-12 Litigation Lifecycle Transaction + Mutation Fence** | lawsuitLifecycleTransaction.ts + lawsuitLifecycleMutationFence.ts + tests ×2 = معاملة دورة الحياة القضائية + السياج | Session closure fence: dual guard on EVERY transaction callback; Abort before commit |
| 13 | **CP-13 8-Variant Phase Procedural Resolution** | criminal-system/casePhase* (FilterEngine + FilterTypes + DecisionsScope + JourneyStage + ProceduralRoots + ResolveCore + ×2 tests) = 8 متغيرات قرارية إجرائية | Zone-switch perf marks latest-index (CP-15/08) on every phase nav switch |
| 14 | **CP-14 Parties Classification + Identity Sync + Correction** | caseClassificationEngine + caseIdentitySyncEngine + caseIdentityCorrectionEngine + tests ×3 = تصنيف الأطراف + مزامنة الهوية + تصحيح | No XSS in party names — sanitize inbound + outbound; no any-casting party.id |
| 15 | **CP-15 SmartFile Case Flow 8-Map** | smart-modal/smartFile/*case* (Linking + ConsolidationHelpers + Merge/Candidates + FlowStatusDisplay + Abandonment + LinkCriminalPeers + caseFlowStatusDisplay.test + Abandonment.test) = 8 خرائط تدفق ملف ذكي | tearDown call-site 8/9 mandatory inside smartFile unmount tail |
| 16 | **CP-16 6-Alert Lawsuit Notifications + Timeline Mirror** | lawsuitAlerts + lawsuitTimelineCalendarMirror + services/calendar/dossierSync/lawsuitSync + lawsuitArchivePerfMetrics + 3 × tests = 6 مسارات تنبيه/مرآة زمنية | AbortController on lawsuit sync during close; Sentry report guard no-throw |
| 17 | **CP-17 Jurisdiction + Court Referral Legal Engine** | lawsuitJurisdiction + courtReferral + tests ×2 = محرك الاختصاص القضائي + الإحالة للمحكمة | Ownership gate userId on every referral save; every throw legal-code prefixed |
| 18 | **CP-18 Smart-File Consolidation 4-Testbed Linking** | ConsolidationMerge + Linking + caseLinkingRuntime hook + tests ×2 = ربط وتوحيد ملفات قضائية متعددة | No silent cross-dossier write; session guard commit-only after guard pass |

---

## 14 Acceptance Criteria (11 rule + 3 rubric) + 2 Mandatory Closure Conditions (E1 + E2)

### Closure Conditions (USER MANDATE VERBATIM — لا تُعفى منهما أبداً × 3 مرات تشغيل USER MANDATE 3/3)
| # | ID | Condition | Verifiable Pass State |
|---|----|-----------|-----------------------|
| E1 | **Litigation Console Zero** | جذور الإنتاج CR-1..CR-7 grep على `console\.(log\|debug\|info\|warn\|error\|trace\|dir)` + `debugger;` باستثناء `__tests__/**` = **0 matches** | Grep command output count = 0 |
| E2 | **Litigation Diagnostics =[] ثلاث مرات USER MANDATE 3/3** | (1) أول تشغيل `GetDiagnostics` بعد Task7 = `[]` literal exactly + (2) ثاني بعد Task8 = `[]` + (3) نهائي بعد Task10 = `[]` literal exactly | Three independent runs return empty-array literal [] |

---

### Rule-Type AC (11 Rules — objectively binary pass/fail with grep/test/exit-code evidence)

#### AC-1 (rule): Session Guard 3-part في ≥4 هوكات + ≥26 Dual Guards + Placement Rule
- **Thresholds**: (أ) ≥8 File-level counters (2 لكل هوك: open counter + lastActiveId) (ب) 3-part session guard (`sessionIdRef` + `activeSessionIdRef`) في كل هوك/سياق (ج) ≥26 dual-guarded async closures (warm.then / persist.then / queueMicrotask / catch / observer / timeout / eagerHydrate callbacks) (د) **Placement Rule**: `activeSessionIdRef` reset في **return cleanup ONLY** للـ useEffect / import.meta.hot.dispose / close-function-AFTER-callbacks، لا خارج return في أي نقطة أخرى
- **Coverage Contexts (4+ required)**: (1) `runtime/lawsuitOpenContract.ts` (2) `hooks/lawsuitNewCaseSave.ts` (3) `domain/lawsuit/lawsuitWriteJournal.ts` (4) `services/caseShare/caseShareSession.ts` (5) `components/lawyer/LawyerNewCase/performLawyerNewCaseSave.ts` (6) `runtime/lawsuitWorkspaceWarm.ts` — اختر أربعة على الأقل
- **Evidence Sources**: grep `LawsuitSessionCounter` + `lastActive.*Id` (count ≥8) + grep dual guard pattern `if (sessionIdRef.current !== activeSessionIdRef.current) return;` inside async closures (count ≥26) + grep reset inside return cleanup ONLY = ≥4 hits, 0 hits outside
- **Test Requirement**: 4+ context test files (e.g. lawsuitOpenContract, lawsuitWriteJournal, caseShareSession, lawsuitNewCaseSave tests → existing ×9 + new ×1) → total tests ≥26 → exit code 0 all PASSED

#### AC-2 (rule): Surgical Close 9-Principles + tearDownLitigationFloatingState unified + ≥9 Call Sites
- **NEW Unified Function (DOES NOT EXIST NOW — grep confirmed zero hits)**: Must create `services/litigation/tearDownLitigationFloatingState.ts` (9 Principles + **P3b Network Abort Extension CRITICAL**)
- **9 Mandatory Principles P1→P8 + P3b (all new)**:
  - (P1) Blur surface focusables + blur `document.activeElement` + iframe.contentWindow blur for CaseShare
  - (P2) Drain pending write-journal + pending-create-store + segment-persist microtasks (per CP-02, CP-10) → dispose/delete refs
  - (P3) Unblock Litigation EscapeStack all layers (NewCase → Archive → Criminal → SmartFile → ConsolidationMerge) via `unblockAllLitigationOverlayEscape()` (exported helper, new creation)
  - **(P3b NETWORK ABORT — CRITICAL)** between P3 and P4: abortLitigationNetworkAllSafe() for ALL AbortControllers (FilesEagerHydrate / WorkspaceWarm / CaseShareNetwork / LifecycleTransaction / DossierSyncLawsuit)
  - (P4) Dispatch `LITIGATION_TEARDOWN_EVENT` CustomEvent with `detail:{reason:'tearDown', targetSurface: 'newCase'|'archive'|'criminal'|'smartFile'|'workspace'}`
  - (P5) Delete ≥16 transient `window.__hamiLit*` refs: workspaceWarm×4 / eagerHydrate×3 / sessionId×2 / pendingCreate×2 / journalFlushHandle / vaultCommitHold / lastPerfReportId / networkAbortHandles×3 = 17+ total keys
  - (P6) Snap DOM attrs: 5 root surfaces setAttribute `data-closing=true` + `aria-busy=false` (LawyerNewCaseRoot / LawsuitArchiveChrome / CriminalDashboardPortal / SmartFileModalHost / WorkspaceHostLazy)
  - (P7) Remove 4× NewCase Progressive Reveal + Workspace Warm Chrome covers classes + `pointer-events:none` snap (per CP-01 4 surfaces)
  - (P8) Settle/Clear timeout/animationframe ×5: workspaceIdle12s / overlayPrefetchTimer / phaseNavDebounce / archiveFilterDebounce / partyFormInputThrottle
- **Threshold**: `tearDownLitigationFloatingState` occurrence grep ≥9 call sites: (1) lawsuitOpenContract close tail (2) LawyerNewCase useEffect return cleanup (3) ArchivePortal filter-destroy (4) criminalDashboardPortal unmount (5) SmartFile caseLinkingRuntime abort path (6) lawsuitWorkspaceWarm hot.dispose cleanup (7) lawsuitFilesEagerHydrate reduced-motion early return (8) write-journal degraded catch (9) lawsuitVaultCommitHold release-after-commit tail
- **Evidence Sources**: grep `LITIGATION_TEARDOWN_EVENT` = 2 hits (const + dispatch) + grep `tearDownLitigationFloatingState` = ≥9 occurrences + grep `data-closing` = ≥5 setAttribute hits + 9 principle grep checks each = ≥1 match
- **Test Requirement**: Litigation honesty family (existing workspace/pin/contract honesty tests ×5 + new tearDownLitigationFloatingState.test + caseShareNetworkGuardAbort.test) → total tests ≥26 → exit code 0 all PASSED

#### AC-3 (rule): Perf Latest Mark ×2 Paths + restoreAllMocks + ≥4 Null Scenarios
- **Latest Mark Pattern**: كل من (A) `services/alerts/lawsuitArchivePerfMetrics.ts:getLatestLawsuitArchiveInteractive()` OR equivalent + (B) Criminal System Phase Switch / Smart-Flow zone-switch performance tracker MUST use `entries[entries.length - 1]` LATEST ENTRY (not first index [0] which causes reopen stale reports per CP-08, CP-13)
- **Null Scenario Tests**: 4+ it blocks: (A1) no marks at all → return null safe no-throw (A2) only start mark, null interactive end → return null (B1) reversed time (interactive before start) → return null BEFORE Math.round (B2) performance API missing (vitest env without marks) + empty array → return null without throwing (B3 optional: zone-switch start-only null → +1 extra score)
- **Cleanup**: `beforeEach(() => { vi.restoreAllMocks(); if (typeof performance !== 'undefined') { performance.clearMarks(); performance.clearMeasures(); } })` in ALL lawsuit perf test files — restoreAllMocks EXACTLY 1 LOCATION ONLY in performance test files; no occurrences inside files that contain `vi.hoisted()` (Placement Rule STRICT NON-NEGOTIABLE)
- **Evidence Sources**: grep `entries\[entries\.length - 1\]` on CR-2 + CR-3/CR-7 roots = ≥2 matches + grep `restoreAllMocks` in lawsuit perf __tests__ files = exactly 1 in Metrics file, 0 elsewhere + grep ≥4 `it('...null'` blocks → ≥4
- **Test Requirement**: `lawsuitArchivePerfMetrics.test.ts` + (criminalPhaseSwitchPerf or smartFileFlowPerf tests if separate or inline) → total ≥8 tests → exit code 0 all PASSED

#### AC-4 (rule): Security 4 طبقات + WIFE BFF (0 supabase.from on CR-1..CR-7)
- **4 Layers**:
  - (L1 Navigation Whitelist): grep `window\.location\s*=|history\.push|location\.href\s*=` on CR-1..CR-7 production roots excluding tests = 0 matches
  - (L2 Session Ownership Gate): `!userId` early return + `LITIGATION_OWNERSHIP_GUARD` comment in (أ) lawsuitPersistFlush (ب) caseShareDossierOwnership (ج) courtReferral.save (د) performLawyerNewCaseSave commit → ≥4 hits
  - (L3 WIFE BFF): grep `supabase\.from\(` on CR-1..CR-7 excluding tests = **0 matches** (baseline A1 already 0 FREE; re-verify only)
  - (L4 At-Rest SecureStore): `SecureStoreService.ensurePersistedReady()` called FIRST LINE in (أ) lawsuitSegmentPersist before write (ب) lawsuitFilesRepository open (ج) caseStorePersist.load (د) lawsuitFilesStorage readKey → ≥3 hits
- **Permissions 12 canXxx Matrix**: Create `services/litigation/litigationPermissions.ts` with 12 predicates: canCreateLawsuit / canEditLawsuitParties / canDeleteLawsuitDraft / canShareCase / canRevokeShare / canMergeCases / canSeverParties / canReferCourt / canChangeJurisdiction / canTransformJudicialOutcome / canArchiveLawsuit / canDownloadLawsuitFiles → exported readonly; no any-casts in predicate bodies
- **Evidence Sources**: Commands `rg -n "supabase\.from\(" CR-paths \| grep -v __tests__` → 0 lines + same 0 for nav methods + ownership guard "!userId" grep ≥4 hits + ensurePersistedReady grep ≥3 hits + permissions 12 canXxx exports grep count = 12 exactly
- **Test Requirement**: (if Security tests exist) litigationPermissions.test ×12 predicates + ownership guard scenarios + wife routes coverage → ≥40 tests exit 0 (if family test count below threshold compensated by existing 3× durability tests no-fail)

#### AC-5 (rule): XSS 5-Layer 2-Phase Strip + ≥2 outbound sanitizeProfilePlainText (دون تغيير DOM ZVF)
- **Phase 1 Inbound Strip L1/L2/L3**: Since baseline A2 = 0 dangerouslySetInnerHTML (FREE) compensated by L2 Sanitize + L3 Whitelist:
  - (L2 Input Sanitize): First line domain mapper `sanitizeProfilePlainText()` (من ملف الخدمة الرسمي للمشروع — grep أولًا للاسم الدقيق) on (A) performLawyerNewCaseSave before writing `caseStore.partyNames` (B) caseShareCatalogBuilder party field extraction (C) lawsuitIndexSearchHaystack index party name insert → ≥2 hits
  - (L3 Whitelist RegExp legal char set): `[Arabic letters English digits spaces ,.()-]` whitelist replace call at ≥2 of the same boundaries
- **Phase 2 Outbound L4/L5**: At **LEAST 2 network-send boundaries** outbound sanitizeProfilePlainText FIRST LINE payload before BFF network call (A) caseShareApiService.request payload.prepend → before fetch (B) lawsuitAlerts payload.name before BFF push → ≥2 distinct call sites
- **Evidence Sources**: grep `sanitizeProfilePlainText` on CR-1..CR-7 excluding tests → ≥4 total hits (inbound ≥2 + outbound ≥2) + sanitize import line at 2+ files distinct locations = ≥2 files import it
- **Test Requirement**: existing sanitizer-family tests no-fail plus new litigationXssBoundaries.test (if below count compensated by InputSanitizerService.test already existing pass)

#### AC-6 (rule): Throw Opcode Prefix ≥95% Coverage [litigation:<submod>:<opcode>] format legal-readable
- **Baseline**: N=3 throws across CR-1 (lawsuitFileMutationGuard + independentChallengeDossier + litigationDecisionEngine) — M=1 = 33%
- **Target**: ≥95% → 3/3 or 3/3 = 100% all 3 throws converted
- **Prefix Convention**: `[litigation:<domainSubmod>:<VERB_opcode>]` — examples: `[litigation:fileMutation:guard_violation]`, `[litigation:indChallenge:stage_missing]`, `[litigation:decisionEngine:party_missing]`. CaseShare services subsystem uses prefix `[caseshare:<submod>:<opcode>]` for any future throws there (no need to fabricate non-existent throws for 0-hit modules)
- **Evidence Sources**: grep `throw new Error\(` / `throw Error` on CR-1 + CR-7, count prefix match regex `\[(litigation|caseshare):` = (M_actual / N_total) ≥ 0.95 rounded down + raw ratio line displayed
- **Test Requirement**: existing lawsuit contract tests (Nucleus + NoSilentWipe ×2) exit code 0 (no opcode format tests needed; grep evidence sufficient)

#### AC-7 (rule): Honesty Console Zero + DEV-only wrapping + Diagnostics 1st Run (1/3) = literal []
- **Honesty ≥90%**: (M_actual honest wrapped / N_total pre-existing) ≥ 0.90
- **Console Zero E1**: grep `console\.(log\|warn\|error\|info\|debug\|trace\|dir)` + `debugger;` on CR-1..CR-7 exclude tests = **COUNT 0 EXACTLY**
- **Wrap Convention**: Wrap every remaining production console hit in `if (import.meta.env.DEV) { ... }` block (NOT `process.env.NODE_ENV`) — preserve original console argument list verbatim, no console message text changes, no new console additions
- **Baseline A6 = 1 hit**: `domain/lawsuit/lawsuitSegmentPersist.ts:1` → wrap only 1 location this task (if more surfaced later in Task1/2 edits, wrapped retroactively same pass)
- **First Diagnostics RUN (1/3 USER MANDATE)**: `GetDiagnostics` tool invocation returns **exact literal empty array []** not just "no items visible" — if length >0 repeat fixes until literal []
- **Evidence Sources**: grep count console production = 0 + DEV wrapper grep count = ≥1 (matches original 1 baseline) + Diagnostics raw JSON output screenshot/copy line = `[]`
- **Test Requirement**: 0 failing honesty/close tests (lawsuit honesty family ≥8 pass exit 0)

#### AC-8 (rule): Mobile Safe-Area ≥8×4 dirs + EscapeStack 4-Priority REAL (not stub) + Abort×3 Singletons + Diagnostics 2nd RUN (2/3) = literal []
- **L1 Safe-Area ≥8 hits × 4 directions**: paddingTop/marginTop + `env(safe-area-inset-top)` + right/left/bottom counterparts on 8+ litigation mobile-critical components: LawyerNewCase Save button / ArchivePortal Toolbar / criminal Dashboard sticky header / smart-modal TopRail / CaseShare Session Slider / Workspace 48h Pin strip → ≥8 components, each reads env(safe-area-inset-{top,right,bottom,left}) at least once = ≥8×4
- **L2 EscapeStack L0-L3 REAL (Task2 stubs upgraded via re-export)**: (L0 Modal First Responder) (L1 Overlay Dismiss) (L2 Fragment Back) (L3 Deep Navigation). Prioritized stack. Replace stubs via RE-EXPORT pattern ZVF: create real escape-impl → re-export same names as Task2 stub → zero caller edits
- **L3 Abort×3 Singletons + global attach**: (1) abortLitigationFilesHydrateAll (2) abortLitigationWorkspaceAll (3) abortCaseShareNetworkAll → three separate AbortController singletons exported; attach to window globals `__hamiLitAbortFiles` / `__hamiLitAbortWorkspace` / `__hamiLitAbortCaseShare` with typeof guards on lookup
- **Second Diagnostics RUN (2/3 USER MANDATE)**: `GetDiagnostics` returns literal [] exactly
- **Evidence Sources**: safe-area env() hits ≥8×4 = 32 pattern lines + escape 4 priority levels real impl grep = ≥4 classes/level enums + abort singletons 3 × exports + 3 × window attach typeof guards + Diagnostics = []
- **Test Requirement**: existing escape-family lawsuit tests + mobile touch tests → total ≥30 tests exit 0 (compensated by prior no-fail suite if below)

#### AC-9 (rule): Litigation Gate Upgrade 4-Phase + REPO_SHADOW_STUB adapted ANTI-MODULE-SHADOWING for Litigation LAWSUIT_SHADOW_STUB 4 wrong subfolder paths
- **Phase 0 (Anti-Module-Shadowing Bomb LAWSUIT_SHADOW_STUB)**: Glob with `node:fs globSync({ caseSensitive:false })` — NOT existsSync (Windows false-positive trap) on 4 INTENTIONALLY WRONG SUBFOLDER LOCATION litigation paths that MUST NOT EXIST to defeat case-insensitive bombs: (1) `src/app/components/Lawyer/dossier-notes/components/LitigationNucleusSheet.tsx` (wrong capital L + wrong subfolder) (2) `src/app/SERVICES/vault/VaultServices/litigationOwnershipGate.ts` (wrong SERVICES caps + wrong subfolder) (3) `src/app/HOOKS/lawyerDashboard/litigation/litigationShellLifecycle/litigationOpenFlow.ts` (wrong HOOKS caps + non-existent lifecycle subfolder) (4) `src/app/RUNTIME/storage/encryptedStorage/lawyerLitigationBoot.ts` (wrong RUNTIME caps + wrong storage path) → Phase0 requires ALL 4 paths return empty Glob result (4/4 clean) → any 1 hit = gate exit 1 INSTANT FAIL
- **Phase1 Critical Paths**: Glob ≥56 litigation-relevant critical production paths from REAL disk (not hardcoded from spec — capture real array at gate runtime) → count matched paths ≥56
- **Phase2 vitest ≥237 tests across ≥40 litigation test files**: Two separate runs (verbose visible + JSON reporter programmatic parse): (a) `vitest run --reporter=verbose ...` all litigation-relevant suites count ≥237 passing tests (b) JSON reporter parsed with `JSON.parse`: total test count ≥237 AND testResults every single one = status "passed" no failed
- **Phase3 PASSED banner exact last line stderr match**: string equality check for `'===== LITIGATION TIER-1 PRODUCTION GATE PASSED ====='` exactly no typos as final last line stderr + process.exit(0)
- **Create**: `scripts/litigation-production-gate.mjs` implementing 4 phases in order. No gate edits allowed to raise counts by cheating (actual real run only)
- **Evidence Sources**: Gate raw stdout/stderr with 4 phase banners + Phase0 4/4 CLEAN lines + Phase1 paths=56+ + Phase2 JSON parsed 237+ both runs match + Phase3 PASSED banner last line + exit code = 0 exactly
- **Test Requirement**: gate self-test: run the gate once → Phase0-3 all pass → exit0 (integrated)

#### AC-10 (rule): Honesty + Dual Guard Correctness + Opcode + XSS Boundary Regression ≥99% No-Fail on Existing 100+ lawsuit test family
- Run the ENTIRE litigation test family CR-1..CR-7 __tests__ in one vitest aggregate. NO test failures allowed. Total ratio passed / total ≥ 0.99 (fail ≤1 allowed, pass ≥99%)
- **Evidence Sources**: vitest JSON reporter run results → total = N → passed = M → M/N ≥ 0.99 numeric + 0 failing test name strings OR ≤ 1 excused unrelated failure only if approved by user explicitly (default: 0 fail expected)
- **Test Requirement**: actual aggregate run; pass or fail based on ratio

#### AC-11 (rule): Final Diagnostics RUN 3/3 USER MANDATE = literal [] exactly + 0 todo = 0 pending
- `GetDiagnostics` tool invocation raw JSON output = literal `[]` (no "passing 0 info" — actually `[]` with length property 0)
- **No Pending items**: All 10 tasks in tasks.md Status ∈ {completed, cancelled-with-user-approval}. 0 items ∈ {pending, in_progress, blocked}
- **Evidence Sources**: raw Diagnostics = [] + grep tasks.md `Status:` = 10× completed OR cancelled (cancelled requires approval field)
- **Test Requirement**: literal string comparison Diagnostics output = `[]` + manual status scan of all 10 Tasks = completed

---

### Rubric-Type AC (3 Rubrics — evaluative with numeric scale + explicit pass threshold)

#### AC-12 (rubric: Lifecycle Clarity / Session + Close Freshness)
- **Dimension**: وضوح دورة حياة الدعاوى + نضارة الجلسة + صحة الإغلاق الجراحي عبر 4 الأسطح الرسمية
- **Scale**: 0-5
- **Anchors**:
  - 1 = لا حراس جلسة على الإطلاق؛ إغلاق مبعثر بدون دالة مركزية tearDown
  - 3 = حراس جلسة موجودة في ≥2 هوكات لكن ≤10 dual guard؛ دالة tearDown موجودة لكن <6 مواقع استدعاء؛ ضبابية في Placement Rule
  - 5 = 4+ هوكات × dual guard ≥26 + Placement Rule صحيح reset في cleanup فقط 0 خارج + tearDown 9 مبادئ + ≥9 call sites + P3b Abort بين P3/P4 + 17+ مفاتيح عابرة محذوفة
- **Pass Threshold**: ≥ 4/5
- **Evidence Sources**: CR-1/4/7 grep counts (8+ counters / 26+ guards / 9+ tearDown / 5+ data-closing / 16+ __hamiLit keys) + 4 test files session = exit 0

#### AC-13 (rubric: Production Hardening Readiness — Security / Perf Budget / Mobile / Opcode / Zero Console)
- **Dimension**: جاهزية القسم للانتاجية الفعلية في بيئات حقيقية على أجهزة مستخدمين عادية + هواتف
- **Scale**: 0-5
- **Anchors**:
  - 1 = ثغرات واضحة: أي استدعاء مباشر supabase في الكلاينت، XSS غير محمي، console ملوث، لا safe-area في الهواتف
  - 3 = أغلب الطبقات موجودة لكن ثغرات طفيفة: WIFE=0✅ لكن ≤2 outbound sanitize فقط، console=0 لكن ≤2 opcode prefix ناقصة، ≤4 safe-area hits فقط
  - 5 = WIFE BFF=0✅ + XSS inbound ≥2 + outbound ≥2 sanitize✅ + Opcode ≥95%✅ + Console=0✅ + Safe-area 8×4=32✅ + Abort×3 globals✅ + EscapeStack L0-L3 real✅ + Perf latest-mark ×2✅ + restoreAllMocks placement 1-location STRICT✅
- **Pass Threshold**: ≥ 4/5
- **Evidence Sources**: A1..A7 baseline + Tasks4-8 numeric results from tasks.md Evidence tables + 3× Diagnostics = []

#### AC-14 (rubric: Honesty / Clean Build / Zero Mutation Side Effects Observed During Gate Run)
- **Dimension**: الصدق والشفافية في إغلاق القسم؛ عدم وجود آثار جانبية للتحويلات على الحالة العامة للمشروع خارج نطاق الدعاوى؛ نقاء الـ Build والاختبارات
- **Scale**: 0-5
- **Anchors**:
  - 1 = Build مكسور أو اختبارات كثيرة تفشل؛ آثار جانبية تؤثر على أقسام أخرى (تقويم / مستودع / منتدى)
  - 3 = جميع اختبارات الدعاوى تمر لكن ≤3 اختبارات في الأقسام الأخرى فشلت بعد تعديلات الدعاوى؛ أو ≤2 تحذيرات TypeScript
  - 5 = 100% tests pass (≥237 litigation) + سائر الأقسام السبعة (الإعدادات / البحث / الإشعارات / الملف / المهام / المنتدى / التقويم) جميعها تمر بنسبة 100% أيضاً بعد الدمج + GetDiagnostics ثلاث مرات [] تماماً + مشاكل برمجية = 0 + Console = 0 جذور الإنتاج
- **Pass Threshold**: ≥ 4/5
- **Evidence Sources**: Gate Phase2 exit 0 + PASSED banner + Build/TypeScript clean check exit 0 + 3× Diagnostics = [] + regression 8 sections optional re-run pass ratio

---

## End of Litigation spec.md — Total ACs: 14 (11 rule + 3 rubric) / Total E closure conditions × 2 (E1 Console=0 + E2 Diag 3×=[])
