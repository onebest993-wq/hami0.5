# Hami Settings Tier-1 Zero-to-Production Honest Audit — Implementation Plan

## Task 1: فحص وتصحيح هوك useSettingsLifecycle + اختبارات Stale Closure
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة فعلية لسطر بسطر لملف [useSettingsLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/hooks/useSettingsLifecycle.ts)
  - اكتشاف وجود fallback timeout / async callback بدون نمط Session Guard (sessionIdCounter + sessionIdRef + activeSessionIdRef + guard داخل closure)
  - إصلاح محافظ ZVF
  - إضافة حالة اختبار جديدة تثبت رفض stale callbacks عند تبديل الجلسات بسرعة داخل [useSettingsLifecycle.test.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/hooks/__tests__/useSettingsLifecycle.test.ts)
  - تشغيل الاختبار وتسجيل النتيجة الصادقة
- **Acceptance Criteria Addressed**: AC-1, AC-14
- **Test Requirements**:
  - `rule` TR-1.1: نمط Session Guard كامل موجود داخل كل closure يؤدي إلى mark/report. Evidence: Read الأسطر + grep لـ sessionIdCounter داخل useSettingsLifecycle.ts
  - `rule` TR-1.2: الحالة الجديدة للاختبار "يرفض استدعاءات stale عند تبديل الجلسات بسرعة" تمر PASSED. Evidence: vitest verbose output
  - `rubric` TR-1.3: درجات تغطية useSettingsLifecycle.test.ts للحالات الأساسية + الحالة الجديدة. Scale 1-5. 1=0 حالات, 3=2-3 حالات, 5=5+ حالات. Threshold >= 4. Evidence: عدد it() blocks ممرّة
- **Notes**: أول مهمة لأنها تمس الدورة الحيوية (Interactive Reporting عند الفتح).

## Task 2: فحص وتصحيح هوك useSettingsHostLifecycle + مسار الفتح settingsShellOpenFlow
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة [useSettingsHostLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle.ts) سطر بسطر
  - قراءة [settingsShellOpenFlow.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow.ts) سطر بسطر للتأكد من أن clear يسبق open-request
  - اكتشاف أي ثغرة في host lifecycle: Stale Closure / missing cleanup / dynamic import.then بدون guard
  - إصلاح + تحديث اختبارات settingsShellOpenFlow.test.ts إن وجد gap
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-14
- **Test Requirements**:
  - `rule` TR-2.1: ترتيب clearSettingsPerfMarks ثم mark open-request صحيح في مسار الفتح الرسمي. Evidence: أسطر الدالة + grep عكسي (open قبل clear يجب أن يكون 0)
  - `rule` TR-2.2: useSettingsHostLifecycle يمتلك cleanup لجميع timers/observers خارج closure. Evidence: وجود cleanupActiveGuards أو نمط مكافئ
  - `rule` TR-2.3: settingsShellOpenFlow.test.ts PASSED بالكامل. Evidence: vitest verbose output

## Task 3: فحص طبقة المقاييس settingsPerfMetrics + settingsPerfBudget
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة [settingsPerfMetrics.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfMetrics.ts)
  - قراءة [settingsPerfBudget.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfBudget.ts)
  - التأكد من استخدام آخر mark (length-1)، ووجود Sentry reporter، و latch pattern لمنع report مكرر
  - تشغيل اختبارات المقاييس الرسمية
- **Acceptance Criteria Addressed**: AC-4, AC-14
- **Test Requirements**:
  - `rule` TR-3.1: دالة الحصول على delta تستخدم آخر mark وليس الأول. Evidence: grep `entries[entries.length - 1]`
  - `rule` TR-3.2: اختبارات settingsPerfMetrics.test.ts + settingsPerfBudget.test.ts PASSED. Evidence: vitest verbose output
  - `rubric` TR-3.3: اكتمال مقاييس الأداء (openRequest → firstPaint → interactive + report + budget). Scale 1-5. 1=missing stages, 3=partial marks, 5=full pipeline with latch. Threshold >= 4. Evidence: عدد مراحل mark الموجودة

## Task 4: فحص الإغلاق الجراحي الصحيح لصدفة الإعدادات
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة [settingsShellExit.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings/settingsShellExit.ts)
  - قراءة [useSettingsShellCloseGuard.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/hooks/useSettingsShellCloseGuard.ts)
  - قراءة [settingsEscapeStack.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/settingsEscapeStack.ts)
  - فحص أن الإغلاق يُلغي timers/subscriptions، يُعيد التركيز، يُصيغ inert، يُنفذ snap DOM
  - تشغيل كل اختبارات الإغلاق الرسمية
- **Acceptance Criteria Addressed**: AC-5, AC-12
- **Test Requirements**:
  - `rule` TR-4.1: worldclassSettingsCloseHonesty.test.ts PASSED. Evidence: vitest verbose
  - `rule` TR-4.2: settingsPerformanceCloseHonesty.test.ts PASSED. Evidence: vitest verbose
  - `rule` TR-4.3: settingsShellExit.test.ts + settingsEscapeStack.test.ts PASSED. Evidence: vitest verbose
  - `rubric` TR-4.4: اكتمال جودة الإغلاق. Scale 1-5. 1=only close, 3=close + timer cancel, 5=full pipeline (cleanup + focus back + inert + snap + escape stack LIFO + cap native). Threshold >= 4. Evidence: covers 5+ aspects

## Task 5: فحص أقسام الأربعة (Appearance/Data/Security/Account) سطر بسطر
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - قراءة AppearanceSection + DataSection + SecuritySection + AccountSection رئيسية + هوكاتها
  - قراءة [settingsSectionLoad.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/settingsSectionLoad.ts) + [SettingsSectionReveal.tsx](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/SettingsSectionReveal.tsx) + هوك useSettingsSectionWarm + observeSettingsSectionInteractive
  - تشغيل اختبارات الأقسام الرسمية + section load + section keepalive
- **Acceptance Criteria Addressed**: AC-6, AC-13
- **Test Requirements**:
  - `rule` TR-5.1: AppearanceSection.test.tsx + DataSection.test.tsx + SecuritySection.test.tsx + AccountSection.test.tsx كلها PASSED. Evidence: vitest verbose
  - `rule` TR-5.2: SettingsSectionRouter.keepalive.test.tsx + settingsSectionLoad.test.ts + useSettingsSectionWarm.test.ts + observeSettingsSectionInteractive.test.ts PASSED. Evidence: vitest verbose
  - `rubric` TR-5.3: جودة تقسيم الأقسام والتسخين. Scale 1-5. 1=single load, 3=keepalive+reveal, 5=warm+reveal+keepalive+interactive observation + error boundary per section. Threshold >= 4. Evidence: num features found

## Task 6: فحص الأمن — مكالمات الكلاينت مباشرة supabase.from + الإجراءات الحساسة
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - grep فعلية لنمط `supabase.from` داخل مجلدات الإعدادات الثلاثة مع استثناءات الـ gate
  - grep وقراءة verifySensitiveSettingsAction داخل كل Danger Zones (DataDangerZone, useLocalDataClear, useWipeCountdown, deleteLawyerAccount, business backup export/import)
  - تشغيل اختبارات الأمن الرسمية: settingsSecurityCloseHonesty + settingsNetworkIsolationHonesty + verifySensitiveSettingsAction.test + settingsSecurityRuntime.test + applicationWipe.test + deleteLawyerAccount.test
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-6.1: grep `supabase.from` داخل الكلاينت (غير api و غير SupabaseService المعفى) = 0. Evidence: grep output count
  - `rule` TR-6.2: كل danger action (≥ 4) تستخدم verifySensitiveSettingsAction قبل تنفيذها. Evidence: grep للـ verify داخل كل ملف خطر
  - `rule` TR-6.3: جميع اختبارات الأمن المذكورة تمر PASSED. Evidence: vitest verbose

## Task 7: فحص جودة الكود (بادئات الأخطاء [settings:opcode])
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - grep فعلية لجميع throw / reject داخل مجلدات الإعدادات الثلاثة (غير الاختبارات)
  - تصحيح بادئات الأخطاء للملفات التي تفتقر إلى البادئة القياسية (تعديلات سطرية فقط)
  - تشغيل اختبارات جودة الكود: settingsCodeQualityCloseHonesty.test
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rule` TR-7.1: نسبة throw statements التي تحتوي على `[settings:` ≥ 95٪ من إجمالي الـ throws في الإعدادات. Evidence: عددي grep قبل/بعد
  - `rule` TR-7.2: settingsCodeQualityCloseHonesty.test.ts PASSED. Evidence: vitest verbose

## Task 8: فحص النظافة واختبارات الأمانة (Honesty Tests)
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - تشغيل اختبارات الأمانة الستة: settingsCleanlinessCloseHonesty + settingsRemainingGapsHonesty + settingsRemainingCompletionHonesty + settingsLatentBugsHonesty + settingsWiringCoverage + settingsScenarioCoverage + settingsChromeCritical + settingsFlowGuard + settingsMaxPushHonesty + settingsOpenSizeHonesty
  - تصحيح أي gaps قابلة للتصحيح في الكود (حذف dead import / تسوية export unused)
- **Acceptance Criteria Addressed**: AC-10, AC-13
- **Test Requirements**:
  - `rule` TR-8.1: ≥ 9 من 11 اختبار أمانة تمر PASSED. Evidence: vitest summary
  - `rubric` TR-8.2: درجة النظافة العامة. Scale 1-5. 1=كثير من dead code, 3=بعض البقايا, 5=0 dead imports / 0 dead exports / 0 unused utils. Threshold >= 4. Evidence: عدد items التي اكتشفها اختبارات الأمانة

## Task 9: فحص استعداد الموبايل وملفات الإعدادات UI/UX
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - قراءة [useSettingsMobileSuspend.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/hooks/useSettingsMobileSuspend.ts) + focus trap + escape stack layers + gesture hygiene
  - قراءة ملفات CSS: settingsChrome.css / settingsChromeCards.css / settingsChromeOverlay.css / settingsInstantChrome.css للتأكد من وجودها وعدم تكرار
  - قراءة مجلد settings-ui (SettingRow, SettingCard, Toggle, Segmented, tokens) + اختباراتها
  - تشغيل اختبارات الموبايل الرسمية
- **Acceptance Criteria Addressed**: AC-12, AC-13
- **Test Requirements**:
  - `rule` TR-9.1: SettingsMobile.test.tsx + SettingsShellGestureHygiene.test.tsx + useSettingsShellFocusTrap.test.tsx + useSettingsShellEscape.layers.test.tsx + useSettingsMobileSuspend.test.ts + settingsMobileCloseHonesty.test.ts → ≥ 5/6 PASSED. Evidence: vitest verbose
  - `rule` TR-9.2: اختبارات الـ UI atoms (settings-ui.test.tsx, settingsUiSegmented.test.tsx, Toggle/SettingRow...) كلها موجودة. Evidence: ls ملفات الاختبار
  - `rubric` TR-9.3: درجة استعداد الموبايل. Scale 1-5 بالأساطير المعرفة في AC-12. Threshold >= 4. Evidence: covers 4+ aspects من 5

## Task 10: تشغيل بوابة الإنتاج الرسمية settings-production-gate.mjs + TypeScript Diagnostics
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9
- **Description**:
  - تشغيل `node scripts/settings-production-gate.mjs` بشكل فعلي
  - تسجيل exit code وعدد اختبارات PASSED
  - GetDiagnostics لكل ملف تم تعديله خلال المهام 1-9
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `rule` TR-10.1: node scripts/settings-production-gate.mjs يخرج 0 وGate result = PASSED. Evidence: output الأمر كامل
  - `rule` TR-10.2: كل ملف تم تعديله خلال المهام 1-9 لديه TS Diagnostics = []. Evidence: GetDiagnostics لكل ملف
  - `rubric` TR-10.3: درجة إجمالية لجاهزية الإعدادات للإنتاج. Scale 1-5. 1=Gate FAIL, 3=Gate PASS مع بعض Honesty Tests FAIL, 5=كل الأبوابات + كل Honesty Tests تمر PASSED. Threshold >= 4. Evidence: summary of all test files run
