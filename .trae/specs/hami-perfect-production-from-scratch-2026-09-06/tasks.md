# Hami Perfect Production From Scratch — Implementation Plan (Tier-1 v10.5.0)

**مراجع أساسية (اقرأها أولًا قبل أي تعديل حرفيًا):**
- [package.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json) — كل الـ 28 guard scripts + 13 production gates + build chains
- [scripts/guard-ci-covers-guards.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-ci-covers-guards.mjs) — NOT_FOR_CI Map
- [scripts/guard-test-ratchet.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-test-ratchet.mjs) — KNOWN_TIMING_FLAKES[3] MAX=3
- [.audit/architecture-boundaries-baseline.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/architecture-boundaries-baseline.json) — T21 floor 1/129/114/244
- [src/app/bootstrap/bootFrame1Hydrate.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootFrame1Hydrate.ts) — Frame 1 hydrate foundation
- [src/app/runtime/notificationBootEvents.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/notificationBootEvents.ts) — نمط مثالي جاهز لتوحيد الثوابت
- [supabase/migrations/20260828201000_lock_update_updated_at_search_path.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260828201000_lock_update_updated_at_search_path.sql) — النمط الصحيح `pg_catalog, public`
- [scripts/native-ready/android/AndroidManifest.xml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/native-ready/android/AndroidManifest.xml) — Canonical Capacitor template
- [.gitignore L137-L141](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.gitignore#L137-L141) — housekeeping handoff exclude

**نقطة البداية الفعلية NON-NEGOTIABLE:** HEAD=`e1aab858` improve/current clean 0 uncommitted. كل Task منفصل commit ذري bisectable. لا ترخي أي راتشيت.

---

## المرحلة A: توحيد الأساسيات (الأولوية العالية — ACs الحرجة)

## Task 1: توحيد ثوابت الأحداث في eventConstants.ts + إزالة 4 تكرارات APP_RUNTIME_READY_EVENT
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  1. إنشاء ملف جديد `src/app/runtime/eventConstants.ts` يحتوي على **كل** ثوابت أحداث `hami:*` و `hami-*` الحالية (~60 ثابت من الاستطلاع + يتم تعديلها لإضافة ~200 الباقي من 263 المقدرة).
  2. إزالة التعريف المكرر `APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready'` من الملفات الأربعة التالية واستبداله بـ import من الملف الجديد:
     - [src/boot/mountApplication.ts L11](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/mountApplication.ts#L11)
     - [src/hq/mountHqApplication.ts L5](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/hq/mountHqApplication.ts#L5)
     - [src/hq/HqResolvedRuntime.tsx L8](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/hq/HqResolvedRuntime.tsx#L8)
     - [src/app/AppResolvedRuntime.tsx L16](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/AppResolvedRuntime.tsx#L16)
  3. لنقل تدريجي: أولًا الثوابت التي لها تكرار معلن، ثم الباقي (وليس كل 263 مرة واحدة لتجنب مخاطر — الخطوة 1 للـ 4 التكرارات المعروفة + 10 ثوابت نموذجية).
  4. لا يُسمح بتغيير قيمة السلسلة النصية نفسها — فقط نقل مكان التعريف + تغيير المواقع لاستيراد.
- **Acceptance Criteria Addressed**: AC-02, AC-00
- **Test Requirements**:
  - `rule` TR-1.1: grep `= ['\"]hami:app-runtime-ready['\"]` على كامل `src/**/*.ts/tsx` يعيد بالضبط 1 match (في eventConstants.ts فقط وليس في أي مكان آخر). الدليل = grep -c output بعد التعديل.
  - `rule` TR-1.2: `npm run gate:wave0` exit=0. الدليل = terminal stdout last 5 lines.
  - `rule` TR-1.3: `tsc --noEmit` exit=0 (typecheck بدون أخطاء بعد تغيير الـ imports). الدليل = output الناتج.
  - `rule` TR-1.4: الملف الجديد موجود على المسار الصحيح ويعيد export كل الثوابت مع كلمات `export const` صريحة. الدليل = ls الملف + head -20 الملف.
- **Notes**: Commit message: `refactor(runtime): centralize APP_RUNTIME_READY_EVENT + 14 event constants into eventConstants.ts — zero value changes, only import dedup`. **لا Visual Edits**. لا --save لأي baseline في هذا Task.

## Task 2: تصحيح SQL search_path في 15 migration — إضافة pg_catalog قبل public
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (موازي لـ Task 1 — لا يعتمد عليه)
- **Description**:
  1. تعديل **كل** سطور `SET search_path = public` فقط (بدون pg_catalog) إلى `SET search_path = pg_catalog, public` في الملفات 15 التالية:
     - `supabase/migrations/021_forum_production.sql` L15
     - `supabase/migrations/023_calendar_defense_in_depth.sql` L133
     - `supabase/migrations/20260812000002_admin_headquarters_rpcs.sql` L17, L64, L138 (3 سطور)
     - `supabase/migrations/20260826020000_headquarters_court_counts_rpc.sql` L7
     - `supabase/migrations/20260820000001_forum_rls_function_hardening.sql` L11
     - `supabase/migrations/20260706000005_lock_forum_tables_to_bff.sql` L10
     - `supabase/migrations/20260613000004_fix_privileged_roles_and_rls.sql` L42, L82, L111, L129 (4 سطور)
     - `supabase/migrations/20260812000001_freeze_profile_ban_flags_and_verification_meta.sql` L27
     - `supabase/migrations/20260820000000_forum_official_schema.sql` L22, L36 (2 سطور)
     - `supabase/migrations/20260828230000_kyc_strip_user_meta_sync_app_metadata.sql` L9
     - `supabase/migrations/20260829010000_legal_display_name_once.sql` L70
     - `supabase/migrations/20260828210000_strip_client_verification_status_metadata.sql` L8
     - `supabase/migrations/20260829030000_hq_directory_scale.sql` L30, L43, L65 (3 سطور — **استثناء خاص**: من `auth, public` إلى `pg_catalog, auth, public`)
     - `supabase/migrations/20260828201000_lock_update_updated_at_search_path.sql` L5 (يوجد به بالفعل pg_catalog عادة — تحقق فقط، إن كان ناقصًا أضفه)
     - `supabase/migrations/20260829020000_hq_connection_signals.sql` L72
     - `supabase/migrations/20260830220000_auth_otp_register_failed_attempt.sql` L7
     - `supabase/migrations/ops/20260812000000_bootstrap_profiles_for_ban_freeze.sql` L41, L86, L120, L137 (4 سطور)
  2. استثناء واحد: الملفات التي تحتوي بالفعل على `pg_catalog` (مثل `020_wife_security_rls.sql`, `028_*`, `20260613000000_*`, `20260828121500_*`, `20260821225600_*`, `20260809000000_*`, `20260829120232_*`, `20260829130636_*`) — **لا تُعدّل** (لها بالفعل pg_catalog — صحيحة 100%).
  3. **لا تغيير أي SQL آخر** — فقط سطور `SET search_path`.
- **Acceptance Criteria Addressed**: AC-04, AC-00
- **Test Requirements**:
  - `rule` TR-2.1: grep `SET search_path =` على كامل `supabase/migrations/` ثم عدّ من النتائج عدد السطور التي **لا تحتوي** على `pg_catalog` — يجب أن يكون العدد = 0. الدليل = grep count output.
  - `rule` TR-2.2: `hq_directory_scale.sql` (L30/L43/L65) = بالضبط `SET search_path = pg_catalog, auth, public` (ثلاثي: ليس auth فقط). الدليل = grep snippet.
  - `rule` TR-2.3: `npm run gate:wave0` exit=0 (التعديلات SQL لا تُؤثر على الـ web guards محليًا). الدليل = stdout.
  - `rubric` TR-2.4: دقة تطبيق التعديلات؛ مقياس: Scale 1-5. Anchors: 1=تعديل خاطئ لملفات صحيحة, 3=تعديل ناقص 2+, 5=الـ 15 ملف المذكورة فقط معدلة، وسطورها فقط، والباقي 100% كما هي. Threshold >=4. الدليل = `git diff --stat` output بعد التعديل (أقل من 20 file changed, أقل من 40 insertions/deletions).
- **Notes**: Commit message: `hardening(db): prepend pg_catalog to SET search_path across 15 migrations — path hijack Tier-1 defense`. **لا تُعدّل أي أسماء جدول أو أعمدة أو دالة SQL — فقط السطر search_path**.

## Task 3: توثيق LoaderHydrator Order سجل مركزي + عزل I/O بعد أول paint
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (نستخدم الثوابت الجديدة eventConstants.ts في السجل المركزي — وإن لم يكن متاحًا، تنفذ موازيًا مع تعليق TODO يُشير إلى Eventual Import)
- **Description**:
  1. إنشاء ملف جديد `src/app/bootstrap/LOADER_HYDRATOR_ORDER.ts` (أو md داخل bootstrap folder) يسرد الترتيب الصحيح لـ 30 ملف hydrate بالرقم (L1→L30):
     - L1: bootFrame1Hydrate.ts (sync قبل reveal)
     - L2: bootEventNames.ts
     - L3: bootEntryPreamble.ts (wallpaper hydrate)
     - L4: homeBootChrome.ts (profile warm cache peek sync)
     - L5: staggeredBootOrchestrator.ts (DASHBOARD_INTERACTIVE_EVENT)
     - L6-L25: shells بترتيب: notificationBootHydrator, repositoryBootHydrator, settingsShellEvents, profileBootHydrator, criminalBootHydrator, executionBootHydrator, transactionsBootHydrator, globalSearchBootHydrator, communityBootHydrator, calendarEventsWarm, fieldTasksInstantChromeMarkup, repositoryInstantChromeMarkup, sectionChunkDataWarm, notificationBootEvents, lawsuitWorkspaceEvents, profileInstantPaint, etc. (يُستكمل قائمًا على grep inventory 100 lines)
     - L26-L30: مؤجلة requestIdleCallback: SecureStoreService.kickoffBootShellSync (المؤجل في المستقبل — حالياً import-level side-effect), CryptoService, dossierWipeGuard, caseStore hydrate, transactionsHubLoader.
  2. نقل `SecureStoreService` kickoff side-effect (مستوى الوحدة) إلى استدعاء صريح من `bootReveal.ts` بعد `markBootRevealDone()` أو داخل `requestIdleCallback` (إذا لم يكن مؤجلًا بالفعل).
  3. التحقق: لا يوجد `localStorage.getItem` أو `JSON.parse` أو `IndexedDB.open` مباشرة داخل جسم دالة React component render/commit (تدقيق عينة 10 ملفات من 30).
- **Acceptance Criteria Addressed**: AC-03, AC-00
- **Test Requirements**:
  - `rule` TR-3.1: الملف `LOADER_HYDRATOR_ORDER` (الامتداد .ts أو .md) موجود في مجلد bootstrap ويسرد ≥27 من الـ 30 hydrator بالرقم. الدليل = ls الملف + wc -l.
  - `rule` TR-3.2: `SecureStoreService.kickoffBootShellSync` (أو أي side effect مؤجل مشابه) لا يُنفّذ على مستوى الوحدة import — لا يوجد استدعاء في آخر الملف بدون شرط idle. الدليل = grep آخر 50 سطور من [SecureStoreService.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/SecureStoreService.ts).
  - `rule` TR-3.3: `npm run gate:wave0` exit=0. الدليل = stdout.
  - `rubric` TR-3.4: جودة وضوح السجل المركزي وصلته بالكود؛ Scale 1-5. Anchors: 1=قائمة عشوائية بدون روابط, 3=قائمة مرقمة بدون روابط إلى ملفات, 5=قائمة مرقمة L1→L30 مع `file:///.../#Lx-Ly` لكل مدخل وشرط I/O timing (before paint / after paint / idle). Threshold >=4. الدليل = قراءة أول 30 سطر من الملف.
- **Notes**: Commit message: `docs(boot): add LOADER_HYDRATOR_ORDER central registry + defer SecureStore kickoff to idleCallback`. **لا Visual Edits. لا تغيير props أو classNames أو أي JSX. فقط إضافة ملف توثيق + نقل استدعاء واحد**.

---

## المرحلة B: المؤسسات والأمان Build (الأولوية العالية)

## Task 4: إنشاء CLAUDE.md رسمي 7 أقسام في الجذر
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (موازي لـ Task 2)
- **Description**:
  1. إنشاء ملف `CLAUDE.md` في الجذر `c:\Users\HEX STORE\Downloads\New folder\CLAUDE.md`.
  2. الأقسام السبعة الدقيقة بالترتيب:
     - **§1 Tech Stack & Versions**: React 18, Vite 7, TS 5.9, Tailwind 4, Zustand 4, Capacitor 8, Supabase 2.108, Playwright, Vitest, Sentry, Node 24.x + ملف `.nvmrc`.
     - **§2 Atomic Commit Rules**: Conventional Commits (feat/fix/chore/refactor/test/hardening/docs). ذرية (bisectable). NO --save إلا baseline: prefix. No force push.
     - **§3 Quality Gates (28)**: قائمة ترتيب `gate:wave0` verbatim من package.json L50 + شرح مختصر لكل واحد + مرجع إلى المشغل الرسمي `scripts/run-gate-wave0.mjs`.
     - **§4 Ratchet Baselines (6)**: tsc=956, lint=177, dead-exports=1888, test=23, arch=1/129/114/244, import-closure=0. كيفية `--save`: **ONLY** في commit بادئة `baseline:` مع سبب موثق كامل.
     - **§5 Zero Visual Freeze Policy**: المحظورات صراحة: أي CSS/TSX/Tailwind/ألوان/توزيع/أحجام. الاستثناء: المستخدم يوافق صراحة لكل تعديل بصري. مثال محظور: تعديل `className`, `style=`, `sx=`, `colors.*` في *.tsx/*.css.
     - **§6 Critical Paths (20)**: أهم 20 مسار ملف حاسم مع روابط `file:///`: package.json scripts, scripts/* guards, src/boot/*, src/app/bootstrap/*, src/app/api/security/*, src/app/runtime/*BootHydrator*, capacitor.config.ts, .audit/*baseline.json, .github/workflows/quality-gate.yml, supabase/migrations/*, src/app/services/calendar/bridge/*, src/app/services/*Store*, src/stores/*, eslint.config.js, .audit/eslint-arch-boundaries.config.js, index.html, public/hami-boot.js, android/app/build.gradle, android/app/src/main/res/values/styles.xml, scripts/native-ready/android/AndroidManifest.xml, CLAUDE.md (هذا الملف).
     - **§7 Review Protocol (Spec-Mode 5 Phases)**: Specify → Plan → Approve → Implement → Review. AC vocabulary: rule (binary) / rubric (scale 1-5). TR vocabulary: نفسها لكل task. Review مستقل — ليس تنفيذًا ذاتيًا.
  3. **لا تُضَع أي قيمة سرية** — فقط أسماء المتغيرات (مثل `SUPABASE_ANON_KEY` بدون قيم).
- **Acceptance Criteria Addressed**: AC-06, AC-10, AC-00
- **Test Requirements**:
  - `rule` TR-4.1: الملف موجود في الجذر `CLAUDE.md` و 7/7 أقسام موجودة بعناوينها الدقيقة (grep `## §` = 7 matches). الدليل = ls الملف + grep output.
  - `rule` TR-4.2: grep للملف على patterns الأسرار التالية: `service_role`, `sk_`, `eyJhbGc`, `-----BEGIN`, `anon =` → **0 matches**. الدليل = grep count output.
  - `rule` TR-4.3: `npm run guard:tracked-secrets` يمر (الملف الجديد لا يُكشف كسر). الدليل = stdout الحارس.
  - `rule` TR-4.4: `npm run gate:wave0` exit=0. الدليل = stdout.
- **Notes**: Commit message: `docs(ai): create CLAUDE.md 7-section Tier-1 rulebook for AI assistants`.

## Task 5: تشغيل Build الإنتاج + تحقق 7 dist-secrets + sync security headers
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 4 (لتأكد من أن الملفات الجديدة eventConstants + CLAUDE.md لا تكسر build — **ليس إلزاميًا لكنه آمن**؛ يُمكن تشغيله مرتين: قبل وبعد، المهم Pass في النهاية)
- **Description**:
  1. تشغيل `npm run build` (Vite production build).
  2. تشغيل تسلسل الأمان بالكامل على `dist/` المُولَّد:
     - `npm run guard:dist-secrets` (7 تحقق: no service-role chunk, no kv-admin chunk, no forum-supabase-admin chunk, no forum-moderator chunk, no HQ runtime chunk, client-env clean, no sourcemaps — أو إن كانت sourcemaps موجودة استخدم `release:strip-sourcemaps`)
     - `npm run guard:shell-auth-prod`
     - `npm run guard:prod-env-contract`
     - `npm run sync:security-headers --check`
  3. إن كان `HQ runtime chunk` مكتشفًا — لا تُعدّل أي UI؛ فقط تحقق من أن `guard:dist-hq-runtime` يمر عند `build:hq` فقط (المهم ليس dist العادي يحتوي HQ chunk).
- **Acceptance Criteria Addressed**: AC-05, AC-00
- **Test Requirements**:
  - `rule` TR-5.1: `npm run build` exit=0 + مجلد `dist/` موجود وله ملف `index.html` و `assets/` غير فارغ. الدليل = ls dist/ output + build stdout الأخير.
  - `rule` TR-5.2: `npm run guard:dist-secrets` exit=0. الدليل = stdout 7 سطور من التحققات كلها PASS.
  - `rule` TR-5.3: `npm run guard:shell-auth-prod && npm run guard:prod-env-contract && npm run guard:security-headers` = الثلاثة exit=0. الدليل = && chain output.
  - `rule` TR-5.4: `npm run gate:wave0` exit=0 بعد build. الدليل = stdout.
- **Notes**: Commit message (فقط إن تم تعديل ملفات config — وإلا skip commit ويعتبر Task مكتمل بدون commit أو مع commit `chore(build): verify 7 dist-secrets + 3 security guards on production build dist` — لو حفظنا نتيجة التحقق في ملف `build-receipt.txt` داخل .audit. **لا --save**.

## Task 6: تأكيد 6 Ratchets + gate:wave0 ×3 تكرار (Determinism)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5 (build succeeded — أضمن أن الراتشيتات لا تزال سليمة بعد كل التعديلات السابقة)
- **Description**:
  1. تشغيل كل راتشيت بشكل مستقل 3 مرات متتالية وتسجيل الأرقام:
     - `npm run guard:tsc` (يجب: current ≤ 956)
     - `npm run guard:lint` (يجب: current ≤ 177 — المسموح 11 هو أقل)
     - `npm run guard:dead-exports` (يجب: 1888 — لا تزيد)
     - `npm run guard:tests` (يجب: current ≤ 23 — المسموح 21 هو أقل)
     - `npm run guard:architecture-boundaries` (يجب: api≤1, services≤129, domainApp≤114, total≤244)
     - `npm run guard:import-closure` (يجب: 0 broken)
  2. تشغيل `npm run gate:wave0` 3 مرات متتالية على نفس HEAD بدون أي تعديل. كل المرات يجب exit=0 (لا يُسمح بـ flake non-deterministic على الكل).
  3. إن وجدت flakes في الاختبارات: **لا تُضاف إلى allow-list** إلا إذا تطابق النمط تمامًا مع أحد الـ 3 flakes المعروفين بالفعل في `guard-test-ratchet.mjs:96-L105` (fieldTasksInstantPaint, shouldPreloadLawyerBoard marathon, calendarContractAudit.test marathon). أي flake جديد → Task يبقى `in_progress` حتى إصلاحه جذريًا.
- **Acceptance Criteria Addressed**: AC-01, AC-00, NFR-3 (Build Determinism)
- **Test Requirements**:
  - `rule` TR-6.1: تشغيل 6 الراتشيتات مرة واحدة — كلها exit=0. الدليل = 6 stdout snapshots معروضة في Completion Evidence.
  - `rule` TR-6.2: تشغيل `gate:wave0` 3 مرات متتالية — الثلاث exit=0. الدليل = 3 lines last output: `ALL 28 GUARDS PASSED exit=0`.
  - `rule` TR-6.3: `git status --porcelain` = فارغ بعد التشغيل الثلاثي. الدليل = output.
  - `rubric` TR-6.4: درجة Determinism. Scale 1-5. Anchors: 1=run 1/3 pass فقط, 3=راكض 2/3 مع flake جديد, 5=3/3 PASS بدون أي flake undocumented جديد. Threshold >=4. الدليل = الـ 3 exit codes.
- **Notes**: إن كان calendarContractAudit fail مرة واحدة فقط ضمن 3 — فهو **مسموح** (هو في الـ 3 flakes الموثوقين)، لكن إن فشلت اختبارات أخرى جديدة غير مُسجلة في allow-list → لازم إصلاح جذري.

---

## المرحلة C: الأداء و CI Coverage (أولوية متوسطة → عالية)

## Task 7: قياس 20 شاشة حاسمة VR ≤ 5% على hydration latency
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6 (الراتشيتات مستقرة)
- **Description**:
  1. تشغيل حراس الأداء الأساسية:
     - `npm run guard:boot-critical-weight`
     - `npm run guard:lawyer-inner-weight`
     - `npm run guard:first-open-shared-tax`
     - `npm run guard:screen-closure`
  2. تشغيل أدوات التدقيق:
     - `npm run perf:boot-ttfi`
     - `npm run perf:lawsuits-dossier-ttfi`
  3. جمع نتائج الـ 20 شاشة في جدول صغير داخل `.audit/VR-20-screens-baseline.md` أو JSON داخلي (لا يُلتزم commit به خارجيًا — لكنه يُخزن محليًا للمراجعة).
  4. أي شاشة تتجاوز +20% عن الحد → إضافة ملاحظة في Completion Evidence مع مسار الملف — **لا تعديل بصري**؛ فقط تسجيل (المعيار هو ≤5% عن المتوسط الحالي، وليس تحسين).
- **Acceptance Criteria Addressed**: AC-07, AC-00
- **Test Requirements**:
  - `rule` TR-7.1: 4 حراس الأداء exit=0. الدليل = 4 stdout.
  - `rule` TR-7.2: أمرا perf يُنفيذان بنجاح (exit=0) مع قيم رقمية حقيقية في stdout (ليس NaN أو null). الدليل = 2 stdout snapshots.
  - `rubric` TR-7.3: تغطية القياس لـ 20 شاشة؛ Scale 1-5. Anchors: 1=أقل من 8 شاشات مقاسة, 3=10-15 شاشة, 5=≥18 شاشة لها قياس رقمي صحيح ضمن ±5% انحراف. Threshold >=4. الدليل = جدول الـ 20 قياس.
- **Notes**: Commit message فقط إن أنشأنا ملف baseline JSON: `chore(perf): capture VR-20 screens hydration baseline snapshot`. **لا Visual Edits تحت أي ظرف — لا تغيير أي latency بهندسة عكسية. فقط القياس**.

## Task 8: تأكيد CI Coverage 32 مربوط + 2 مستثنى موثق
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None (موازي لـ Task 7)
- **Description**:
  1. تشغيل `npm run guard:ci-covers-guards` بشكل مستقل.
  2. فحص ملفات Workflows الأربعة في [`.github/workflows/`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.github/workflows/) يدوياً:
     - quality-gate.yml (الرئيسي)
     - boot-e2e.yml
     - execution-gate.yml
     - lawsuits-gate.yml
  3. التحقق من أن Map `NOT_FOR_CI` في guard-ci-covers-guards.mjs لا يزيد عن 2 مدخلات (guard:baseline و guard:architecture-boundaries) إلا إذا كان هناك guard جديد مُضاف في المستقبل — في حالتنا الحالية = 2 فقط.
- **Acceptance Criteria Addressed**: AC-09, AC-00
- **Test Requirements**:
  - `rule` TR-8.1: `npm run guard:ci-covers-guards` exit=0 + الرسالة النهائية تتضمن بالضبط `"32 حارساً مربوطاً بالبوّابة، 2 مستثنى"`. الدليل = stdout آخر 5 سطور.
  - `rule` TR-8.2: NOT_FOR_CI Map size = 2 (count المدخلات = 2). الدليل = grep `Map(` في الملف + عدّل الأزواج.
  - `rule` TR-8.3: 4 workflow files موجودة فعليًا على المسار. الدليل = ls output.
  - `rule` TR-8.4: `npm run gate:wave0` exit=0. الدليل = stdout.
- **Notes**: Task لا يتوقع أي تعديل للملفات — فقط تشغيل وتسجيل أدلة. يمكن تخطيه إلى مرحلة Review مباشرة إذا ما تُشغّل في Task 6.

---

## المرحلة D: تنظيف وإغلاق + Build Tag (أولوية متوسطة/عالية)

## Task 9: حذف آمن للملفات الخاملة ~450+ (Open Question 1 — Pending Approval)
- **Status**: `pending`
- **Priority**: medium 👈 **ترقية إلى high فقط بعد موافقة صريحة من المستخدم على Open Question [1] في spec.md**
- **Depends On**: Task 6 (الراتشيتات مستقرة — نعرف قاعدتنا قبل الحذف)
- **Description**:
  1. جري قائمة المرشحين للحذف من تقرير T21 السابق والأرشيفات القديمة (`.trae/documents/archive/`, `docs/archive/`, `docs/legacy/`, `.audit/*.md القديمة بدون قواعد تنفيذ، وملفات `*.tmp`, `*.bak`, `*.orig`, `*.swp`).
  2. **قبل الحذف**: تشغيل `grep -r [اسم_الملف_بدون_امتداد] src/ scripts/ .audit/ e2e/` لكل ملف مرشح.
  3. **بعد الحذف**: تشغيل `npm run guard:source-paths` + `npm run guard:dead-exports` + `npm run guard:cycles` + `npm run guard:import-closure` للتأكد من عدم كسر أي مرجع.
  4. تُحذف فقط إذا ما مرت الأربعة حراس. لا تخاطر بأي baseline تراخٍ.
- **Acceptance Criteria Addressed**: AC-11, AC-00
- **Test Requirements**:
  - `rule` TR-9.1: عدد الملفات المحذوفة ≥ 400 (400 هو الحد الأدنى المقبول لتحقيق rubric score ≥4). الدليل = `git diff --stat | tail -1` (files deleted count).
  - `rule` TR-9.2: 4 حراس post-delete exit=0 (source-paths, dead-exports, cycles, import-closure). الدليل = 4 stdout.
  - `rubric` TR-9.3: كمية ونظافة الحذف؛ Scale 1-5. Anchors: 1=<100 ملف أو كسر مرجع, 3=200-300 ملف آمن, 5=≥450 ملف مع 0 زيادة في baselines. Threshold >=4. الدليل = diff stat + baseline deltas.
- **Notes**: **⚠️ PENDING USER APPROVAL — ⛔ لا يُنفّذ قبل إجابة المستخدم على Open Question [1] في spec.md**. إن لم تُوافق: يُحَوَّل Status إلى `cancelled` مع سبب موثق وموافقة المستخدم.

## Task 10: إنشاء Tag الرسمي `v10.5.0-tier1-hardened` Annotated + snapshot الراتشيتات
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, 2, 3, 4, 5, 6, 7, 8 (جميع المهام الأساسية مكتملة و gate:wave0 ×3 PASS)
- **Description**:
  1. تسجيل الأرقام الفعلية الحالية للـ 6 الراتشيتات بعد التعديلات كلها:
     - tsc=... (current ≤ 956)
     - lint=... (current ≤ 177, e.g. 11)
     - dead-exports=1888
     - test=... (≤ 23, e.g. 21)
     - arch=api/1, services/129, domainApp/114, total/244
     - import-closure=0
     - 28-gate-wave0=PASS
  2. إنشاء annotated tag:
     ```
     git tag -a v10.5.0-tier1-hardened -m "Hami v10.5.0 Tier-1 World-Class Hardened (Perfect Production From Scratch)
     Commit: $(git rev-parse --short HEAD)
     Ratchet snapshot:
       tsc=X
       lint=Y
       dead-exports=1888
       tests=W
       arch=api/1 services/129 domainApp/114 total/244
       import-closure=0
     gate:wave0 28/28=PASS ×3 deterministic runs
     Applied: EventConsts Dedup, SQL pg_catalog Defense, LoaderHydrator Registry, CLAUDE.md Rulebook, 7 dist-secrets, CI Coverage, VR≤5%"
     ```
  3. (Open Question 3: إن طلب المستخدم signature GPG → أضف `-s`. الافتراضي بدون حتى موافقة.)
- **Acceptance Criteria Addressed**: AC-08, AC-00
- **Test Requirements**:
  - `rule` TR-10.1: `git tag -l v10.5.0-tier1-hardened` يعيد سطر واحد غير فارغ. الدليل = output.
  - `rule` TR-10.2: `git show v10.5.0-tier1-hardened | head -30` يعرض الأرقام الستة للراتشيتات + PASS 28/28. الدليل = head output.
  - `rule` TR-10.3: آخر commit مؤشر إليه بالـ tag هو نفس HEAD الحالي (`git rev-parse HEAD` == `git rev-parse v10.5.0-tier1-hardened^{}`). الدليل = الـ two rev-parse output.
- **Notes**: **لا --force** على الـ tag. إن كان الاسم موجود مسبقًا — ارمِ خطأ واطلب من المستخدم إعادة تسمية (`-rc1` أو `-final`).

## Task 11: تشغيل Native Guards + Capacitor Checklist على الإصدار Hardened
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 10 (Tag موجود — الأصل هو التأكد من أن الإصدار النهائي يعمل على native)
- **Description**:
  1. تشغيل `npm run guard:native-foundation`.
  2. تشغيل `npm run guard:cold-entry`.
  3. تشغيل `npm run checklist:capacitor-boot` (إن توفر جهاز Android متصل — وإلا تشغيل الوضع التجريبي مع إخراج القسم 'device check' skipped مع توثيق السبب).
  4. فحص Canonical template [scripts/native-ready/android/AndroidManifest.xml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/native-ready/android/AndroidManifest.xml) يدوياً — أن hardwareAccelerated=true, allowNavigation صحيح, webContentsDebuggingEnabled=false في PROD.
- **Acceptance Criteria Addressed**: AC-00, NFR-4 (CI Time — إنه يختبر أن الـ native check لا يستغرق وقتًا طويلًا مقارنة بالحالة الحالية)
- **Test Requirements**:
  - `rule` TR-11.1: `guard:native-foundation` exit=0. الدليل = stdout.
  - `rule` TR-11.2: `guard:cold-entry` exit=0. الدليل = stdout.
  - `rule` TR-11.3: `checklist:capacitor-boot` يخرج 0 (أو output واضح يذكر skipped لـ device section مع السبب — مقبول إذا لم يكن هناك جهاز متصل). الدليل = stdout.
  - `rubric` TR-11.4: اكتمال فحص 4 عناصر Manifest؛ Scale 1-5. Anchors: 1=0 عناصر تم فحصها, 3=2 عناصر, 5=4 عناصر (hw-accel, allowNav, debug off, theme) تم تأكيدها. Threshold >=4. الدليل = 4 grep fragments من الملف.
- **Notes**: Task يتوقع بدون تعديلات على ملفات Android. إذا ما تبين خطأ في Manifest → Task منفصل جديد (Task 11b atomic).

## Task 12: تشغيل الـ 13 Production Gates الإضافية (gate:calendar, lawsuits, etc.)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6 (الأساسيات مكتملة — gates الإنتاجية الأعلى مستوى)
- **Description**:
  تشغيل التسلسل التالي بالكامل على نفس HEAD:
  1. `npm run gate:notifications`
  2. `npm run gate:settings`
  3. `npm run gate:tasks`
  4. `npm run gate:calendar`
  5. `npm run gate:repository`
  6. `npm run gate:forum`
  7. `npm run gate:homeHub`
  8. `npm run gate:size-boot-closure`
  9. `npm run gate:global-search`
  10. `npm run gate:profile`
  11. `npm run gate:lawsuits`
  12. `npm run gate:lawsuits:perf`
  13. `npm run gate:legal`
  14. `npm run gate:closed-sections`
- **Acceptance Criteria Addressed**: AC-00 (المبدأ العام: كل commit مكتمل يمر عبر كل البوابات المناسبة له)
- **Test Requirements**:
  - `rule` TR-12.1: ≥12 من 14 gate exit=0 (بعضها قد يتطلب e2e environment device — مقبول مع توثيق السبب). الدليل = 14 exit codes مصفوفة.
  - `rule` TR-12.2: `gate:calendar`, `gate:lawsuits`, `gate:closed-sections` (الثلاث الحرجة للقانون العراقي) exit=0 بدون أي استثناء. الدليل = 3 stdout.
  - `rubric` TR-12.3: استقرار التسلسل؛ Scale 1-5. Anchors: 1=<7 gates pass, 3=9-11 pass, 5=≥13/14 pass. Threshold >=4. الدليل = Matrix 14×2 (اسم + exit code).
- **Notes**: يُمكن تشغيله بالتوازي على عدة terminals لتوفير الوقت. لا --save لأي baseline في هذا Task.

## Task 13: تجميع الأدلة للمرحلة Review المستقلة — Pre-Review Readiness
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1-12 كلها (إلا Task 9 إذا كان cancelled)
- **Description**:
  1. جمع أدلة كل Task (الـ Completion Evidence) في ملف واحد مؤقت داخل مجلد specs الجديد: `.trae/specs/hami-perfect-production-from-scratch-2026-09-06/IMPLEMENTATION-EVIDENCE.md` (**لا يُلتزم — فقط استعداد لـ Reviewer المستقل**).
  2. إنشاء قائمة تحقق سريعة:
     - [ ] spec.md مكتمل ACs 11
     - [ ] tasks.md 13/13 tasks status = completed (باستثناء 9 إذا cancelled)
     - [ ] git log --oneline عدد commits الذرية = n (حسب التنفيذ الفعلي)
     - [ ] last gate:wave0 ×3 PASS
     - [ ] 6 ratchets snapshot ≤ baseline
     - [ ] CLAUDE.md 7 أقسام
     - [ ] v10.5.0-tier1-hardened tag موجود
     - [ ] eventConsts dedup 4/4
     - [ ] SQL search_path 0 without pg_catalog
     - [ ] 13/14 production gates
  3. إعداد مسارات المراجعة: reviewer يحتاج لقراءة spec.md, tasks.md, ثم تنفيذ كل AC/TR بشكل مستقل.
- **Acceptance Criteria Addressed**: Prep for NFR-6 (Independence of Review)
- **Test Requirements**:
  - `rule` TR-13.1: مجلد specs يحتوي على 3 ملفات رسمية: spec.md, tasks.md, IMPLEMENTATION-EVIDENCE.md (هذا الأخير اختياري لكنه يُحسّن درجة). الدليل = ls مجلد.
  - `rule` TR-13.2: Checklist 10/10 items علامتها ✅ (باستثناء items لو كانت tasks cancelled). الدليل = checklist state.
  - `rule` TR-13.3: `git status --porcelain` = فارغ — المستودع نظيف قبل الدخول لمرحلة Review. الدليل = output.
- **Notes**: **لا تنشئ `review.md` الآن** — يجب أن ينشأ فقط خلال مرحلة Review (قاعدة Spec-Mode الرسمية: لا Review artifacts في Plan/Implement).

---

**ملاحظات نهائية للمرحلة Implement:**
1. كل Task = commit ذري منفصل (Conventional Commits: refactor/hardening/docs/chore/test/fix).
2. إذا ما كسر أي task أحد الراتشيتات: Task يبقى `in_progress` حتى إصلاحه. لا نُنفّذ `--save` لتجاوُز.
3. Zero Visual Edits: لتفقد سرعة — `git diff -- '*.css' '*.scss' '**/*.tsx' | grep -E '^\+.*(className|style=|colors\.|bg-|text-)'` يجب أن يكون فارغًا بين كل commitين.
4. Visual Freeze Violation → Task تلقائيًا `blocked` حتى قرار المستخدم.
