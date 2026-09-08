# Hami Settings Tier-1 Zero-to-Production Honest Audit — Product Requirements Document

## Overview
- **Summary**: تدقيق فحص ذري كامل من الصفر لقسم الإعدادات (HamiSettings) طبقة بطبقة وسطر بسطر، بهدف الوصول إلى جاهزية إنتاجية Tier-1 فعلية بحيث لا يُعتمد على أي تدقيق أو تقرير سابق، بل كل استنتاج مُثبت برقمي ميداني من الكود أو تشغيل الاختبارات أو البوابات الرسمية.
- **Purpose**: الالتزام الصريح بتعليمات المستخدم التي ترفض الأسلوب المُكرر السطحي، وتطلب فحصًا فعليًا، صادقًا، مجهريًا، احترافيًا، يغطي: التحميل الأولي، التسخين، الأداء، استجابة، الخفة، النظافة، حذف الكود الميت/المكرر، جودة الكود، التقسيم، الحجم، ثغرات الأمن، البرمجة، استعداد الموبايل، كل زر وخاصية، والإغلاق الجراحي الإنتاجي الصادق.
- **Target Users**: المستخدم النهائي للمحامي على الهواتف + مهندس الإنتاج الذي يشغل البوابات + مهندس الصيانة الذي يقرأ الكود بعد 6 أشهر.

## Goals
1. فحص فعلي سطر بسطر لكل طبقة في قسم الإعدادات (Shell → Host → App → Sections 4x: Appearance / Data / Security / Account + hooks + UI atoms + services) يثبت كل استنتاج برقمي ميداني (مسار الملف + رقم السطر + إخراج أمر).
2. اكتشاف وتصحيح كل ثغرة إنتاجية حقيقية في: الـ lifecycle hooks (Stale Closure / Session Guard / Fallback Timeouts)، مقاييس الأداء (latest mark، clear marks)، فتح/إغلاق الصدفة، التسخين، تسريب الذاكرة، تلوث الجلسات.
3. التأكد من استعداد الموبايل: استجابة الإيماءات، تعليق non-visible، تعطيل التركيز في الصفحات inert، escape stack LIFO، focus trap.
4. فحص الأمن: WIFE coverage لـ routes متعلقة بالإعدادات، عدم استخدام supabase.from مباشر في الكلاينت، CSP، CSRF، device binding.
5. فحص النظافة: الكود الميت (dead exports / dead imports / unused utils)، التكرار (duplicate logic)، الوزن (import size thresholds)، وجود كل من: CSS files / icons stems / tokens ui.
6. الإغلاق الإنتاجي الصادق: إغلاق جراحي perfect لكل خاصية مع تأكيد عدم تسريب focus، إزالة inert، snap DOM، unhook observers، تصفير refs.
7. تشغيل بوابة الإنتاج الرسمية `settings-production-gate.mjs` وتسجيل نتيجتها الصادقة، تشغيل كل `honesty` test خاص بالإعدادات.

## Non-Goals
- عدم إعادة تصميم بصري أو تغيير السلوك الوظيفي المرئي (ZVF 100% ملزم).
- عدم إصلاح اختبارات flaky بيئية سببها VMM (تُصنف وثائقياً كـ timing flake فقط).
- عدم إنشاء وثائق `*.md` جديدة إلا إذا طلب المستخدم صراحة.
- عدم إضافة ميزات جديدة؛ فقط إصلاح الثغرات المكتشفة (Bugfix-only scope).
- عدم لمس أقسام أخرى في لوحة المحامي خارج HamiSettings + settings services + settings shell hooks.

## Background & Context
1. المستخدم رفض صراحة الأسلوب السابق ("دفعه واحده على كل الاقسام خطاء قد يجعلك تعلوس او لا تبحث وتفحص بشكل دقيق وشامل ومجهري").
2. الموردين الرسميين الذين يُشتق منه نطاق القسم:
   - مجلد المكونات الفعلي: [HamiSettings](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings)
   - خدمات الإعدادات: [services/settings](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings)
   - هوكات صدفة لوحة المحامي للإعدادات: [hooks/lawyerDashboard/settings](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings)
3. حجم القسم ميداني: ~160 ملف TS/TSX + 85+ اختبار مباشر + 4 أقسام داخلية رئيسية (Appearance / Data / Security / Account).
4. الأدلة الميدانية الأولية (قبل أي تعديل) التي تساق في الأسطر التالية هي مصدر الحقيقة الوحيد لهذا التدقيق.

## Functional Requirements
- **FR-1**: كل زر في الإعدادات له path حقيقي واختبار يُثبت وظيفته؛ كل زر غير موجود يُدرج كـ gap مع دليل عدم وجود import أو test.
- **FR-2**: فتح القسم من لحظة الضغط → Clear Marks → Open Request → First Paint → Interactive → Lifecycle Hooks → Hydrate Sections → إغلاق Close Surgical. كل خطوة لها دليل سطر واختبار.
- **FR-3**: التسخين (warm-up) قبل الفتح لا يُركّب Host ويستخدم prefetch فقط، وله اختبار يُثبت الفرق بين warm و arm.
- **FR-4**: الإغلاق الجراحي يعيد التركيز للعنصر الذي فتح القسم، يُلغي جميع الـ timers و observers و subscriptions، يُصيغ inert للصفحة، يُنفّذ snap DOM للإغلاق.
- **FR-5**: كل from الإعدادات الأربعة (Appearance / Data / Security / Account) لها lifecycle خاص، section load، section reveal، error boundary، وتسخين مسبق.
- **FR-6**: كل إجراء حساس (مسح محلي، نسخ احتياطي، حذف حساب) له flow guard، countdown، confirmation، escape stack، focus trap.

## Non-Functional Requirements
- **NFR-1 (الدقة الصادقة)**: كل AC `rule` يمر فقط بعد تشغيل الأمر فعلياً وتسجيل إخراجه رقمياً في Completion Evidence. لا يُسمح بالاستنتاج النظري أو "يعمل بنفس نمط قسم X".
- **NFR-2 (ZVF 100%)**: كل تعديل للكود يجب أن يترك DOM الظاهر، التركيب البصري، السلوك الوظيفي، CSS tokens، سوية القياسات كما هو دون أي تغيير قابل للقياس.
- **NFR-3 (الأداء / Cold Start)**: open-request → interactive ≤ 500ms على شبكة 4G (محاكاة عبر perf marks داخل الاختبارات الرسمية).
- **NFR-4 (الأداء / Reopen)**: عند إعادة الفتح بعد إغلاق سريع، لا يحدث تلوث تقارير (Stale Closure Rejection عبر Session Guard).
- **NFR-5 (الأمن)**: جميع مكالمات الإعدادات التي تضبط state تمر عبر WIFE BFF ولا تستخدم supabase.from مباشرة في الكلاينت؛ التبديلات الحساسة تحتاج verifySensitiveSettingsAction.
- **NFR-6 (النظافة)**: لا يوجد dead import، ولا export غير مستخدم، ولا function موجودة إلا إذا استدعت من test أو مسار حقيقي؛ الوزن الإجمالي للـ Settings bundle ضمن ما يفرظه settings-production-gate.
- **NFR-7 (الموبايل)**: كل خاصية تعمل مع keyboard nav + back native gesture + inert في خلفية الصفحة + تعليق الـ timers في background (useSettingsMobileSuspend).
- **NFR-8 (جودة الكود)**: error prefix بتنسيق `[settings:opcode] message`، استخدام نمط sessionIdCounter + sessionIdRef + activeSessionIdRef في كل lifecycle hook يحتوي على timeout callback.
- **NFR-9 (الاستقرار البواباتي)**: `settings-production-gate.mjs` يمر PASSED بدون Blockers.

## Constraints
- **Technical**: Node على Windows (PowerShell 5)، Vitest runner، `scripts/settings-production-gate.mjs` كبوابة رسمية. لا تعديل خارج مجلدات الـ 3 المذكورة في Non-Goals.
- **Business**: ZVF 100% ملزم على كامل الإعدادات. أي تعديل يغير الـ computed style أو DOM الظاهر يُصنف خطأ ويرجع.
- **Dependencies**: يعتمد على `src/app/services/settings/*`، و `src/app/hooks/lawyerDashboard/settings/*`، و `src/app/components/lawyer/HamiSettings/*` فقط.

## Assumptions
1. إعدادات البيئة dev مقبولة (بلا مفتاح حقيقي لـ Supabase/WIFE Redis) وفق ما تُشغّله البوابات رسمياً في وضع الـ dev.
2. الـ timing flake ≤ 50ms في 1 اختبار من 85 يُصنف timing flake ويوثق وليس عائقاً للإطلاق.
3. اختبارات `*.liveEnv.test.ts` أو التي تحتاج Supabase حقيقي تُصنف خارج النطاق إن فشلت بسبب عدم وجود env.

## Acceptance Criteria

### AC-1: هوك useSettingsLifecycle نمط Session Guard صحيح داخل fallback timeout
- **Type**: `rule`
- **Given**: ملف [useSettingsLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/hooks/useSettingsLifecycle.ts) مفتوح للقراءة
- **When**: نفرض وجود أي setTimeout/setInterval/async callback داخل هوك الـ lifecycle
- **Then**: أنماط `let sessionIdCounter = 0;` على مستوى الملف + `sessionIdRef` + `activeSessionIdRef` داخل الهوك + مقارنة `if (sessionIdRef.current !== activeSessionIdRef.current) return;` داخل الـ callback كلها موجودة
- **Pass Condition**: grep للنمط الثلاثي يعيد matches متصلة داخل نفس الهوك مع وجود guard داخل كل closure تؤدي إلى mark / report
- **Evidence**: grep output فعلي + أرقام أسطر داخل الاختبار الرسمي `useSettingsLifecycle.test.ts`

### AC-2: هوك useSettingsHostLifecycle نمط Session Guard صحيح
- **Type**: `rule`
- **Given**: ملف [useSettingsHostLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle.ts)
- **When**: يحتوي الهوك على أي setTimeout أو async import.then أو fallback بانتظار
- **Then**: نفس نمط Session Guard (AC-1) مطبق + cleanup لجميع الـ observers و timers خارج الـ closure عبر دالة موحدة cleanupActiveGuards
- **Pass Condition**: وجود نمط guard في كل callback يمكن أن يُنفذ بعد أن أصبحت الجلسة stale
- **Evidence**: Read لأسطر الهوك فعلياً + اختبارات settingsShellOpenFlow.test.ts

### AC-3: Clear Marks قبل Open دائمًا في مسار الفتح الرسمي
- **Type**: `rule`
- **Given**: ملف [settingsShellOpenFlow.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow.ts)
- **When**: استدعاء commitSettingsOpen() لأول مرة أو reopen بعد close
- **Then**: `clearSettingsPerfMarks()` تُستدعى قبل `markSettingsPerfPhase('open-request')`
- **Pass Condition**: ترتيب الأسطر داخل دالة الفتح الرسمي يُظهر Clear ثم Open Request، وليس العكس
- **Evidence**: Read لأسطر الدالة + `settingsShellOpenFlow.test.ts` إخراج الاختبار

### AC-4: مقاييس الأداء تعتمد آخر mark (latestPerfMark) وليس الأول
- **Type**: `rule`
- **Given**: ملف [settingsPerfMetrics.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/settings/settingsPerfMetrics.ts)
- **When**: جلسة ثانية تفتح الإعدادات بعد جلسة سابقة
- **Then**: دالة `getSettingsOpenToInteractiveMs()` تستخدم `entries[entries.length - 1]` وليس `[0]`
- **Pass Condition**: وجود last-index في دوال الحصول على delta، مع اختبار يحاكي تعدد الفتحات
- **Evidence**: grep لـ `.length - 1` + إخراج `settingsPerfMetrics.test.ts`

### AC-5: الإغلاق الجراحي الصحيح لصدفة الإعدادات
- **Type**: `rule`
- **Given**: ملف [settingsShellExit.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/settings/settingsShellExit.ts) + هوك [useSettingsShellCloseGuard.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/HamiSettings/hooks/useSettingsShellCloseGuard.ts)
- **When**: الضغط على Escape أو Back أو زر Close أو Native Back في الموبايل
- **Then**: (1) إلغاء timers و subscriptions و observers، (2) إعادة التركيز للعنصر السابق (blurFocusWithin / focusBack)، (3) snap DOM عبر runtime معكوس للفتح، (4) تصفير reportedRef لسماح reopen لاحقة، (5) وضع inert لخلفية الصفحة
- **Pass Condition**: الاختبارات `worldclassSettingsCloseHonesty.test.ts` + `settingsPerformanceCloseHonesty.test.ts` + `settingsShellExit.test.ts` تمر كلها
- **Evidence**: إخراج vitest verbose للملفات الثلاثة

### AC-6: الأقسام الأربعة (Appearance/Data/Security/Account) كلها لها اختبار تحميل وتسخين صريح
- **Type**: `rule`
- **Given**: ملفات الأقسام الأربعة AppearanceSection / DataSection / SecuritySection / AccountSection داخل HamiSettings
- **When**: نفترض وجود settingsSectionLoad و settingsSectionReveal و keepalive policy
- **Then**: كل قسم له اختبار .test.tsx يثبت render، keepalive، section interactive، واختبار لـ useSettingsSectionWarm
- **Pass Condition**: 4 اختبارات أقسام موجودة، 4 اختبارات hooks section تحميل، كلها PASSED
- **Evidence**: ls للاختبارات الموجودة + vitest verbose

### AC-7: الأمن — لا supabase.from مباشرة داخل كلاينت الإعدادات
- **Type**: `rule`
- **Given**: كل ملفات الإعدادات في المجلدات الثلاثة ما عدا `src/app/api/*` و `src/app/services/*/cloud*.ts`
- **When**: grep نمط `supabase\s*\.\s*from\s*\(` في ملفات HamiSettings
- **Then**: صفر matches داخل ملفات الكلاينت غير الاستثناء المعروف (SupabaseService السماح به في الـ gate)
- **Pass Condition**: 0 نتائج
- **Evidence**: grep output فعلي

### AC-8: الأمن — الإجراءات الحساسة تستخدم verifySensitiveSettingsAction
- **Type**: `rule`
- **Given**: الأوامر: factory reset، مسح محلي، حذف حساب، تصدير/استيراد backup
- **When**: نقرة على زر Danger / Wipe / Delete / Import/Export
- **Then**: وجود استدعاء verifySensitiveSettingsAction قبل تنفيذ الإجراء الحقيقي، مع flow guard و countdown
- **Pass Condition**: grep لـ verifySensitiveSettingsAction داخل كل Danger Zone، مع اختبار `verifySensitiveSettingsAction.test.ts` PASSED
- **Evidence**: grep + إخراج الاختبار

### AC-9: جودة الكود — رسائل الخطأ ملزمة بالبادئة [settings:opcode]
- **Type**: `rule`
- **Given**: كل throw statements و reject / onError callbacks داخل مجلدات الإعدادات الثلاثة
- **When**: grep نمط `throw new Error\(` أو `Promise.reject\(`
- **Then**: كل رسالة تبدأ بالبادئة `[settings:` تليها opcode ثم مسافة ثم الرسالة
- **Pass Condition**: ≥ 95% من throw statements تطابق البادئة؛ exceptions موثقة بـ // WONTFIX comment
- **Evidence**: grep نتائج عددي + تعديلات على الأقل 5 throw للملفات التي تفتقر للبادئة

### AC-10: النظافة — لا dead imports / dead exports قابلة للحذف
- **Type**: `rule`
- **Given**: كل ملفات الإعدادات غير الاختبارات
- **When**: التشغيل اليدوي للأمانة (honesty tests): `settingsCleanlinessCloseHonesty.test.ts` + `settingsCodeQualityCloseHonesty.test.ts` + `settingsRemainingGapsHonesty.test.ts` + `settingsRemainingCompletionHonesty.test.ts`
- **Then**: كل الاختبارات الأمانة الـ 4 تمر PASSED
- **Pass Condition**: 4/4 ناجحة
- **Evidence**: إخراج vitest verbose

### AC-11: بوابة الإنتاج الرسمية للإعدادات PASSED بدون Blockers
- **Type**: `rule`
- **Given**: الأمر `node scripts/settings-production-gate.mjs`
- **When**: التشغيل فعلياً بعد إغلاق كل الثغرات المكتشفة
- **Then**: مخرجات تُطبع Gate result = PASSED مع Test Files N passed (N) بدون أي خطأ
- **Pass Condition**: exit code = 0 و last line = PASSED
- **Evidence**: إخراج أمر node كامل مع الأرقام

### AC-12: استعداد الموبايل وإدارة Gestures
- **Type**: `rubric`
- **Dimension**: مستوى اكتمال جودة تجربة الموبايل لقسم الإعدادات
- **Scale**: 1-5
- **Anchors**:
  1 = لا escape stack، لا focus trap، لا inert، لا native back handler
  3 = بعض الأجزاء موجودة لكنها غير مُتصلّة؛ يمر 50% من اختبارات الموبايل
  5 = كل شيء متصل (LIFO escape stack + focus trap + native back cap + inert policy + suspend في الخلفية) ويمر 100% من اختبارات الموبايل الرسمية
- **Pass Threshold**: >= 4
- **Evidence**: إخراج اختبارات SettingsMobile، SettingsShellGestureHygiene، useSettingsShellFocusTrap، settingsMobileCloseHonesty، useSettingsMobileSuspend

### AC-13: حجم الكود و Chunk Weight
- **Type**: `rubric`
- **Dimension**: مدى التزام قسم الإعدادات بحدود الوزن والتحميل التدريجي دون إدخال ثقل زائد
- **Scale**: 1-5
- **Anchors**:
  1 = كل الأقسام الأربعة تُحمل غليظة في أول render واحد دون أي chunk
  3 = بعض الأقسام lazy، لكن icons/appearance تُحمل معاً دون splitting
  5 = كل قسم، panel، wallpaper editor، backup panel مُجزّأ dynamic import، settingsDialogPrefetch، settingsStemIcons split (Core/Chrome/Security/Lazy)، ويمر settingsOpenSizeHonesty و settingsMaxPushHonesty
- **Pass Threshold**: >= 4
- **Evidence**: إخراج `settingsOpenSizeHonesty.test.ts` + `settingsMaxPushHonesty.test.ts` + read لملف settingsDialogPrefetch

### AC-14: صحة مقاييس الأداء الكلية (Perf Budget)
- **Type**: `rubric`
- **Dimension**: مدى التزام قسم الإعدادات بميزانية الأداء الواقعية من ضغطة حتى Interactive
- **Scale**: 1-5
- **Anchors**:
  1 = لا توجد perf marks ولا ميزانية ولا اختبار
  3 = توجد marks لكن بدون budget، 3 من 5 اختبارات أداء تمر
  5 = كامل الـ pipeline يوجد: clear → openRequest → firstPaint → interactive + report + budget + fallback timeout + session guard، ويمر settingsPerfBudget.test + settingsPerfMetrics.test + settingsPerformanceFastPath.test + settingsPerformanceCloseHonesty + observeSettingsSectionInteractive.test + phase14IntentWarmDeferral.test
- **Pass Threshold**: >= 4
- **Evidence**: إخراج vitest لجميع اختبارات الـ performance المذكورة

## Open Questions
- [ ] هل يسمح للمستخدم بزيادة عدد الثغرات المصححة لكل قسم فوق الثغرة الواحدة المعتمدة سابقاً إذا اكتشفنا فعلية أكثر من واحدة؟ (الافتراضي: تصحيح كل ثغرة حقيقية تُكتشف وثبتها أدلة رقمية بغض النظر عن عددها؛ المستخدم طلب صدق وأمانة وليس قيد عدد).
- [ ] هل يسمح بإنشاء اختبارات جديدة للمسارات التي نجدها بدون اختبار (dead branch)؟ (الافتراضي: نعم، كلما ثبت وجود gap فعلي).
