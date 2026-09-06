# Hami Legal System v10.5.0 — Perfect Production From Scratch (Tier-1 World-Class)

## Overview
- **Summary**: تحويل نظام Hami Iraqi Legal Case Management v10.5.0 من حالة "تعمل" إلى تجربة إنتاجية **احترافية مثالية فعليًا على كل المعايير حرفيًا**، من نقطة الصفر عبر 6 محاور محكمة: (1) بوابات الجودة وصلاحيات الراتشيتات، (2) الأداء عند الإقلاع والترطيب والشاشات الحاسمة، (3) الأمان على مستوى قواعد البيانات والتوزيع والأسرار، (4) انضباط المعمارية النظيفة 4 الطوابق وتوحيد الأحداث، (5) التطبيق الأصلي Capacitor Android، (6) التتبع الكامل للإثباتات والتسليمات.
- **Purpose**: إزالة **كل** نقطة الضعف المكتشفة عبر الاستطلاع الميداني (تكرار ثوابت الأحداث، نقص pg_catalog في search_path، LoaderHydrator غير موحد، 28 حارس حاليًا بدون gate دوري للأداء)، مع الحفاظ الصارم على **100% Visual Freeze** (كل العمل تحت الغطاء فقط).
- **Target Users**: مهندس البناء الرئيسي (Principal Build Architect)، مسؤول CI/CD، مهندس الأمان، مستخدمي الإنتاج النهائي على Android/Web.

## Goals
1. **البوابات الذرية**: اجتياز 28 حارس `gate:wave0` بنسبة 100% exit=0 دائمًا مع الحفاظ على 6 راتشيتات أساسية *بدون أي تراخٍ على الإطلاق*: tsc=956, lint=177 (الوضع الحالي 11 هو تحسن مقبول), dead-exports=1888, test-ratchet=23, T21 arch=244, ci-covers=32.
2. **الأداء عند الإقلاع**: خفض حجب الإقلاع عبر ترتيب LoaderHydrator 30 ملفًا موحدًا، VR (Visual Regression) ≤5% على 20 شاشة حاسمة، و cold-entry ضمن الحدود.
3. **توحيد ثوابت الأحداث**: إزالة التكرار الميداني المكتشف (`APP_RUNTIME_READY_EVENT` متكرر ×4 مرات في 4 ملفات مختلفة) عبر ملف موحد `src/app/runtime/eventConstants.ts` يحتوي على ~263 ثابت حدث.
4. **صيانة SQL search_path**: تصحيح 15 migration تستخدم `SET search_path = public` فقط إلى `SET search_path = pg_catalog, public` (مطابق لـ Tier-1 DB Hardening ضد path hijack).
5. **صحة الإصدار المُوزَّع**: `build:production` يمر عبر 6 حراس `guard:dist-secrets` بدون تسريب أي مفتاح أو service-role أو chunk HQ runtime.
6. **CLAUDE.md رسمي**: إنشاء ملف CLAUDE.md في الجذر يحتوي على 7 أقسام (Stack, Commits, Guards, Baselines, Visual Freeze, Paths, Review)، ليكون مرجعًا فوريًا لكل مساعد AI.
7. **بناء الإصدار النهائي**: tag `v10.5.0-tier1-hardened` على commit يمر عبر كل البوابات مع أدلة إثبات مرفقة.
8. **تغطية مستقلة للمراجعة**: `review.md` مستقل يتحقق من كل AC/TR دون الاعتماد على نتائج منفذ التنفيذ.

## Non-Goals
- ❌ أي تعديل بصري: ألوان، Tailwind classes، توزيع عناصر، أحجام، سماكات حدود، أي `className` أو `style={{}}` أو `sx={{}}` أو `style=` في *.tsx أو *.css.
- ❌ إعادة تصميم المعمارية (rewrite/redesign) أو ترقية أي باكدج (package.json ثابت — Node 24, React 18, Vite 7, TS 5.9, Tailwind 4, Capacitor 8).
- ❌ تعطيل أو إضعاف أي حارس أو راتشيت موجود حاليًا.
- ❌ تغيير أي واجهة عامة لمكوّنات React props أو مسارات `src/app/api/**` المتوافقة مع العميل حالياً.
- ❌ نشر أي قيمة سر أو env أو مفتاح في أي ملف أو رسالة أو output.
- ❌ force push أو تعديل تاريخ git قبل `e1aab858` (HEAD improve/current الحالي).
- ❌ حذف أي ملف بدون grep `src/`, `scripts/`, `.audit/`, `e2e/` مسبق لتأكيد عدم وجود مراجع معلقة.

## Background & Context
نقطة البداية الحالية **المؤكدة ميدانيًا**:
- **Git**: HEAD=`e1aab858` على فرع `improve/current` مع 7 clean commits فوق `audit-baseline-20260906-v2` (`2dfdda91`). Working tree **CLEAN 0 uncommitted**.
- **28 Quality Gates**: `npm run gate:wave0` في [package.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L50) = ALL 28 PASS exit=0 (مُثبت عبر 17-quality-gate.txt في حزمة التسليم الرسمية).
- **6 Ratchet Baselines الرسمية** في مجلد [`.audit/`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/): `tsc-baseline.json`=956, `lint-baseline.json`=177, `dead-exports-baseline.json`=1888, `test-ratchet-baseline.json`=23, `architecture-boundaries-baseline.json`=244 (api=1, services=129, domainApp=114), `import-closure-report.json`=0 broken.
- **الاستطلاع الميداني الذي أُنجِز قبل كتابة هذه المواصفات** (Zero Hallucinations — كل نقطة لها grep فعلي):
  1. `30+` ملف LoaderHydrator/Hydration في `src/**/*.ts/tsx` (grep `LoaderHydrator|hydrat` → 100 lines).
  2. `30+` ملف ثوابت الأحداث مع **4 تكرارات** لـ `APP_RUNTIME_READY_EVENT` (grep `EVENT.*=.*['\"]` → 100 lines، الملفات: [boot/mountApplication.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/mountApplication.ts#L11), [hq/mountHqApplication.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/hq/mountHqApplication.ts#L5), [hq/HqResolvedRuntime.tsx](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/hq/HqResolvedRuntime.tsx#L8), [app/AppResolvedRuntime.tsx](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/AppResolvedRuntime.tsx#L16)).
  3. `29` ملف SQL migration تحتوي على `SET search_path`، منها `15` تستخدم `public` فقط بدون `pg_catalog` (مثل [021_forum_production.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/021_forum_production.sql#L15), [023_calendar_defense_in_depth.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/023_calendar_defense_in_depth.sql#L133) — إجمالي 37 سطر grep).
  4. `42` guard script في [package.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L13-L49) + `13` production gate (L87-L100).

القرارات المستمرة من وثيقة التسليم القسم 2 (سارية حتى إشعار عكسها):
1. **Zero Visual Edits مطلقًا**: لا CSS/TSX/Tailwind/ألوان/توزيع تحت أي ظرف.
2. **NO --save ABSOLUTE**: تشغيل `--save` لأي baseline يُسمح فقط في commit مستقل بادئة `baseline:` مع سبب موثق بالكامل في رسالة الالتزام.
3. **No File Delete بدون grep**: كل عملية حذف تسبقها وتتبعها grep كامل على `src/`, `scripts/`, `.audit/`, `e2e/`, `*.test.ts/tsx`.
4. **Atomic Commits**: كل إصلاح منطقي في commit منفصل (لتسهيل `git bisect`).

## Functional Requirements
- **FR-1 (LoaderHydrator Unified Order)**: سلسلة ترطيب الإقلاع Frame1→Frame2→Shells→Dashboards تكون موحدة في سجل واحد مرقم، مع ترتيب يضمن الصفر I/O متزامن بعد أول paint مرئي.
- **FR-2 (Event Consts Single Source of Truth)**: جميع ثوابت أحداث CustomEvent (`hami:*`, `hami-*`) تكون معرّفة مرة واحدة فقط في `src/app/runtime/eventConstants.ts`؛ كل مكان آخر يستورد منها بدلاً من إعادة تعريف const بنفس القيمة.
- **FR-3 (SQL search_path Defense in Depth)**: كل دالة SQL (RPC/trigger/UDF) تعين `SET search_path = pg_catalog, public` (أو `pg_catalog, public, private, extensions` للملفات التي تحتاج private/extensions)، ولا يُسمح بـ `public` فقط بدون `pg_catalog`.
- **FR-4 (CLI Contract)**: `npm run build:production` المختصر (أو تسلسل `build` + `guard:dist-secrets` + `guard:security-headers` + `sync:security-headers --check`) يخرج دائمًا exit=0 بدون أي تحذيرات أمنية.
- **FR-5 (CI Coverage Contract)**: كل `guard:*` موجود في `gate:wave0` يجب أن يكون إما مذكورًا في GitHub workflows أو مسجلًا في Map `NOT_FOR_CI` داخل [scripts/guard-ci-covers-guards.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-ci-covers-guards.mjs#L21-L24) مع سبب 3 أسطر عربي/إنجليزي.
- **FR-6 (Atomic Build Tag)**: آخر commit يمر عبر كل gates يُعلَم بـ `v10.5.0-tier1-hardened` مع رسالة tag تسرد كل الأرقام المرجعية للراتشيتات في وقت البناء.
- **FR-7 (CLAUDE.md)**: ملف في الجذر يحتوي على 7 أقسام دقيقة (Stack, Commit Rules, Quality Gates, Baselines, Visual Freeze Policy, Critical Paths, Review Protocol) ويُشار إليه من README أو .trae/documents.

## Non-Functional Requirements
- **NFR-1 (Visual Freeze 100%)**: 20 شاشة حاسمة (LawyerDashboard, Calendar, Execution, Lawsuits, Profile, Repository, Settings, Notifications, Field Tasks, Community, Global Search, Criminal Timeline, Dossier Files, Home Hub, Forum HQ, Login/Register, KYC, HQ Console, Smart Vault, Urgent Center) لها VR ≤0.0% أي صفر انزياح بكسل في التخطيط والألوان.
- **NFR-2 (Ratchet Monotonicity)**: كل 6 راتشيتات أساسية **إما تظل ثابتة أو تتحسن (تنخفض)**؛ أي زيادة → رفض تلقائي مع exit=1 من الحارس المقابل.
- **NFR-3 (Build Determinism)**: `npm run build` متكرر على نفس HEAD يُنتج نفس حجم الـ chunks ضمن ±0.5% (deterministic builds).
- **NFR-4 (CI Time)**: إجمالي وقت `quality-gate.yml` لا يزيد عن 15% عن قيمته الحالية بعد إضافة أي خطوات جديدة.
- **NFR-5 (Zero Hallucination Documentation)**: كل AC في هذا الملف له دليل إثبات ملموس من الكود الفعلي (path + line range) لا تُكتَب أي AC بدون Evidence مرجع.
- **NFR-6 (Independence of Review)**: المرحلة الأخيرة Review تنفذ من سياق جديد بلا اعتماد على Completion Evidence الخاص بمنفذ التنفيذ.
- **NFR-7 (Memory Leak Proof)**: أي تسجيل/listener/subscription جديد في LoaderHydrator أو event bus يُضمَّن تنظيفه صريحًا في cleanup؛ لا توجد نمو heap بعد 5 دورات mount/unmount على الشاشات المتأثرة (باستخدام أدوات المشروع الحالية).

## Constraints
- **Technical**:
  - المكدس الثابت: React 18 + Vite 7 + TS 5.9 + Tailwind 4 + Zustand 4 + Capacitor 8 + Supabase (supabase-js 2.108) + Playwright + Vitest + Sentry + Node 24.x. **لا ترقية**.
  - الحفاظ على عمل كل guards وratchets الإنتاجية الحالية كما هي (لا إزالة أو إضعاف).
  - لا إزالة أي baseline إنتاجي أو ملف `PHASE_*` أو ملف `WIFE_*_LATEST` أو `_chunk_connect_edges.json` أو `verify-import-closure.mjs`.
  - Capacitor: تصحيح إعدادات فقط على الـ canonical template في [scripts/native-ready/android/AndroidManifest.xml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/native-ready/android/AndroidManifest.xml) (لا ترقية إصدار).
- **Business**:
  - التجميد البصري 100% (Strict Visual Freeze) تحت أي ظرف. أي إصلاح يواجه تعارضًا مع هذا الشرط يُعلَّق ويُقرَّر من المستخدم.
  - لا نشر أي سر أو قيمة env في هذا المستند أو أي commit أو أي رسالة سطر أوامر.
- **Dependencies**:
  - لا تغيير كبير في `package.json` dependencies — صراحةً السماح فقط بإزالة باكدجات مؤكدة خاملة (بعد grep للمراجع) ونقل build-only إلى devDependencies فقط إذا دعت الحاجة.

## Assumptions
- المستودع متاح للكتابة مع صلاحيات حذف/تعديل كاملة؛ git موجود؛ Node 24.x مثبّت يطابق [`.nvmrc`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.nvmrc).
- الحالة الحالية: فرع `improve/current` HEAD=`e1aab858` clean 0 uncommitted — هذه هي نقطة البداية الفعلية لا شيء قبلها.
- المستخدم يوافق ضمنيًا على خلاصة القيود المذكورة في Constraints إلا في حال إعلانه عكس ذلك صراحة قبل Approve.

## Acceptance Criteria

### AC-00: حالة المستودع نظيفة + جميع الحرّاس خضراء بعد كل مهمة ذرية
- **Type**: `rule`
- **Given**: نهاية كل Task مكتمل
- **When**: يُنفَّذ `git status --porcelain` ثم `node scripts/run-gate-wave0.mjs` (المشغل الرسمي cross-platform)
- **Then**: `git status --porcelain` = فارغ (0 سطور)، و exit code المشغل = 0
- **Pass Condition**: كلا الشرطين صحيحين لكل Task. الدليل = terminal stdout مخزّن في Completion Evidence لكل Task.
- **Evidence**: [package.json L13-L50](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L13-L50) — قائمة الـ guards الكاملة; [scripts/run-gate-wave0.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/run-gate-wave0.mjs) المشغل الرسمي; سجل السابق لـ 17-quality-gate.txt في حزمة التسليم الرسمية التي تثبت exit=0.

### AC-01: 6 Ratchets محفوظة بدون تراخٍ على الإطلاق (أحادية الاتجاه)
- **Type**: `rule`
- **Given**: كل commit بعد تنفيذ مهمة ما
- **When**: نقرأ الـ JSON values في مجلد `.audit/*baseline.json` ونقارنها مع: `tsc=956, lint=177, dead-exports=1888, test-ratchet=23, arch-floor-total=244, import-closure=0`
- **Then**: كل قيمة إما **مساوية أو أقل** من القيمة المرجعية (لاحظ: انخفاض lint 177→11 هو تحسن مقبول، وانخفاض test 23→21 هو تحسن مقبول — لكن الزيادة مرفوضة بات). كما أن arch breakdown (api≤1, services≤129, domainApp≤114) لا يزيد.
- **Pass Condition**: 6/6 قيم تحقق الشروط. الدليل = stdout كل حارس مستقل: `guard:tsc`, `guard:lint`, `guard:dead-exports`, `guard:tests`, `guard:architecture-boundaries`, `guard:import-closure`.
- **Evidence**: [`.audit/tsc-baseline.json`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/tsc-baseline.json), [`.audit/lint-baseline.json`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/lint-baseline.json), [`.audit/dead-exports-baseline.json`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/dead-exports-baseline.json), [`.audit/test-ratchet-baseline.json`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/test-ratchet-baseline.json), [`.audit/architecture-boundaries-baseline.json`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/architecture-boundaries-baseline.json), [`.audit/import-closure-report.json`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.audit/import-closure-report.json).

### AC-02: ثوابت الأحداث موحّدة في ملف واحد — صفر تكرار
- **Type**: `rule`
- **Given**: كامل `src/**/*.ts`, `src/**/*.tsx`, `src/**/*.js`, `src/**/*.jsx`
- **When**: grep `= ['\"]hami:.*['\"]` و grep `= ['\"]hami-.*['\"]` على كامل src/ باستخدام regex للعثور على تعريف ثابت حدث (ليس استدعاء dispatch)
- **Then**: **جميع** تعريفات ثوابت أحداث hami:* و hami-* توجد **مرة واحدة فقط** في `src/app/runtime/eventConstants.ts`؛ لا يوجد أي تعريف مكرر (نفس قيمة السلسلة النصية في ملفين أو أكثر). بالإضافة: `APP_RUNTIME_READY_EVENT` الذي كان متكررًا ×4 يصبح مرة واحدة.
- **Pass Condition**: تعداد grep للتعريفات = عدد الثوابت في eventConstants.ts بالضبط. الدليل = grep output list + diff قبل/بعد الملفات الأربعة المتكررة.
- **Evidence**: [boot/mountApplication.ts L11](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/mountApplication.ts#L11), [hq/mountHqApplication.ts L5](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/hq/mountHqApplication.ts#L5), [hq/HqResolvedRuntime.tsx L8](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/hq/HqResolvedRuntime.tsx#L8), [app/AppResolvedRuntime.tsx L16](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/AppResolvedRuntime.tsx#L16) — مواقع التكرار الحالية.

### AC-03: LoaderHydrator موحد — ترتيب موثق + صفر I/O بعد أول paint
- **Type**: `rubric`
- **Dimension**: وضوح ترتيب ترطيب الإقلاع + عزل عن render path
- **Scale**: 1-5
- **Anchors**:
  - 1 = ترتيب عشوائي، تعليمات hydrate مبعثرة في 30 ملف بدون سجل مركزي
  - 3 = سجل مركزي للترتيب موجود لكن لا يحدد متى يُسمح بالـ I/O (قبل/بعد paint)
  - 5 = سجل مركزي مرقم (تسلسل واضح L1→L30 لكل loader/hydrator)، وكل I/O يتم قبل أول paint أو بعد `requestIdleCallback`، و صفر `localStorage`/`JSON.parse`/`IndexedDB` داخل جسم مكوّن React وقت render
- **Pass Threshold**: >= 4
- **Evidence**: 30 ملف hydrate inventory من الاستطلاع الميداني (grep 100 lines: `bootFrame1Hydrate`, `transactionsHubLoader`, `settingsShellEvents`, `notificationBootHydrator`, `profileBootHydrator`, `calendarEventsWarm`, `SecureStoreService`, `CryptoService`, `dossierWipeGuard`, `lawsuitLifecycleTransaction`, `bootEntryPreamble`, `homeBootChrome`, etc.)

### AC-04: SQL search_path = pg_catalog, public في كل RPC/UDF/Migration
- **Type**: `rule`
- **Given**: كل ملفات `supabase/migrations/**/*.sql` و `supabase/migrations/ops/**/*.sql`
- **When**: grep `SET search_path =` في كل ملفات SQL
- **Then**: كل سطر `SET search_path =` يحتوي على `pg_catalog` **قبل** `public` (مثل `SET search_path = pg_catalog, public` أو `pg_catalog, public, private, extensions`). استثناء واحد فقط: الملفات التي تحتاج حقول `auth` (مثل `20260829030000_hq_directory_scale.sql`) التي تستخدم `auth, public` تعاد صياغتها إلى `pg_catalog, auth, public`.
- **Pass Condition**: grep count `SET search_path =` بدون `pg_catalog` = 0. الدليل = grep output listing الملفات الـ 15 التي تحتاج تعديل.
- **Evidence**: 15 ملفات مع `public` فقط بدون pg_catalog من الاستطلاع: [021_forum_production.sql L15](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/021_forum_production.sql#L15), [023_calendar_defense_in_depth.sql L133](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/023_calendar_defense_in_depth.sql#L133), [20260812000002_admin_headquarters_rpcs.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260812000002_admin_headquarters_rpcs.sql) (3 سطور), [20260826020000_headquarters_court_counts_rpc.sql L7](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260826020000_headquarters_court_counts_rpc.sql#L7), [20260820000001_forum_rls_function_hardening.sql L11](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260820000001_forum_rls_function_hardening.sql#L11), [20260706000005_lock_forum_tables_to_bff.sql L10](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260706000005_lock_forum_tables_to_bff.sql#L10), [20260613000004_fix_privileged_roles_and_rls.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260613000004_fix_privileged_roles_and_rls.sql) (4 سطور), [20260812000001_freeze_profile_ban_flags_and_verification_meta.sql L27](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260812000001_freeze_profile_ban_flags_and_verification_meta.sql#L27), [20260820000000_forum_official_schema.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260820000000_forum_official_schema.sql) (2 سطور), [20260828230000_kyc_strip_user_meta_sync_app_metadata.sql L9](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260828230000_kyc_strip_user_meta_sync_app_metadata.sql#L9), [20260829010000_legal_display_name_once.sql L70](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260829010000_legal_display_name_once.sql#L70), [20260828210000_strip_client_verification_status_metadata.sql L8](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260828210000_strip_client_verification_status_metadata.sql#L8), [20260829030000_hq_directory_scale.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260829030000_hq_directory_scale.sql) (3 سطور تحتاج `auth` → `pg_catalog, auth, public`), [20260828201000_lock_update_updated_at_search_path.sql L5](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260828201000_lock_update_updated_at_search_path.sql#L5), [20260829020000_hq_connection_signals.sql L72](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260829020000_hq_connection_signals.sql#L72), [20260830220000_auth_otp_register_failed_attempt.sql L7](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/20260830220000_auth_otp_register_failed_attempt.sql#L7), وملفات ops [20260812000000_bootstrap_profiles_for_ban_freeze.sql](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/supabase/migrations/ops/20260812000000_bootstrap_profiles_for_ban_freeze.sql) (4 سطور).

### AC-05: Build الإنتاج يمر عبر 6 dist-secrets بدون تسريب
- **Type**: `rule`
- **Given**: مجلد `dist/` بعد `npm run build` (أو `build:vercel`) ناجح
- **When**: `npm run guard:dist-secrets` → يتضمن تسلسلًا من 7 تحقق أمني
- **Then**: exit=0، و grep داخل كل chunks في `dist/assets/` لا يجد أي match لـ `service_role`, `sk_`, `admin-`, `kv-proxy-admin`, `moderator-chunk`, `HQ_RUNTIME`, أو قيم env سرية.
- **Pass Condition**: `npm run guard:dist-secrets` exit=0 + `sync:security-headers --check` exit=0 + `guard:shell-auth-prod` exit=0 + `guard:prod-env-contract` exit=0. الدليل = terminal output for all 4 guards.
- **Evidence**: [package.json L42](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L42) (`guard:dist-secrets` chain), [L38](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L38) (`shell-auth-prod`), [L39](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L39) (`prod-env-contract`), [L41](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L41) (`security-headers check`).

### AC-06: ملف CLAUDE.md رسمي 7 أقسام في الجذر
- **Type**: `rule`
- **Given**: مستودع root
- **When**: يوجد ملف `CLAUDE.md` في الجذر ويقرأ بنجاح
- **Then**: يحتوي على الأقسام السبعة التالية بالترتيب: (1) Tech Stack & Versions، (2) Atomic Commit Rules & Conventional Commits، (3) Quality Gates (gate:wave0 28 items + order)، (4) Ratchet Baselines وكيفية استخدام --save، (5) Zero Visual Freeze Policy مع أمثلة محظورة، (6) Critical Paths (أهم 20 مسار ملف حاسم)، (7) Review Protocol (Workflow Spec→Plan→Approve→Implement→Review + AC/TR vocabulary).
- **Pass Condition**: 7/7 أقسام موجودة وترتبط بملفاتها الفعلية عبر روابط `file://`. الدليل = قراءة الملف + grep لكل عنوان قسم.
- **Evidence**: المستودع الجذر [c:\Users\HEX STORE\Downloads\New folder](file:///c:/Users/HEX%20STORE/Downloads/New%20folder) — لا يوجد CLAUDE.md حالياً (موجود فقط في وثيقة التسليم القسم 7).

### AC-07: 20 شاشة حاسمة لها VR ≤ 5% على hydration latency
- **Type**: `rubric`
- **Dimension**: استقرار وقت ترطيب الشاشات الحاسمة
- **Scale**: 1-5
- **Anchors**:
  - 1 = لا قياس على الإطلاق، و 10+ شاشات تتجاوز 20% انحراف hydration عن المتوسط
  - 3 = قياس موجود لـ 10 شاشات، والباقي غير مثبت
  - 5 = قياس كامل لـ 20 شاشة حاسمة (القائمة المذكورة في NFR-1) عبر حراس الأداء الموجودة (`guard:screen-closure`, `perf:boot-ttfi`, `perf:lawsuits-dossier-ttfi`) وكل شاشة ضمن ±5% عن المتوسط المرجعي
- **Pass Threshold**: >= 4
- **Evidence**: [package.json L28-L31](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L28-L31) (guard:boot-critical-weight, lawyer-inner-weight, first-open-shared-tax, screen-closure); [package.json L77-L79](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L77-L79) (perf:boot-ttfi, checklist:capacitor-boot, perf:lawsuits-dossier-ttfi)

### AC-08: Tag build الرسمي `v10.5.0-tier1-hardened` مع snapshot الراتشيتات
- **Type**: `rule`
- **Given**: آخر commit يمر عبر 28/28 gates
- **When**: `git tag -n99 v10.5.0-tier1-hardened`
- **Then**: الـ tag موجود، ورسالة الـ tag تسرد الأرقام الفعلية للراتشيتات في وقت الالتزام (tsc=X, lint=Y, dead-exports=Z, test=W, arch=A/B/C/D, import-closure=0, 28-gate-wave0=PASS)
- **Pass Condition**: `git tag -l v10.5.0-tier1-hardened` غير فارغ، و `git show v10.5.0-tier1-hardened | head -30` يعرض الأرقام. الدليل = terminal output.
- **Evidence**: حالة git الحالية clean — نقطة البداية `e1aab858`; تاريخ الـ tags الحالي: `audit-baseline-20260906-v2` موجود بالفعل (من Q1 v2).

### AC-09: CI Coverage contract محفوظ — 32 مربوط + 2 مستثنى وموثق
- **Type**: `rule`
- **Given**: [scripts/guard-ci-covers-guards.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-ci-covers-guards.mjs) + workflows في [`.github/workflows/`](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.github/workflows/)
- **When**: تشغيل `npm run guard:ci-covers-guards`
- **Then**: exit=0 مع رسالة "32 حارساً مربوطاً بالبوّابة، 2 مستثنى بسبب مكتوب". أي guard جديد يُضاف إلى gate:wave0 في المستقبل يجب إضافته إما للـ workflow أو إلى NOT_FOR_CI مع سبب.
- **Pass Condition**: exit=0 الدليل = stdout الحارس.
- **Evidence**: [scripts/guard-ci-covers-guards.mjs L21-L24](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-ci-covers-guards.mjs#L21-L24) — NOT_FOR_CI Map الحالي (2 مدخلات: guard:baseline, guard:architecture-boundaries)

### AC-10: وثيقة CLAUDE.md وقواعد الـ AI لا تحتوي على أسرار
- **Type**: `rule`
- **Given**: ملف CLAUDE.md الجديد في الجذر
- **When**: مسح الملف بـ patterns البحث عن أسرار (المنفذة بالفعل في `guard:tracked-secrets`)
- **Then**: لا يوجد أي إفصاح غير مقصود لعنوان URL السرّي أو قيمة anon key أو أي token. فقط أسماء المتغيرات (مثل `SUPABASE_ANON_KEY`) بدون قيم فعلية.
- **Pass Condition**: grep للملف على patterns أسرار = 0 matches. الدليل = grep output.
- **Evidence**: [scripts/guard-tracked-secrets.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-tracked-secrets.mjs) — patterns الرسمي.

### AC-11: الحذف الآمن للملفات المؤقتة/الخاملة (~500) بدون كسر مرجع
- **Type**: `rubric`
- **Dimension**: حجم الحذف الآمن + سلامة المراجع
- **Scale**: 1-5
- **Anchors**:
  - 1 = أي محاولة حذف تكسر guard:source-paths أو guard:dead-exports
  - 3 = حذف 200 ملف آمن فقط، والباقي مؤجل due to risk
  - 5 = حذف ≥450 ملف مؤكد خامل عبر grep `src/scripts/e2e/.audit` كلها 0 مراجع، مع 0 زيادة في dead-exports baseline، و 0 كسر في import-closure
- **Pass Threshold**: >= 4
- **Evidence**: [package.json L32](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L32) `guard:source-paths`; [package.json L22](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L22) `guard:dead-exports`; [package.json L18](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json#L18) `guard:cycles`.

## Open Questions
- [ ] ما هي أولوية تنفيذ AC-11 (الحذف الآمن ~500 ملف) مقارنة بـ AC-02/AC-03/AC-04 (المحاور الأساسية)؟ هل تعتبر P1 أم P2؟ (الافتراضي: P2 بعد أنتهاء المحاور الأساسية الأربعة).
- [ ] هل يُسمح بإنشاء مجلد `docs/ai-rules/` داخلي لوضع نسخ من CLAUDE.md باللغتين؟ أم يُكتفى بالملف الواحد في الجذر؟ (الافتراضي: ملف واحد فقط في الجذر).
- [ ] هل يحتاج Tag `v10.5.0-tier1-hardened` إلى signature GPG؟ أم tag خفيف (lightweight) كافٍ؟ (الافتراضي: annotated tag مع رسالة غنية -a -m).
