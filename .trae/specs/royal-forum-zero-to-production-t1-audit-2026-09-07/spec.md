# Hami Royal Forum Section — Tier-1 Zero-to-Production Atomic Audit Spec
**Date**: 2026-09-07  
**Standard**: Tier-1 World-Class Atomic Inspection from Scratch (Zero reliance on prior reports)  
**User Mandate VERBATIM**: فحص سطر سطر فعلياً مع ضمان: (1) الأداء/الخفة/الاستجابة (2) النظافة وحذف الكود الميت/المكرر (3) جودة الكود والبرمجة (4) جاهزية الموبايل بأعلى كفاءة (gestures/safe-area/inert/escape-stack) (5) من لحظة الضغط → التحميل → التسخين → الإغلاق والخروج (6) اختبار ميزة ميزة وسطر سطر وكل زر وخاصية.  
**Non-Goals**: تغيير UI سلسلة/UX/السلوك المرئي للمستخدم (ZVF 100% ملزم). جميع التعديلات داخلية فقط: lifecycle/guards/perf metrics/sanitizer/opcode prefixes/TS cleanups/theme constants strings/gate logic anti-bomb.

---

## 7 Official Forum Production Roots (Audit Scope)
All grep/test/diagnostic runs SHALL execute ONLY against these 7 roots to avoid pollution from unrelated sections:

| # | Root Key | Path Pattern | Approx File Count | Audit Priority |
|---|----------|--------------|-------------------|----------------|
| **FR-1** | CommunityScreen (Main Forum Surface) | `src/app/components/lawyer/CommunityScreen/` | ~135 (hooks + components + __tests__ + theme/css) | 🔴 Critical |
| **FR-2** | Forum Services (Business Logic) | `src/app/services/forum/` | ~100 (forumApi/* + repositories + caches + security + perf) | 🔴 Critical |
| **FR-3** | Forum Top-Level Services (Blobs/Attachments) | `src/app/services/forumApiService.ts` + `forumAttachmentService.ts` + `forumBlobStore.ts` + `forumBlobPath.ts` + `forumAttachmentPreview.ts` | 5 | 🔴 High |
| **FR-4** | Dashboard Forum Integration (Tiles + Quarter Profile + Entry) | `src/app/components/lawyer/dashboard/forumProfile/` + `commandHub/ForumTile*.tsx` + `HomeForumSignalsIsland.tsx` + `ForumInstantPaintCover.tsx` + `overlay-sections/LawyerDashboardCommunityOverlayEntry.tsx` | ~25 | 🟠 High |
| **FR-5** | Forum Shell/Open Hooks (Lifecycle + Intent + Warm) | `src/app/hooks/lawyerDashboard/forumIntentWarm.ts` + `community/communityShellOpenFlow.ts` + `community/communityLazyImports.ts` + `hooks/useForumUnreadCount.ts` + `useForumNotificationStream.ts` + `useForumMentionAutocomplete.ts` | 6 | 🟠 High |
| **FR-6** | Forum Runtime (Boot + Hydration + Instant Paint) | `src/app/runtime/forumOpenIntent.ts` + `forumSurfaceLive.ts` + `forumE2eForceOpen.ts` + `forumInstantPaint.ts` + `forumTileProfileQuarterLoader.ts` + `communityOverlayEntryLoader.ts` + `communityHubLoader.ts` + `communityBootHydrator.ts` + `communityHubReadiness.ts` | 9 | 🟡 Medium-High |
| **FR-7** | Forum Moderation + HQ Admin + API Security Routes | `src/app/api/forum/` + `api/security/*Forum*` + `components/admin/HqForumAdminPanel.tsx` + `hqForumBanRows.ts` | ~12 | 🟡 Medium |

---

## 18 Unique Forum Section Properties (FP-01 → FP-18)
All Acceptance Criteria SHALL be adapted to these unique characteristics (not generic):

| # | Property ID | Description | Implication on Audit |
|---|-------------|-------------|----------------------|
| 1 | **FP-01: Dual Identity Surface** | المنتدى له واجهتان متزامنتان: (أ) CommunityScreen الكامل داخل LawyerDashboardCommunityOverlayEntry (ب) ForumTile الربع داخل Command Hub | Session Guards + tearDown مطلوب على الاثنين معاً؛ لا يُسمح ببقاء refs مهجورة من إحداهما عند فتح الأخرى |
| 2 | **FP-02: 8-Section Atomic Switch** | `ForumSectionSwitch.tsx` يدير تبديل 8 أقسام داخل CommunityScreen: Feed / Following / Notifications / Groups / Directory / CategoryPanels / RepositoryBridge / AccessGate | Escape Stack و Clear Drafts و Perf Marks و Abort مطلوب لكل section switch لا فقط للخروج النهائي |
| 3 | **FP-03: Cross-System Repository Bridge** | `forumRepositoryEscapeBridge.ts` + `LegalRepositoryModals.tsx` يدمج نافذة SmartRepository داخل سياق المنشورات forum feed | Close handlers يجب أن تعتبر Repository Bridge طبقة escape مستقلة؛ cleanups متداخلة |
| 4 | **FP-04: Instant Paint ×4 Covers** | 4 طبقات Instant Paint: ForumOverlayInstantCovers + ForumFollowingInstantCover + ForumLazySectionInstantSlots + ForumInstantPaintCover (dashboard) | tearDown يجب أن ينظف كل الـ 4 refs و snap attrs بشكل متزامن |
| 5 | **FP-05: 5-Level Post Publish Pipeline** | communityAddQuestionPublishGuard → Draft → Commit + forumPostCreateGuard + forumBffAccessPolicy + forumGroupMutationGate | XSS sanitizer مطلوب على *كل* مرحلة من المراحل الـ5 لا فقط عند الـ UI submit |
| 6 | **FP-06: Dual Rate Limiting** | forumRateLimit.ts (client-side 500ms debounce) + forumRateLimitServer.ts (server-side token bucket) | Session Guards يجب أن تلغي pending rate limit timers عند الإغلاق لمنع تسريب |
| 7 | **FP-07: Mention Autocomplete System** | forumMentionUtils.ts + useForumMentionAutocomplete + ForumMentionSuggestions.tsx تعرض أسماء المحامين أثناء الكتابة | Draft refs + observer scroll للاقتراحات يجب تنظيفها جراحياً |
| 8 | **FP-08: Community Social Graph Init** | communitySocialGraphInit.ts يهيئ Follow/Mute/Group caches قبل render أولي | AbortController مطلوب إذا تم إغلاق الشاشة أثناء init الثقيل |
| 9 | **FP-09: Warm Cache ×6 Layers** | forumPostsWarmCache + forumNotificationsWarmCache + forumGroupsWarmCache + forumSocialWarmCache + repositoryDocsWarmCache + communityNotificationsPrefetch/communityFollowingPrefetch | warm cache handles يجب حذفها في tearDown + إلغاء pending network fetches |
| 10 | **FP-10: ForumPerfBudget Thread** | forumPerfBudget.ts + forumPerfMetrics.ts يقيّمان paint budget لكل post row | يجب استخدام latest mark (`entries[length-1]`) لا أول عند إعادة فتح نفس القسم عدة مرات |
| 11 | **FP-11: BLOB Attachment Encryption Pipeline** | forumBlobStore + forumBlobAtRest.ts (encryption at-rest) + forumAttachmentSigning + forumImageCompression.ts | Abort مطلوب أثناء عمليات upload/Compression عند إغلاق؛ لا orphan blobs |
| 12 | **FP-12: ILike Search Arabic Normalization** | forumIlikePattern.ts يطبّع أحرف عربية (أ/إ/آ → ا، ى/ي → ي، إلخ) قبل PostgreSQL search | Input guards مطلوبة قبل تطبيق pattern |
| 13 | **FP-13: Strongly-Typed Entity ID Discriminators** | forumEntityIdCore.ts + forumEntityId.ts يفرق PostId/CommentId/GroupId/AttachmentId بتمييز صريح TypeScript | No any-casting؛ throw messages بدون ID مسبوقة بـ opcode |
| 14 | **FP-14: ForumNotificationStream Background Service** | ForumNotificationStreamService.ts + forumNotificationDispatchThread يعمل في الخلفية حتى عند إغلاق CommunityScreen مؤقتاً | Dispose() و sessionId guard مطلوب عند unmount كامل للـ Provider |
| 15 | **FP-15: Index Queue + Retry Workers** | forumRepositoryIndexQueue.ts + forumRepositoryIndexRetryWorker.ts عمليات خلفية كثيفة | Abort via session close؛ لا تُسمح بتشغيل workers بعد unmount |
| 16 | **FP-16: Orphan Sweep Garbage Collector** | forumRepositoryOrphanSweep.ts يمحى media paths غير المرجعية | GC runs يجب إلغاؤها إذا تم الإغلاق قبل الانتهاء |
| 17 | **FP-17: Moderation Triple-Gate** | forumReportModeratorNotify.server.ts + forumRepositoryModeration.ts + HqForumAdminPanel (HQ) | BFF enforcement confirmed — لا supabase.from في الكلاينت |
| 18 | **FP-18: Community Access Gate Panel** | CommunityScreenAccessGatePanel.tsx + communityPermissions.ts + useCommunityForumAccess.ts يمنع المطرودين/المكتومين من القراءة/الكتابة | Session guard يتحقق من صلاحيات في كل render ولا يعتمد على cache فاسد |

---

## 14 Acceptance Criteria (11 rule + 3 rubric) + 2 Mandatory Closure Conditions (E1 + E2)

### Closure Conditions (USER MANDATE VERBATIM — لا تُعفى منهما أبداً)
| # | ID | Condition | Verifiable Pass State |
|---|----|-----------|-----------------------|
| E1 | **Forum Console Zero** | جذور الإنتاج FR-1..FR-7 grep على `console\.(log\|debug\|info\|warn\|error\|trace\|dir)` + `debugger;` باستثناء `__tests__/**` = **0 matches** | Grep command output count = 0 |
| E2 | **Forum Diagnostics =[] مرتين** | (1) أول تشغيل `GetDiagnostics` بعد Task8 = `[]` + (2) نهائي بعد Task10 = `[]` | Both independent runs return empty array |

---

### Rule-Type AC (11 Rules — objectively binary pass/fail with grep/test/exit-code evidence)

#### AC-1 (rule): Session Guard 3-part في ≥4 هوكات + ≥20 Dual Guards + Placement Rule
- **Thresholds**: (أ) ≥8 File-level counters (2 لكل هوك: open counter + lastActiveId) (ب) 3-part session guard (`sessionIdRef` + `activeSessionIdRef`) في كل هوك (ج) ≥20 dual-guarded async closures (warmCache.then / cloudLoader.then / queueMicrotask / catch / observer / timeout callbacks) (د) **Placement Rule**: `activeSessionIdRef` reset في **return cleanup ONLY** للـ useEffect، لا خارج return في أي نقطة أخرى
- **Coverage Hooks**: (1) `hooks/useForumLifecycle.ts` (2) `hooks/lawyerDashboard/community/communityShellOpenFlow.ts` (3) `dashboard/commandHub/ForumTile.tsx` (4) `CommunityScreen/hooks/useCommunityForumAccess.ts`
- **Evidence Sources**: grep for `SessionCounter` + `lastActive.*Id` (count ≥8) + grep for dual guard pattern `if (sessionIdRef.current !== activeSessionIdRef.current) return;` inside async closures (count ≥20) + grep for reset location: inside `return () => {...}` ONLY of useEffect = 4 hits, 0 hits outside
- **Test Requirement**: 4 hook test files → total tests ≥ 20 → exit code 0, all PASSED

#### AC-2 (rule): Surgical Close 8-مبادئ + tearDownForumFloatingState unified + ≥6 Call Sites
- **8 Mandatory Principles P1-P8**: (P1) Blur surface focusables + blur `document.activeElement` (P2) Drain pending SaveQueue microtasks (Forum drafts + post publish commit queue) → dispose/delete refs (P3) Unblock ForumEscapeStack all layers via `unblockAllForumOverlayEscape()` (P4) Dispatch `FORUM_TEARDOWN_EVENT` CustomEvent with `detail:{reason:'tearDown'}` (P5) Delete 16+ transient `window.__hamiForum*` refs: saveQueueDraft / managerEnterSettle / warmCacheHandles×6 / sectionSwitchTimer / mentionObserverRef / rateLimitDebounceHandle / attachmentAbortHandles / notificationStreamSessionId / lastPerfReport / runtimeHydrationId / indexQueueHandle / orphanSweepHandle (P6) Snap DOM attrs: root CommunityScreen + ForumTile + OverlayHost setAttribute `data-closing=true` + `aria-busy=false` (P7) Remove 4× Instant Paint Chrome covers classes + `pointer-events:none` snap (P8) Clear communityOverlayEnterSettle timeout + delete ref
- **Threshold**: `tearDownForumFloatingState` occurrence grep ≥6 call sites (actual ≥9): (1) CommunityScreen closeFlow (2) ForumTile unmount (3) HQ Admin Panel close (4) LawyerDashboardCommunityOverlayEntry exit (5) communityBootHydrator abort path (6) reduced-motion early return (7) post-animation finish (8) idleRelease 12s callback (9) ErrorBoundary fallback reset
- **Evidence Sources**: grep for `FORUM_TEARDOWN_EVENT` = 2 hits (const + dispatch) + grep for `tearDownForumFloatingState` = ≥9 occurrences + grep `data-closing` = ≥3 setAttribute hits + 8 principle grep checks each = ≥1 match
- **Test Requirement**: Forum close-honesty files ≥26 tests → exit 0, all PASSED

#### AC-3 (rule): Perf Latest Mark ×2 Paths + restoreAllMocks + ≥4 Null Scenarios
- **Latest Mark Pattern**: كل من `services/forum/forumPerfMetrics.ts:getLatestForumInteractive()` AND CommunityScreen section switch performance tracker MUST use `performance.getEntriesByName(name)[entries.length - 1]` LATEST ENTRY (not first index [0] which causes reopen stale reports per FP-10, FP-02)
- **Null Scenario Tests**: 4 it blocks (≥2 threshold ×2): (A1) no marks at all → return null safe no-throw (A2) only start mark, null interactive → return null (B1) reversed time (interactive before start) → return null (B2) performance API missing (vitest env without marks API) + no marks → return null without throwing
- **Cleanup**: `beforeEach(() => { vi.restoreAllMocks(); if (typeof performance !== 'undefined') performance.clearMarks(); })` in BOTH perf test files
- **Evidence Sources**: grep `entries\[entries\.length - 1\]` on FR-2 + FR-1 roots = 2 matches + grep `restoreAllMocks` in both __tests__ files = 2 hits + grep for 4 `it('...null'` blocks → ≥4
- **Test Requirement**: `forumPerfMetrics.test.ts` + community section perf scenarios → total ≥8 tests → exit 0

#### AC-4 (rule): Security 4 طبقات + WIFE BFF (0 supabase.from on FR-1..FR-7)
- **4 Layers**: (L1) Whitelist Navigation: grep `window\.location\s*=|history\.push|location\.href\s*=` على FR-1..FR-7 = 0 matches (L2) Session Ownership Gate: `!userId` early return exists in forumPostCreateGuard.handleSubmit AND useCommunityForumAccess.hook + `FORUM_OWNERSHIP_GUARD` comment in core (L3) WIFE BFF: grep `supabase\.from\(` على FR-1..FR-7 production roots = **0 matches** (excluding `__tests__/**` + comment literals fixed to avoid false-positive) (L4) At-Rest SecureStore: `SecureStoreService.ensurePersistedReady()` called BEFORE `forumRepositoryHydration.ts` + `forumBlobAtRest.ts` encryption
- **Evidence Sources**: Commands `rg -n "supabase\.from\(" FR-paths | grep -v __tests__` → line count = 0 + same 0 for nav methods + ownership guard grep "!userId" ≥2 hits + ensurePersistedReady grep ≥2 hits
- **Test Requirement**: forumBffAccessPolicy.test.ts + forumPostCreateGuard.test.ts + communityPermissions.test.ts → ≥5 tests → exit 0

#### AC-5 (rule): XSS Defense 5 طبقات + explicit HTML strip regex + ≥2 outbound sanitizeProfilePlainText paths
- **XS-5.1 L1 inbound boundary**: `forumInputSecurity.ts` taskInputGuard rejects length-attack / control-chars / non-string
- **XS-5.2 L3 explicit HTML strip regex** (FIRST LINE before PII redact): `stripForumHtml(input)` regex `String(input ?? '').replace(/<\/?[^>]+(>|$)/gi, '')` called كأول سطر في دالة PII redact `redactForumPiiText()`
- **XS-5.3 L2 PII 6/6 regexes**: (1) Emails (2) Iraq 7xxx / 07x mobile formats (3) 10-16 digit IDs/رقم قضايا (4) 1-3 Arabic compound names after الموكل/المدعي/الخصم patterns (5) القضية/الإضبارة/الوثيقة reference numbers (6) رقم الهاتف المنزلي/المكتبي patterns
- **XS-5.4 L4 sanitizeProfilePlainText ≥2 outbound paths** (min 2 threshold): (Path A) CommunityScreen UI boundary `communityAddQuestionPublishCommit.ts` before draft→commit transition (Path B) forum services central boundary `forumApi/forumApiClientCore.ts:buildSafeRequestParams()` — كلاهما يستدعي `sanitizeProfilePlainText` على body/title/mention/comment fields قبل any network/BFF call
- **XS-5.5 L5 React auto-escape**: grep `dangerouslySetInnerHTML` على FR-1..FR-7 production roots = 0
- **Evidence Sources**: `stripForumHtml` regex match =1; sanitizeProfilePlainText grep on FR-1..FR-7 ≥2 files; PII regexes 6/6; dangerouslySetInnerHTML 0
- **Test Requirement**: forumInputSecurity.test.ts + forumMapperRedaction.test.ts + forumUrlSafety.test.ts → ≥15 tests → exit 0

#### AC-6 (rule): Opcode Throw Prefixes [forum:*] / [community:*] / [forumApi:*] / [forumRepo:*] ≥ 95% Coverage
- **Methodology**: (1) Count total `throw new Error` statements in FR-1..FR-7 excluding `__tests__/**` = N total (2) Count prefixed throws matching `\[(forum|community|forumApi|forumRepo|forumBff|forumNotify|forumMod|forumHQ):[a-z_:]+\]` = M prefixed (3) Ratio M/N ≥ 0.95 (95%)
- **Expected Prefixes**: `[forum:input:length]`, `[forum:publish:guard_blocked]`, `[forumApi:client:bff_sign]`, `[forumRepo:orphan:no_session]`, `[community:access:banned]`, `[community:publish:no_draft]`, `[forumNotify:stream:disposed]`, `[forumMod:report:bad_id]`, `[forumHQ:ban:hijacked_session]` etc
- **Evidence Sources**: grep counts command output with N total + M prefixed + ratio% ≥95%
- **Test Requirement**: forum throw-site-bearing test files → ≥13 tests → exit 0

#### AC-7 (rule): Honesty ≥ 90% + Console=0 + First Diagnostics Pre-check
- **Honesty Threshold ≥90%**: Forum Surgical Close Honesty + Dock Section Honesty + Gate Urgent Media Honesty + ForumSecurityHonesty + ForumVisualDensity + ForumCleanliness + ForumHiddenBugsHonesty + ForumComponentSplit + ForumPerformanceHonesty + communityAccessHonesty = total honesty tests / passing ≥ 0.90
- **Console=0 Prod-Only**: E1 condition confirmed (grep 0 matches)
- **First Diagnostics Pre-check**: After Task8 edits → GetDiagnostics() on FR-1..FR-7 modified files → result = `[]` (zero TS diagnostic issues)
- **Stability Run**: 13+ test files for Forum Section (Honesty + Mobile + Perf bundles) executed in a single vitest run → ≥61 tests → all PASSED exit 0

#### AC-8 (rule): Mobile CSS×4 Safe-Area + EscapeStack 4+ Layers + AbortController ≥3
- **Mobile CSS×4 explicit env(safe-area-inset-*,0px) calc pattern** in forumPlumTheme.ts constants: (1) FORUM_APPBAR safe-area-top calc (2) FORUM_FEED_BODY safe-area-top+bottom explicit calc (3) GROUP_DRAWER_HEADER safe-area-top calc (4) PUBLISH_FAB_ROW safe-area-bottom calc + (بالإضافة إلى الموجود مسبقاً: touch-action manipulation/none, overscroll-behavior contain/none, dvh viewport units, aria-modal, inert for background)
- **EscapeStack 4+ طبقات Top-First Pop**: forumEscapeStack.ts upgraded to priority layers: (L0-surface priority=0) CommunityScreen Overlay surface close / (L1-sheet priority=1) Group Drawer / Filter Panel dismiss / (L2-help priority=2) DeleteConfirm / MentionSuggestion / ReportModerator modals / (L3-plan priority=3) LegalRepositoryModals (via FP-03 bridge) → Map-based priority stack with `peekForumEscapeTopLayer()` API + backward-compatible block/unblock original API (ZVF 100% no caller changes)
- **AbortController ≥3 locations** (all abort in useEffect return cleanup): (Abort-1) communityBootHydrator.ts — heavy social graph init + warm cache 6× fetches (Abort-2) CommunityScreenHost forum section load — repository index queue + orphan sweep workers (Abort-3) forumBlobAtRest + forumImageCompression upload pipeline — attachment processing abort if close
- **Evidence Sources**: CSS×4 safe-area calc grep = 4 matches; Escape priority layers count 4 types; AbortController grep `new AbortController()` on FR-1..FR-6 roots ≥3 matches
- **Test Requirement**: forumEscapeStack.test.ts + forumRepositoryEscapeBridge.test.ts + mobile honesty → ≥34 tests exit 0

#### AC-9 (rule): Forum Moderation FP-17 + Attachment Pipeline FP-11 Clean Lifecycle
- **Moderation BFF Triple Confirmed**: report/ban/mute decisions routed via `forumReportModeratorNotify.server.ts` + `forumRepositoryModeration.ts` — NO client-side supabase moderation writes (AC-4 L3 confirmed)
- **Attachment Cleanup**: pending upload/compression/signing operations aborted at close via AbortController-3; orphan blob paths queued only AFTER successful persist commit; forumOrphanSweep.ts aborted at session end if still running
- **Evidence Sources**: grep for orphanSweep + indexQueue abort inside tearDownForumFloatingState = ≥2 matches
- **Test Requirement**: forumImageCompression.test.ts + forumBlobAtRest.test.ts + forumRepositoryOrphanSweep.test.ts → ≥8 tests exit 0

#### AC-10 (rule): Production Gate `scripts/forum-production-gate.mjs` exit 0 + FORUM_SHADOW_STUB Anti-Bomb Clean
- **Gate Phases**: (Phase 0 PRE-FLIGHT) FORUM_SHADOW_STUB check (4 shadow paths): `components/lawyer/CommunityScreen.tsx` + `components/lawyer/dashboard/ForumTile.tsx` + `services/forum/ForumRepository.ts` + `components/lawyer/CommunityScreen/ForumMemberProfileOverlay.tsx` — هذه الملفات إذا وجدت في مسارات خاطئة ستظلل real modules security bomb → gate verifies 4/4 paths DO NOT exist (clean). (Phase 1) Critical Paths Exists: 37+ Forum FR-1..FR-7 production files verified present. (Phase 2) Full Forum Vitest Suite: ≥40 test files → ≥237 tests → 100% PASS. (Phase 3) Output final line `=== Gate result === PASSED` + process.exit(0)
- **Evidence Source**: Run `node scripts/forum-production-gate.mjs` → exit code 0, stdout contains `PASSED`, stderr has NO production-code console.warn/error (only test-lib `act(...)` hints allowed)
- **Test Requirement**: Gate self-test passes; no failed gates in any phase

#### AC-11 (rule): Dual Surface FP-01 Session Isolation
- **Rule**: Opening ForumTile (dashboard surface) MUST NOT pollute CommunityScreen telemetry/session IDs — and vice versa: closing CommunityScreen MUST NOT dispose ForumTile active session if user returns to dashboard.
- **Mechanism**: Independent file-level session counter pairs for FR-1 (CommunityScreen `communityOpenSessionCounter` + `lastActiveCommunityId`) VS FR-4 (ForumTile `forumTileOpenCounter` + `lastActiveForumTileSessionId`). TearDown is selective per surface id, NOT global.
- **Evidence Sources**: grep for 4 unique counters (2 per surface) → 4 matches; grep for selective teardown check `if (targetSurfaceSessionId !== currentActiveId) return;` inside tearDown paths = 2 matches
- **Test Requirement**: dual-surface session isolation test file → ≥3 tests exit 0

---

### Rubric-Type AC (3 Rubrics — evaluative, numeric scale, pass threshold ≥4/5)

#### AC-12 (rubric): Lifecycle Clarity — 8-Stage Linear Pipeline + Dual Surface Isolation
**Scale 1-5, Pass Threshold ≥4/5**
| Score | Anchor | Evidence Required for Score |
|-------|--------|------------------------------|
| 5/5 | World-Class Tier-1 | Linear 8-stage proven by tests: (1) forumIntentWarm prefetch (2) communityShellOpenFlow 3-part session-guarded ≥5 async zones (3) useForumLifecycle Placement Rule return-cleanup-only (4) communityCloudLoader + access gate via communityPermissions (5) Render + 6× warm cache (FP-09) + section switch latest-mark perf (6) communityAddQuestionPublishGuard→Draft→Commit pipeline XSS sanitized (7) forumEscapeStack L0-L3 4-layer + Repository Bridge escape (8) tearDownForumFloatingState 8-principle surgical close + idleRelease 12s unmount. Dual Surface Isolation counters 4/4 independent. Cumulative tests ≥300 all PASS. Zero stale-closure telemetry at 3 reopen/close cycles. |
| 4/5 | Production-Grade | Minor gaps but no failures; lifecycle stages linear proven, dual isolation confirmed, tests ≥250 PASS |
| 3/5 | Adequate | Stages present but ≥1 minor leak in close; dual isolation still holds |
| 2/5 | Risky | Missing stages, cross-surface pollution, high test flake rate |
| 1/5 | Unacceptable | No lifecycle order, severe stale closure pollution |

#### AC-13 (rubric): Security Hardening — Defense-in-Depth Matrix 15× (Security4 × XSS5 × Opcode100% × AntiBomb)
**Scale 1-5, Pass Threshold ≥4/5**
| Score | Anchor | Evidence for Score |
|-------|--------|---------------------|
| 5/5 | Tier-1 Fortified | Tightly-coupled defense matrix verified: Security 4-layer (Whitelist nav 0 / Ownership 2 early-returns / BFF 0 supabase grep / SecureStore at-rest) × XSS 5-layer (forumInputSecurity L1 / redactForumPiiText 6/6 regex / stripForumHtml first-line L3 / ≥2 outbound sanitizeProfilePlainText paths L4 / React no-dangerously L5) × Opcode prefixes 100% M/N ≥95% actual hit 100% × FORUM_SHADOW_STUB anti-module-shadowing 4/4 clean paths. All security suites ≥40 tests PASS. No supabase.from literal ANYWHERE client forum code. |
| 4/5 | Production Safe | All layers present, ≥95% opcodes, 0 supabase, small gaps no functional exploit |
| 3/5 | Acceptable | One layer weak but compensated |
| 2/5 | Weak | Multiple layer gaps, XSS sanitizer missing ≥1 path |
| 1/5 | Failed | Direct supabase.from found, no sanitizer, missing opcodes |

#### AC-14 (rubric): Closure Integrity — Console Zero + Diagnostics=[] ×2 Independent Runs
**Scale 1-5, Pass Threshold ≥4/5**
| Score | Anchor | Evidence for Score |
|-------|--------|---------------------|
| 5/5 | Tier-1 Perfect | Console grep FR-1..FR-7 = 0 matches (E1) ✅; Diagnostics×2 empty: (1) Task8 E-2 أولي=[] ✅ (2) Task10 E-2 نهائي=[] ✅; Production gate ≥237/237 tests exit 0 PASSED; stderr purely `act(...)` test-lib only; Honesty 100% ≥90% threshold PASS; All 11 rule AC binary passes with grep/exit evidence. |
| 4/5 | Production Clean | Same 5/5 but honesty 90-99% instead of 100%; all other thresholds perfect |
| 3/5 | Minor Gaps | ≤1 console.warn production-code OR diagnostics ≤2 items trivial non-blocking cast fixed post-hoc |
| 2/5 | Flaky | Multiple console emissions OR diagnostics TS errors OR gate exit non-zero |
| 1/5 | Failed | Console spam, gate fail, diagnostics red errors |

---

## Production Gate Artifact Location
Post-Approval, during Implement Task9 I SHALL create: `scripts/forum-production-gate.mjs`

## Review Artifact Location (Review Only, not Spec/Plan)
Post-10 Tasks completed + Gate pass + Final Diagnostics empty I SHALL create:
`.trae/specs/royal-forum-zero-to-production-t1-audit-2026-09-07/review.md`

---
End of Forum Tier-1 Spec (AC: 11 rule + 3 rubric + 2 closure E1/E2; ZVF binding 100%)
