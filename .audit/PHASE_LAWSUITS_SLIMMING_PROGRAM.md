# برنامج تخفيف قسم الدعاوى (بلا أثر سلبي)

**بدء:** 2026-08-21  
**هدف:** تقليل الوزن (تحميل أولي، chunks، اعتماديات ثقيلة) دون كسر سلوك أو تصميم.

## قواعد صارمة
- لا تغيير بصري
- لا حذف منطق حي
- lazy بدل eager حيث المسار ليس first-paint
- الإبقاء على prefetch عند النية (hover/intent)
- قياس قبل/بعد حيث أمكن (LOC مسارات حرجة، عدد import ثقيل)

## محاور التخفيف
1. مسارات الإقلاع/Hub لا تسحب criminal/urgent/SmartFile كاملاً
2. توحيد lazy identities (registry vs local lazy)
3. تأجيل محركات ثقيلة حتى فتح الإضبارة
4. إزالة import جانبي غير ضروري من shells

## صدق
التخفيف ≠ حذف الميزات. إن تعذّر قياس bundle كامل، يُوثَّق أثر هيكلي (eager→lazy).

---

## Wave 1 — Safe slimming (2026-08-21)

### Done

| ID | Change | Effect |
|----|--------|--------|
| L0-1 / L1-5 | `lawsuitWorkspaceWarm`: `includeSecondary` default **false**, `secondaryDelayMs` default **2000**; runtimeEffects passes `includeSecondary: false` | فتح المخزن لا يسحب NewCase+SmartFile+جسر جزائي فوراً |
| L0-2 | `LawsuitsWorkspaceHost.primeCivilArchiveCore` → `loadLawsuitArchiveHubModule` (لا `loadArchivePortalModule`) | مسار الدعاوى بلا غلاف التنفيذ |
| L0-3 | hover بطاقات/تبويب جزائي → `prefetchCriminalListPath`; full/phased عند الفتح | تصفّح الأرشيف أخف |
| L0 View_Urgent | `Modal_Quick_Log` → lazy+Suspense عند `quickLogModal.isOpen` | dashboard المستعجل بلا modal ثابت |
| L1-3 | ثانوي Host: لا على mount؛ فقط FAB/`civil` tab؛ NewCase@800ms، SmartFile@12s | مسار الفتح يبقى خفيفاً؛ نية FAB محفوظة |
| L1-1 | `CriminalDashboardRequestsTab` يستخدم registry Lazies (shared preload identity) | Suspense يشارك preload مع tab prefetch |
| L0-4 lite | Portal: lazy **Flow + Admin** خلف `show*`; Judgment **eager** (keep-mounted) | تخفيف shell الإضبارة مع prefetch عند فتح SmartFile |

### Skipped / deferred (→ Wave 2 closed below)

| Item | Why |
|------|-----|
| Judgment section lazy | Keep-mounted contract — أول فتح انتقال مرحلة بلا chunk flash |
| `ActiveOrderFileView` static `Modal_Quick_Log` | خارج نطاق View_Urgent لهذه الموجة |
| Bundle size delta | لم يُقَس webpack/vite stats هذه الجلسة — الأثر هيكلي |

### Tests run (focused)
- phase15SectionFirstOpenCut, phase16LawsuitChromeCut, phase17ArchiveContentCut
- criminalDashboardLazyRegistry, criminalDashboardLoader, criminalOpenContract, criminalBootHydrator
- View_Urgent_And_Orders_Dashboard.render, LawsuitsWorkspaceShell.close
- heavyDashboardSectionWarm, lawsuitOpenContract, SmartFileModalPortal (إن وُجدت)

### Residual honesty
- Prefetch-on-intent (FAB hover/open، تبويب مستعجل، بطاقة جزائية hover خفيف، فتح إضبارة كامل) **محفوظ**.

---

## Wave 2 — Deep dossier / criminal hubs (2026-08-21)

### Done

| ID | Change | Effect (structural) |
|----|--------|---------------------|
| W2-1 | `SmartFileMainPanel`: `QuickActions` + `SessionAndRequestsHub` + `TimelineFeed` → `smartFileMainPanelLazyHubs` (preloadable) + Suspense `null` | ~47KB مصدر hubs خارج first paint chrome؛ prefetch عبر `prefetchSmartFileMainPanelSecondaryHubs` / shell widgets / timeline intent |
| W2-2 | `CriminalDashboardRequestsTab`: static `TrialsTab` → `LazyTrialsTab` registry + Suspense | ~45KB TrialsTab خارج eager tab؛ نفس preload مع نية requests / idle |
| W2-3 | `CriminalDashboardModalsHost`: `StageCloser` + `RequestsEntry` + SendToCassation / LegalArticle / Reopen / BailForfeiture → `criminalDashboardLazyModals` | ~100KB+ مودالات ثقيلة عند الفتح فقط؛ Suspense داخل `lazyModal` |
| W2-4 | `SmartFileModalContent`: `PersonalStatusSmartFileChrome` lazy خلف `isPersonalStatusFile` فقط | مدني لا يسحب chrome أحوال؛ prefetch عند personal |

### Approximate import wins (no vite analyze)
| Surface | Eager removed (approx source bytes) |
|---------|-------------------------------------|
| SmartFileMainPanel hubs | QuickActions ~5KB + SessionHub ~21KB + TimelineFeed ~22KB |
| RequestsTab | TrialsTab ~45KB |
| ModalsHost | StageCloser ~46KB + RequestsEntry ~38KB + 4 lighter modals ~21KB |
| SmartFileModalContent | PersonalStatus chrome ~7KB (civil path) |

### Prefetch preserved
- SmartFile open → secondary hubs preload identity
- Timeline expand / pointerenter → `LazyTimelineFeed.preload`
- Criminal requests tab intent / idle → `LazyTrialsTab` + heavy engines (Wave 1)
- Boot orchestrator still warms `criminalDashboardLazyModals` module map

### Still deferred
- ~~Judgment portal section remains eager (keep-mounted)~~ → Wave 3: shell eager؛ Appeal/Cross lazy
- ~~`trialSessionsEngine` still static in RequestsTab~~ → Wave 3: `trialSessionsDisplay` leaf
- Full vite/webpack chunk stats not measured this session

---

## Wave 3 — AOF / filters / archive leaves / judgment nested (2026-08-21)

### Done

| ID | Change | Effect (structural) |
|----|--------|---------------------|
| W3-1 | `ActiveOrderFileView`: `Modal_Quick_Log` → `activeOrderQuickLogLazy` + Suspense عند `isOpen`؛ prefetch من زر تبليغ التظلم | إضبارة المستعجل بلا Quick Log ثابت |
| W3-2 | `trialSessionsDisplay.ts`: types + normalize/filter/phantom؛ RequestsTab يستورد الورقة فقط؛ المحرّك يعيد التصدير | تبويب الطلبات بلا سلسلة decisionAppeal/cassation |
| W3-3 | Archive: `dossierFinality` + `sessionTimelineNumber` + `judgmentStageNames` (تصحيح)؛ Hearing/SmartStatus بلا gateway/engine ثقيل | FileGrid warm لا يسحب SmartFile engines |
| W3-4 | Judgment section: `SmartJudgmentModal` keep-mounted eager؛ `AppealTransition` + `CrossAppeal` lazy خلف `show*` + prefetch عند فتح الإضبارة / نية الزر | تخفيف ~40KB مصدر nested مع الحفاظ على عقد الحكم |

### Prefetch preserved
- AOF: `preloadActiveOrderQuickLog` على pointer/focus/click
- SmartFile open → AppealTransition + CrossAppeal + Judgment
- Footer: appeal panels + cross-appeal button

### Skipped
| Item | Why |
|------|-----|
| Lazy entire Judgment section | Keep-mounted على `SmartJudgmentModal` مطلوب — أول فتح ختام مرافعة بلا chunk flash |
| Bundle gzip delta | أثر هيكلي فقط هذه الجلسة |

### Tests (focused)
انظر `PHASE_LAWSUITS_SLIMMING_WAVE_3_CLOSURE.md`
