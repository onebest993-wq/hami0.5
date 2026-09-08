# Hami v10.5.0-tier1-hardened — قسم الإعدادات (Settings): فحص عميق احترافي مركزي إنتاجي من الصفر

## Overview
- **Summary**: فحص ذري احترافي كامل ومتكامل من الصفر لقسم الإعدادات بأكمله (كل مكونات UI، كل الخدمات، كل الـ hooks، كل الـ API، كل الـ tests، وكل التكاملات مع باقي النظام) وفقاً للمعايير العالمية، مع التركيز الصريح على `button` و `div` كما هو مطلوب في تفعيل هذه الدورة. الهدف: تأكيد أن قسم الإعدادات يعمل بأعلى درجات الكفائة والأداء والاتقان والنظافة وجودة الكود والاستعداد الإنتاجي الفعلي المثالي، مع **عدم السماح بأي نقص أو عيب أو عمل رخيص أو هلوسة** في أي نقطة تم فحصها.
- **Purpose**: إنتاج "تقرير مراجعة مركزي إنتاجي حقيقي" لقسم الإعدادات يغطي 9 محاور: (1) صحة وجودة الأكواد، (2) الأداء ومشتقاته (الخفة، السرعة، الوقت لتفاعل أولي TTFI، حجم الحزم، استهلاك الذاكرة)، (3) النظافة البرمجية (0 TODO/FIXME/HACK فعلي، 0 console.* غير موثق، 0 throw عام بلا context)، (4) سلامة ووجاهة عناصر `button` و `div` من ناحية السلوك/الدلالة/التصميم/الوصولية (a11y) وعدم وجود anti-patterns، (5) سلامة سطح الأمان لحسابات حساسة (حذف الحساب، مسح التطبيق، النسخ الاحتياطي المشفر)، (6) اختبارات الوحدة والتكامل ومرورها baseline 21، (7) استقرار حافظة الحالة Zustand + Context + AutoSave، (8) الصحة الهيكلية للـ import boundaries وعدم كسر الطوابق 4، (9) استعداد القسم للعمل الإنتاجي على Web + Capacitor Android/iOS بدون أي تذبذب.
- **Target Users**: Principal Build Architect، مسؤول QA/QC قسم الإعدادات، مهندس الأداء، مهندس الأمان، المستخدم النهائي الإنتاجي على Web والهاتف.

## Goals
1. **G1 (Code Quality 0 Defects)**: إنتاج جرد دقيق لكل عيوب جودة الكود في قسم الإعدادات، وإغلاق 100% منها (0 عيوب مفتوحة عند الإغلاق):
   - TODO/FIXME/HACK/XME/XXX فعلي → إما إزالة أو تنفيذ أو ترقية إلى معلقة موثقة WONTFIX مع سبب مهني (صفر علامات موثقة بشكل غير كافٍ).
   - console.log / console.warn / console.error غير المضمونة (ليست ضمن guards الأمنية الموجودة) → إزالة 0 عائد أو الاستبدال ب Sentry.captureException / structured logger.
   - throw new Error("رسالة غير موثقة") أو بدون خطأ مطبقي → استخدام ErrorSubtype موحد (إذا كان موجوداً في المشروع) أو إضافة رسالة بها context كامل (operationId, userId, snapshotId).
2. **G2 (Performance Deep)**: ضمان أن قسم الإعدادات يفي بـ budgets الأداء الموجودة في `services/settings/settingsPerfBudget.ts` أو تحديدها بوضوح:
   - TTFI (Time To First Interaction) عند فتح مركز الإعدادات ≤ الـ budget المحدد.
   - عدد عمليات إعادة الرسم (re-renders) عند تبديل الأقسام ≤ threshold المحدد.
   - استهلاك الذاكرة (heap delta) بعد 5 دورات فتح → إغلاق مركز الإعدادات ≤ 5% عن baseline الصفحة الرئيسية.
   - حجم الـ chunks للمكونات غير المستخدمة (lazy-loaded) متوافق مع weights الحالية.
3. **G3 (Button/Div Atomic Honesty)**: فحص **ذري** لكل `<button>` وكل `<div>` داخل مكونات UI قسم الإعدادات (HamiSettings + ProfileSettings components = 62 TSX file تقريبًا، مع 170 occurrence تم اكتشافها في scan الأولي). لكل عنصر تأكيد:
   - Button: نوعه صحيح (type="button|submit|reset") وليس div بمظهر button، وله role/aria-label/aria-pressed/aria-expanded المناسب بحسب استخدامه، وجميع الأحداث (onClick/onKeyDown) متصلة بشكل صحيح ولا تسرب listeners، وكل Interactive button لديها `focus-visible` outline، وكل disabled button لها aria-disabled بالإضافة إلى خاصية disabled HTML.
   - Div: لا div مُستخدم كـ interactive button (div with onClick بدلاً من <button>)، ولا div يلعب دور landmark (header/footer/nav/section/article/aside) بدون سبب مهني مبرر (لذلك تم استبدال 3 فقط في المرحلة السابقة — نفس المنهجية). لكل div تحمل className دلالي (settings-card/settings-row/settings-tabpanel): هل يتناسب نوع العنصر HTML مع دوره أم يمكن استبداله بعنصر دلالي آخر مع ZVF 100%؟
4. **G4 (Security Critical Paths)**: فحص كامل لـ critical paths الأمنية في قسم الإعدادات:
   - حذف الحساب: deleteLawyerAccount.ts + يمر عبر verifySensitiveSettingsAction.ts (تأكيد كلمة المرور / 2FA إذا موجود).
   - مسح التطبيق: applicationWipe.ts + wipeIndexedDatabases.ts + mutePersistedStoresForWipe.ts + حذف كائنات storage.
   - النسخ الاحتياطي: businessBackupCrypto.ts (تشفير AES-GCM؟)، businessBackupEncoding.ts، businessBackupBuild.ts، Import/Export + keys التشفير لا تسرب إلى localStorage بسيط.
5. **G5 (Tests Baseline + Settings Integrity)**: تأكيد أن 42+ اختبار قسم الإعدادات كلها تمر ضمن baseline 21 global test ratchet، مع تحقق صريح من أن اختبارات القسم الأساسية الـ 15 موجودة فعليًا وتمر.
6. **G6 (State Hydration Integrity)**: فحص LawyerSettingsProvider + useLawyerSettingsHydration + useAutoSave + settingsShellOrchestration: أن الترطيب يحدث مرة واحدة، و AutoSave لا يحفظ قبل اكتمال الترطيب، و لا يوجد double-dispatch في events الأقسام.
7. **G7 (Architecture)**: حدود الطوابق 4 محفوظة (services لا تستورد من components، api لا تستورد من components مباشرة)، 0 تسريب عبر طبقات.
8. **G8 (Final Report)**: كتابة `.audit/SETTINGS-DEEP-PRODUCTION-AUDIT-2026-09-07.txt` يحتوي على أرقام فعلية + دلائل لكل محور من المحاور التسعة، مع تصنيف كل ملف تم فحصه إلى (PASS / REMEDIATED / WONTFIX مع سبب).

## Non-Goals
- ❌ أي تعديل بصري على UI قسم الإعدادات: ألوان، حدود، توزيع عناصر، أحجام خطوط، إضافة أو إزالة أي className أو style. ZVF 100% ملزم.
- ❌ إعادة تصميم المعمارية لقسم الإعدادات أو إزالة أي واجهة عامة props أو context values مستخدمة خارجياً.
- ❌ ترقية أي package في package.json أو تغيير إصدار Node 24.x.
- ❌ إضافة features جديدة غير موجودة حالياً في قسم الإعدادات. العمل مقتصر على **الفحص + الإصلاح للعيوب المكتشفة فقط**.
- ❌ نشر أي أسرار أو مفاتيح تشفير أو بيانات مستخدم في أي ملف أو رسالة أو terminal output.
- ❌ تشغيل `--save` لأي baseline إلا في حال موافقة صريحة من المستخدم (NO --save ABSOLUTE ملزم).
- ❌ حذف أي ملف في قسم الإعدادات بدون grep كامل على المستودع بالكامل أولاً.

## Background & Context
نقطة البداية المؤكدة ميدانياً (Zero Hallucinations — كل نقطة لها استطلاع فعلي من الكود في هذه الجلسة):
- **Git الحالي**: HEAD=`3b608afd` على فرع `improve/current`، baseline ratchets ثابتة: tsc=956, lint=11, dead-exports=1885, test-ratchet=21.
- **مكونات UI قسم الإعدادات**: مجلد `src/app/components/lawyer/HamiSettings/` (52 ملف TSX)، ومجلد `src/app/components/lawyer/RoyalLawyerProfile/components/settings/` (10 ملفات TSX)، + مكونات تشغيل مثل `SettingsInstantPaintCover.tsx`، `LawyerDashboardSettingsOverlayPortal.tsx`، إلخ. الإجمالي التقريبي: **62 ملف TSX** للواجهة الرسومية.
- **مسح أولي button/div في HamiSettings/**: 170 occurrence (52 ملف) عبر grep `<button|<Button|<div`. عدد الـ `<button>`/`<Button>` صغير نسبيًا → معظم الـ 170 هي `<div>` → محور فحص G3 يركز بشكل خاص على anti-pattern div كـ interactive button.
- **خدمات قسم الإعدادات (Business Logic)**: مجلد `src/app/services/settings/` يحتوي على **75 ملف TS** مع 47 علامة مريبة في 10 ملفات عبر grep `throw new Error|console.(log|warn|error)|TODO|FIXME|HACK` → هذه هي العينة الأولى لـ G1 Code Quality.
- **اختبارات قسم الإعدادات**: 42+ ملف اختبار داخل `services/settings/__tests__/` + 16 اختبار ضمن HamiSettings/__tests__ + اختبارات hooks في `hooks/lawyerDashboard/settings/__tests__/` + اختبارات API في `api/settings/**`.
- **مسارات الأمان الحرجة**: deleteLawyerAccount.ts, applicationWipe.ts, businessBackup*.ts, wipe/route.ts موجودة.
- **budgets الأداء**: يوجد `settingsPerfBudget.ts` و `settingsPerfMetrics.ts` داخل الخدمات → محور G2 سيركز على تطابق الفعلية مع هذه الـ budgets.

## Functional Requirements
- **FR-1 (Button Honesty)**: كل interactive عنصر في قسم الإعدادات يكون باستخدام `<button>` (أو مكون Button الرسمي إن وجد) وليس `<div>` أو `<span>` مع onClick. استثناء واحد موثق فقط: حالات role="button" على عنصر مركب مع tabindex و onKeyDown صحيحين وrole بوضوح.
- **FR-2 (Semantic Div Honesty)**: تطبيق نفس منهجية F-phase على divs قسم الإعدادات فقط: استبدال div بعنصر دلالي HTML5 **فقط إذا كان الاستبدال يتحقق ZVF 100% ولا يؤثر على أي selector أو اختبار**. تفضيل أولوية: (1) SettingsShell الخارجي (data-settings-root) هل يمكن أن يكون <dialog> أصلاً؟ (2) رأس القسم hdr هل هو <header> فعلاً؟ (3) tabpanel هل هو فعلاً <section role="tabpanel">؟ باقي الحالات → WONTFIX مع سبب.
- **FR-3 (Sensitive Settings Gate)**: كل عملية حساسة (حذف الحساب، مسح التطبيق، استيراد نسخة احتياطية، تصدير نسخة احتياطية بمفاتيح مشفرة) تمر عبر `verifySensitiveSettingsAction.ts` بواجهة واحدة، مع تسجيل fingerprint العملية.
- **FR-4 (AutoSave Order)**: AutoSave لحالة settings يبدأ **فقط بعد** اكتمال useLawyerSettingsHydration بنجاح و settingsHydrated=true، ولا يوجد تحفظ قبل ذلك (يمنع حفظ قيم افتراضية خاطئة في أول تشغيل).
- **FR-5 (Wipe Atomicity)**: applicationWipe + deleteLawyerAccount تكون ذرية: إما أن تنتهي كل خطواتها بنجاح، أو يتم rollback لأي تخزين متوسطي (محدد). لا يبقى المستخدم في حالة نصف مسح.

## Non-Functional Requirements
- **NFR-1 (ZVF 100%)**: أي إصلاح ناتج عن هذه المراجعة (استبدال div→button، استبدال div→header/section، إزالة console.log، تحسين throw) لا يغير شيء بكسلي في UI قسم الإعدادات على الإطلاق.
- **NFR-2 (Ratchet Monotonicity)**: 4 ratchets الأساسية ثابتة أو تتحسن (تنخفض): tsc ≤ 956، lint ≤ 11، tests ≤ 21، dead-exports ≤ 1885. أي زيادة = فشل تلقائي للمهمة مع rollback للخطوة.
- **NFR-3 (Settings TTFI Budget)**: الوقت من نقر زر الإعدادات على الشاشة الرئيسية حتى يصبح أول button تفاعلي داخل مركز الإعدادات جاهز للتفاعل (قابل للنقر) ضمن الـ budget المحدد في settingsPerfBudget.ts أو ≤ 120ms على جهاز متوسط (لابتوب i5 الجيل 10 / هاتف متوسط).
- **NFR-4 (Settings Re-render Budget)**: عند التبديل بين الأقسام الأربعة (Appearance / Data / Account / Security) داخل مركز الإعدادات: إعادة رسم لكل مكون ضمن شجرة الأقسام ≤ 1 مرة لكل tab (سواء باستخدام memo أو section slotting أو keep-alive الموجود).
- **NFR-5 (Zero Code Smells)**: 0 TODO/FIXME/HACK فعلي غير موثقة في تقرير WONTFIX النهائي داخل حدود قسم الإعدادات، باستثناء الـ tests التي يمكن أن تحتوي على TODO لتوسيع نطاق الاختبار (بما أنها لا تصل إلى إنتاج).
- **NFR-6 (Import Closure)**: Import closure لقسم الإعدادات صحيح (لا broken imports داخل الـ 137 ملف في settings ecosystem)، كما أن الـ architecture boundaries ضمن الحدود: services ≤ 129، api ≤ 1، domainApp ≤ 114.
- **NFR-7 (Test Integrity)**: جميع اختبارات قسم الإعدادات تعمل standalone عند تشغيلها بمفردها (لا تعتمد على ترتيب تشغيل الاختبارات الأخرى)، و timing-flakes إن وجدت تُضاف إلى allowlist الرسمي مع سبب واضح.

## Constraints
- **Tech Stack Thabit**: React 18.3، Vite 7، TypeScript 5.9، Tailwind 4، Zustand 4، Capacitor 8، Supabase 2.108، Vitest، Playwright، Sentry. Node 24.x مطابق لـ .nvmrc. **لا ترقيات**.
- **Zero Visual Edits (ZVF) ملزم 100%**. أي تعارض بين إصلاح عيب جودة/أمان والـ ZVF: يتوقف الإصلاح ويُسجل في التقرير كـ BLOCKED BY ZVF.
- **No --save ABSOLUTE**: لا يُسمح بتشغيل `--save` لأي baseline ratchet إلا في commit مستقل بادئة `baseline:` وموافقة صريحة من المستخدم.
- **No Delete بدون Grep**: حذف أي سطر/ملف/علامة console.log/TODO يسبقه ويتبعه grep كامل للمراجع في `src/`, `scripts/`, `.audit/`, `e2e/`.
- **Fail-Closed Tier-1**: أي تغيير غير مؤكد 100% يُصنف WONTFIX مع سبب بدلًا من المخاطرة بكسر الـ ratchet.

## Assumptions
- المستودع متاح للقراءة والكتابة، Node 24 مثبّت، npm cache صالح.
- المستخدم يوافق ضمنيًا على أنه **لا يوجد تعارض بين G3 button/div honesty و ZVF**. إذا ظهر تعارض (مثل: div كـ interactive button يعتمد عليه اختبار يستخدم `container.querySelector('div').click()`)، يُصنف WONTFIX مع سبب واضح بدل كسر الاختبار.
- baseline الاختبارات 21 ثابتًا ولا يُسمح بأي زيادة حتى لو سببها قسم الإعدادات بدون حل — أي فشل جديد في اختبار قسم الإعدادات = إصلاح إجباري قبل الإغلاق.

## Acceptance Criteria

### AC-00: جميع الراتشيتات الـ 4 محفوظة بعد انتهاء الدورة
- **Type**: `rule`
- **Given**: نهاية جميع مهام التنفيذ، قبل كتابة التقرير النهائي
- **When**: تشغيل تسلسلي لـ `npm run guard:tsc`, `npm run guard:lint`, `npm run guard:dead-exports`, `npm run guard:tests`
- **Then**: tsc ≤ 956 AND lint ≤ 11 AND dead-exports ≤ 1885 AND tests ≤ 21 (كل 4 قيم ضمن الحدود). exit code كل حارس = 0.
- **Pass Condition**: 4/4 PASS. الدليل = stdout كل حارس + exit code مخزون في أدلة الإغلاق النهائية.
- **Evidence**: [`.audit/tsc-baseline.json`](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/tsc-baseline.json)=956, [lint-baseline.json](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/lint-baseline.json)=11, [dead-exports-baseline.json](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/dead-exports-baseline.json)=1885, [test-ratchet-baseline.json](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/test-ratchet-baseline.json)=21.

### AC-01: جرد كل عيوب الكود في قسم الإعدادات وإغلاقها 100%
- **Type**: `rule`
- **Given**: كل 75 ملف TS في `src/app/services/settings/` + 62 ملف TSX في `src/app/components/lawyer/HamiSettings/` + `RoyalLawyerProfile/components/settings/` + 3 hooks + 4 api
- **When**: مسح regex دقيق `TODO|FIXME|HACK|XXX|XME|console\.(log|warn|error)|throw\s+new\s+Error\s*\(\s*['"][^'"']{1,50}['"]\s*\)` على الملفات كلها (مع استثناء واضح لملفات __tests__)
- **Then**: عدد المطابقات الفعلية في ملفات PRODUCTION (غير __tests__) = عدد REMEDIATED (قام الإصلاح) + عدد WONTFIX (كل منها به سبب مهني 3 أسطر في التقرير). صفر علامات مفتوحة بلا تصنيف.
- **Pass Condition**: نتيجة المسح النهائي بعد الإصلاح: (count ≤ initial_count) AND كل hit مصنفة REMEDIATED/WONTFIX في التقرير مع دليل path:line. صفر "unclassified" hits. الدليل = grep output قبل وبعد.
- **Evidence**: 47 hit مبدئي في 10 ملفات من services/settings/ (مسح جلسة SPEC01). قائمة الملفات الـ 10: [deleteLawyerAccount.ts:4](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/deleteLawyerAccount.ts), [applicationWipe.ts:3](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/applicationWipe.ts), [businessBackupCrypto.ts:9](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/businessBackupCrypto.ts), [businessBackupEncoding.ts:6](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/businessBackupEncoding.ts), [businessBackupBuild.ts:7](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/businessBackupBuild.ts), [businessBackupImport.ts:11](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/businessBackupImport.ts), [collaborationNetworkGate.ts:1](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/collaborationNetworkGate.ts), [verifySensitiveSettingsAction.ts:1](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/verifySensitiveSettingsAction.ts), [wallpaperEditorRender.ts:3](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/wallpaperEditorRender.ts).

### AC-02: Button Honesty في قسم الإعدادات (0 divs مستخدمة كـ interactive buttons)
- **Type**: `rule`
- **Given**: 62 ملف TSX للواجهة الرسومية في قسم الإعدادات
- **When**: مسح مخصص (div-button-audit.mjs) يكتشف كل <div> أو <span> بها onClick handler **و** role !== button / role !== presentation / ليس wrapper فقط، أو أن لديها className مثل `*btn*` أو `*button*` أو cursor-pointer.
- **Then**: 0 مطابقات لـ div مستخدمة كـ button، أو كل مطابقة إما: (أ) تم إصلاحها إلى <button> الفعلي مع الحفاظ على className/style/children كاملة (ZVF)، أو (ب) مصنفة WONTFIX مع سبب (مثل: المكون مركب من قبل خارجي، أو الاختبار يعتمد على selector div بالضبط). صفر div-button بلا تصنيف.
- **Pass Condition**: عدد divs المستخدمة كـ buttons التي لم يتم إصلاحها أو تصنيفها WONTFIX = 0. الدليل = script output قبل وبعد + قائمة بالملفات التي تم فيها استبدال div→button + أسباب WONTFIX.
- **Evidence**: 170 occurrence مبدئي من button/div في 52 ملف من HamiSettings/ (مسح SPEC01 grep `<button|<Button|<div`).

### AC-03: Semantic Div Honesty في قسم الإعدادات (swap منخفض المخاطرة فقط + WONTFIX واعي)
- **Type**: `rubric`
- **Dimension**: دقة اختيار عنصر HTML لكل div دلالي داخل مركز الإعدادات + انضباط عدم كسر الاختبارات
- **Scale**: 0-5
- **Anchors**:
  - 1 = 10+ divs دلالية (header/footer/tabpanel/section) لم يتم فحصها أو لا يوجد قرار واضح لها
  - 3 = تم فحص 80% من divs الدلالية، استبدال ≤ 2، وثمة باقي غير مصنف
  - 5 = تم فحص 100% من divs الدلالية (className *header*|*tabpanel*|*footer*|*nav*|*panel*|*section*) ضمن قسم الإعدادات، مع قرار لكل div: إما REMEDIATED (استبدال بعنصر دلالي، ZVF موثوق، tsc/lint/tests لا تتغير) أو WONTFIX بسببان واضحين (مخاطرة selector / مخاطرة a11y double-role). وعدد الاستبدالات يكون ≥ 1 (على الأقل رأس SettingsShell إلى <header> إذا كان آمنًا 100%).
- **Pass Threshold**: ≥ 4
- **Evidence**: `div-semantic-index.mjs` من المرحلة السابقة يمكن تشغيله محصوراً على `**/HamiSettings/**` و `**/RoyalLawyerProfile/components/settings/**` فقط لإنتاج القائمة المرشحة.

### AC-04: Critical Paths الأمنية (حذف حساب + مسح + نسخ احتياطي) سليمة وذرية
- **Type**: `rule`
- **Given**: 6 ملفات أمنية حرجة: deleteLawyerAccount.ts, applicationWipe.ts, wipeIndexedDatabases.ts, businessBackupCrypto.ts, businessBackupBuild.ts, businessBackupImport.ts
- **When**: (1) قراءة يدوية + (2) تشغيل اختباراتها الموجودة standalone (غير ضمن guard:tests، لمدة أسرع): `npx vitest run src/app/services/settings/__tests__/deleteLawyerAccount.test.ts src/app/services/settings/__tests__/applicationWipe.test.ts src/app/services/settings/__tests__/wipeIndexedDatabases.test.ts src/app/services/settings/__tests__/businessBackup*.test.ts src/app/services/settings/__tests__/verifySensitiveSettingsAction.test.ts`
- **Then**: exit=0 للاختبارات standalone، و كل عملية حساسة تمر عبر verifySensitiveSettingsAction (أو لها comment مبرر لماذا لا تحتاج)، و لا يوجد مسار "success" ينتج عنه حالة نصف مسح (تتحقق على الأقل من خلال خطأ مفقود throw في آخر pipeline → يُصنف REMEDIATED).
- **Pass Condition**: اختبارات standalone exit=0، + 6/6 ملفات لها تصنيف في التقرير (PASS / REMEDIATED / WONTFIX). الدليل = terminal output للاختبارات + جرد يوضح مسارات الأمان.
- **Evidence**: [deleteLawyerAccount.test.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/__tests__/deleteLawyerAccount.test.ts), [applicationWipe.test.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/__tests__/applicationWipe.test.ts), [wipeIndexedDatabases.test.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/__tests__/wipeIndexedDatabases.test.ts), [verifySensitiveSettingsAction.test.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/__tests__/verifySensitiveSettingsAction.test.ts).

### AC-05: الأداء (TTFI + Re-renders + Heap Delta) ضمن budgets
- **Type**: `rubric`
- **Dimension**: وفاء قسم الإعدادات بـ settingsPerfBudget أو حدود عالمية معقولة
- **Scale**: 0-5
- **Anchors**:
  - 1 = لا قياس على الإطلاق، وTTFI > 500ms أو re-renders > 3 في كل تبديل قسم
  - 3 = قياس جزئي: TTFI موجود ضمن budget لكن re-renders أو heap delta غير مثبت
  - 5 = قياس كامل 3/3 metrics: (أ) TTFI ضمن حدود settingsPerfBudget.ts، (ب) تبديل الأقسام ≤ 1 إعادة رسم لكل tabpanel (استخدام keep-alive/Suspense memoized)، (ج) heap delta بعد 5 دورات open/close ≤ 5% عن الصفحة الرئيسية. حتى لو لم يتم القياس مباشرة، على الأقل تم فحص الـ code path: أن الـ Suspense و keep-alive الموجود في SettingsSectionRouter فعال فعلاً ويمكن إثباته من الكود (evidence static).
- **Pass Threshold**: ≥ 4
- **Evidence**: [settingsPerfBudget.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfBudget.ts), [settingsPerfMetrics.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfMetrics.ts), [SettingsSectionRouter.tsx](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx) (keep-alive + slots).

### AC-06: سلامة الترطيب وحافظة الحالة (Hydration + AutoSave)
- **Type**: `rule`
- **Given**: [LawyerSettingsProvider.tsx](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/context/lawyerSettings/LawyerSettingsProvider.tsx) + [useLawyerSettingsHydration](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/context/lawyerSettings/useLawyerSettingsHydration.ts) + [useAutoSave](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/useAutoSave.ts)
- **When**: (1) قراءة رمز يدوي للتحقق أن `useAutoSave` يحصل على `settingsHydrated` كـ guard ضمني أو صريح، و(2) تشغيل اختبارات الترطيب standalone: `npx vitest run src/app/hooks/__tests__/useAutoSave.settingsIntegrity.test.ts src/app/services/settings/__tests__/settingsCore.test.ts src/app/services/settings/__tests__/settingsShellOrchestration.test.ts src/app/services/settings/__tests__/settingsShellSnap.test.ts src/app/services/settings/__tests__/settingsSnapshotLiveStore.test.ts`
- **Then**: اختبارات الترطيب exit=0، و useAutoSave لا يحفظ قبل الـ hydration (يُثبت إما من الكود أو من اختبار useAutoSave.settingsIntegrity.test.ts إذا كان موجوداً بهذا المعنى).
- **Pass Condition**: standalone tests exit=0 + دليل خطي على تأخير AutoSave حتى الترطيب. الدليل = terminal output للاختبارات + path:line من الكود.
- **Evidence**: [useAutoSave.settingsIntegrity.test.ts](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/__tests__/useAutoSave.settingsIntegrity.test.ts) موجود فعلاً → اختبار متخصص لهذا الـ AC.

### AC-07: اختبارات قسم الإعدادات (58 تقريبًا) كلها PASS ضمن baseline 21
- **Type**: `rule`
- **Given**: كامل اختبارات قسم الإعدادات (services/HamiSettings/hooks/api)
- **When**: إما (أ) تشغيل `npm run guard:tests` كامل → PASS 21=21، أو (ب) تشغيل `npx vitest run src/app/services/settings/__tests__ src/app/components/lawyer/HamiSettings/__tests__ src/app/hooks/lawyerDashboard/settings/__tests__ src/app/api/settings` standalone
- **Then**: 0 فشلات غير موثقة (أي timing-flake مسموح 1 ضمن السقف 13)
- **Pass Condition**: standalone run exit=0 OR guard:tests exit=0 مع 0 فشلات جديدة في ملفات قسم الإعدادات. الدليل = terminal output.

### AC-08: Architecture Boundaries + Import Closure سليمة
- **Type**: `rule`
- **Given**: الطوابق الأربعة للمعمارية (API ← Services ← Domain ← Components)
- **When**: تشغيل `npm run guard:architecture-boundaries` + `npm run guard:import-closure`
- **Then**: arch breakdown ضمن الحدود (api ≤ 1, services ≤ 129, domainApp ≤ 114) و import closure 0 broken.
- **Pass Condition**: 2/2 guards exit=0. الدليل = stdout.
- **Evidence**: [architecture-boundaries-baseline.json](file:///C:/Users/HEX%20STORE/Downloads/New%20folder/.audit/architecture-boundaries-baseline.json) (services=129, total=244)

### AC-09: تقرير نهائي مركزي موثق بالكامل
- **Type**: `rule`
- **Given**: انتهاء جميع المهام السابقة (AC-00..AC-08)
- **When**: وجود ملف `.audit/SETTINGS-DEEP-PRODUCTION-AUDIT-2026-09-07.txt`
- **Then**: الملف يحتوي على الأقسام 11 التالية: (0) ملخص تنفيذي رقمي، (1) محور جودة الكود (عدد REMEDIATED/WONTFIX/UNCLASSIFIED)، (2) محور button honesty (عدد divs التي تم إصلاحها إلى button/WONTFIX)، (3) محور semantic div honesty (عدد الاستبدالات + قائمة الملفات + WONTFIX counts)، (4) محور أمان critical paths (6/6 حالة)، (5) محور الأداء TTFI/re-renders/heap (رولبريك score)، (6) محور الترطيب + AutoSave (حالة)، (7) محور الاختبارات (عدد tests التي تم تشغيلها + PASS count + flakes)، (8) محور Architecture/Closure، (9) قرارات WONTFIX التفصيلية لكل حالة (path:line + 3 أسطر سبب)، (10) شروط المرور لكل AC + أدلةها.
- **Pass Condition**: 11/11 أقسام موجودة وكل قسم يحتوي على numbers صريحة وليس نصوصاً مجردة. الدليل = قراءة الملف النهائي.

## Open Questions
- [ ] هل يُسمح بتعطيل استبدال div→button لـ مكونات AppearancePressButton أو SettingsCollapseToggle إذا كان يعتمد على Selector اختبار خاص؟ الافتراضي: WONTFIX مع سبب موثق بدل كسر الاختبار.
- [ ] هل نسخ الأمان المشفرة businessBackup تحتاج إضافة fingerprint device id لـ verifySensitiveSettingsAction (زيادة صلابة) أم يكفي ما هو موجود؟ الافتراضي: إذا لم يكن موجوداً → WONTFIX "لا يحدد مواصفات الأمان 2FA لهذه المرحلة" حتى يطلب المستخدم صراحة.
