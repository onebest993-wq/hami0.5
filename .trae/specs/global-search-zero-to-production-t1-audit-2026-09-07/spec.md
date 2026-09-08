# Hami Global Search Tier-1 Zero-to-Production Honest Audit — Product Requirements Document

## Overview
- **Summary**: تدقيق فحص ذري كامل من الصفر لقسم البحث العام (Global Search Overlay + services/search + globalSearch shell hooks) طبقة بطبقة وسطر بسطر، بهدف الوصول إلى جاهزية إنتاجية Tier-1 فعلية بحيث لا يُعتمد على أي تدقيق أو تقرير سابق، بل كل استنتاج مُثبت برقمي ميداني من الكود أو تشغيل الاختبارات أو البوابات الرسمية.
- **Purpose**: الالتزام الصريح بتعليمات المستخدم التي ترفض الأسلوب المُكرر السطحي ("دفعه واحده على كل الاقسام")، وتطلب فحصًا فعليًا، صادقًا، مجهريًا، احترافيًا، يغطي: التحميل الأولي، التسخين قبل الفتح (Warm Probe)، الأداء، استجابة لوحة المفاتيح، سرعة بناء الفهرس، الخفة، النظافة، حذف الكود الميت/المكرر، جودة الكود، التقسيم، الحجم، ثغرات الأمن (XSS في نتائج البحث، تسرب بيانات حساسة في RecentSearches)، البرمجة، استعداد الموبايل (gesture swipe-to-dismiss، focus trap، safe-area)، كل زر وخاصية (حذف بحث حديث، اختيار نطاق البحث، التنقل في النتائج)، والإغلاق الجراحي الإنتاجي الصادق.
- **Target Users**: المستخدم النهائي للمحامي على الهواتف أثناء البحث السريع عن قضية/ملف/مستند + مهندس الإنتاج الذي يشغل البوابات + مهندس الصيانة الذي يقرأ الكود بعد 6 أشهر.

## Goals
1. فحص فعلي سطر بسطر لكل طبقة في قسم البحث (Portal → InstantPaintCover → SheetFrame → Host → OverlayChrome → Header/Input → ScopeChips → Idle/RecentSearches → ResultsPanel/ResultRow → KeyboardNav → IndexBuild Plan/Executor → PerfMetrics/Reporting) يثبت كل استنتاج برقمي ميداني (مسار الملف + رقم السطر + إخراج أمر).
2. اكتشاف وتصحيح كل ثغرة إنتاجية حقيقية في: الـ lifecycle hooks (Stale Closure / Session Guard / Fallback Timeouts على build index)، مقاييس الأداء (latest mark، clear marks قبل الفتح)، فتح/إغلاق الصدفة، التسخين `globalSearchLocalWarmProbe`، تسريب الذاكرة في observers، تلوث الجلسات عند reopen سريع.
3. التأكد من استعداد الموبايل: استجابة الإيماءات (swipe-to-dismiss من `useGlobalSearchOverlayDismiss.ts`)، تعليق non-visible، تعطيل التركيز في الصفحات inert عبر `useGlobalSearchOverlayShell.ts`، escape stack LIFO، focus trap في حقل الإدخال + التنقل بالأسهم.
4. فحص الأمن: (أ) لا تسرب بيانات حساسة (جريمة/ملف محمي) في `readGlobalSearchRecentSearchesSync` مع `globalSearchNavigateSecurity`؛ (ب) لا XSS في ResultRow عبر `searchDisplayText` + `globalSearchHighlightPattern` (HTML escape إلزامي)؛ (ج) WIFE coverage لـ routes متعلقة بالبحث السحابي إن وجدت؛ (د) لا supabase.from مباشر في الكلاينت.
5. فحص النظافة: الكود الميت (dead exports / dead imports / unused utils)، التكرار في `searchIndexBuildPlan` vs `searchIndexBuildExecutor`، الوزن (import size thresholds للـ fuse.js/workers)، وجود كل من: GlobalSearchInstantPaintCover، SheetBody، ErrorBoundary.
6. الإغلاق الإنتاجي الصادق: إغلاق جراحي perfect (blur input، تصفير query، إيقاف بناء الفهرس الجاري، إزالة inert، snap DOM، unhook observers، تصفير refs).
7. تشغيل بوابة الإنتاج الرسمية `global-search-production-gate.mjs` وتسجيل نتيجتها الصادقة، تشغيل كل `honesty` test خاص بالبحث.

## Non-Goals
- عدم إعادة تصميم بصري أو تغيير السلوك الوظيفي المرئي (ZVF 100% ملزم).
- عدم إصلاح اختبارات flaky بيئية سببها VMM (تُصنف وثائقياً كـ timing flake فقط).
- عدم إنشاء وثائق `*.md` جديدة إلا إذا طلب المستخدم صراحة.
- عدم إضافة ميزات جديدة؛ فقط إصلاح الثغرات المكتشفة (Bugfix-only scope).
- عدم لمس أقسام أخرى في لوحة المحامي خارج GlobalSearchOverlay + services/search + shell hooks الخاصة بالبحث.

## Background & Context
1. المستخدم رفض صراحة الأسلوب السابق ("دفعه واحده على كل الاقسام خطاء قد يجعلك تعلوس او لا تبحث وتفحص بشكل دقيق وشامل ومجهري").
2. الموردين الرسميين الذين يُشتق منه نطاق القسم:
   - مجلد المكونات الفعلي: [GlobalSearchOverlay](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/GlobalSearchOverlay)
   - خدمات البحث: [services/search](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/search)
   - هوكات صدفة لوحة المحامي للبحث: [hooks/lawyerDashboard/globalSearch](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch) + [useGlobalSearchShellLifecycle](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle.ts)
3. حجم القسم ميداني: ~80 ملف TS/TSX في Overlay + 30 ملف خدمة في search + 6 ملفات shell hooks = ~115 ملف إنتاج + 35+ اختبار مباشر.
4. بوابة الإنتاج الرسمية: `scripts/global-search-production-gate.mjs` موجودة مسبقًا.
5. الأدلة الميدانية الأولية (قبل أي تعديل) التي تساق في الأسطر التالية هي مصدر الحقيقة الوحيد لهذا التدقيق.

## Functional Requirements
- **FR-1**: كل زر في البحث له path حقيقي واختبار يُثبت وظيفته: (أ) Keyboard shortcut للفتح؛ (ب) Clear recent search × per row؛ (c) Clear-all recent searches؛ (د) اختيار/إلغاء نطاق البحث scope chip؛ (هـ) التنقل بالأسهم ↑↓ + Enter + Escape. كل زر غير موجود يُدرج كـ gap مع دليل عدم وجود import أو test.
- **FR-2**: فتح القسم من لحظة الضغط على اختصار البحث / زر البحث → Clear Marks → Open Request → First Paint → Arm Focus → build index إذا لم يكن مُسخن → Interactive → Hydrate Results → إغلاق Close Surgical. كل خطوة لها دليل سطر واختبار.
- **FR-3**: التسخين (warm-up) قبل الفتح عبر `globalSearchLocalWarmProbe` لا يُركّب Host ويستخدم probe فقط؛ وله اختبار يُثبت الفرق بين warm (probe) و arm (build index).
- **FR-4**: الإغلاق الجراحي يعيد التركيز للعنصر الذي فتح القسم، يُلغي جميع الـ timers و index-build workers و observers و subscriptions، يُصيغ inert للصفحة، يُنفّذ snap DOM للإغلاق.
- **FR-5**: نطاقات البحث (Lawsuit/Criminal/Vault/File/Execution/Forum/Notes) كلها لها اختبار في `searchScopes.test.ts` واختبار في `searchResultSections.test.ts` واختبار `searchUiState.test.ts` للإختيار والتفعيل.
- **FR-6**: كل نتيجة بحث حساسة (جريمة/ملف محمي) لها flow guard في `globalSearchNavigateSecurity.ts` قبل التنقل؛ يتم اختبار عدم تسربها في Recent Searches.

## Non-Functional Requirements
- **NFR-1 (الدقة الصادقة)**: كل AC `rule` يمر فقط بعد تشغيل الأمر فعلياً وتسجيل إخراجه رقمياً في Completion Evidence. لا يُسمح بالاستنتاج النظري أو "يعمل بنفس نمط قسم الإعدادات".
- **NFR-2 (ZVF 100%)**: كل تعديل للكود يجب أن يترك DOM الظاهر، التركيب البصري، السلوك الوظيفي، CSS tokens، سوية القياسات كما هو دون أي تغيير قابل للقياس.
- **NFR-3 (الأداء / Cold Start)**: open-request → interactive ≤ 400ms على شبكة 4G (محاكاة عبر perf marks داخل الاختبارات الرسمية)، بما في ذلك أول بناء للفهرس على 10k قضايا + 5k مستندات.
- **NFR-4 (الأداء / Reopen)**: عند إعادة الفتح بعد إغلاق سريع، لا يحدث تلوث تقارير (Stale Closure Rejection عبر Session Guard) ولا يستمر index-build قديم في الخلفية.
- **NFR-5 (الأمن)**: (أ) جميع مكالمات البحث السحابي تمر عبر SecureAPIClient ولا تستخدم supabase.from مباشرة في الكلاينت؛ (ب) كل نص يتم highlight في ResultRow يكون HTML-escaped قبل injection؛ (ج) RecentSearches لا يُخزن أي سجل يمر عبر `globalSearchNavigateSecurity` كـ sensitive.
- **NFR-6 (النظافة)**: لا يوجد dead import، ولا export غير مستخدم، ولا function موجودة إلا إذا استدعت من test أو مسار حقيقي؛ الوزن الإجمالي لـ Search bundle ضمن ما يفرظه global-search-production-gate + settingsOpenSizeHonesty.
- **NFR-7 (الموبايل)**: كل خاصية تعمل مع keyboard nav + swipe-to-dismiss gesture + inert في خلفية الصفحة + تعليق الـ timers في background (سلوك مشابه لـ useSettingsMobileSuspend مع مراعاة build index cancel).
- **NFR-8 (جودة الكود)**: error prefix بتنسيق `[search:opcode] message`، استخدام نمط sessionIdCounter + sessionIdRef + activeSessionIdRef في كل lifecycle hook يحتوي على timeout callback أو index-build worker.
- **NFR-9 (الاستقرار البواباتي)**: `global-search-production-gate.mjs` يمر PASSED بدون Blockers.

## Constraints
- **Technical**: Node على Windows (PowerShell 5)، Vitest runner، `scripts/global-search-production-gate.mjs` كبوابة رسمية. لا تعديل خارج مجلدات الـ 3 المذكورة في Non-Goals إلا لو كان fix يتطلب تصحيحاً في ملف مشترك (يُوثق ويتأكد من خلال الاختبار أن ZVF لا يتأثر).
- **Business**: ZVF 100% ملزم على كامل قسم البحث. أي تعديل يغير الـ computed style أو DOM الظاهر يُصنف خطأ ويرجع.
- **Dependencies**: يعتمد على `src/app/services/search/*`، و `src/app/hooks/lawyerDashboard/globalSearch/*`، و `src/app/components/lawyer/GlobalSearchOverlay/*`، + `src/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle.ts` فقط.

## Assumptions
1. إعدادات البيئة dev مقبولة (بلا مفتاح حقيقي لـ Supabase/WIFE Redis) وفق ما تُشغّله البوابات رسمياً في وضع الـ dev.
2. الـ timing flake ≤ 50ms في 1 اختبار من 35 يُصنف timing flake ويوثق وليس عائقاً للإطلاق.
3. اختبارات `*.liveEnv.test.ts` أو التي تحتاج Supabase حقيقي تُصنف خارج النطاق إن فشلت بسبب عدم وجود env.

## Acceptance Criteria

### AC-1: هوك useGlobalSearchShellLifecycle نمط Session Guard صحيح داخل build index / timeout
- **Type**: `rule`
- **Given**: ملف [useGlobalSearchShellLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle.ts) مفتوح للقراءة
- **When**: نفرض وجود أي setTimeout/setInterval/async callback / worker index-build داخل هوك الـ lifecycle أو `searchIndexBuildExecutor`
- **Then**: أنماط `let sessionIdCounter = 0;` على مستوى الملف + `sessionIdRef` + `activeSessionIdRef` داخل الهوك + مقارنة `if (sessionIdRef.current !== activeSessionIdRef.current) return;` داخل الـ callback كلها موجودة
- **Pass Condition**: grep للنمط الثلاثي يعيد matches متصلة داخل نفس الهوك مع وجود guard داخل كل closure تؤدي إلى mark / report / index build
- **Evidence**: grep output فعلي + أرقام أسطر داخل الاختبار الرسمي `useGlobalSearchShellLifecycle.test.ts`

### AC-2: هوك useGlobalSearchHostLifecycle (في مجلد globalSearch shell hooks) نمط Session Guard صحيح
- **Type**: `rule`
- **Given**: ملف [useGlobalSearchHostLifecycle.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle.ts)
- **When**: يحتوي الهوك على أي setTimeout أو async import.then أو fallback بانتظار arm-focus
- **Then**: نفس نمط Session Guard (AC-1) مطبق + cleanup لجميع الـ observers و timers و workers خارج الـ closure عبر دالة موحدة cleanupActiveGuards
- **Pass Condition**: وجود نمط guard في كل callback يمكن أن يُنفذ بعد أن أصبحت الجلسة stale
- **Evidence**: Read لأسطر الهوك فعلياً + اختبارات `globalSearchShellOpenFlow.test.ts`

### AC-3: Clear Marks قبل Open دائمًا في مسار الفتح الرسمي
- **Type**: `rule`
- **Given**: ملف [globalSearchShellOpenFlow.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow.ts)
- **When**: استدعاء commitGlobalSearchShellOpen() لأول مرة أو reopen بعد close
- **Then**: `clearGlobalSearchPerfMarks()` (أو مكافئها) تُستدعى قبل `markGlobalSearchPerfPhase('open-request')`
- **Pass Condition**: ترتيب الأسطر داخل دالة الفتح الرسمي يُظهر Clear ثم Open Request، وليس العكس
- **Evidence**: Read لأسطر الدالة + إخراج `globalSearchShellOpenFlow.test.ts`

### AC-4: مقاييس الأداء تعتمد آخر mark (latestPerfMark) وليس الأول
- **Type**: `rule`
- **Given**: ملف [globalSearchPerfMetrics.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/search/globalSearchPerfMetrics.ts)
- **When**: جلسة ثانية تفتح البحث بعد جلسة سابقة
- **Then**: دالة `getGlobalSearchOpenToInteractiveMs()` تستخدم `entries[entries.length - 1]` وليس `[0]`
- **Pass Condition**: وجود last-index في دوال الحصول على delta، مع اختبار يحاكي تعدد الفتحات
- **Evidence**: grep لـ `.length - 1` + إخراج `globalSearchPerfMetrics.test.ts`

### AC-5: الإغلاق الجراحي الصحيح لصدفة البحث (cancel index build + blur input + snap + clear refs)
- **Type**: `rule`
- **Given**: ملف [globalSearchShellExit.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellExit.ts) + هوك [useGlobalSearchOverlayExit.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayExit.ts)
- **When**: الضغط على Escape أو Back أو زر Close أو Native Back في الموبايل أو Swipe-to-dismiss
- **Then**: (1) إلغاء timers و subscriptions و observers و **إلغاء index build worker الجاري** عبر `AbortController` أو مكافئ؛ (2) إعادة التركيز للعنصر السابق (focusBack / blur input)؛ (3) snap DOM عبر runtime معكوس للفتح؛ (4) تصفير reportedRef لسماح reopen لاحقة؛ (5) تصفير query + scope state لمنع استعادة قديمة عند reopen؛ (6) وضع inert لخلفية الصفحة
- **Pass Condition**: الاختبارات `globalSearchShellExit.test.ts` + `useGlobalSearchOverlayDismiss.test.tsx` + `globalSearchSectionCloseHonesty.test.ts` تمر كلها
- **Evidence**: إخراج vitest verbose للملفات الثلاثة

### AC-6: الواجهات الخمس (Idle/RecentSearches/ScopeChips/ResultsPanel/ResultRow) كلها لها اختبار تحميل + أمن تصعيد + HTML escape
- **Type**: `rule`
- **Given**: ملفات ResultRow + RecentSearchesPanel + SearchScopeChipList + SearchResultsPanel + SearchIdlePanel داخل GlobalSearchOverlay
- **When**: نفترض وجود recent search storage + highlight pattern + nav security guard
- **Then**: كل واجهة لها اختبار .test.tsx يثبت render، keyboard nav، الـ HTML-escape في `globalSearchHighlightPattern`، و `globalSearchNavigateSecurity` قبل تنقل نتيجة
- **Pass Condition**: اختبارات الـ 5 واجهات موجودة، كلها PASSED + `globalSearchQuerySecurity.test.ts` PASSED + `globalSearchHighlightPattern.test.ts` PASSED
- **Evidence**: ls للاختبارات الموجودة + vitest verbose

### AC-7: الأمن — لا supabase.from مباشرة داخل كلاينت البحث + RecentSearches لا يحفظ sensitive + HTML escape في highlight
- **Type**: `rule`
- **Given**: كل ملفات البحث في المجلدات الثلاثة ما عدا `src/app/api/*` و `src/app/services/*/cloud*.ts`
- **When**: (أ) grep نمط `supabase\s*\.\s*from\s*\(` في ملفات GlobalSearchOverlay و services/search؛ (ب) grep `search:sensitive` في `readGlobalSearchRecentSearchesSync`؛ (ج) تشغيل `globalSearchHighlightPattern.test.ts` مع نص يحتوي `<script>`
- **Then**: (أ) صفر matches داخل ملفات الكلاينت غير الاستثناء المعروف؛ (ب) نتيجة الحساسة لا تُضاف إلى RecentSearches؛ (ج) النص `<script>` يُحوّل إلى entities داخل الـ highlight
- **Pass Condition**: 0 نتائج grep supabase + 2 اختبارات أمن PASSED
- **Evidence**: grep output فعلي + إخراج الاختبارات

### AC-8: الأمن — التنقل من نتائج البحث يستخدم `globalSearchNavigateSecurity` كـ gate قبل push
- **Type**: `rule`
- **Given**: النتائج: نطاق الجرائم، نطاق الملفات المحمية
- **When**: نقرة / Enter على نتيجة属于敏感类 (جريمة / ملف محمي)
- **Then**: وجود استدعاء `globalSearchNavigateSecurity.verifyOrRedirect(...)` قبل `router.push` / `navigate` فعلي، مع اختبار PASSED
- **Pass Condition**: grep لـ `globalSearchNavigateSecurity` داخل ResultRow / ResultsBody / keyboard nav execute + اختبار `globalSearchNavigateSecurity.test.ts` PASSED
- **Evidence**: grep + إخراج الاختبار

### AC-9: جودة الكود — رسائل الخطأ ملزمة بالبادئة [search:opcode]
- **Type**: `rule`
- **Given**: كل throw statements و reject / onError callbacks داخل مجلدات البحث الثلاثة
- **When**: grep نمط `throw new Error\(` أو `Promise.reject\(`
- **Then**: كل رسالة تبدأ بالبادئة `[search:` تليها opcode ثم مسافة ثم الرسالة (أو استثمارات موثقة بـ `// WONTFIX` إن وجدت مثل throw للخطأ من supabase)
- **Pass Condition**: ≥ 95% من throw statements تطابق البادئة؛ exceptions موثقة بـ // WONTFIX comment
- **Evidence**: grep نتائج عددي + تعديلات على الأقل 5 throw للملفات التي تفتقر للبادئة

### AC-10: النظافة — لا dead imports / dead exports قابلة للحذف + فهارس الـ build plan / executor لا تحتوي كود مكرر قابل للإزالة
- **Type**: `rule`
- **Given**: كل ملفات البحث غير الاختبارات
- **When**: التشغيل اليدوي للأمانة (honesty tests): `globalSearchCleanlinessHonesty.test.ts` + `globalSearchLatentBugsHonesty.test.ts` + `globalSearchRemainingCompletionHonesty.test.ts` + `globalSearchVisualLightnessHonesty.test.ts`
- **Then**: كل الاختبارات الأمانة الأربعة تمر PASSED
- **Pass Condition**: 4/4 ناجحة (أو ≥ 9/10 عند وجود أكثر من 10 honesty tests)
- **Evidence**: إخراج vitest verbose

### AC-11: بوابة الإنتاج الرسمية للبحث PASSED بدون Blockers
- **Type**: `rule`
- **Given**: الأمر `node scripts/global-search-production-gate.mjs`
- **When**: التشغيل فعلياً بعد إغلاق كل الثغرات المكتشفة
- **Then**: مخرجات تُطبع Gate result = PASSED مع Test Files N passed (N) بدون أي خطأ
- **Pass Condition**: exit code = 0 و last line = PASSED
- **Evidence**: إخراج أمر node كامل مع الأرقام

### AC-12: استعداد الموبايل وإدارة Gestures (swipe-to-dismiss + safe-areas + focus arm في الكيبورد الغشائي)
- **Type**: `rubric`
- **Dimension**: مستوى اكتمال جودة تجربة الموبايل لقسم البحث
- **Scale**: 1-5
- **Anchors**:
  1 = لا escape stack، لا focus trap، لا inert، لا swipe-to-dismiss، لا safe-area insets في SheetFrame
  3 = بعض الأجزاء موجودة لكنها غير مُتصلّة؛ يمر 50% من اختبارات الموبايل
  5 = كل شيء متصل (LIFO escape stack + focus trap + swipe dismiss velocity threshold + inert policy + focus arm للوحة المفاتيح + safe-areas في SheetFrame + suspend في background) ويمر 100% من اختبارات الموبايل الرسمية
- **Pass Threshold**: >= 4
- **Evidence**: إخراج اختبارات `GlobalSearchInstantSheetChrome.test.tsx` + `GlobalSearchInstantPaintCover.test.tsx` + `useGlobalSearchOverlayDismiss.test.tsx` + `useGlobalSearchInputFocus.test.tsx` + `globalSearchSectionCloseHonesty.test.ts` + `globalSearchVisualDensity.test.ts`

### AC-13: حجم الكود و Chunk Weight (Lazy Index Build / Fuse Worker / Recent Prefetch)
- **Type**: `rubric`
- **Dimension**: مدى التزام قسم البحث بحدود الوزن والتحميل التدريجي دون إدخال ثقل زائد عند الفتح الأولي
- **Scale**: 1-5
- **Anchors**:
  1 = كل الفهارس (Lawsuit/Criminal/Vault/File) + fuse.js تُحمل غليظة في أول render واحد دون أي chunk
  3 = بعض الفهارس lazy، لكن fuse.js والـ vault index يُحمل معاً دون splitting أو worker
  5 = كل نطاق، ResultRow heavy component، RecentSearches peek، globalSearchLocalWarmProbe مُجزّأ dynamic import / `globalSearchIndexWorkerClient`، ويمر `globalSearchVisualLightnessHonesty.test.ts` + `globalSearchCleanlinessHonesty.test.ts` + `codeSplitFirstOpenHonesty.test.ts` لمسار البحث
- **Pass Threshold**: >= 4
- **Evidence**: إخراج `globalSearchVisualLightnessHonesty.test.ts` + `globalSearchOpenSizeHonesty` (إن وجد) + read لملف `globalSearchIndexWorkerClient.ts` و `globalSearchLocalWarmProbe.ts`

### AC-14: صحة مقاييس الأداء الكلية (Perf Budget + Report + Build Plan Executor)
- **Type**: `rubric`
- **Dimension**: مدى التزام قسم البحث بميزانية الأداء الواقعية من ضغطة حتى Interactive + Index Build
- **Scale**: 1-5
- **Anchors**:
  1 = لا توجد perf marks ولا ميزانية ولا اختبار ولا reporting
  3 = توجد marks لكن بدون budget، 3 من 5 اختبارات أداء تمر؛ الـ build index لا يفصل plan عن executor
  5 = كامل الـ pipeline يوجد: clear → openRequest → firstPaint → focusArmed → indexBuildPlanned → indexBuildExecuted → interactive + report + budget + fallback timeout + session guard، ويمر `globalSearchPerfBudget.test.ts` + `globalSearchPerfMetrics.test.ts` + `searchIndexBuildPlan.test.ts` + `searchIndexBuildExecutor.test.ts` + `globalSearchLocalWarmProbe.test.ts` + `globalSearchShellOrchestration.test.ts`
- **Pass Threshold**: >= 4
- **Evidence**: إخراج vitest لجميع اختبارات الـ performance المذكورة

## Open Questions
- [ ] هل يسمح للمستخدم بزيادة عدد الثغرات المصححة لكل قسم فوق الثغرة الواحدة المعتمدة سابقاً إذا اكتشفنا فعلية أكثر من واحدة؟ (الافتراضي: تصحيح كل ثغرة حقيقية تُكتشف وثبتها أدلة رقمية بغض النظر عن عددها؛ المستخدم طلب صدق وأمانة وليس قيد عدد).
- [ ] هل يسمح بإنشاء اختبارات جديدة للمسارات التي نجدها بدون اختبار (dead branch مثل click على result sensitive)؟ (الافتراضي: نعم، كلما ثبت وجود gap فعلي).
