# Hami Legal System — Implementation Plan
## سبع مراحل × ~30 مهمة جُزيئية

ملفات مرجعية فعلية (لقراءة مسبقة دائماً قبل أي تعديل):
- [package.json](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/package.json)
- [MainActivity.java](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/android/app/src/main/java/iq/hami/legal/MainActivity.java)
- [styles.xml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/android/app/src/main/res/values/styles.xml)
- [colors.xml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/android/app/src/main/res/values/colors.xml)
- [build.gradle (android/app)](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/android/app/build.gradle)
- [capacitor.config.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/capacitor.config.ts)
- [index.html](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/index.html)
- [hq.html](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/hq.html)
- [hami-boot.js](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/public/hami-boot.js)
- [quality-gate.yml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/.github/workflows/quality-gate.yml)
- [bootCriticalPreload.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/bootCriticalPreload.ts)
- [mountApplication.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/mountApplication.ts)
- [bootEntryPreamble.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/bootEntryPreamble.ts)
- [homeBootChrome.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/homeBootChrome.ts)
- [bootReveal.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootReveal.ts)
- [dashboardInteractiveMark.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/dashboardInteractiveMark.ts)
- [bootEventNames.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootEventNames.ts)
- [peekBootSessionUserId.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/peekBootSessionUserId.ts)
- [HomeHubCardSkeleton.tsx](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/dashboard/HomeHubCardSkeleton.tsx)
- [peekHomeHubBootHasItems.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/dashboard/peekHomeHubBootHasItems.ts)
- [bootSurfacePaintCache.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/bootSurfacePaintCache.ts)
- [securePersistStorage.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/securePersistStorage.ts)
- [SecureStoreService.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/SecureStoreService.ts)
- [caseStore.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/stores/caseStore.ts)
- [cloudSyncStatusStore.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/cloudSync/cloudSyncStatusStore.ts)
- [LawyerDashboardBackgroundServices.tsx](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx)
- [contentSecurityPolicy.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/api/security/contentSecurityPolicy.ts)
- [wifeSecurityHeaders.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/api/security/wifeSecurityHeaders.ts)
- [clientEnv.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/utils/clientEnv.ts)
- [vite.config.mts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/vite.config.mts)
- [guard-dist-no-sourcemaps.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-dist-no-sourcemaps.mjs)
- [guard-dead-exports.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-dead-exports.mjs)
- [guard-tracked-secrets.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-tracked-secrets.mjs)
- [CryptoService.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/CryptoService.ts)
- [dossierBackupStore.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/infrastructure/dossierBackupStore.ts)

---

## المرحلة 0: تجميد الأرضية وتوحيد حالة المستودع

## Task 1: نسخ احتياطي أمان + علامة git + تقسيم الالتزامات الستة الدفعات
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - (1) `git stash push --include-untracked -m "audit-backup-$(date +%Y%m%d-%H%M%S)"` ثم `git stash apply` للإبقاء على العمل مع tag.
  - (2) `git tag audit-baseline-20260906` على HEAD (`7835d324`).
  - (3) تقسيم الـ2580 تغييراً إلى 6 دفعات التزام منطقية كل منها self-contained مع رسالة Conventional Commits:
    - (أ) lawyer components (D=150 + ??=263) — `refactor(lawyer): restructure lawyer components as per v10.5 surface`
    - (ب) domain/lawsuit (33 new) + utilities migrated deletions — `refactor(domain): lawsuit domain additions + tombstone calendar cleanup`
    - (ج) services/forum (34) + services/calendar (19) — `feat(forum): forum + calendar service modules v1`
    - (د) 7× migrations `20260830*` + supabase/functions/server/kvProxyKeyOwnership.ts و make-server-f09713ba copy — `chore(db): 7 migrations 20260830 + kvProxyKeyOwnership server sync`
    - (هـ) .audit 142 modified baselines + scripts 17 modified — `chore(audit): update audit baselines and guard scripts for 10.5`
    - (و) runtime/__tests__ 22 + e2e 20 remaining — `test(runtime): add runtime tests + e2e coverage 2026Q3`
  - (4) بعد كل دفعة (a→f): تشغيل `npm run gate:wave0` + إن إخفاق أي دفعة إضافة --amend للتحيين أو تقسيم إضافي.
  - (5) بعد الدفعة الأخيرة: `git status --porcelain` = فارغ.
- **Acceptance Criteria Addressed**: AC-00
- **Test Requirements**:
  - `rule` TR-1.1: بعد كل دفعة من 6: `npm run gate:wave0` يخرج بـ exit code 0. الدليل: stdout snippets لكل دفعة مخزّنة في completion evidence
  - `rule` TR-1.2: بعد الدفعة الأخيرة: `git status --porcelain` يعيد فارغ + `git log --oneline -6` يعرض الست التزامات بالترتيب a→f. الدليل: terminal output
  - `rule` TR-1.3: `git tag audit-baseline-20260906` موجود في `git tag -l` + stash backup في `git stash list`. الدليل: terminal output.
- **Notes**: لا حذف أي ملف في هذه المرحلة — فقط التزام ما هو موجود بالفعل.

---

## المرحلة 1: إيقاف النزيف الحرج

## Task 2: تعارض المهلات — رفع SAFETY_FAILSAFE_MS وتعيين الحارِس لـ +20% فائض
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) قراءة حارس الإقلاع الأصلي: `grep -n "22000\|120000\|14000" public/hami-boot.js` — استخراج رقم milliseconds الفعلي للدالة الأصلية (أكبر قيمة في مسار الأصلي غير dev).
  - (2) تحديث `MainActivity.java:28` لتصبح `SAFETY_FAILSAFE_MS = ceil(native_guard_ms * 1.30)` (فائض 30% لضمان استيفاء شرط +20%).
  - (3) تعليق/توثيق السبب في الملف مباشرة.
  - (4) تشغيل `npm run guard:native-foundation` للتأكد من عدم كسر الحارس.
- **Acceptance Criteria Addressed**: AC-01, AC-00
- **Test Requirements**:
  - `rule` TR-2.1: `SAFETY_FAILSAFE_MS >= ceil(max_native_guard_ms * 1.20)` عدّادياً. الدليل: grep السطرين بالقيم الجديدة + نسبة محسوبة
  - `rule` TR-2.2: `npm run guard:native-foundation` يخرج 0. الدليل: output
  - `rule` TR-2.3: `git status --porcelain` نظيف بعد commit. الدليل: output
- **Notes**: هذا commit بسيط سريع — Conventional: `fix(android-boot): align native failsafe timeout to exceed web boot guard by 30%`

## Task 3: AppTheme فاتحة → إضافة windowBackground صريح + طبقة الفشل #000→#0a0f1c
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) في [styles.xml](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/android/app/src/main/res/values/styles.xml): داخل `<style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">` إضافة سطر `<item name="android:windowBackground">@color/splash_background</item>` (أو أي parent theme محايد بدون تغيير ألوان واجهة).
  - (2) تحديث سمة `<style name="AppTheme.NoActionBar">` أيضاً للتأكد من أن windowBackground موجودة (إن كانت غائبة).
  - (3) في `public/hami-boot.js` السطر 311: تغيير `background:#000` → `background:#0a0f1c` في failure overlay string.
  - (4) الاحتفاظ بكل الألوان الأخرى كما هي.
- **Acceptance Criteria Addressed**: AC-02, AC-00
- **Test Requirements**:
  - `rule` TR-3.1: styles.xml يحتوي `windowBackground` صريح في `AppTheme` يرمز إلى `#0A0F1C` (أو ما يوافقه). الدليل: grep fragment
  - `rule` TR-3.2: `grep "background:" public/hami-boot.js | grep -c "#000"` == 0 في سطر failure overlay. الدليل: grep output
  - `rule` TR-3.3: `gate:wave0` يمر. الدليل: output
- **Notes**: Commit: `fix(boot-flash): AppTheme windowBackground explicit + failure overlay color unify to navy`

## Task 4: minifyEnabled=true في build.gradle block release
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) التعديل على `android/app/build.gradle` سطر release block: `minifyEnabled = true`
  - (2) التأكد من وجود `proguardFiles` الفعلية في السطر التالي كما هي (لا تُغير قواعد proguard).
  - (3) تشغيل `guard:native-foundation`.
- **Acceptance Criteria Addressed**: AC-03, AC-00
- **Test Requirements**:
  - `rule` TR-4.1: grep `minifyEnabled` في build.gradle release block: `true`. الدليل: fragment
  - `rule` TR-4.2: guard:native-foundation يمر + gate:wave0 يمر
- **Notes**: Commit: `chore(android): enable R8 minify in release builds`

## Task 5: meta CSP صريحة في index.html وhq.html مطابقة لـ contentSecurityPolicy
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) قراءة سطور [contentSecurityPolicy.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/api/security/contentSecurityPolicy.ts#L8) 8-47 للإنتاج PROD.
  - (2) إضافة `<meta http-equiv="Content-Security-Policy" content="…">` في `<head>` index.html بعد theme-color مباشرة (لا تحجب سكربتات تحميل الأصلية hami-boot.js، وتضم الكلمات المفتاحية: object-src 'none', base-uri 'self', frame-ancestors 'none', upgrade-insecure-requests, script-src 'self' https://js.sentry-cdn.com script-src-attr 'none'. ضع `style-src` بما يتناسب مع وضع meta دون كسر Tailwind).
  - (3) نفس العملية في hq.html في قسم head مع نفس السياسات.
  - (4) تشغيل `npm run guard:security-headers` و`npm run typecheck`.
- **Acceptance Criteria Addressed**: AC-04, AC-00
- **Test Requirements**:
  - `rule` TR-5.1: grep `<meta.*Content-Security-Policy` في index.html و hq.html: واحد في كل منهما. الدليل: output
  - `rule` TR-5.2: grep للميتا يحتوي `object-src`, `base-uri`, `frame-ancestors`, `upgrade-insecure-requests`, `script-src 'self'`. الدليل: output
  - `rule` TR-5.3: guard:security-headers يمر + gate:wave0 يمر
- **Notes**: Commit: `fix(security): add meta CSP to index/hq for WebView native coverage`

## Task 6: إغلاق fail-open الحراس + guard-tracked-secrets .env* شامل
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) `guard-dist-no-sourcemaps.mjs:20-22`: عند غياب dist → exit 1 لا exit 0. إضافة رسالة خطأ واضحة "BUILD_ARTIFACT_MISSING".
  - (2) `guard-dead-exports.mjs:190-192`: عند غياب baseline → exit 1 لا exit 0، مع رسالة تشرح كيف تولده (`--save`).
  - (3) تسعة الحرّاس ratchet التي auto-save عند غياب baseline: شرط `process.env.CI === 'true'` → تخطّي auto-save و exit 1 بدلاً من الكتابة. التسعة: guard-tsc-ratchet (س81), guard-lint-ratchet (س90), guard-test-ratchet (س81), guard-ts-nocheck-ratchet (س62), guard-import-cycles (س299), guard-dead-modules (س206-209), guard-duplicate-logic (س105), guard-screen-closure-weight (س161), guard-source-path-references (س94).
  - (4) `guard-tracked-secrets.mjs`: توسيع BLOCKED list من 3 ملفات إلى regex عام: `^\\.env(?:\\..+)?$` مع استثناء صريح لـ `\\.env\\.example$` و `\\.env\\.production\\.example$`. وإضافة مسار فرعي `^hami/\\.env$`.
- **Acceptance Criteria Addressed**: AC-05, AC-06, AC-00
- **Test Requirements**:
  - `rule` TR-6.1: محاكاة غياب dist مع guard-dist-no-sourcemaps → exit != 0. الدليل: تشغيل اختبار تجريبي مع tmp dir
  - `rule` TR-6.2: محاكاة غياب baseline (مؤقتًا: نقل baseline ثم التشغيل على CI=true) → exit != 0 في كلًا من التسعة الحرّاس + guard-dead-exports
  - `rule` TR-6.3: guard-tracked-secrets مع وجود ملف مؤقت .env.development.local ثم الحذف بعد الاختبار: يكتشفه ولا يمرّ
  - `rule` TR-6.4: gate:wave0 يمر في وضع عدم المحاكاة (baselines موجودة، dist يولد بعد build)
- **Notes**: Commit: `hardening(guards): fail-close on missing dist/baselines; tracked-secrets cover all .env*`

## Task 7: quality-gate.yml test:security + e2e-boot merged
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) قراءة quality-gate.yml الحالي وboot-e2e.yml + lawsuits-gate.yml patterns.
  - (2) إضافة job أو step داخل quality-gate.yml:
    - (أ) step `npm run test:security` بعد guard:tests مباشرة (قبل build:vercel).
    - (ب) job e2e-boot مُدمج مطلوب (required check) داخل quality-gate.yml باستخدام workflow_run مستقل أو step مُضمَّن (build:e2e + test:e2e:boot مع VITE_SHELL_AUTH_OPEN='false' للمسار fail-closed الإنتاجي — مهم جداً: لا 'true').
  - (3) الحفاظ على concurrency و cancel-in-progress الحاليين.
  - (4) لا تحذف workflows القديمة boot-e2e.yml (تبقى path-filtered كنسخة رديء).
  - (5) تشغيل أمر التحقق من تغطية الحرّاس: `guard:ci-covers-guards`.
- **Acceptance Criteria Addressed**: AC-07, AC-00
- **Test Requirements**:
  - `rule` TR-7.1: grep `test:security` في quality-gate.yml: واحد. الدليل: output
  - `rule` TR-7.2: grep `test:e2e:boot` أو `e2e-boot` داخل quality-gate.yml موجود. الدليل: output
  - `rule` TR-7.3: VITE_SHELL_AUTH_OPEN في job e2e الجديد يساوي 'false' تحديداً. الدليل: grep
  - `rule` TR-7.4: guard:ci-covers-guards يمر + gate:wave0 يمر
- **Notes**: Commit: `ci(quality-gate): integrate test:security + fail-closed boot-e2e`

## Task 8: clientEnv fallback info.ts bound strictly to MODE=development only
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) تعديل [clientEnv.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/utils/clientEnv.ts) شرط السقوط devFallback: أي شرط يحتوي `PROD !== true` أو `!PROD` استبداله بـ `MODE === 'development'` صريح وحيد.
  - (2) إضافة شرط إضافي: إن كانت VITE_SUPABASE_URL فارغة في MODE غير development → رمي خطأً واضح "Production build requires real SUPABASE env; refused to start".
  - (3) تشغيل `npm run guard:supabase-info-boundary` و`npm run build:vercel` و`npm run guard:dist-client-env`.
- **Acceptance Criteria Addressed**: AC-08, AC-00
- **Test Requirements**:
  - `rule` TR-8.1: grep clientEnv.ts لا يحتوي `PROD!==true` أو `!PROD` فقط كنقطة قرار للسقوط إلى info.ts؛ فقط `MODE==='development'`. الدليل: grep output
  - `rule` TR-8.2: build:vercel يمر + guard:dist-client-env يمر
  - `rule` TR-8.3: guard:supabase-info-boundary يمر + gate:wave0 يمر
- **Notes**: Commit: `hardening(boundary): info.ts dev fallback strictly MODE=development`

## Task 9: allowNavigation + hardwareAccelerated + webContentsDebuggingEnabled صريحة في Capacitor (مجموعة إعدادات واضحة)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - (1) في [capacitor.config.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/capacitor.config.ts) الكائن `server` إضافة `allowNavigation: ['self']` (أو [] حسب أفضل ممارسة Capacitor للسماح بالتنقل المحلي فقط).
  - (2) إضافة `android.hardwareAccelerated: true` كإعداد منفصل صريح.
  - (3) إضافة `android.webContentsDebuggingEnabled: false` صريح لتجنب السلوك الضمني.
  - (4) في `AndroidManifest.xml` إضافة `android:hardwareAccelerated="true"` في application كـ explicit override ثنائي.
  - (5) تشغيل `guard:native-foundation`.
- **Acceptance Criteria Addressed**: AC-25 (جزء), AC-00
- **Test Requirements**:
  - `rule` TR-9.1: capacitor.config.ts يحتوي `allowNavigation` صريح + hardwareAccelerated صريح + webContentsDebuggingEnabled:false. الدليل: grep
  - `rule` TR-9.2: AndroidManifest.xml يحتوي android:hardwareAccelerated صريح. الدليل: grep
  - `rule` TR-9.3: guard:native-foundation يمر + gate:wave0 يمر
- **Notes**: Commit: `hardening(capacitor): explicit allowNavigation/hw-accel/debug-settings`

---

## المرحلة 2: الإطار صفر + حجب الخيط الرئيسي

## Task 10: Memoization لـ peekBootSessionUserId (≤1 scan/process)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) في `peekBootSessionUserId.ts` تعريف متغير على مستوى الوحدة `let cachedPeek: BootSessionPeek | null | undefined` (undefined = لم نقم بالمسح بعد؛ null = تم المسح ولا يوجد جلسة؛ object = نتيجة مجزأة).
  - (2) `readBootSessionPeek()` أولاً إذا `cachedPeek !== undefined` تعيده مباشرة؛ غير ذلك تنفذ المسح وتخزّن النتيجة.
  - (3) لا إضافة invalidation logic (dعند الحاجة لها من مسارات تسجيل الخروج يُضاف لاحقاً داخل مسار تسجيل الخروج نفسه فقط، لا في هذه المرحلة).
- **Acceptance Criteria Addressed**: AC-09 (جزء), AC-00
- **Test Requirements**:
  - `rule` TR-10.1: `for (let i = 0; i < localStorage.length; i += 1)` المسح الكمي يُنفِّذ مرة واحدة واحدة فقط عند تشغيل `peekBootSessionUserIdSync()` مرتين متتاليتين في اختبار صفري. الدليل: مقطع الكود الجديد
  - `rule` TR-10.2: gate:wave0 يمر + build لا يحتوي أخطاء
- **Notes**: Commit: `perf(boot): memoize peekBootSession to single full-localStorage scan`

## Task 11: نقل peekHomeHubBootHasItems خارج render (HomeHubCardSkeleton + استخدامه الصحيح hasItems)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 10
- **Description**:
  - (1) `HomeHubCardSkeleton.tsx`: استدعاء `peekHomeHubBootHasItems()` يُخزَّن في `useMemo` مع مصفوفة تبعيات فارغة — `const hasItems = useMemo(peekHomeHubBootHasItems, [])`.
  - (2) الشرط الآن `hasItems ? (skeleton للتنبيهات بنفس 88px الخارجي ولا أي تغيير بصري) : (EmptyState الحالي)`.
  - (3) تغيير المحتوى الداخلي فقط: إذا كان true تعرض skeleton lines/placeholders لا "لا توجد عناصر". **الغلاف الخارجي: exact same heights/colors/spacing**.
  - (4) لا تغيير أي سمة tailwind على العناصر الهيكلية أو الألوان أو المسافات الخارجية.
- **Acceptance Criteria Addressed**: AC-09 (جزء — خارج render), AC-11, AC-00, AC-27
- **Test Requirements**:
  - `rule` TR-11.1: جسم المكوّن لا يحتوي استدعاء peek مباشرة — فقط داخل useMemo callback. الدليل: fragment الملف
  - `rule` TR-11.2: wrapper height 88px ثابت في الحالتين (hasItems=true/false). الدليل: grep `min-h`/`height` أو style
  - `rule` TR-11.3: hasItems=true يعرض skeleton وعند false EmptyState الحالي. الدليل: fragment JSX
  - `rubric` TR-11.4: AC-27 Visual freeze dimension; scale 1-5; anchors 1=اختلاف بصرية واضحة; 3=تغيير طفيف في إطار داخلي واحد فقط; 5=صفر اختلاف بكسل في الغلاف الخارجي وA11y attributes الحالية محفوظة؛ threshold=5; evidence=قبل/بعد screenshots e2e لـ 3 شاشات لوحة المحامي
  - `rule` TR-11.5: gate:wave0 يمر
- **Notes**: Commit: `perf(clarity): move peekHomeHubHasItems into useMemo + correct skeleton selection`

## Task 12: securePersistStorage — parse واحد لكل payload + de-dupe الأربع
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) `securePersistStorage.ts`: إعادة بناء defaultPersistWipeGuard: `JSON.parse(incomingRaw || 'null')` مرة واحدة → stored as `const inParsed = ...`، ثم استخراج subFiles و linkedDossiers منه.
  - (2) نفس الشيء لـ existingRaw → واحد parse.
  - (3) إعادة استخدام الدالة countArrayItemsInPersistPayload بدون تغيير توقيعها.
- **Acceptance Criteria Addressed**: AC-10, AC-00
- **Test Requirements**:
  - `rule` TR-12.1: within defaultPersistWipeGuard → ≤2 occurrences of JSON.parse ليس أكثر. الدليل: grep JSON.parse scope
  - `rule` TR-12.2: test:run يمر + gate:wave0 يمر
- **Notes**: Commit: `perf(persist): single JSON.parse per payload instead of 4 in wipeGuard`

## Task 13: applyBootSurfacePaintFromStorage — single call site + bootEntryPreamble duplicate removed
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - (1) قارن الاستدعاء في `src/index.tsx:13` مقابل `src/boot/bootEntryPreamble.ts:14`.
  - (2) حذف أحد الاستدعائين. الإبقاء على موقع أبكر عموماً (الذي يأتي أولاً في تسلسل الإقلاع) وحذف الثاني.
  - (3) تأكد من أن `persistBootSurfacePaintFromDom` يُستدعى لاحقاً في نقطة واحدة فقط بعد boot-reveal، وليس قبل.
- **Acceptance Criteria Addressed**: AC-13, AC-00
- **Test Requirements**:
  - `rule` TR-13.1: `grep -c "applyBootSurfacePaintFromStorage"` كامل src/ = 1 (واحد). الدليل: output
  - `rule` TR-13.2: gate:wave0 يمر
- **Notes**: Commit: `perf(boot): single boot surface paint read site; eliminate duplicate`

## Task 14: caseStore partialize دقيق يقلل حجم الحمولة
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - (1) قراءة `stores/executionDashboardStore.ts:145` كمثال نموذجي جيد للـpartialize الحالي.
  - (2) في `caseStore.ts` إضافة `partialize: (s) => ({ ... نصف الحقول الـessential فقط مثلاً: cases, activeCaseId, filters, lastSyncAt, version })` — لا أقل ولا أكثر؛ مبلغ الحقول لا يتجاوز 6.
  - (3) تشغيل `test:run` للتأكد من أن الاختبارات التي تعتمد على persist caseStore تمرّ.
- **Acceptance Criteria Addressed**: AC-14, AC-00
- **Test Requirements**:
  - `rule` TR-14.1: `partialize` موجودة في options persist لـ caseStore، وعدد مفاتيح العائد ≤6. الدليل: grep fragment
  - `rule` TR-14.2: test:run يمر + gate:wave0 يمر
- **Notes**: Commit: `perf(persist): caseStore partialize with narrowed persisted keyset`

## Task 15: SecureStoreService side-effect import-level → مؤجل requestIdleCallback أو بعد markBootRevealDone
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) حذف السطور `SecureStoreService.ts:1986-1988` التأثير الجانبي على مستوى الوحدة.
  - (2) تعريف دالة صادرة جديدة `export function bootSecureStoreShellSync(): void { SecureStoreService.kickoffBootShellSync(); }`.
  - (3) استدعاءها إما من `bootReveal.ts` داخل `markBootRevealDone()` بعد السطر 130 (بعد إزالة `data-hami-initial-boot`)، أو من داخل `requestIdleCallback` بعد boot-reveal مع idle timeout fallback إذا لم يُدعَ خلال 2000ms. اختر الأقرب والأقل تدخلاً.
- **Acceptance Criteria Addressed**: AC-15, AC-00
- **Test Requirements**:
  - `rule` TR-15.1: grep `SecureStoreService.kickoffBootShellSync` عند آخر الملف (import-level side-effect) = 0. الدليل: grep
  - `rule` TR-15.2: grep الملف يحتوي `export function bootSecureStoreShellSync` صريحاً. الدليل: grep
  - `rule` TR-15.3: استدعاء جاهز صريح في bootReveal.ts أو مكان مسار إقلاع مناسب آخر. الدليل: grep site
  - `rule` TR-15.4: gate:wave0 يمر + build:vercel يمر
- **Notes**: Commit: `perf(boot): defer SecureStoreService warm migration out of import-time side effect`

## Task 16: homeBootChrome busy-poll 16ms → استبدال بـ MutationObserver/boot listeners + memoized peeks + shouldPreloadLawyerBoard memoized
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 10
- **Description**:
  - (1) استبدال حلقتا polling بفاصل 16ms في `homeBootChrome.ts:35-41,50-56` باستخدام `addEventListener(BOOT_REVEAL_DONE_EVENT, …)` من `bootstrap/bootReveal` إذا كانا ينتظران boot-reveal؛ أو استخدامهما `MutationObserver` على `documentElement` لسمات `data-hami-*` المقابلة للشروط.
  - (2) السطور 72-73 في نفس الملف: استدعاء peek مكرر — تبقى مرة واحدة فقط (الثانية محذوفة تماماً).
  - (3) نقل النتيجة لـ memoized من Task 10 كضمان.
  - (4) `shouldPreloadLawyerBoard.ts` إذا كانت الدالة تستدعى أكثر من 2 مرات: إضافة memoization بنفس نمط Task 10.
- **Acceptance Criteria Addressed**: AC-16, AC-00
- **Test Requirements**:
  - `rubric` TR-16.1: Dimension main-thread wakeup reduction; scale 1-5; 1=الحلقتان بقايا كما هو; 3=حلقة واحدة فقط مستبدلة مع 16ms polling الأخرى لازالة; 5=الحلقتان مستبدلتان كاملًا بـ listeners/observers، وmemoization مطبق على كل peek داخلهما; threshold>=4; evidence=السطور الجديدة + grep polling setInterval occurrences
  - `rule` TR-16.2: `grep -c "setInterval\|setTimeout.*16" homeBootChrome.ts` = 0 (أو عدّها 0 إن استُبدلت بالكامل). الدليل: output
  - `rule` TR-16.3: gate:wave0 يمر
- **Notes**: Commit: `perf(boot): replace 16ms busy-polls with boot events; full memoize peeks`

## Task 17: unregisterSyncHandler + cleanup in effect cloud sync
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - (1) إضافة `unregisterSyncHandler(bucket: CloudSyncBucketId): void` في المتجر `cloudSyncStatusStore.ts`، مع السلوك: حذف المفتاح من `syncNowHandlers`.
  - (2) `LawyerDashboardBackgroundServices.tsx:260-275` effect المسجِّل: إضافة `return () => { unregisterSyncHandler('notes'); unregisterSyncHandler('lawsuit'); unregisterSyncHandler('execution'); }`.
  - (3) التحقق من عدم إعادة التسجيل بشكل متكرر: تأكد أن `registerSyncHandler` السلوك يستبدل فقط نفس الـ bucket (لا تزايد عدد الحوارات إذا mount/unmount متكرر).
- **Acceptance Criteria Addressed**: AC-12, AC-00
- **Test Requirements**:
  - `rule` TR-17.1: `unregisterSyncHandler` صادرة ومُعرَّفة في المتجر. الدليل: grep
  - `rule` TR-17.2: effect المسجِّل يعيد دالة تنظيف تستدعي unregisterSyncHandler للثلاثة buckets. الدليل: fragment
  - `rule` TR-17.3: gate:wave0 يمر + test:run يمر
- **Notes**: Commit: `fix(memory): unregister cloud sync handlers on effect cleanup`

---

## المرحلة 3: سلامة البيانات + النسخ الاحتياطي

## Task 18: لفّ المفتاح الرئيسي (non-extractable) + تشفير لقطات النسخ الاحتياطي
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) قراءة [CryptoService.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/CryptoService.ts) كاملًا 1-1992 تحديدًا الاستيراد/الحفظ/استرجاع master-key في IndexedDB.
  - (2) استخدام `crypto.subtle.wrapKey` مع `extractable: false` عند استيراد المفتاح الرئيسي إلى WebCrypto، مع تسلسله في `hami-crypto-keystore` فقط في شكل wrapped.
  - (3) استراتيجية Backward compat: مفتاح خام قديم موجود → ترقيته تلقائيًا إلى wrapped في أول قراءة.
  - (4) ملف dossierBackupStore.ts: أي لقطة تكتب إلى `hami-dossier-backups` تكون مشفّرة بمفتاح مشتق (HKDF) من المادة السرية لكل مستخدم + ختم HMAC-SHA256 لكل لقطة.
  - (5) استراتيجية ترقية النسخ القديمة plaintext: عند أول قراءة بعد التحديث → إعادة تشفير كلها على الدفعة مع progress (لا حجب الخيط الرئيسي).
- **Acceptance Criteria Addressed**: AC-17, AC-00
- **Test Requirements**:
  - `rubric` TR-18.1: Dimension key/backup safety; scale 1-5; 1=لا تغيير; 3= إما key-wrapped فقط أو backup-encrypted فقط; 5= master-key non-extractable + auto-upgrade plaintext backups → encrypted with per-user HKDF + HMAC seal; threshold>=4; evidence=CryptoService كود الجديد + dossierBackupStore كود الجديد + test:security يمر
  - `rule` TR-18.2: `grep "extractable:\s*true"` داخل CryptoService scope store master-key = 0. الدليل: grep
  - `rule` TR-18.3: setItem أو put في dossierBackupStore يمر عبر encrypt قبل الكتابة. الدليل: fragment
  - `rule` TR-18.4: test:security يمر + gate:wave0 يمر
- **Notes**: Commit: `hardening(crypto): wrap master-key non-extractable; encrypt backup at-rest`

## Task 19: Resurrection filter — استعادة workCloudCheckpoint + businessBackupImport فلاتر tombstones لـ execution/notes
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) قراءة `workCloudCheckpoint` مسار الاستعادة في ملفاته المختلفة (ملف checkpoint، BFF `/api/work-checkpoints`).
  - (2) قبل أي `INSERT` أو `upsert` إلى الجداول ذات الصلة execution/notes: فلتر `isTombstone === true` أو `deletedAt != null` أو السمة tombstone المميزة وفق نمط المشروع الحالي.
  - (3) نفس الفلتر في `businessBackupImport.ts`.
  - (4) لا يُحدِث أي تغيير في JSON schema للقطة أو الملفات المُصدَّرة — فقط فلتر وقت الاستيعاب.
- **Acceptance Criteria Addressed**: AC-18, AC-00
- **Test Requirements**:
  - `rule` TR-19.1: مسار workCloudCheckpoint restore: شرط tombstone filter قبل insert/upsert للـ execution/notes. الدليل: fragment
  - `rule` TR-19.2: businessBackupImport نفس الفلتر. الدليل: fragment
  - `rule` TR-19.3: test:run يمر + gate:wave0 يمر
- **Notes**: Commit: `fix(backup): tombstone filter on cloud/business restore; no resurrection`

## Task 20: الحذف السحابي fire-and-forget → promise/await مع logging + outbox مع retries و drift detection
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) ملف `useLawsuitFileMutations.ts:124` + `useLawyerExecutionFiles.ts:604`: التحويل من `void deleteCloud(...)` إلى `await deleteCloud(...)` مع try/catch يضيف failed-delete to outbox أو يُسجّل breadcrumb في Sentry مع retry دائرة 3 محاولات exponential.
  - (2) إضافة reconciler دوري (كل 10 دقائق أو عند تشغيل التطبيق بعد الـboot) يفحص جدول pending-deleted ويُعيد المحاولة. إن استمر الفشل لأكثر من 24 ساعة → يرفع alert في حقل state "drift-detected" يظهر للمستخدم داخل الحزمة كـ"انتقام قيد الانتظار" ولا يحذف المحلي.
- **Acceptance Criteria Addressed**: AC-19, AC-00
- **Test Requirements**:
  - `rubric` TR-20.1: Dimension cloud-delete reliability; scale 1-5; 1=fire-and-forget كما هو; 3=تحويل لـ await مع try/catch و logging + retry 1; 5=outbox row + periodic reconciler + drift detection 24h with visible status; threshold>=4; evidence=ملفات الطرفين المعدّلة + new outbox schema (إن وجد)
  - `rule` TR-20.2: `grep "void deleteCloud" | grep -c "//"` (أو أي شكل void غير متعمد) = 0 في هذه المواقع. الدليل: grep
  - `rule` TR-20.3: gate:wave0 يمر
- **Notes**: Commit: `fix(reliability): cloud delete outbox + retry + drift detection`

---

## المرحلة 4: انضباط الطبقات المعمارية

## Task 21: ESLint no-restricted-imports — 3 قواعد + حارس جديد في gate:wave0 بـ baseline ratchet يتناقص فقط
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) إضافة قواعد no-restricted-imports 3 إلى ESLint config الحالي لـ:
    - (أ) `src/app/api/**` يحظر استيراد أي مسارات تحتوي على `components/`, `hooks/`, `runtime/`, `bootstrap/`؛ يسمح فقط بمسارات ضمنية security-types-shared-infrastructure.
    - (ب) `src/app/services/**` يحظر استيراد `components/`, `hooks/`, `runtime/`, `bootstrap/`.
    - (ج) `src/app/domain/**` + `src/app/application/**` يحظر استيراد `components/`, `services/`, `runtime/`.
  - (2) إنشاء حارس جديد `scripts/guard-architecture-boundaries.mjs` يعمل كـ ratchet: يشغّل ESLint على تلك المجلدات ويقارن عدد الانتهاكات ب`.audit/architecture-boundaries-baseline.json` ويرفض أي زيادة، ويسمح بالانخفاض.
  - (3) إنشاء الـbaseline الأولي بنumbers الحالي، وإضافة الحارس إلى آخر `gate:wave0` في package.json (لربطه بالسلسلة).
  - (4) تشغيل gate:wave0 للتأكد من مرّه مع الـbaseline الجديد.
- **Acceptance Criteria Addressed**: AC-20, AC-00
- **Test Requirements**:
  - `rule` TR-21.1: ESLint config تحتوي 3 no-restricted-imports صريحة للمسارات المذكورة. الدليل: eslintrc fragment
  - `rule` TR-21.2: guard-architecture-boundaries.mjs موجود ويثير exit code !=0 عند إضافة انتهاك جديد وتضييع baseline. الدليل: test تجريبي زائد الكود الجديد
  - `rule` TR-21.3: baseline جديد .audit/architecture-boundaries-baseline.json منشأ والحارس مضاف إلى gate:wave0. الدليل: package.json gate:wave0 السطور
  - `rule` TR-21.4: gate:wave0 يمر
- **Notes**: Commit: `arch(guards): add layer boundary ESLint rules + ratchet guard`

---

## المرحلة 5: توحيد الأحداث + الـ loaders/hydrators + تنضيف الملفات + تبعيات npm

## Task 22: dashboardInteractiveEvent + app-runtime-ready أسماء ثوابت واحدة في جميع الموقعَين (~42 + 5)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) تعريف `DASHBOARD_INTERACTIVE_EVENT` موجود في `dashboardInteractiveMark.ts:6` — هو المصدر. تعريف `APP_RUNTIME_READY_EVENT` أو استخدامه من `bootEventNames.ts` موجود.
  - (2) استبدال كل `'hami:dashboard-interactive'` الحرفي بـ `DASHBOARD_INTERACTIVE_EVENT` المستورد من dashboardInteractiveMark.ts (تأكد من import في كل ملف). الاستثناء الوحيد: تعريف الثوابت نفسه.
  - (3) استبدال كل `'hami:app-runtime-ready'` الحرفي بالثابت الصحيح من `bootEventNames.ts` أو تعريفه إن لم يكن.
  - (4) الـ 12 hydrator + overlayLayerHygiene + staggeredBootOrchestrator المحلي يبقى فقط import الثابت.
- **Acceptance Criteria Addressed**: AC-21 (جزء), AC-00
- **Test Requirements**:
  - `rule` TR-22.1: `grep -rn "'hami:dashboard-interactive'" --include=*.ts --include=*.tsx src/` == 0 أو يعيد تعريف الثابت فقط. الدليل: grep output
  - `rule` TR-22.2: `grep -rn "'hami:app-runtime-ready'" --include=*.ts --include=*.tsx src/ public/` == 0 عدا تعريف الثابت. الدليل: grep output
  - `rule` TR-22.3: gate:wave0 يمر
- **Notes**: Commit: `refactor(events): single source boot event literals; eliminate 42 string duplicates`

## Task 23: data-hami-* ثوابت مركزية + ملف ثوابت موحّد + توليد نسخة لـhami-boot.js
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - (1) إنشاء ملف `src/app/bootstrap/dataHamiAttrs.ts` مع `export const HAMI_ATTR_X = 'data-hami-...'` لكل سمة (~25).
  - (2) استبدال جميع السمات الحرفية في JS/TS/TSX بالثوابت المستوردة.
  - (3) إنشاء سكربت sync مُضاف إلى `scripts/` أو توسيع سكربت موجود: `scripts/generate-hami-boot-attrs.mjs` يُخرِج أسماء الثوابت بصيغة `const { … } = { 'data-hami-app-locked':'…' }` إلى `public/hami-boot.js` (أو يضيفها في الجزء العلوي من الملف كـ header section). الهدف: الحد من ازدواجية أسماء السمات بين vanilla JS و TS.
  - (4) إضافة سكربت الـgenerate إلى post-install أو pre-build في package.json أو كـ gate:checkpoint صغير يفحص عدم الانحراف مع guard:ci-covers-guards (إن لزم).
- **Acceptance Criteria Addressed**: AC-21 (جزء), AC-00
- **Test Requirements**:
  - `rule` TR-23.1: ملف dataHamiAttrs.ts موجود ويمتلك ≥20 ثابتًا. الدليل: وجود الملف
  - `rule` TR-23.2: `grep -rn "data-hami-[a-z-]*=" --include=*.tsx --include=*.ts src/app/` داخل جمل شرط strings: عدد صفر أو صغير جدًا (بضعة مواقع فقط) في سطور بناء strings dynamic؛ استبدال كامل الساكن بالثوابت. الدليل: grep
  - `rule` TR-23.3: hami-boot.js يحتوي نسخة من أسماء الثوابت (مُولَّدة بلا edit يدوي هش). الدليل: grep الـ generated comment في hami-boot.js
  - `rule` TR-23.4: gate:wave0 يمر
- **Notes**: Commit: `refactor(attrs): centralize 25+ data-hami attributes; sync hami-boot.js generated header`

## Task 24: Loader/Hydrator correctness fixes (SETTINGS dispatch double, repository prefetch order, profileInstantPaint scope, 11 hydrators wave, communityHubLoader dynamic, dashboardSurfaceWarm dead-code removal or flag)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 22
- **Description**:
  - (1) SETTINGS_SHELL_HYDRATED_EVENT double dispatch: تحديد أحد موقعي (`settingsBootHydrator` أو `hamiSettingsLoader.adoptSettingsModule`) — واحد يُطلِق والآخر يُحذف استدعائه.
  - (2) `repositoryBootHydrator`: `prefetchRepositoryAfterBootReveal` يُنقَل إلى داخل استجابة حارس `BOOT_REVEAL_DONE_EVENT` ليحدث بعد Reveal لا قبله.
  - (3) `profileInstantPaint` يزيل `data-hami-feature-open` — يُغيَّر الإزالة إلى السمات الخاصة بـ profile فقط لا العامة.
  - (4) 11 hydrator على نفس الحدث → تقسيم إلى موجتين: wave1 فورية للخدمات الأساسية، wave2 مؤجلة عبر `requestIdleCallback` مع مهلة احتياطي 1500ms (لا تغيير في النتيجة النهائية المرئية).
  - (5) `communityHubLoader`: استيراد CommunityScreen eager → dynamic `import()`.
  - (6) `src/app/runtime/dashboardSurfaceWarm.ts`: إذا كان 0 مستورد إنتاجي كما في التقرير → حذفه صراحةً وإعادة توليد dead-modules baseline بـ--save.
- **Acceptance Criteria Addressed**: AC-22, AC-00
- **Test Requirements**:
  - `rubric` TR-24.1: Dimension loader/hydrator correctness; scale 1-5; 1=لا تغيير; 3= 2-3 بنود من الستة; 5=جميع البنود الستة مستحقة كما هو مذكور، وguard:dead-modules يمر بعد حذف dashboardSurfaceWarm مع تحديث baseline; threshold>=4; evidence=الملفات المعدلة السطرية لكل بند
  - `rule` TR-24.2: SETTINGS_SHELL_HYDRATED_EVENT dispatch في موقع واحد فقط فقط في مسار الإقلاع. الدليل: grep occurrences
  - `rule` TR-24.3: communityHubLoader لا يستورد CommunityScreen بساكن (eager). الدليل: grep
  - `rule` TR-24.4: gate:wave0 يمر
- **Notes**: Commit: `fix(runtime): loader/hydrator order/scoping; wave split; remove dead warm`

## Task 25: npm dependencies — remove (vaul, embla), add sirv devDep, move 5 build-only to devDep, remove framer-motion line in vite.config, unify dompurify
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - (1) `npm uninstall vaul embla-carousel-react`
  - (2) `npm install -D sirv`
  - (3) نقل `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `tailwindcss-animate` من dependencies إلى devDependencies في package.json (النقل اليدوي أو عبر npm pkg set، بعد ذلك `npm install` مجدداً لإعادة بناء lock).
  - (4) في vite.config.mts السطر ~394 `/framer-motion/` classification line: حذفه.
  - (5) توحيد dompurify: استبدال `isomorphic-dompurify` في `api/security/sanitizer.ts` باستخدام `dompurify` نفسها + `jsdom` داخل دالة إعداد للخادم أو stub (`nodeDomPurifyStub.ts` الموجود). إن لم يكن كافياً، إبقاء isomorphic فقط مع إزالة `dompurify` العميل أو العكس حسب قرار أفضل ممارسة، ثم حذف واحدة فقط.
  - (6) تشغيل `npm run typecheck && npm run lint && npm run build && npm run gate:wave0`
- **Acceptance Criteria Addressed**: AC-24, AC-00
- **Test Requirements**:
  - `rule` TR-25.1: package.json dependencies لا يحتوي `vaul` ولا `embla-carousel-react`. الدليل: grep
  - `rule` TR-25.2: sirv موجود فقط في devDependencies. الدليل: grep
  - `rule` TR-25.3: الخمسة build-only (vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, tailwindcss-animate) في devDependencies لا dependencies. الدليل: grep
  - `rule` TR-25.4: vite.config.mts لا يحتوي '/framer-motion/' كـ classification string. الدليل: grep
  - `rule` TR-25.5: إما dompurify وحدها أو isomorphic وحدها لا كليهما. الدليل: package.json grep
  - `rule` TR-25.6: gate:wave0 يمر + build:vercel يمر
- **Notes**: Commit: `chore(deps): prune unused; add sirv; move build-only; unify DOMPurify`

## Task 26: حذف الملفات الآمنة (~500 ملف) بتحقق قبل وبعد gate:wave0، مع الحفاظ على baselines + PHASE_* + WIFE_*
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 25
- **Description**:
  - (1) تنفيذ قائمة الحذف الآمن تفصيلياً:
    - (أ) `.audit/_tmp_*`, `_probe_*`, `probe-*`, `_split_*`, `_peel_*`
    - (ب) `batch-*.txt`, `tsc-*.txt`, `settings-e2e-*`, `gradle-*`, `_agent_*`, `*.log`, `*.png` (باستثناء لوحات/أيقونات داخل src/ وandroid res فقط، أي **هذا الحذف فقط على جذر المشروع و مجلدات tmp**)
    - (ج) `perf-reports/*` عدا الملفات المحددة في قائمة الإبقاء
    - (د) scripts المذكورة: `patch-slice*`, `fix-*`, `repair-*`, decode/dump/show-purge/unescape-purge, `_wire_*.py`, wave7m-*, trace-*, apply-layout-split, applyV11Patch.js, recovered*.patch cluster, tmp-orch-keys.json, chunk-scope, `_lite_lawsuit_visual_pass*`, *.ps1
    - (هـ) جذر: `div_balance_detail.js`, `nocheck-from-tsc.mjs`, `prod-boot-25s.png`, `tsconfig.tsbuildinfo`
    - (و) `hami/` بقايا Flutter (11 ملف)
  - (2) الاحتفاظ بـ: `.audit/verify-import-closure.mjs` + كل baselines، `WIFE_*_LATEST.json`, `PHASE_*`, `_chunk_connect_edges.json`, `scripts/_phone-body-keys.json`, `perf-budget.json`, `chunk-baseline.json`, `execution-coverage-matrix.md`, `hq.html`.
  - (3) المتنازع عليه الآن: **لا تحذف** (`.audit/*.md` ~195, `docs/archive/` ~230, `.trae/documents/`).
  - (4) بعد الحذف: تشغيل `node scripts/guard-source-path-references.mjs --save` إذا نال الحذف أي مسار تمت الإشارة إليه في baselines.
  - (5) `npm run guard:dead-modules && npm run gate:wave0`.
- **Acceptance Criteria Addressed**: AC-23, AC-00
- **Test Requirements**:
  - `rule` TR-26.1: وجود الملفات المحفوظة مضمون: ls للملفات الـ12 الإلزامية (`WIFE_*`, `PHASE_*`, baselines, `_chunk_connect_edges.json`) كلها موجودة. الدليل: ls output
  - `rule` TR-26.2: `find . -name "vaul*"` أو البحث عن نماذج المحذوف: العدد = 0 بعد الحذف. الدليل: find output
  - `rule` TR-26.3: guard:source-path-references يمر بعد --save (إذا لزم الأمر) + gate:wave0 يمر
  - `rule` TR-26.4: guard:dead-modules يمر + guard:dead-exports يمر
- **Notes**: Commit: `chore(cleanup): delete ~500 confirmed temp/dead files; preserve baselines`

---

## المرحلة 6: تشديد CI والأمان المتبقي + CLAUDE.md

## Task 27: تشديد طبقة الأمان المتبقية (rate-limits، CSRF logout، تقليم auth/session payload، SHA-256 RL، CSP report-uri، search_path/REVOKE على migrations)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 9
- **Description**:
  - (1) `auth/lawyer-verification/route.ts`: rate limit بسيط (5 طلبات في 10 دقائق لكل مستخدم + 10 لكل IP).
  - (2) `auth/logout/route.ts`: إضافة WIFE CSRF/same-origin check + rate limit (10 لكل جلسة في دقيقة).
  - (3) `public/readyz`: rate limit عام 60 طلب/دقيقة لكل IP.
  - (4) `auth/session/route.ts:61` payload: إزالة `identities` و`user_metadata` غير الضروريين من الرد — الاحتفاظ بمعرفات أساسية فقط لـ UI.
  - (5) `wifeRateLimitStore.ts`: استبدال `FNV-1a 32-bit` ب `SHA-256` أو `WebCrypto digest` سريع truncation إلى 128 بت لتجنب التصادمات.
  - (6) `contentSecurityPolicy.ts`: إضافة `report-uri /api/security/csp-violation` + `report-to csp-group` مع تعريف `Report-To` بسيط في wifeSecurityHeaders.ts (لا يحتاج مسار نهايي حقيقي الآن — يضبط لاحقاً، والهدف مجرد رصد في logs).
  - (7) `018_daily_auditor_cron_manual_setup.sql` الدالتين `schedule_daily_auditor_job` + `unschedule_daily_auditor_job`: إضافة `SET search_path = public, extensions, cron;` في بداية الدالة + `REVOKE ALL ON FUNCTION ... FROM PUBLIC;` التأكد `SECURITY DEFINER` محفوظ مع الأذونات المضبوطة.
  - (8) `cleanup_expired_wife_nonces()` نفس المعاملة: `SET search_path` + `REVOKE`.
  - (9) `forum_repository_docs_set_updated_at()` نفس المعاملة.
- **Acceptance Criteria Addressed**: AC-25, AC-00
- **Test Requirements**:
  - `rubric` TR-27.1: Dimension remaining security surface; scale 1-5; 1=لا تغيير; 3=4 من 8 البنود; 5=الثمانية جميعها كما هو مذكور; threshold>=4; evidence=سطور الملفات
  - `rule` TR-27.2: wifeRateLimitStore.ts لا يحتوي FNV-1a صريح. الدليل: grep
  - `rule` TR-27.3: SQL migrations الدوال الثلاث تحتوي SET search_path + REVOKE أو comment توثيقي إن SECURITY DEFINER يمنع. الدليل: grep
  - `rule` TR-27.4: auth/session response payload مفصوله (identities/user_metadata غير موجودة). الدليل: fragment
  - `rule` TR-27.5: gate:wave0 يمر + test:security يمر
- **Notes**: Commit: `hardening(security): remaining surface; rate limits; CSRF logout; SHA keys; CSP report; search_path`

## Task 28: إنشاء ملف CLAUDE.md في جذر المشروع
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1, Task 21 (للوصول إلى القواعد النهائية للطبقات)، Task 7 (لجودة CI النهائي)
- **Description**:
  - (1) إنشاء `CLAUDE.md` باللغة الإنجليزية (المتعارف عليه عالمياً في ملفات CLAUDE) مع الالتزام الكامل بالمسودة في تقرير التدقيق مع الإضافة:
    - Non-negotiables (4 عناصر كما هي)
    - Core commands (كل الأوامر الأساسية من package.json scripts: typecheck, lint, gate:wave0, guard:baseline --save, test:run, test:security, test:e2e:boot, build, build:hq, build:vercel, health, cap:apply:android, db:migrate)
    - Quality gates في CI (quality-gate, boot-e2e.yml, lawsuits-gate.yml, execution-gate.yml + Node من .nvmrc=24)
    - Architecture rules (قواعد الطبقات الجديدة من AC-20 plus ما ورد في المسودة)
    - Boot pipeline invariants (3 قواعد من المسودة + paint gate + failsafe order + zero sync-io inside render)
    - Data safety (3 قواعد: never plaintext dossier in IDB + tombstones before restore + cloud deletes through outbox)
    - Definition of done (typecheck + lint + gate:wave0 + test:run + test:security green; baselines unchanged or down; zero visual diff)
  - (2) عدم ذكر أي قيم env أو أسرار.
- **Acceptance Criteria Addressed**: AC-26, AC-00
- **Test Requirements**:
  - `rule` TR-28.1: ./CLAUDE.md موجود ويمتلك الأقسام السبعة. الدليل: ls output
  - `rule` TR-28.2: كل قسم يحتوي على النقاط الرئيسية (gate:wave0, test:security, cap:apply, Node 24, No sync I/O inside render, outbox deletes, tombstone filter). الدليل: grep للكلمات المفتاحية
  - `rule` TR-28.3: لا وجود لأي سلسلة تبدو كمفتاح أو قيمة سرية. الدليل: grep سريع بالكلمات 'sk-' 'SUPABASE_SERVICE' إلخ = 0
  - `rule` TR-28.4: gate:wave0 يمر (لأن هذا الملف لا يدخل في أي build — يحق له المرور بدون تأثير)
- **Notes**: Commit: `docs(claude): add CLAUDE.md with world-class dev rules; CI contract`

## Task 29: Visual regression final sweep مقارنة 20 شاشة + توقيع النجاح على AC-27 (rubric Visual Freeze)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 2 through 28
- **Description**:
  - (1) تشغيل e2e screenshots على الأقل 20 شاشة (dashboard auth, lawyer dashboard home, execution, lawsuit, vault, forum, calendar, tasks, archive, profile, settings, admin hq login, admin hq dashboard, print dossier views, offline banner, dialogs, toasts, boot splash overlay → total 20 screens) مقارنة قبل/بعد باستخدام مولد لقطات موجود في المشروع أو Playwright screenshots مسارية.
  - (2) تشغيل visual diff: صفر بكسل اختلاف في التخطيط والألوان والمسافات الخارجية. السماح فقط برسم خطوط skeleton داخل بطاقة Hub (Task 11 hasItems=true) والتي يجب أن تكون نفس مساحة الـ88px تماماً — وإن حدث اختلاف بالسطر الداخلي فقط ضمن الهيكل فهذا مقبول فقط عند score 4، ولا يقبل إلا 5 في هذه المهمة أي أن الهيكل ككل لا يتغير بكسل واحد.
- **Acceptance Criteria Addressed**: AC-27, AC-00
- **Test Requirements**:
  - `rubric` TR-29.1: Dimension strict visual freeze; scale 1-5; 1=اختلافات واضحة في >2 شاشة; 3=اختلاف بسيط في إطار داخلي واحد فقط ≤1 شاشة; 5=صفر اختلاف بكسل في 20 شاشة لأي غلاف/لون/مسافة خارجية + كل internal skeleton بنفس الأبعاد الصريحة؛ threshold=5 (لازم القيمة القصوى); evidence=ملفات screenshots قبل/بعد مسجلة في completion evidence مع أرقام تشغيل diff
  - `rule` TR-29.2: `npm run test:e2e:boot` يمر (إذا كان يمكن تشغيله محلياً). الدليل: output
  - `rule` TR-29.3: gate:wave0 يمر
- **Notes**: Commit (إن لزم تعديلات بسيطة لاستعادة التطابق) أو مجرد check بدون changes إذا تم الـ5 كاملًا. Evidence في completion evidence فقط.

## Task 30: Build final clean state — build:vercel, build:hq:vercel, guard:dist-* كلها + tag milestone
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 29 (الكل)
- **Description**:
  - (1) تشغيل تسلسل الإصدار الكامل: `npm run typecheck && npm run lint && npm run test:run && npm run test:security && npm run build:vercel && npm run build:hq:vercel && npm run guard:dist-secrets && npm run health:bundle && npm run gate:wave0`
  - (2) إذا أخرجه كلها أخضر → `git tag release-v10.5.0-tier1-hardened` رسمي.
  - (3) `git status --porcelain` نظيف.
- **Acceptance Criteria Addressed**: AC-00 (نهائي), جميع الـACs من فرض AC-00
- **Test Requirements**:
  - `rule` TR-30.1: الأوامر التسلسلية exit code 0. الدليل: output لكل أمر
  - `rule` TR-30.2: git status نظيف + release tag موجود. الدليل: git output
  - `rubric` TR-30.3: Dimension overall readiness (synthesis); scale 1-5; 1=لا يمر السلسلة; 3=يمر مع warnings قليلة من npm audit فقط; 5=السلسلة خضراء كاملة، no new warnings في أي خطوة; threshold>=4
- **Notes**: Evidence مجمّع نهائي.
