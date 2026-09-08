# خطة الفحص الذري الإنتاجي لـ Community Screen (المنتدى/Forum)

## Repository Research — الخلفية والأولوية

### لماذا Community Screen أولاً؟
يُصنف القسم ضمن 3 أقسام أولوية عالية للمخاطر الإنتاجية بناءً على أدلة ميدانية فعلية:

1. **حجم القطعة (Chunk Size):** يظهر بوضوح في:
   - [check-min-chunk-size.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/check-min-chunk-size.mjs#L32) ضمن `community` على قائمة الـ min chunk size المحسوبة
   - [overlayEntryChunks.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/overlayEntryChunks.ts#L13) يُشير إلى **~1.4 MB** كوزن إجمالي للمنتدى: "ليس هنا — hover/فتح عبر forumIntentWarm و communityShellOpenFlow"
   - [guard-first-open-shared-tax.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/guard-first-open-shared-tax.mjs#L139-L148) يفحص community chunks بشكل منفصل (communityChunks) ضمن ضرائب first-open shared

2. **وجود بوابة إنتاجية رسمية:**
   - [forum-production-gate.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/forum-production-gate.mjs) بوابة `gate:forum` تغطي:
     - المسارات الحرجة: shellOpenFlow، lazyImports، loader، hydrator، overlayEntry
     - الاختبارات: shell open/exit tests، boot hydrator tests، publish guard/draft/commit، feed policy، comments، lazy sections، permissions

3. **WONTFIX سابق غير مُفحوص:** في ذاكرة المشروع السابقة تم اتخاذ قرار "WONTFIX" لـ CommunityScreen و LawyerDashboardInner فقط لسبب "ضمان تجربة تنقل فوري (Instant Navigation)" — **بدون فحص ذري عميق لمسارات first-open / warm-up / cleanup / reopen**. هذا الوضع يُعتبر "نقطة أعمى إنتاجية" (Production Blind Spot) عالية المخاطر.

4. **تعدد طبقات Lifecycle المعقدة:** من استكشاف شجرة CommunityScreen hooks:
   - 9 هوكات تحكم رئيسية: useCommunityScreenController / useCommunityScreenShell / useCommunityScreenInteractions / useCommunityScreenKeepAliveDismiss / useCommunityScreenForumEscape / useCommunityScreenPropModel (من [forumDockSectionSurgicalCloseHonesty.test.ts:463-475](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/__tests__/forumDockSectionSurgicalCloseHonesty.test.ts#L463-L475))
   - هوكات تغذية: Feeds / Paging / ThreadFollow / SocialGraph (10+ ملفات إضافية)
   - هوكات نشر: AddQuestion (Attachment / Voice / Publish) — 3 ملفات متداخلة
   - هوكات تعليقات: Write / Add / Mutate / Signals / Actions — 6 مستويات من التعقيد
   - هوكات إدارة متأخرة: LazySectionMount — قسم الـ "كسول" من الشاشة (الذي لم يكن خاضعًا لفحص lifecycle حتى الآن)

### ماذا تم فحصه حتى الآن؟
**لا شيء على مستوى الفحص الذري الصفري → القسم.** الجولات السابقة غطّت فقط:
- طبقة القياسات (perf metrics: latestPerfMark + reopen session) في forumPerfMetrics.ts
- طبقة Shell Lifecycle (cleanup + session guard) في الأقسام الـ 3 السابقة (GS / Notif / Settings)

**لم يتم فحص:**
- مسار communityShellOpenFlow بالكامل (Trigger → Perf Marks Reset → Instant Paint → Chunk Load → Hydration)
- useCommunityScreenLifecycle إذا كان موجودًا أو هوك Controller
- مسار الإغلاق: KeepAlive dismiss + Escape handler + surgical close
- مسار التسخين: forumIntentWarm (Hover vs Open)
- Session reset عند Reopen داخل نفس الجلسة
- تلوث القياسات عبر multi-session
- أي تسريب ذاكرة في الـ 9+ هوكات عند الإغلاق والفتح المتكرر

---

## Files and Modules — نطاق الفحص بالملفات (قراءة فقط ثم تعديل واحد محافظ بحد أقصى)

### الطبقة 0: بوابة الإنتاج والمرجعية
- [forum-production-gate.mjs](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/scripts/forum-production-gate.mjs) — قراءة فقط: تعرّف على ما تختبره البوابة الرسمية لتحديد الثغرات خارج التغطية

### الطبقة 1: مسار الفتح (Open Flow)
- [communityShellOpenFlow.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts) — **مرشح أساسي**: هل هناك clearPerf + mark؟ هل هناك in-flight guard؟ هل هناك حماية من الفتح أثناء الإغلاق؟
- [communityLazyImports.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/community/communityLazyImports.ts) — استيرادات كسولة وتسخين

### الطبقة 2: Runtime (Loader / Hydrator / Readiness / OverlayEntry)
- [communityHubLoader.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/communityHubLoader.ts) — هل هناك دالة `isCommunityScreenModuleResolved()` صحيحة؟
- [communityBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/communityBootHydrator.ts) — ترتيب الـ hydration + microtask policy
- [communityHubReadiness.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/communityHubReadiness.ts) — صحة دائرة الاستيراد المغلقة
- [communityOverlayEntryLoader.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/communityOverlayEntryLoader.ts) — comment L3 يذكر: "بدون هذا الـ prefetch يعلق Suspense على InstantShell عند أول نقرة" → تحقق من صحة هذا الضمان

### الطبقة 3: Lifecycle و Controller داخل CommunityScreen
- [hooks/useCommunityScreenController.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenController.ts) — الـ master hook (تحكم + feeds + interactions + keepAlive + escape + prop model) → **أعلى احتمال لوجود ثغرات lifecycle/cleanup**
- [hooks/useCommunityScreenShell.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenShell.ts) — shell open/close/inert
- [hooks/useCommunityScreenKeepAliveDismiss.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenKeepAliveDismiss.ts) — مسار keep alive + cleanup عند الخروج
- [hooks/useCommunityScreenForumEscape.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenForumEscape.ts) — Escape key + back handler
- [hooks/useCommunityScreenLazySectionMount.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenLazySectionMount.ts) — تحميل كسول للأقسام الداخلية → هل هناك cleanup عند إغلاق قبل حلول الوقت؟

### الطبقة 4: طبقة القياسات (Perf Metrics)
- **ابحث عن ملف perf metrics:** `services/forum/*PerfMetrics.ts` أو `services/community*` → تحقق من نمط latestPerfMark (قد تم إصلاحه في الجولة السابقة لكننا نتحقق من session reset في open flow)

### الطبقة 5: اختبارات المرجعية
- [communityShellOpenFlow.test.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/hooks/lawyerDashboard/community/__tests__/communityShellOpenFlow.test.ts) — ما هي الافتراضات الحالية؟
- [communityBootHydrator.test.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/__tests__/communityBootHydrator.test.ts)
- [forumDockSectionSurgicalCloseHonesty.test.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/__tests__/forumDockSectionSurgicalCloseHonesty.test.ts) — مرجعية سلوكية للـ surgical close

---

## Implementation Steps — 9 مراحل للفحص الذري (Zero-to-Section)

> القاعدة الصارمة: **لا تعديل في 8 مراحل الأولى** — كلها قراءة وتوثيق وتحليل للثغرات. التعديل يأتي في المرحلة 9 فقط، وثغرة واحدة على الأكثر، واختبار مركزة واحد على الأكثر.

### المرحلة 1 (قراءة): بناء مسار الفتح من الصفر
اقرأ `communityShellOpenFlow.ts` كاملًا + forumIntentWarm. وثّق:
1. ترتيب العمليات: clear perf marks → mark open-request → instant paint → set state → chunk load
2. هل هناك `clearCommunityPerfMarks()` قبل `mark('open-request')`؟
3. هل هناك in-flight guard ضد الفتح المتداخل أثناء إغلاق سابق؟
4. هل هناك `showCommunityRef` مثل باقي الأقسام؟
5. هل هناك reset session id أو guard ضد stale callback؟

### المرحلة 2 (قراءة): Instant Paint + Shell DOM السمات
ابحث عن ملف `communityInstantPaint.ts` أو ما يعادله في runtime. تحقق مما إذا كان هناك:
1. سمات `data-hami-community-open` / `data-hami-community-closing` على `<html>`
2. دالة `paintCommunityInstantChrome()` قبل React state set
3. دالة `beginCommunityShellExit(onDone)` للإغلاق مع animation + transitionend + fallback timer
4. cleanup لـ motion في حال reduced motion

### المرحلة 3 (قراءة): Chunk Loading (4 ملفات runtime)
اقرأ communityHubLoader + communityOverlayEntryLoader + communityHubReadiness. تحقق:
1. هل `communityOverlayEntryLoader.ts` الحماية المذكورة في L3 من تعليق Suspense فعالة حقًا؟
2. هل `isCommunityScreenModuleResolved()` صحيحة (لا تُرجع true إلا بعد resolve فعلي + لا تُرجع false بعد true)؟
3. هل هناك double mark لـ `chunk-ready` (إذا كان مُحمل مسبقًا، يتم العلامة مرة؛ ثم بعد resolve مرة ثانية إذا كان معلقًا)؟

### المرحلة 4 (قراءة): Boot Hydration
اقرأ communityBootHydrator.ts. تحقق:
1. هل `bindCommunityBootHydrator()` تعيد دالة cleanup `() => void` صحيحة؟
2. هل `hydrateCommunityShellForInstantOpen(true)` تعمل على microtask ولا تعيق first-paint؟
3. هل هناك حماية من استدعاء hydrate مرتين متتاليتين قبل الأول؟

### المرحلة 5 (قراءة): Lifecycle الداخلي داخل CommunityScreen
اقرأ useCommunityScreenController.ts (والمتفرعة منه 4 هوكات رئيسية). تحقق:
1. هل هناك هوك لـ lifecycle داخلي مسؤول عن first-paint / interactive / report perf؟
2. هل هناك observer + fallback (مثل نمط observe*Interactive في الأقسام الأخرى)؟
3. هل هناك cleanup صريح عند إغلاق الشاشة أو عند تغيير keepAlive؟
4. هل هناك session guard ضد stale callbacks من هوكات إدارة التغذية (paging/feed)?
5. **أهم:** عند إغلاق الشاشة قبل انتهاء الـ feed bootstrap — هل يتم إلغاء pending requests أو timers؟

### المرحلة 6 (قراءة): Keep Alive Dismiss + Surgical Close
اقرأ useCommunityScreenKeepAliveDismiss.ts + useCommunityScreenForumEscape.ts. تحقق:
1. هل surgical close يلغي جميع الـ in-flight operations؟
2. هل هناك حماية من Escape key أثناء publishing؟
3. عند dismiss مع keep alive هل تبقى البيانات أو يتم تفريغها بعد فترة؟

### المرحلة 7 (قراءة): Lazy Section Mount + Post Moderation + Social Bootstrap
اقرأ 3 هوكات إدارة المتأخرات. تحقق:
1. عند إغلاق الشاشة قبل انتهاء فترة الـ lazy section mount — هل يتم تنظيف timers/intersection observers؟
2. هل هناك أي تسريب listeners بعد إغلاق الشاشة؟

### المرحلة 8 (تحليل): استخلاص الثغرات وتصنيفها حسب الخطورة
أدرج جميع الثغرات في جدول ثم اختر **ثغرة واحدة فقط** ذات أولوية عالية وفق هذه المعايير:
- ❌ لا تختار ثغرة cosmetic أو تقتصر على missing test
- ✅ اختر ثغرة تؤثر على: correctness الإغلاق / تسريب ذاكرة / تلوث قياسات / فشل cold open / استجابة مستخدم سيئة
- ✅ يجب أن تكون الثغرة قابلة للإصلاح بـ **ZVF 100%** (لا تغيير بصري، لا تغيير سلوكي مرئي)
- ✅ يجب أن تكون الثغرة **مؤكدة بأدلة في الكود** وليس تخمينًا

### المرحلة 9 (تنفيذ — الوحيدة التي تعدل الكود):
1. تطبيق إصلاح واحد محافظ للثغرة المختارة (تعديل واحد على الأكثر)
2. إضافة اختبار مركزة واحد يثبت وجود الثغرة ثم إصلاحها
3. تشغيل اختبارات البوابة المحيطة (shell open/boot hydrator/surgical close/lazy section)
4. التحقق من TypeScript Diagnostics = [] على الملفات المعدلة

---

## Dependencies and Considerations — قيود واعتبارات

### قيود لا تخترق أبدًا (ZVF 100%):
1. **تجميد بصري تام:** لا تعديل في CSS، سمات DOM ظاهرة، نصوص، ترتيب عناصر، ألوان، مواضع.
2. **تجميد سلوكي مرئي:** لا تغيير في ترتيب ظهور الأقسام، سرعة الحركة، timeout ظاهر للمستخدم، سلوك back/escape.
3. **التعديلات فقط في طبقات:** lifecycle cleanup / session reset / perf marks correctness / in-flight guards داخل هوكات أو ملفات runtime (services/hooks/runtime فقط).

### اعتبارات خاصة بـ Community Screen:
- الشاشة تستخدم KeepAlive policy في بعض الحالات → هذا يعني أن isOpen=false قد لا يعني unmount كامل → تحقق جيد من أن cleanup لا يهدم حالة مطلوبة للـ keep alive.
- الوزن الضخم (1.4 MB) يعني أن أي تعديل يجب أن لا يُدخل ثقلاً ثابتًا في الشاشة الرئيسية → جميع الـ imports الجديدة (إن لزمت) يجب أن تكون lazy داخل useEffect فقط.
- forumDockSectionSurgicalCloseHonesty.test.ts هو "جدار صداقة" — أي تعديل يخترق سلوك الإغلاق سيُمسك بهذا الاختبار.

### التبعيات الحالية المعروفة:
- depends on sectionChunkPreload.ts → overlayEntryChunks.ts
- depends on boot LOADER_HYDRATOR_ORDER.md L19 (communityBootHydrator)

---

## Validation — بوابات التحقق (بترتيب التشغيل)

1. **اختبارات مركزة للثغرة المُصنفة:** مجرد الملفات المتعلقة فقط (ملف واحد أو اثنين كحد أقصى).
2. **اختبارات المرجعية الرسمية من forum-production-gate.mjs L62-L98:**
   - communityShellOpenFlow.test.ts
   - communityBootHydrator.test.ts
   - communityLazySections.test.ts
   - communityAddQuestionPublishGuard/Draft/Commit tests
   - communityFeedPolicy.test.ts
   - communityPermissions.test.ts
   - communityCommentContent.test.ts
3. **اختبار صداقة الإغلاق:** forumDockSectionSurgicalCloseHonesty.test.ts (اختبار 1000+ سطور يلتقط أي كسر في surgical close policy)
4. **TypeScript Diagnostics:** الملفات المعدلة فقط، يجب أن تكون Diagnostics = [].
5. **عدم تشغيل اختبارات عامة أو E2E** (تشغيل مركزة فقط بناءً على طلب المستخدم).

---

## Risks — المخاطر وكيفية إدارتها

| المخاطر | مستوى | الإجراء المتخذ |
|--------|--------|----------------|
| تكسير سلوك surgical close بسبب تعديل في lifecycle hook | عالي | تشغيل forumDockSectionSurgicalCloseHonesty.test.ts كـ "Smoke Test" مباشرة بعد أي تعديل |
| تدمير Keep Alive state بسبب تنظيف زائد | متوسط | قبل أي cleanup في الإصلاح — تحقق من أن الشاشة ليست في keep alive mode عبر قراءة الـ keepAlive hook أولاً |
| تسريب event listeners بعد إغلاق الشاشة | متوسط | تم تصنيفه ضمن المرحلة 7 من الفحص؛ إن وُجد يُعالج فقط إذا كان ثغرة واحدة مختارة |
| ZVF breach بسبب تعديل data-* attributes على DOM | منخفض جدًا | جميع التعديلات المخططة داخل هوكات (useRef/useEffect cleanup) لا تمس DOM |
| Performance regression بسبب إضافة guards إضافية | منخفض جدًا | جميع الـ guards عبارة عن مقارنات عددية بسيطة (session id) + try/catch around stopObserve — مجهولة التكلفة |
