# Hami Legal System — Tier-1 World-Class Production Hardening

## Overview
- **Summary**: إعادة تأهيل مشروع Hami Iraqi Legal Case Management طبقاً لأشد معايير Tier-1 الإنتاجية العالمية عبر سبع مراحل محكمة: (0) توحيد حالة المستودع (2580 تغييراً ملتزماً)، (1) إيقاف النزيف الحرج (C-01→C-05، H-01→H-07)، (2) الإطار صفر والأداء عند الإقلاع، (3) سلامة البيانات ومحرك النسخ الاحتياطي المشعب، (4) انضباط طبقات المعمارية النظيفة وحدّ client/server، (5) توحيد الأحداث والتحميل والتنظيف الجذري، (6) تشديد بوابات CI والأمان المتبقي.
- **Purpose**: إزالة كل عوائق الجودة التي تمنع وصف النظام بـ "منصة إنتاجية عالمية موثوقة"، مع الحفاظ على التجميد البصري الصارم (100% Visual Freeze — تحت الغطاء فقط).
- **Target Users**: فريق التطوير، مهندس الأمن، فريق التحكم في الجودة، مسؤولو عمليات الإنتاج CI/CD.

## Goals
- إصلاح الخمس خلايا حرجة (C-01 حتى C-05) مع دليل مُتتبع لكل إصلاح.
- خفض حجب الخيط الرئيسي عند الإقلاع من 24-64ms إلى أقل من 4ms (≥94% تخفيض)، وضمان صفر I/O متزامن داخل أي دالة render.
- إغلاق كل بوابات fail-open في الحراس (11 بنداً)، ودمج test:security + e2e الإقلاع في quality-gate.yml على كل PR.
- توحيد حالة المستودع من 2580 تغييراً ملتزماً إلى حالة نظيفة مع gate:wave0 أخضر بعد كل دفعة.
- لفّ المفتاح الرئيسي وتشفير لقطات النسخ الاحتياطي + إغلاق resurrection + outbox للحذف السحابي.
- فرض no-restricted-imports لطبقات services/domain/application، وطرد browser-only من api/**، وثبت بنية في gate:wave0 بـ ratchet يتناقص فقط.
- حذف ~500 ملف آمن بدون حذف أي baseline إنتاجي أو ملف PHASE_* أو WIFE_* LATEST.
- إنشاء CLAUDE.md رسمي في الجذر يحتوي على جميع قواعد التطوير والأوامر وبوابات CI.

## Non-Goals
- ❌ أي تغيير بصري: ألوان، خطوط، مسافات Tailwind، توزيع العناصر، أحجام، سمات بصرية.
- ❌ إعادة تصميم المعمارية (rewrite/redesign). الإصلاحات تحت الغطاء فقط.
- ❌ تغيير أي واجهة عامة لمُكوّنات React أو props أو مخرجات مسارات api/** المتوافقة حالياً مع العميل.
- ❌ تعطيل أو إضعاف أي حارس/ratchet موجود حالياً.
- ❌ نشر أو تسريب أي قيم لأسرار/env أو مفاتيح أو بيانات اعتماد في أي ملف أو رسالة.

## Background & Context
بناءً على تقرير التدقيق الشامل (قراءة فقط) المستقل المؤرخ 2026-09-05/06، وجُهد فحص ستة محاور: سلسلة الإقلاع الأصلي (Android)، الإطار صفر وحجب الخيط الرئيسي، نقاط الفشل الحرجة والـ jank، المعمارية والطبقات، أمان RLS/سطح الحدود، التبعيات والملفات القابلة للحذف. نتائج الفحص الحالية: 5 Critical، 15 High، 24 Medium، ~500 ملف قابل للحذف، وتاريخ مستودع غير ملتزم بـ 2580 تغييراً. المعيار المستهدف: Tier-1 World-Class Production Standard (مستوى تطبيق مصرفي/حكومي Enterprise Mobile).

القرارات الاستراتيجية التي وثّقها المستخدم رسمياً (لا تُعاد فتحها):
1. المرحلة 0 (توحيد المستودع) تُنفَّذ أولاً قبل أي إصلاح آخر.
2. قائمة الحذف الآمن (~500 ملف) تُنفَّذ كلها؛ المتنازع عليه (`.audit/*.md`, `docs/archive/`, `.trae/documents/`) يُحتفظ به أولاً مع علامة pending للمراجعة لاحقاً (لا يحذف الآن).
3. ملف CLAUDE.md يُنشأ كملف فعلي في الجذر.
4. التقرير نفسه يبقى في المحادثة ولا يُحفظ كملف منفصل (ما عدا هذا المستند الرسمي).

## Functional Requirements
- **FR-1**: سلسلة الإقلاع الأصلية (tap-icon → interactive) تكون خالية من الوميض الأبيض/الأسود، مع مهلة failsafe أصلي أطول من حارس JS الأصلي بفارق لا يقل عن 20%.
- **FR-2**: جميع قراءات التخزين المتزامنة عند الإقلاع memoized، وصفر قراءات localStorage/JSON.parse داخل جسم المكوّن React في وقت render/commit.
- **FR-3**: حالات فارغة/loading تظهر معلومات صحيحة مطابقة لما هو مُتاح فعلياً من الذاكرة (لا نفي ثم نقض).
- **FR-4**: النسخ الاحتياطي المشعب مشفّر على الجلسة + الاستعادة ترشّح tombstones execution/notes قبل الإدراج + الحذف السحابي يمرّ عبر outbox مع تأكيد end-to-end.
- **FR-5**: طبقة api/** لا تستورد أي وحدة تعتمد على window/document/localStorage أو runtime/bootstrap/hooks/components.
- **FR-6**: جميع أسماء أحداث الإقلاع والسمات data-hami-* مستوردة من مصدر واحد موثّق.
- **FR-7**: بوابات الحرّاس التي fail-open اليوم تصبح fail-closed على CI.
- **FR-8**: `npm run test:security` + e2e الإقلاع يُشغّلان على كل PR في quality-gate.yml.
- **FR-9**: حالة المستودع `git status --porcelain` نظيفة مع `npm run gate:wave0` أخضر بعد كل دفعة من الالتزامات.
- **FR-10**: كل حذف ملف يسبقه + يتبعه `npm run guard:source-path-references --save` (عند اللزوم) و`gate:wave0` للتأكد من عدم انقطاع أي مرجع.

## Non-Functional Requirements
- **NFR-1 (Visual Freeze)**: مقارنة لقاط الشاشة قبل/بعد كل مرحلة (20 شاشة رئيسية) تُثبت صفر انزياح بكسل في التخطيط والألوان.
- **NFR-2 (Memory Leak)**: أي تسجيل/listener/subscription جديد يُضمَّن تنظيفه؛ وكل إصلاح يُثبت عدم نمو heap بعد 5 دورات mount/unmount على الشاشات المتأثرة (باستخدام أدوات المشروع الحالية).
- **NFR-3 (Boot Budget)**: حارس `guard:boot-critical-weight`, `guard:first-open-shared-tax` لا يتجاوز حدودهم الحالية (لا زيادة).
- **NFR-4 (Ratchet Baselines)**: جميع mِisenan-ratchet في `.audit/*` إما تظل ثابتة أو تنخفض؛ الزيادة تُرفض.
- **NFR-5 (CI Time)**: زمن total runtime لـ quality-gate.yml لا يزيد عن 15% من زمنه الحالي بعد إضافة test:security + e2e الإقلاع.
- **NFR-6 (Atomic Commits)**: كل commit ذاتي الصيانة (self-contained)، يمر بـ gate:wave0 وحده، مع رسالة commit تأطيرية Conventional Commits.
- **NFR-7 (Zero Regressions)**: `typecheck`, `lint`, `test:run` إما أرقامهم في baselines تتحسن أو تبقى ثابتة.

## Constraints
- **Technical**:
  - المكدس الثابت: React 18 + Vite 7 + TS 5.9 + Tailwind 4 + Zustand 4 + Capacitor 8 + Supabase (supabase-js 2.108) + Playwright + Vitest + Sentry + Node 24.x. لا ترقية.
  - الحفاظ على عمل كل guards وratchets الإنتاجية الحالية (gate:wave0، lint-baseline، tsc-ratchet، dead-modules، import-cycles، import-closure، dead-exports، duplicate-logic، screen-closure، source-path-refs، size-baseline، WIFE_*، PHASE_*، chunk-baseline، perf-budget).
  - لا إزالة أي baseline إنتاجي أو ملف PHASE_* أو ملف WIFE_*_LATEST أو `_chunk_connect_edges.json` أو `verify-import-closure.mjs`.
  - Capacitor: تصحيح إعدادات فقط (minify, allowNavigation, hardwareAccelerated، webContentsDebuggingEnabled)، لا ترقية إصدار.
- **Business**:
  - التجميد البصري 100% (Strict Visual Freeze) تحت أي ظرف. أي إصلاح يواجه تعارضاً مع هذا الشرط يُعلَّق ويُقرَّر من المستخدم.
  - لا نشر أي سر أو قيمة env في هذا المستند أو أي commit أو أي رسالة سطر أوامر.
- **Dependencies**:
  - `package.json`: حذف `vaul`, `embla-carousel-react` فقط من مُعقّدات التبعيات المُؤكَّدة لخمولها؛ إضافة `sirv` إلى devDependencies؛ نقل 5 build-only إلى devDependencies؛ توحيد `dompurify`.

## Assumptions
- المستودع متاح للكتابة مع صلاحيات حذف/تعديل كاملة؛ git موجود؛ Node 24.x مثبَّت يطابق `.nvmrc`.
- الحالة الحالية: فرع `main` متقدم بـ1 عن `hami/main`، آخر commit `7835d324`، و2580 تغييراً غير ملتزم (M=1770, D=178, ??=632). هذه الحالة هي نقطة البداية.
- النسخ الاحتياطي المخبأ يمكن حمايته بـ `git stash push --include-untracked` و`git tag` رسمي قبل أي تعديل.
- المستخدم يوافق ضمنياً على خلاصة قراراته المذكورة في Goals/Non-Goals إلا في حال إعلانه عكس ذلك صراحة.

## Acceptance Criteria

### AC-00: حالة المستودع نظيفة + جميع الحرّاس خضراء بعد كل مرحلة
- **Type**: `rule`
- **Given**: نهاية كل مرحلة (0→6)
- **When**: يُنفَّذ `git status --porcelain` و `npm run gate:wave0`
- **Then**: `git status --porcelain` يعيد سطور فارغة، و`gate:wave0` يخرج بـ exit code 0
- **Pass Condition**: كلاهما يُحقَّق للمرحلتين 0 و1 و2 و3 و4 و5 و6. أسطر الأوامر الفعلية في Completion Evidence لكل مرحلة.
- **Evidence**: سطور أوامر cmd output من مرحلة التنفيذ لكل مرحلة.

### AC-01: تعارض المهلات مُحلّل — fail-safe أصلي يُحرَر بعد JS guard بنسبة 20%+
- **Type**: `rule`
- **Given**: build android release + build web production
- **When**: نقرأ القيمة النصية لـ `SAFETY_FAILSAFE_MS` في [MainActivity.java](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/android/app/src/main/java/iq/hami/legal/MainActivity.java) وقيمة حارس الإقلاع الأصلي في [hami-boot.js](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/public/hami-boot.js)
- **Then**: `SAFETY_FAILSAFE_MS >= ceil(hami-boot-guard-native-ms * 1.20)` AND لا يوجد مدخل مهلة أخرى أقصر من حارس JS الويبي على المسار نفسه
- **Pass Condition**: المعادلة صحيحة عدّادياً + grep للملفَين يؤكدان القيم الجديدة
- **Evidence**: grep output: السطرين بالقيم الجديدة + حساب نسبة الـ+20%

### AC-02: صفر وميض لوني عبر مسارات Android Theme / windowBackground / failure overlay
- **Type**: `rule`
- **Given**: build Android + build Web
- **When**: نقرأ القيم Hex في styles.xml (AppTheme)، colors.xml، hami-boot.js طبقة الفشل، index.html
- **Then**: `AppTheme` في styles.xml تضم `windowBackground=#0A0F1C` صريحاً (أو تُحوَّل theme parent ليكون رمادياً موحّداً) وطبقة الفشل في hami-boot.js `background=#0a0f1c` (لا #000)
- **Pass Condition**: grep يثبت وجود `windowBackground` صريح في `<style name="AppTheme">` وgrep `background.*#0a0f1c` في hami-boot.js عند نقطة failure overlay
- **Evidence**: سطور الملفات بعد التعديل.

### AC-03: minifyEnabled=true في buildType release (Android)
- **Type**: `rule`
- **Given**: android/app/build.gradle release block
- **When**: grep block `release {`
- **Then**: `minifyEnabled = true` صريح مع وجود `proguardFiles` الحالية المحافظة
- **Pass Condition**: السطر موجود بنفس الكتلة release ولا توجد كلمة `false` مساواة لـ minifyEnabled في نفس الكتلة
- **Evidence**: fragment النص من build.gradle

### AC-04: CSP على Android WebView: meta CSP صريح في index.html و hq.html مطابق لـ wifeSecurityHeaders
- **Type**: `rule`
- **Given**: build web + inspect head
- **When**: نقرأ `<meta http-equiv="Content-Security-Policy"` في index.html وhq.html ومقارنتها بمحتوى `contentSecurityPolicy.ts`
- **Then**: الميتا توجد في كلا الملفَين، ولا تحتوي على سياسات أضعف من المُعلَنة في wifeSecurityHeaders (`script-src`, `object-src`, `base-uri`, `frame-ancestors`, `upgrade-insecure-requests` موجودة)
- **Pass Condition**: grep للميتا + وجود هذه المفتاحيات + عدم وجود 'unsafe-eval' في PROD template
- **Evidence**: fragment head من كلا الملفَين بعد التعديل

### AC-05: بوابات fail-open مغلقة — guard-dist-no-sourcemaps + guard-dead-exports + 9 baseline-auto-save ترفض عند CI=true
- **Type**: `rule`
- **Given**: كل guard-*.mjs المذكورين في تقرير التدقيق
- **When**: تشغيل الحراس ضمنياً مع متغير البيئة `CI=true` مع محاكاة غياب baseline أو dist
- **Then**: كل الحارس exit code != 0 في حالة التجاوز (غياب baseline أو غياب dist) وليس 0
- **Pass Condition**: grep دالة exit/process.exit في تلك الحرّاس تشترط CI=true لتعطيل auto-save
- **Evidence**: تعديلات guard-*.mjs لقطات نصية من السطور

### AC-06: guard-tracked-secrets يغطي جميع ملفات .env* ما عدا *.example (وملفات hami/.env)
- **Type**: `rule`
- **Given**: scripts/guard-tracked-secrets.mjs
- **When**: قراءة مصفوفة BLOCKED
- **Then**: المصفوفة تستخدم نمط `/.env(\..*)?$/` عام ويستثني صراحة `*.example`، ويتضمّن مسارات فرعية مثل `hami/`
- **Pass Condition**: grep regex الجديد + تشغيل الحارس مع وجود ملف تجريبي مؤقت `.env.development.local` ثم حذفه
- **Evidence**: السطر المعدّل في الحارس + output تشغيل تجريبي.

### AC-07: quality-gate.yml يشتغل test:security و e2e-boot على كل push/PR إلى main/master
- **Type**: `rule`
- **Given**: .github/workflows/quality-gate.yml
- **When**: قراءة jobs/steps في الملف
- **Then**: توجد خطوة `npm run test:security` وتوجد خطوة e2e الإقلاع (بناءً على job boot-e2e الحالي) مدمجة كـ required step
- **Pass Condition**: grep `test:security` وgrep `boot-e2e` / `playwright` داخل quality-gate.yml
- **Evidence**: snippets من workflow بعد التعديل

### AC-08: info.ts dev fallback NEVER يُضمّن في أي build ما عدا MODE=dev صريح
- **Type**: `rule`
- **Given**: src/utils/clientEnv.ts + utils/supabase/info.ts
- **When**: قراءة resolveOnce()
- **Then**: شرط السقوط يعتمد فقط على `MODE==='development'` صريح لا على `!PROD` الواسع (الذي يغطي preview/staging أيضاً)، ويرمي خطأً إن لم يجد env الحقيقية في PROD/PREVIEW
- **Pass Condition**: `PROD!==true` محلولة بـ `MODE === 'development'` فقط + guard-supabase-info-boundary يمرّ
- **Evidence**: السطر المعدّل من clientEnv.ts

### AC-09: peekBootSessionUserId memoized (≤1 scan/process per boot) و صفر calls داخل React render function
- **Type**: `rule`
- **Given**: src/boot/peekBootSessionUserId.ts + HomeHubCardSkeleton.tsx
- **When**: grep لمصطلح `readBootSessionPeek()` في كامل src/
- **Then**: في المصدر يوجد متغير cache على مستوى الوحدة يُحفظ النتيجة (ولا ينفذ الحلقة إلا إذا كان null)، وHomeHubCardSkeleton.tsx الجسم خالٍ من استدعاء peekBootSessionPeekSync أو peekBootSessionUserIdSync
- **Pass Condition**: لا يوجد استدعاء لتلك الدوال في أي ملف ضمن دالة React component (بحث جملي `function.*\(\).*\{.*peekBootSession*` أو إثبات بالقراءة أنه تم نقله خارج render إلى useMemo/useEffect + code snippet)
- **Evidence**: السطور من الملفَين بعد التعديل + استدعاء جديد خارج render.

### AC-10: securePersistStorage يحلل payload JSON مرتين فقط (parse واحد لكل نص: incoming + existing) لا أربعة
- **Type**: `rule`
- **Given**: src/app/services/securePersistStorage.ts الدالة countArrayItemsInPersistPayload الاستدعاءات
- **When**: قراءة نص defaultPersistWipeGuard
- **Then**: سطور الاستدعاء تكون parse واحد للـ incomingRaw + واحد للـ existingRaw ثم استخراج الحقلين منهما
- **Pass Condition**: ≤2 JSON.parse per write call وليس 4
- **Evidence**: fragment الكود بعد إعادة البناء

### AC-11: HomeHubCardSkeleton يعرض skeleton/empty حسب hasItems الحقيقي (مع نفس الأبعاد 88px الخارجي دائماً)
- **Type**: `rule`
- **Given**: HomeHubCardSkeleton.tsx + peekHomeHubBootHasItems.ts
- **When**: hasItems=true و hasItems=false
- **Then**: الغلاف الخارجي heights ثابت 88px دائماً (لا CLS)، وداخله عند hasItems=true skeleton لعناصر التنبيهات وليس "لا توجد عناصر"، وعند hasItems=false EmptyState الحالي
- **Pass Condition**: السطور الشرطية الجديدة داخل الملف، وعدم تغيّر wrapper style
- **Evidence**: fragment JSX + grep `data-hub-has-items` + صورة مقارنة قبل/بعد (اختباري)

### AC-12: registerSyncHandler paired مع unregisterSyncHandler و cleanup في effect
- **Type**: `rule`
- **Given**: cloudSyncStatusStore.ts + LawyerDashboardBackgroundServices.tsx
- **When**: قراءة المتجر + useEffect في المكوّن
- **Then**: يوجد `unregisterSyncHandler(bucket)` في المتجر، وeffect في الـcomponent يعيد `return () => { /* unregister 3 handlers */ }`
- **Pass Condition**: الدالة الجديدة في المتجر موجودة + return من effect يُستدعيها للـ 3 buckets
- **Evidence**: fragment الكود من الملفَين

### AC-13: boot paint/storage reads de-duplicated — applyBootSurfacePaintFromStorage يُستدعى مرة واحدة فقط في سلسلة الإقلاع
- **Type**: `rule`
- **Given**: src/index.tsx + src/boot/bootEntryPreamble.ts + src/app/services/settings/bootSurfacePaintCache.ts
- **When**: grep `applyBootSurfacePaintFromStorage()` على كامل src/
- **Then**: نتيجة grep =1 استدعاء فقط (لا ثاني)
- **Pass Condition**: grep count == 1
- **Evidence**: grep output

### AC-14: caseStore يضبط partialize تحديداً (لا كامل مصفوفة cases)
- **Type**: `rule`
- **Given**: stores/caseStore.ts
- **When**: قراءة options persist
- **Then**: يوجد `partialize: (state) => ({ ... })` مع الحقول المطلوبة فقط (موجودة في مخازن شقيقة مثل executionDashboardStore كحسن مثال)
- **Pass Condition**: partialize صريح في options ويعيد أقل من 6 حقولاً (ليس state كاملاً)
- **Evidence**: السطر المعدّل

### AC-15: SecureStoreService.kickoffBootShellSync مؤجّل إلى requestIdleCallback أو بعد boot-reveal (لا side-effect import-level)
- **Type**: `rule`
- **Given**: services/SecureStoreService.ts السطور 1986-1988
- **When**: grep التأثير الجانبي في آخر الملف
- **Then**: التأثير يختفي من مستوى الوحدة ويُربَط باستدعاء صريح من bootReveal.ts بعد markBootRevealDone أو داخل requestIdleCallback
- **Pass Condition**: السطر 1986-1988 المحذوف ومرجع استدعاء صريح جديد موجود
- **Evidence**: grep قبل/بعد + السطر الجديد في bootReveal

### AC-16: homeBootChrome busy-poll 16ms مُستبدل بآلية حدثية (MutationObserver / boot-reveal event listener) مع memoized peeks
- **Type**: `rubric`
- **Dimension**: تقليل إيقاظ الخيط الرئيسي أثناء الإقلاع (reduction of main-thread wakeups during boot)
- **Scale**: 1-5
- **Anchors**: 1 = حلقتا poll بقيت كما هي؛ 3 = حلقة واحدة فقط مستبدلة؛ 5 = الحلقتان مستبدلتان بالكامل بـ listeners وpeek داخل الحلقة memoized بتكلفة 0 بعد التخزين
- **Pass Threshold**: >= 4
- **Evidence**: عدد الحلقتِ polling المتبقيتين + سطور الاستبدال في الملف

### AC-17: CryptoService master-key + dossierBackupStore plaintext resolved
- **Type**: `rubric`
- **Dimension**: سلامة تخزين المفاتيح ولقطات النسخ الاحتياطي (key safety + backup-at-rest)
- **Scale**: 1-5
- **Anchors**: 1 = وضع ثابت دون تغيير؛ 3 = لفّ المفتاح (wrapped + non-extractable) عبر WebCrypto مع fallback مُصادَر أو كلا الشيئين، أو لقطات النسخ الاحتياطي مشفّرة فقط؛ 5 = لفّ المفتاح غير قابل للاستخراج (عند توفر Keystore الأصلي) + لقطات النسخ الاحتياطي مشفّرة بمفتاح مشتق من المادة الاصلية نفسها (HKDF) مع ختم HMAC
- **Pass Threshold**: >= 4
- **Evidence**: fragments الكود + test:security يأخذ نقاط إضافية.

### AC-18: resurrection filter في استعادة workCloudCheckpoint + businessBackupImport
- **Type**: `rule`
- **Given**: ملفات الاستعادة
- **When**: قراءة مسار إعادة الإدراج
- **Then**: قبل insert يُطبّق فلتر `!tombstone` أو `isTombstone !== true` وصف للملفات execution/notes
- **Pass Condition**: وجود الفلتر في كلا المسارَين
- **Evidence**: سطور الفلتر

### AC-19: cloud delete outbox/WAL يُضمّن confirmation + retries + drift detection
- **Type**: `rubric`
- **Dimension**: موثوقية الحذف عبر السحابة (cloud delete reliability + drift detection)
- **Scale**: 1-5
- **Anchors**: 1 = fire-and-forget بلا تغيير؛ 3 = تحويل delete إلى promise مُعاد مع `await` مع logging للفشل مع إعادة محاولة واحدة؛ 5 = outbox حقيقي (pending_deleted row) + periodic reconciler يحدّث حالة drift مع Sentry breadcrumb عند تفاوت >24h
- **Pass Threshold**: >= 4
- **Evidence**: الكود الجديد في الملفَين المذكورين في التقرير.

### AC-20: ESLint no-restricted-imports فرض 3 قواعد مع ratchet في guard:wave0
- **Type**: `rule`
- **Given**: eslint config + gate:wave0 package.json scripts
- **When**: تشغيل eslint على src/app/api/** و src/app/services/** و src/app/domain/** و src/app/application/**
- **Then**: (1) api/** لا يستورد مسارات خارج {api, security(/shared?), infrastructure(/server?), types, utils/supabase-only}؛ (2) services لا يستورد components/hooks/runtime/bootstrap؛ (3) domain لا يستورد components/services/runtime. ويوجد guard مُضاف إلى gate:wave0 مع baseline يبدأ حالياً ويسمح فقط بالانخفاض (ratchet)
- **Pass Condition**: قواعد no-restricted-imports موجودة، والجديد حارس مُضاف إلى gate:wave0، وbaseline مُولّد وحالته pass
- **Evidence**: eslintrc fragment + package.json gate:wave0 updated + guard الجديد.

### AC-21: dashboardInteractiveEvent + bootEventNames + data-hami-* ثوابت موحّدة مستوردة في كل الموقعَين (~42 + 5 + 25)
- **Type**: `rule`
- **Given**: dashboardInteractiveMark.ts, bootEventNames.ts, ملف ثوابت جديد data-hami-attrs.*
- **When**: grep للنص الحرفي `'hami:dashboard-interactive'` و `'hami:app-runtime-ready'` و سمات `data-hami-feature-open` الحرفية في الكود
- **Then**: كل نتيجة grep = 0 ما عدا تعريف الثوابت نفسه. جميع الاستخدامات عبر import الثوابت
- **Pass Condition**: grep counts == 0 للأشكال الحرفية عدا تعريف الثوابت
- **Evidence**: grep output بعد الاستبدال

### AC-22: double-dispatch settings, repository prefetch order, profileInstantPaint scope, hydrate wave, communityHubLoader fixed
- **Type**: `rubric`
- **Dimension**: صحة ودقّة شبكة الـ loaders/hydrators (loader/hydrator correctness)
- **Scale**: 1-5
- **Anchors**: 1 = لا تغيير؛ 3 = 2-3 من النقاط الأربعة مستصلحة؛ 5 = الست نقاط كلها: SETTINGS_SHELL_HYDRATED_EVENT single-source, repositoryBootHydrator بعد boot-reveal, profileInstantPaint يزيل سمته الخاصة فقط, 11 hydrator بموجتين (idle-callback), communityHubLoader dynamic, dashboardSurfaceWarm.ts حُذف أو مهمل بشكل صريح ضمن baselines
- **Pass Threshold**: >= 4
- **Evidence**: السطور المعدّلة لكل نقطة + guard-dead-modules يمرّ بعد حذف dashboardSurfaceWarm.

### AC-23: ~500 ملف مؤقت محذوف مع صفر خروج في gate:wave0 + baselines المُبقاء محفوظة
- **Type**: `rule`
- **Given**: قائمة الحذف الآمنة من التقرير
- **When**: بعد تنفيذ عمليات الحذف
- **Then**: جميع الملفات من القائمة الآمنة محذوفة، baselines المذكورة في قائمة الإبقاء موجودة، WIFE_*_LATEST.json و PHASE_* و _chunk_connect_edges.json موجودة، وgate:wave0 يمرّ، وguard:source-path-references baseline مُحدّث فقط عند الحاجة
- **Pass Condition**: existence check لبعض القوائم الأساسية + output gate:wave0
- **Evidence**: قائمة partial delete + gate:wave0 output

### AC-24: npm dependencies — حذف/إضافة/نقل كما هو محدد
- **Type**: `rule`
- **Given**: package.json بعد التعديل + package-lock.json محدّث
- **When**: cat dependencies + devDependencies
- **Then**: لا vaul، لا embla-carousel-react، sirv في devDependencies، vite+@vitejs/plugin-react+tailwindcss+@tailwindcss/vite+tailwindcss-animate في devDependencies وليس dependencies، framer-motion classification line حُذفت من vite.config، ودّاوم dompurify واحد (decide unified path)
- **Pass Condition**: grep `vaul` / `embla-carousel` في package.json = 0 عدا comments; sirv موجود فقط في devDeps; الخمسة نقلوا
- **Evidence**: package.json fragment + grep results.

### AC-25: rate-limits + csrf-logout + session payload trim + FNV→SHA-256 + CSP report-uri + SQL search_path/REVOKE + allowNavigation صريح و hardwareAccelerated و webContentsDebuggingEnabled=false صريح
- **Type**: `rubric`
- **Dimension**: اكتمال طبقة الأمان المتبقية (remaining security surface completeness)
- **Scale**: 1-5
- **Anchors**: 1 = لا تغيير؛ 3 = 4 من 8 البنود منفّذة؛ 5 = الثمانية: (rate-limits على verification/logout/readyz، CSRF على logout، تقليم auth/session payload، SHA-256 بدل FNV-1a في RL keys، CSP report-to/report-uri، SET search_path + REVOKE على الدوال الثلاث في migrations، capacitor.config: allowNavigation=['self'] أو ما يعادلها، explicit hardwareAccelerated + webContentsDebuggingEnabled=false في capacitor/Android)
- **Pass Threshold**: >= 4
- **Evidence**: fragments الكود لكل نقطة.

### AC-26: CLAUDE.md منشأ في الجذر ويحتوي على القواعد المذكورة في المسودة
- **Type**: `rule`
- **Given**: ./CLAUDE.md (جذر المشروع)
- **When**: قراءة الملف
- **Then**: يحتوي على الأقسام: Non-negotiables, Core commands, Quality gates in CI, Architecture rules, Boot pipeline invariants, Data safety, Definition of done. مع مرجعيات لـ gate:wave0, guard:baseline, test:security, Node 24 .nvmrc, cap:apply:android.
- **Pass Condition**: الأقسام السبعة موجودة، وأوامر gate:wave0، test:security، cap:apply مذكورة صراحة
- **Evidence**: قائمة الأقسام وsnippets القيم.

### AC-27: بصريًا مطابق 100% — مقارنة لقطات قبل/بعد للشاشات الرئيسية (20 شاشة) بدون أي انزياح بكسل أو اختلاف لون
- **Type**: `rubric`
- **Dimension**: التزام التجميد البصري الصارم
- **Scale**: 1-5
- **Anchors**: 1 = اختلافات بصرية ظاهرة في أكثر من شاشتين؛ 3 = اختلاف بسيط (شريط تقدم أو إطار داخلي وحيد) في <=1 شاشة لا يؤثر على الهوية； 5 = صفر اختلاف بكسل قابل للرصد في 20+ شاشة، ألوان متطابقة تماماً، مسافات ثابتة، لا pop-in لما فوق مستوى الهيكل
- **Pass Threshold**: 5
- **Evidence**: تسلسل لقطات قبل/بعد في e2e أو مقارنة screenshots يدوية مسجلة في completion evidence.

## Open Questions
- [x] ترتيب المراحل: المرحلة 0 أولاً (مُقرَّر رسمياً من المستخدم).
- [x] المتنازع عليه للحذف (`.audit/*.md`, `docs/archive/`, `.trae/documents/`): يُحتفظ به الآن ولا يُحذف (مُقرَّر).
- [x] إنشاء CLAUDE.md كملف فعلي في الجذر: نعم (مُقرَّر).
- [x] حفظ التقرير كملف منفصل: لا، يبقى في المحادثة، ويُعتمد هذا المستند رسمياً.
