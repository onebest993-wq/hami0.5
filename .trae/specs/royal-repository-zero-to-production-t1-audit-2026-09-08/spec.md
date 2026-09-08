# Hami Royal Repository Section — Tier-1 Zero-to-Production Atomic Audit Spec
**Date**: 2026-09-08  
**Standard**: Tier-1 World-Class Atomic Inspection from Scratch (Zero reliance on prior reports)  
**User Mandate VERBATIM**: فحص سطر سطر فعلياً مع ضمان: (1) الأداء/الخفة/الاستجابة (2) النظافة وحذف الكود الميت/المكرر (3) جودة الكود والبرمجة (4) جاهزية الموبايل بأعلى كفاءة (gestures/safe-area/inert/escape-stack) (5) من لحظة الضغط → التحميل → التسخين → الإغلاق والخروج (6) اختبار ميزة ميزة وسطر سطر وكل زر وخاصية.  
**Non-Goals**: تغيير UI سلسلة/UX/السلوك المرئي للمستخدم (ZVF 100% ملزم). جميع التعديلات داخلية فقط: lifecycle/guards/perf metrics/sanitizer/opcode prefixes/TS cleanups/theme constants strings/gate logic anti-bomb/tearDown + Abort wiring.

---

## 7 Official Repository Production Roots (Audit Scope — CR-1..CR-7)
All grep/test/diagnostic runs SHALL execute ONLY against these 7 roots to avoid pollution from unrelated sections:

| # | Root Key | Path Pattern | Approx File Count | Audit Priority |
|---|----------|--------------|-------------------|----------------|
| **CR-1** | Repository Core Services (Feed / Rooms / Perf / StripHtml / Sync / Presentation) | `src/app/services/repository/` (exclude __tests__) | 14 (repositoryFeedWarmCache / repositoryRooms / repositoryUnifiedFeed / repositoryPerfMetrics / repositoryPerfBudget / stripRepositoryHtml / repositoryDossierNoteSync / repositoryDossierNotes / repositoryDossierRegistry / repositoryRoomRelocate / repositoryRoomPresentation / repositorySentryReporting / repositoryShellNavigation) | 🔴 Critical |
| **CR-2** | Vault PDF + Text Extraction + Ownership + Blob Services | `src/app/services/vault/` (exclude __tests__) | 21 (vaultPdfDocument / vaultPdfRuntime / vaultPdfTextExtraction / vaultTextExtractionService / scheduleVaultTextExtraction / vaultOwnership / vaultBlobPathLite / vaultPreviewUrlSafety / vaultCloudKvPayload / vaultLocalIndex / vaultDocsWarmCache / vaultDocsWarmState / vaultDocsTombstonesLite / smartVaultRuntime / vaultDocResolve / vaultFileGuards / vaultDocUtils / vaultPdfAssetUrls / vaultPdfDocumentTypes / vaultTypes) | 🔴 Critical |
| **CR-3** | Storage Encryption Runtime + Secure Read + Remote Path Remove | `src/app/services/storage/` (exclude __tests__) | 9 (lawyerStorageRuntime / readSecureOrDrainLegacySync / removeRemoteStoragePaths / storageEncryptionError / syncSecureJson / deletedIdsLiteStore / deletedIdsPersistBridge / decryptedCacheNotify) | 🔴 High |
| **CR-4** | Dossier Persistence Backup / Wipe Guards / Corrupt Signals / Protected Storage | `src/app/services/dossierPersistence/` (exclude __tests__) | 12 (dossierBackupStore / dossierPersistenceService / dossierWipeGuard / dossierKeyLoad / dossierPrimaryEmpty / dossierStorageKeys / dossierCollectionSyncLite / corruptStorageSignal / protectedStorageKeys / protectedBackupService / storageHydrationGuard / dossierPersistenceTypes) | 🔴 High |
| **CR-5** | Repository Hooks / Shell Open Flow / Lazy Imports Lifecycle | `src/app/hooks/lawyerDashboard/repository/` (exclude __tests__) | 2 (repositoryShellOpenFlow + repositoryLazyImports) | 🟠 High |
| **CR-6** | Dossier Notes Vault + Smart Law Linkers + Composer / Editor / Preview | `src/app/components/lawyer/dossier-notes/` (exclude __tests__) | 7 (DossierNotesVault / DossierFastNoteComposer / DossierLawArticleRichEditor / DossierNoteBodyPreview / SmartLawLinkPopover / SmartLawPickerMenu / useSmartLawLinkInteractions) | 🟠 High |
| **CR-7** | Repository Runtime Hub (Boot / Hydrate / Paint) + BFF Upload Routes | `src/app/runtime/repositoryHubLoader.ts` + `repositoryBootHydrator.ts` + `repositoryInstantChromeMarkup.ts` + `repositoryInstantPaint.ts` + `src/app/api/forum/repository/` routes (signed-url + main route) | 6 (4 runtime + 2 BFF routes) | 🟡 Medium-High |

---

## 18 Unique Repository Section Properties (CP-01 → CP-18)
All Acceptance Criteria SHALL be adapted to these unique characteristics (not generic):

| # | Property ID | Description | Implication on Audit |
|---|-------------|-------------|----------------------|
| 1 | **CP-01 Blob Ownership Per-Lawyer** | vaultOwnership.ts يربط كل blob PDF/وثيقة بمحامٍ واحد فقط عبر ownership fingerprint مع جدول مرجعي vaultLocalIndex | Session Guard يتحقق من ownership قبل أي تحميل/استخراج نص؛ لا يسمح بتبادل blobs بين جلسات المحامين |
| 2 | **CP-02 Scheduled PDF Text Extraction Pipeline** | scheduleVaultTextExtraction + vaultPdfTextExtraction + vaultTextExtractionService → pipeline مجدول لاستخراج النص من PDF مع budget frame throttling | AbortController مطلوب عند الإغلاق أثناء extraction الثقيلة؛ Session Guards لمنع تداخل extraction بين الجلسات |
| 3 | **CP-03 Dossier Notes Smart Link To Law Articles** | SmartLawLinkPopover + SmartLawPickerMenu + useSmartLawLinkInteractions → ربط الملاحظات بالقوانين والمواد القانونية مع autocomplete | XSS sanitizer مطلوب على *كل* note content قبل الحفظ وقبل الـ dangerouslySetInnerHTML الموجود حالياً في DossierNoteBodyPreview |
| 4 | **CP-04 12 Repository CanXxx Permissions Matrix** | يُنتج أثناء Task4 مكعب صلاحيات شامل للمستودع: canOpenRoom / canRelocateRoom / canUploadVaultDoc / canExtractPdfText / canDownloadBlob / canWipeDossierBackup / canReadSecureStorage / canSyncRemotePaths / canPreviewVaultUrl / canEditDossierNote / canLinkLawArticle / canBootRepositoryHub = 12 صلاحيات | Test matrix 12 canXxx جميعها مع جلسات صالحة وغير صالحة |
| 5 | **CP-05 Storage Encryption Corrupt Signal Detector** | corruptStorageSignal.ts يكتشف إشارات فساد التخزين المشفر (magic byte mismatch / checksum fail / truncation) مع fallback readSecureOrDrainLegacySync | throw messages مع [storage:corrupt:*] opcodes؛ tearDown يلغي عمليات drain الثقيلة عند الإغلاق |
| 6 | **CP-06 Orphan Remote Path Removal Garbage Collector** | removeRemoteStoragePaths.ts يزيل مسارات Blob المنعزلة orphan التي فقدت ownership refs مع ضمان عدم حذف مسارات مستخدم آخر | Abort مطلوب أثناء عملية الحذف المجمعة عند الإغلاق؛ Session Guard للتحقق من identity before deletion |
| 7 | **CP-07 Vault Preview URL Safety Sandbox** | vaultPreviewUrlSafety.ts يطبق URL allow-list + sandboxing لـ preview URLs مع منع redirect خارجي + iframe sandbox attributes | No bypass allowed — يجب أن يمر كل preview عبر هذه الطبقة؛ WIFE BFF 0 supabase في الكلاينت مؤكد |
| 8 | **CP-08 Warm Feed Cache Repository 8 Layers** | repositoryFeedWarmCache + repositoryUnifiedFeed + repositoryPerfBudget + repositoryPerfMetrics + Rooms cache + Presentation cache + vaultDocsWarmCache + dossierBackupStore = 8 طبقات cache | tearDown يجب أن يحذف كل الـ 8 cache refs + يلغي pending network fetches |
| 9 | **CP-09 Performance Budget Allocation Engine** | repositoryPerfBudget.ts يوزع budget الزمني للـ frame بين (Room Render + Vault Thumb + Note Composer + Extraction Worker) مع yieldToMain تلقائي | Latest-Mark pattern مطلوب في repositoryPerfMetrics لمنع تقارير stale عند إعادة فتح القسم |
| 10 | **CP-10 Room Relocate Atomic Transaction** | repositoryRoomRelocate.ts + repositoryShellNavigation → عملية نقل الغرف بين الفئات مع atomic rollback عند الفشل + repositoryDossierRegistry update ثنائي الاتجاه | Opcode prefixes [repository:relocate:*] لجميع throws؛ No partial commit state allowed |
| 11 | **CP-11 Strip HTML Repository Notes (2-Phase)** | stripRepositoryHtml.ts موجود حالياً (واختباره) — 2-phase strip مع delete dangerous whole blocks أولاً ثم tag brackets | يجب استدعاؤه كأول سطر (FIRST LINE) في repositoryUnifiedFeed mapper قبل أي validation/clamp |
| 12 | **CP-12 Dossier Note Registry Bidirectional Sync** | repositoryDossierNoteSync + repositoryDossierRegistry مزامنة ثنائية الاتجاه بين Dossier Notes الـ local و Cloud BFF مع finger-print مقارنة | Abort مطلوب عند الإغلاق أثناء sync؛ Session Guard لمنع خلط جلسات sync بين المحامين |
| 13 | **CP-13 Storage Schema Migration Bootstrap Sequence** | storageHydrationGuard + dossierKeyLoad + protectedStorageKeys + syncSecureJson → تسلسل هيدراتي صارم لـ storage schema migrations مع criminalPrefix protection | SecureStore ensurePersistedReady يجب أن يكون **FIRST LINE** قبل أي read/write من storage |
| 14 | **CP-14 Lawyer Storage Runtime Work Gate Scheduler** | lawyerStorageRuntime.workGate يحدد جداول عمل تخزين المحامي حسب idle time + battery level مع تجميع عمليات الكتابة لرفع الكفاءة | tearDown P3b يلغي جميع pending work items عند الإغلاق؛ IdleRelease 12s pattern للموبايل |
| 15 | **CP-15 Vault PDF Asset URLs Copy-On-Write Isolation** | vaultPdfAssetUrls + vaultBlobPathLite + vaultCloudKvPayload → COW pattern لمنع تعديل blobs الأصلية؛ نسخ منفصلة لكل session user | Ownership gate مطلوب على كل payload blob URL؛ No shared mutable references |
| 16 | **CP-16 Dossier Backup Store Append-Only Immutable Ledger** | dossierBackupStore + protectedBackupService → سجل ملاحق فقط غير قابل للتعديل لنسخ احتياطية الدوسيـر مع Wipe Guards | dossierWipeGuard.ts يحمي من wipe غير مصرح به؛ Wipe opcodes مسبوقة بـ [dossier:wipe:*] مع 2-signature confirmation |
| 17 | **CP-17 Repository↔DossierNote Bidirectional Sync Fingerprint** | repositoryDossierNoteSync + repositoryDossierNotes + repositoryRoomPresentation → مزامنة ثنائية بالبصمة الرقمية دون إعادة كتابة كاملة | Sync abortable via AbortController عند close؛ No orphan dossier notes بعد teardown |
| 18 | **CP-18 Dossier Wipe Guard Unreadable State Machine** | dossierWipeGuard.ts + dossierWipeGuardUnreadable state — state machine يحمي عملية المسح من التلاعب: (INIT → AUTH-2FA → CONFIRM-IDENTITY → WIPE-ATOMIC → FINALIZE) | جميع transitions غير صالحة تُرمي throw opcode [dossier:wipe:invalid_state]؛ No silent bypass لأي transition |

---

## 14 Acceptance Criteria (11 rule + 3 rubric) + 2 Mandatory Closure Conditions (E1 + E2)

### Closure Conditions (USER MANDATE VERBATIM — لا تُعفى منهما أبداً)
| # | ID | Condition | Verifiable Pass State |
|---|----|-----------|-----------------------|
| E1 | **Repository Console Zero** | جذور الإنتاج CR-1..CR-7 grep على `console\.(log\|debug\|info\|warn\|error\|trace\|dir)` + `debugger;` باستثناء `__tests__/**` = **0 matches** (Baseline حالياً = 3 hits: vault=2, storage=1 — يجب تصفيرهم Task7) | Grep command output count = 0 |
| E2 | **Repository Diagnostics =[] 3 مرات** USER MANDATE 3/3: (1) أول تشغيل `GetDiagnostics` بعد Task7 = `[]` + (2) ثاني بعد Task8 = `[]` + (3) نهائي بعد Task10 = `[]` | كل الثلاثة عمليات تشغيل مستقلة ترجع مصفوفة فارغة |

---

### Rule-Type AC (11 Rules — objectively binary pass/fail with grep/test/exit-code evidence)

#### AC-1 (rule): Session Guard 3-part في ≥3 هوكات + ≥26 Dual Guards + Placement Rule
- **Baseline Snapshot**: هوكات رسمية موجودة: (1) hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts (2) DossierNotesVault.tsx controller (3) vaultOwnership session gate (4) repositoryHubLoader lifecycle boot = ≥4 هوكات فعلياً.
- **Thresholds**: (أ) ≥8 File-level counters (2 لكل هوك: open counter + lastActiveId) (ب) 3-part session guard (`sessionIdRef` + `activeSessionIdRef`) في كل هوك (ج) ≥26 dual-guarded async closures (vaultTextExtraction.then / dossierBackupStore.append / repositoryFeedWarmCache.load / workGate queueMicrotask / storage sync callbacks / observer / timeout callbacks) (د) **Placement Rule**: `activeSessionIdRef` reset في **return cleanup ONLY** للـ useEffect، لا خارج return في أي نقطة أخرى
- **Coverage Hooks (4 required)**: (1) `hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts` (2) `components/lawyer/dossier-notes/DossierNotesVault.tsx` lifecycle (3) `services/vault/smartVaultRuntime.ts` boot gate (4) `runtime/repositoryHubLoader.ts` hydrate controller
- **Evidence Sources**: grep for `SessionCounter` + `lastActive.*Id` (count ≥8) + grep for dual guard pattern `if (sessionIdRef.current !== activeSessionIdRef.current) return;` inside async closures (count ≥26) + grep for reset location: inside `return () => {...}` ONLY of useEffect = 4 hits, 0 hits outside
- **Test Requirement**: repositoryShellOpenFlow.test + vaultOwnership.test + repositoryHubHydrate.modal.test + dossierWipeGuard.test → total tests ≥ 20 → exit code 0, all PASSED

#### AC-2 (rule): Surgical Close 9-مبادئ + tearDownRepoFloatingState unified + ≥9 Call Sites + P3b Abort
- **NEW Unified Function (DOES NOT EXIST NOW — grep confirmed zero hits)**: Must create `services/repository/tearDownRepoFloatingState.ts` (8 Principles + **P3b Network Abort Extension**)
- **9 Mandatory Principles P1-P8 + P3b (all new)**:
  - (P1) Blur repository shell focusables + blur `document.activeElement` + blur vault PDF iframe focus
  - (P2) Drain pending SaveQueue microtasks (DossierNote draft + RoomRelocate commit queue + DossierBackup append transient batches + storage workGate pending items) → dispose/delete refs
  - (P3) Unblock Repository EscapeStack all layers (VaultPreview → DossierNoteComposer → SmartLawLinkPopover → RepositoryBack) via `unblockAllRepositoryOverlayEscape()` (exported helper, new creation)
  - **(P3b Network Abort — CRITICAL)**: Call abortRepoXxx() for ALL AbortController instances (VaultTextExtraction / DossierSync / RemotePathRemove / WorkGate / StorageDrain) between P3 and P4
  - (P4) Dispatch `REPOSITORY_TEARDOWN_EVENT` CustomEvent with `detail:{reason:'tearDown', targetSurface: 'repositoryShell'|'dossierNotesVault'|'vaultPdf'}`
  - (P5) Delete 16+ transient `window.__hamiRepo*` refs: workGateQueue / extractionSessionId / warmCacheHandles×8 / roomRelocateTx / noteDraftRef / previewUrlSessionId / storageDrainHandle / syncAbortHandle / registrySnapshotRef / lastPerfReport / hubHydrationId / orphanRemoveHandle
  - (P6) Snap DOM attrs: root RepositoryShell + DossierNotesVault + VaultPdfOverlay setAttribute `data-closing=true` + `aria-busy=false`
  - (P7) Remove Repository Instant Paint Chrome covers classes + `pointer-events:none` snap (per CP-15 Vault isolation + repositoryInstantChromeMarkup)
  - (P8) Clear repositoryHubLoader settle timeout + delete ref
- **Threshold**: `tearDownRepoFloatingState` occurrence grep ≥9 call sites: (1) repositoryShellOpenFlow close path (2) DossierNotesVault unmount (3) VaultPdfDocument dispose (4) repositoryHubLoader abort path (5) SmartLawLinkPopover dismiss (6) lawyerStorageRuntime idleRelease 12s (7) reduced-motion early return (8) post-animation finish (9) repositoryBootHydrator unload
- **Evidence Sources**: grep for `REPOSITORY_TEARDOWN_EVENT` = 2 hits (const + dispatch) + grep for `tearDownRepoFloatingState` = ≥9 occurrences + grep `data-closing` = ≥3 setAttribute hits + 8+1 principle grep checks each = ≥1 match
- **Test Requirement**: repositoryDockSectionSurgicalCloseHonesty + worldclassRepositoryCloseHonesty + dossierWipeGuardUnreadable.test + repositoryHubHydrate.modal.test → total tests ≥ 26 → exit 0, all PASSED

#### AC-3 (rule): Perf Latest Mark ×2 Paths + restoreAllMocks Placement + ≥4 Null Scenarios
- **Latest Mark Pattern**: كل من `services/repository/repositoryPerfMetrics.ts:getLatestRepositoryInteractive()` AND repository zone-switch performance tracker (CR-7 runtime) MUST use `performance.getEntriesByName(name)[entries.length - 1]` LATEST ENTRY (not first index [0] which causes reopen stale reports per CP-08, CP-09)
- **Null Scenario Tests**: 4 it blocks (≥2 threshold ×2): (A1) no marks at all → return null safe no-throw (A2) only start mark, null interactive → return null (B1) reversed time (interactive before start) → return null (B2) performance API missing (vitest env without marks API) + no marks → return null without throwing
- **Cleanup**: `beforeEach(() => { vi.restoreAllMocks(); if (typeof performance !== 'undefined') performance.clearMarks(); })` في **ONE FILE ONLY**: `repositoryPerfMetrics.test.ts` — STRICTLY FORBIDDEN في أي ملف اختبار آخر فيه `vi.hoisted()` لتجنب wipe elevated mocks.
- **Evidence Sources**: grep `entries\[entries\.length - 1\]` on CR-1 + CR-7 roots = 2 matches + grep `restoreAllMocks` in repository perf test files = 1 hit ONLY (repositoryPerfMetrics.test.ts) + grep for 4 `it('...null'` blocks → ≥4
- **Test Requirement**: `repositoryPerfMetrics.test.ts` + `repositoryPerfBudget.test.ts` → total ≥8 tests → exit 0

#### AC-4 (rule): Security 4 طبقات + WIFE BFF (0 supabase.from on CR-1..CR-7) + 12 canXxx Permissions Matrix
- **Baseline Snapshot**: WIFE BFF grep supabase.from على CR-1..CR-7 = 0 hits (ممتاز) — يجب الحفاظ عليه بصفر
- **4 Layers**:
  - (L1) Whitelist Navigation: grep `window\.location\s*=|history\.push|location\.href\s*=` على CR-1..CR-7 = 0 matches
  - (L2) Session Ownership Gate: `!userId` early return exists in vaultOwnership.ts gate AND repositoryShellOpenFlow.hook AND dossierWipeGuard identity check AND `REPOSITORY_OWNERSHIP_GUARD` comment in core
  - (L3) WIFE BFF: grep `supabase\.from\(` على CR-1..CR-7 production roots = **0 matches** (Baseline 0 confirmed; excluding __tests__/** + comment literals). ALL operations routed through BFF services/api routes forum/repository/signed-url + central services BFF adapters (repositoryCloud / vaultCloud / storageCloud). No direct supabase in client code.
  - (L4) At-Rest SecureStore: `SecureStoreService.ensurePersistedReady()` called **BEFORE FIRST LINE** inside (1) `storageHydrationGuard.hydrate` (2) `dossierKeyLoad.loadKey` (3) `protectedStorageKeys.bootstrap` (4) `repositoryHubLoader.boot` → ≥3 hits confirmed (باستثناء SSR typeof guard `if (typeof SecureStoreService?.ensurePersistedReady === 'function')` inside try/catch never-throw)
- **Permissions Matrix (12 canXxx — CP-04)**: إنشاء `services/repository/repositoryPermissions.ts` مع canOpenRoom / canRelocateRoom / canUploadVaultDoc / canExtractPdfText / canDownloadBlob / canWipeDossierBackup / canReadSecureStorage / canSyncRemotePaths / canPreviewVaultUrl / canEditDossierNote / canLinkLawArticle / canBootRepositoryHub = 12 functions × 2 tests each = 24 tests
- **Evidence Sources**: Commands `rg -n "supabase\.from\(" CR-paths | grep -v __tests__` → line count = 0 + same 0 for nav methods + ownership guard grep "!userId" ≥3 hits + ensurePersistedReady grep ≥3 hits + canXxx grep ≥12 functions
- **Test Requirement**: repositoryPermissions.test (24 tests) + vaultOwnership.test + readSecureOrDrainLegacySync.test + lawyerStorageRuntime.workGate.test + transactionsThreadingBackup.test + dossierKeyLoad.test → total ≥ 40 tests → exit 0

#### AC-5 (rule): XSS Defense 5 طبقات + explicit 2-Phase strip regex + ≥2 outbound sanitizeProfilePlainText paths
- **Baseline Snapshot**: XSS L5 dangerouslySetInnerHTML = 1 hit موجود في DossierNoteBodyPreview.tsx (Baseline 1) → **MUST REMOVE OR SANITIZE STRICTLY** to reach 0 safe
- **XS-5.1 L1 inbound boundary**: repositoryUnifiedFeed mapper + DossierFastNoteComposer input guard rejects length-attack / control-chars / non-string / malicious law-link refs
- **XS-5.2 L3 explicit HTML strip 2-PHASE regex FIRST LINE** (Critical CP-11): `stripRepositoryHtml(input)` in `services/repository/stripRepositoryHtml.ts` MUST be split to 2-Phase: (Phase0 FIRST delete WHOLE dangerous blocks WITH content via backreference RegExp `*_DANGEROUS_BLOCK_TAGS` = 8 tag types: script/iframe/object/embed/style/link/meta/base WITH their inner content) → (Phase1 THEN delete remaining tag brackets via `*_STRIP_HTML_TAGS`). Strip function MUST be called كأول سطر (FIRST LINE TOP) INSIDE: (Site A) `repositoryUnifiedFeed:mapRepositoryFeedItems()` mapper function BEFORE any validation/clamp/length ops
- **XS-5.3 L2 Input Clamp 6/6 fields**: (1) DossierNote body length clamp ≤ MAX_NOTE_BODY (2) Room title clamp (3) VaultDoc filename clamp (4) LawArticle link label clamp (5) Presentation description clamp (6) Sync fingerprint nonce clamp = 6/6 ALL clamped with MIN/MAX boundary constants
- **XS-5.4 L4 sanitizeProfilePlainText ≥2 UNIQUE outbound paths** (min 2 threshold): (Path A) Repository UI commit boundary `components/lawyer/dossier-notes/DossierFastNoteComposer.tsx` save handler before draft→commit transition → sanitize note body + law link labels (Path B) Repository services central boundary `services/repository/repositoryDossierNoteSync.ts:buildRepositorySyncPayload()` OR `vaultOwnership.claimOwnershipPayload` → sanitize ALL outbound user-facing string fields BEFORE any BFF/network call
- **XS-5.5 L5 React auto-escape**: Final target = grep `dangerouslySetInnerHTML` على CR-1..CR-7 production roots = **0**. الحالية 1 hit في DossierNoteBodyPreview → إما إزالة التعديل واستبدالها بـ React text render آمن، أو تطبيق DOMPurify-like strict sanitize قبلها مع stripRepositoryHtml + 2-phase + outbound sanitize مضاعفة + comment توضيحي `// XSS L5 Safe: sanitized via stripRepositoryHtml (phase0+phase1) + sanitizeProfilePlainText before render`
- **Evidence Sources**: `stripRepositoryHtml` Phase0 + Phase1 match = ≥2 regex patterns; sanitizeProfilePlainText grep on CR-1..CR-7 ≥2 distinct files; clamp length × 6 fields = 6; dangerouslySetInnerHTML = 0 OR 1 with strict sanitization chain evidence
- **Test Requirement**: stripRepositoryHtml.test (existing) + input clamp tests + law link sanitize tests + DossierNote tests → ≥25 tests → exit 0

#### AC-6 (rule): Opcode Throw Prefixes [repository:*] / [vault:*] / [storage:*] / [dossier:*] / [repo:*] ≥ 95% Coverage
- **Baseline Snapshot**: Total throws N = 17 (vaultDocResolve=2 + smartVaultRuntime=4 + vaultOwnership=7 + lawyerStorageRuntime=4 → 2+4+7+4 = 17 production throws EXCLUDING tests). Prefixed M = 0 (0% coverage currently). Target M/N ≥ 0.95 → ≥ 16/17 prefixed
- **Methodology**: (1) Count total `throw new Error` / `throw 'string'` statements in CR-1..CR-7 excluding `__tests__/**` = N total (2) Count prefixed throws matching `\[(repository|vault|storage|dossier|repo|vaultPdf|vaultOwn|storCrypt|dossPersist):[a-z_:]+\]` = M prefixed (3) Ratio M/N ≥ 0.95 (95%)
- **Expected Prefixes**: `[repository:feed:empty_fingerprint]`, `[repository:relocate:atomic_rollback]`, `[repository:sync:orphan_session]`, `[vault:ownership:identity_mismatch]`, `[vault:extraction:pdf_corrupt]`, `[vault:preview:url_not_allowed]`, `[storage:corrupt:magic_byte_bad]`, `[storage:runtime:legacy_drain_fail]`, `[storage:remote:path_not_owned]`, `[dossier:wipe:invalid_state_CD16]`, `[dossier:backup:append_readonly]`, `[dossier:key:decrypt_failed]` etc
- **Evidence Sources**: grep counts command output with N total + M prefixed + ratio% ≥95%
- **Test Requirement**: throw-site-bearing test files (vaultDocResolve + vaultOwnership + vaultPdfLoadError + storageEncryptionError + dossierWipeGuard + corruptStorageSignal) → ≥20 tests → exit 0

#### AC-7 (rule): Honesty ≥ 90% + Console=0 (E1 verified) + First Diagnostics=[]
- **Baseline Snapshot**: Console production = 3 hits (smartVaultRuntime.ts = 2 + removeRemoteStoragePaths.ts = 1) → Target Task7 = 0 (باستثناء import.meta.env.DEV wrapping إذا أردت الاحتفاظ للـ dev فقط)
- **Honesty Threshold ≥90%**: worldclassRepositoryCloseHonesty + repositoryDockSectionSurgicalCloseHonesty + repositoryInstantPaint + repositoryHubHydrate.modal.test + dossierStorageKeysChunkHonesty + vaultDocsWarmCache + vaultPreviewUrlSafety.test + repositoryFeedWarmCache + repositoryRooms + vaultBlobStore + vaultLocalIndex = total honesty tests / passing ≥ 0.90
- **Console=0 Prod-Only**: E1 condition confirmed (grep 0 matches post-Task7). Any remaining console.* must be wrapped `if (import.meta.env.DEV)` لتقوم Vite بحذفها تلقائياً في production build (dead-code elimination)
- **First Diagnostics Pre-check**: بعد Task8 edits → GetDiagnostics() on CR-1..CR-7 modified files → result = `[]` (zero TS diagnostic items)
- **Stability Run**: 12+ test files for Repository Section (Honesty + Mobile + Perf bundles) executed in a single vitest run → ≥50 tests → all PASSED exit 0

#### AC-8 (rule): Mobile CSS×4 Safe-Area (8+ hits) + EscapeStack 4 Layers + AbortController ≥3 + Second Diagnostics=[]
- **Baseline Snapshot**: CSS env(safe-area-inset-) على CR-5 + CR-6 حالياً = 0 hits → Target Task8 = ≥8 hits with ALL 4 directions covered (top + bottom + left + right each ≥ 1 occurrence)
- **Mobile CSS×4×2 explicit env(safe-area-inset-*,0px) calc pattern**: Target locations (تطبق في ثيم ثابت واحد دون تغيير بصري): (1) RepositoryShellOverlay safe-area-top + safe-area-bottom (2) DossierNotesVault safe-area-left + safe-area-right (3) DossierFastNoteComposerToolbar safe-area-bottom calc env(…)+8px (4) SmartLawLinkPopover safe-area-top (5) VaultPdfOverlay safe-area-left+right for landscape (6) RepositoryInstantChrome safe-area-top+bottom = ≥8 hits covering top/bottom/left/right
- **EscapeStack 4 طبقات Top-First Pop**: إنشاء `services/repository/repositoryEscapeStack.ts` مطابق لتصميم forumEscapeStack.ts: (L0-surface priority=0) RepositoryShell back / (L1-sheet priority=1) VaultPdfOverlay dismiss / (L2-popup priority=2) DossierNoteComposer close / (L3-nested priority=3) SmartLawLinkPopover dismiss. Map-based priority with `peekRepositoryEscapeTopLayer()` API + `unblockAllRepositoryOverlayEscape()` لـ tearDown P3. إبقاء backward compatible مع existing callers عبر re-export من ملف repositoryCloseEvents.ts (يُنشأ Task2 مع stubs تتحقق حقيقية Task8 — ZVF zero caller edits)
- **AbortController ≥3 locations** (ALL wired inside P3b of tearDownRepoFloatingState عبر typeof safe fallback): Currently 0 → Target ≥3 singletons: (Abort-1) vaultTextExtraction abort heavy PDF pipeline (Abort-2) repositoryDossierNoteSync abort bidirectional sync heavy (Abort-3) removeRemoteStoragePaths + storage drain operations OR dossierCollectionSyncLite backup sync = ≥3. إنشاء ملف `services/repository/repositoryNetworkAbort.ts` مع getAbortSignalXxx() + abortRepoXxx() + attachRepoAbortGlobals() side-effect import يربط window.__hamiRepoAbort* تلقائياً
- **Evidence Sources**: CSS×4 safe-area calc grep = ≥8 matches; Escape priority layers count 4 types; AbortController grep `new AbortController()` on CR-1..CR-4 ≥3 matches
- **Test Requirement**: repository mobile tests + escape tests + abort-handler tests + repositoryInstantPaint → ≥40 tests exit 0
- **Second Diagnostics**: Post Task8 edits → GetDiagnostics() second run = `[]` (empty, no TS issues)

#### AC-9 (rule): Vault CP-01/02 + Storage CP-05/14 + Dossier CP-16/18 Clean Lifecycle
- **Vault Text Extraction + Ownership Confirmed**: vaultTextExtractionService routed through BFF signed-url route NOT client supabase (0 supabase.from confirmed AC-4 L3). Permission-denied handled with opcode [vault:ownership:*]. Ownership fingerprint verified before blob load.
- **Storage Corrupt Signal + Work Gate Cleanup**: pending storage drain + workGate items aborted at close via AbortController instances CP-5/CP-14; protectedStorageKeys criminalPrefix verified before ANY storage op; dossierWipeGuard 2-signature confirmation + invalid_state throw pattern CP-18 enforced
- **Dossier Backup + Wipe Guard**: Backup append-only ledger immutable CP-16; WipeGuard state machine transitions ALL validated CP-18; orphan dossier rows removed via CP-06 remote path remove ONLY after ownership confirmation
- **Evidence Sources**: grep for extractionHandle + ownershipCalcHandle + storageDrainHandle + workGateClearHandle inside tearDownRepoFloatingState P3b/P5 = ≥3 matches
- **Test Requirement**: vaultOwnership.test + vaultPdfLoadError.test + vaultPreviewUrlSafety.test + corruptStorageSignal.test + dossierWipeGuard.test + dossierWipeGuardUnreadable.test + protectedStorageKeys.criminalPrefix.test + repositoryDocsWipeGuard.test → ≥20 tests exit 0

#### AC-10 (rule): Production Gate `scripts/repository-production-gate.mjs` exit 0 + REPO_SHADOW_STUB Anti-Bomb 4/4 Clean
- **Gate Phases (NEW gate script MUST BE CREATED during Task9)**:
  - (Phase 0 PRE-FLIGHT) REPO_SHADOW_STUB check (4 shadow paths — targeting WRONG SUBFOLDERS not just case-diff to defeat Windows case-insensitive existsSync):
    1. `src/app/components/lawyer/dossier-notes/components/DossierNotesVault.tsx`
    2. `src/app/services/vault/vaultServices/vaultOwnership.ts`
    3. `src/app/hooks/lawyerDashboard/repository/repositoryShellLifecycle/repositoryShellOpenFlow.ts`
    4. `src/app/services/storage/encryptedStorage/lawyerStorageRuntime.ts`
    These 4 files if present in WRONG subfolders will shadow real modules security bomb → gate verifies 4/4 paths DO NOT exist (clean) using `globSync({caseSensitive:false, nodir:true})`.
  - (Phase 1) Critical Paths Exists: ≥56 Repository CR-1..CR-7 production files verified present (glob pre-verified each exists before gate write)
  - (Phase 2) Full Repository Vitest Suite: ≥40 test files → ≥237 tests → 100% PASS exit 0 (vitest JSON reporter: files ≥40, passed ≥237, failed = 0)
  - (Phase 3) Output final line `=== Gate result === PASSED` + process.exit(0). FAILED case: exit 1 with error details
- **Evidence Source**: Run `node scripts/repository-production-gate.mjs` → exit code 0, stdout contains `PASSED` last line, stderr has NO production-code console.warn/error (only test-lib `act(...)` hints allowed)
- **Test Requirement**: Gate self-test passes; no failed gates in any phase 0/1/2/3

#### AC-11 (rule): Multi-Surface Session Isolation (Repository Shell / DossierNotesVault / VaultPdf)
- **Rule**: Opening DossierNotesVault (CR-6) MUST NOT pollute Repository Shell telemetry/session IDs — and vice versa: closing VaultPdf modal MUST NOT dispose DossierNotesVault active session if user returns via Tab switch. Work Gate storage ops (CR-3) MUST survive session surface switches but abort at full section teardown.
- **Mechanism**: Independent file-level session counter pairs for (1) CR-5 Repository Shell: `repoShellOpenSessionCounter` + `lastActiveRepoShellId` (2) CR-6 DossierNotesVault: `dossierVaultOpenSessionCounter` + `lastActiveDossierVaultId` (3) CR-2 VaultPdf: `vaultPdfOpenSessionCounter` + `lastActiveVaultPdfId` = 6 unique counters total. TearDown is selective per surface id via detail.targetSurface check in REPOSITORY_TEARDOWN_EVENT handler, NOT global.
- **Evidence Sources**: grep for 6 unique counters (2 per surface × 3 surfaces) → 6 matches; grep for selective teardown check `if (targetSurfaceSessionId !== currentActiveId) return;` inside tearDownRepoFloatingState surface-dispatch paths = ≥2 matches
- **Test Requirement**: multi-surface session isolation test file (repository multi-surface honesty scenarios) → ≥3 tests exit 0

---

### Rubric-Type AC (3 Rubrics — evaluative, numeric scale, pass threshold ≥4/5)

#### AC-12 (rubric): Lifecycle Clarity — 8-Stage Linear Pipeline + 3-Surface Session Isolation
**Scale 1-5, Pass Threshold ≥4/5**

| Score | Anchor | Evidence Required for Score |
|-------|--------|------------------------------|
| 5/5 | World-Class Tier-1 | Linear 8-stage proven by tests: (1) repositoryBootHydrator prefetch (2) repositoryShellOpenFlow 3-part session-guarded ≥5 async zones (3) DossierNotesVault lifecycle Placement Rule return-cleanup-only (4) vaultOwnership identity gate + SmartVaultRuntime boot (5) Render + 8× warm cache layers (CP-08) + zone switch latest-mark perf (6) DossierFastNoteComposer→draft→commit 6-clamp XSS sanitized (7) repositoryEscapeStack L0-L3 4-layer + VaultPdf/DossierNote escape (8) tearDownRepoFloatingState 9-principle surgical close + idleRelease 12s unmount. Multi-Surface Isolation counters 6/6 independent for RepoShell/DossierVault/VaultPdf. Cumulative tests ≥237 all PASS. Zero stale-closure telemetry at 3 reopen/close cycles. ZVF 100% zero visual/behavior changes. |
| 4/5 | Production-Grade | Minor gaps but no failures; lifecycle stages linear proven, multi-surface isolation confirmed, tests ≥200 PASS |
| 3/5 | Adequate | Stages present but ≥1 minor leak in close; multi-surface isolation still holds |
| 2/5 | Risky | Missing stages, cross-surface pollution, high test flake rate |
| 1/5 | Unacceptable | No lifecycle order, severe stale closure pollution |

#### AC-13 (rubric): Security Hardening — Defense-in-Depth Matrix 18× (Security4 × XSS5 × Opcode95% × Permissions12 × AntiBomb)
**Scale 1-5, Pass Threshold ≥4/5**

| Score | Anchor | Evidence for Score |
|-------|--------|---------------------|
| 5/5 | Tier-1 Fortified | Tightly-coupled defense matrix verified: Security 4-layer (Whitelist nav 0 / Ownership 3 early-returns / BFF 0 supabase grep / SecureStore at-rest ≥3 FIRST LINE calls) × XSS 5-layer (formInputGuard L1 / 6-clamp-fields L2 / stripRepositoryHtml 2-phase FIRST LINE L3 phase0+phase1 / ≥2 outbound sanitizeProfilePlainText paths L4 distinct 2 files / React no-dangerously L5 target 0) × Opcode prefixes M/N ≥95% actual ≥95% (16+/17) × CP-04 12 canXxx permissions matrix all test PASS × REPO_SHADOW_STUB anti-module-shadowing 4/4 clean paths fail-fast glob. All security suites ≥40 tests PASS. No supabase.from literal ANYWHERE client repository code. |
| 4/5 | Production Safe | All layers present, ≥95% opcodes, 0 supabase, small gaps no functional exploit |
| 3/5 | Acceptable | One layer weak but compensated with secondary guard |
| 2/5 | Weak | Multiple layer gaps, XSS sanitizer missing ≥1 path |
| 1/5 | Failed | Direct supabase.from found, no sanitizer, missing opcodes |

#### AC-14 (rubric): Closure Integrity — Console Zero + Diagnostics=[] ×3 Independent Runs (USER MANDATE 3/3)
**Scale 1-5, Pass Threshold ≥4/5**

| Score | Anchor | Evidence for Score |
|-------|--------|---------------------|
| 5/5 | Tier-1 Perfect | Console grep CR-1..CR-7 = 0 matches (E1) ✅; Diagnostics×3 empty USER MANDATE 3/3: (1) Task7 First=[] ✅ (2) Task8 Second=[] ✅ (3) Task10 Final=[] ✅; Production gate ≥237/237 tests exit 0 PASSED banner last line; stderr purely `act(...)` test-lib only; Honesty 100% ≥90% threshold PASS; REPO_SHADOW_STUB anti-bomb 4/4 clean Phase0; All 11 rule AC binary passes with grep/exit evidence. |
| 4/5 | Production Clean | Same 5/5 but honesty 90-99% instead of 100%; all other thresholds perfect |
| 3/5 | Minor Gaps | ≤1 console.warn production-code (with import.meta.env.DEV wrapper) OR diagnostics ≤2 items trivial non-blocking cast fixed post-hoc |
| 2/5 | Flaky | Multiple console emissions OR diagnostics TS errors OR gate exit non-zero |
| 1/5 | Failed | Console spam, gate fail, diagnostics red errors OR 1 of 3 Diagnostics runs non-empty |

---

## Production Gate Artifact Location
Post-Approval, during Implement Task9 I SHALL CREATE `scripts/repository-production-gate.mjs` (NEW: 4 phases Phase0 REPO_SHADOW_STUB anti-bomb 4 paths + Phase1 ≥56 critical paths Glob pre-verified + Phase2 ≥40 files / ≥237 tests vitest verbose + JSON reporter thresholds + Phase3 PASSED banner exit 0)

## Review Artifact Location (Review Only, not Spec/Plan)
Post-10 Tasks completed + Gate pass + Final Diagnostics empty I SHALL create:
`.trae/specs/royal-repository-zero-to-production-t1-audit-2026-09-08/review.md`

---
End of Repository Tier-1 Spec (AC: 11 rule + 3 rubric + 2 closure E1/E2; ZVF binding 100%; USER MANDATE 3× Diagnostics=[] explicitly required)
