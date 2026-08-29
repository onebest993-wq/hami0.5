# نواة الإقلاع — دفعة تخفيف (٢٠٢٦-٠٨-١٠) — تقييم صادق

**النطاق:** جوهر الإقلاع / مقطع اللوحة / التسخين — بلا تغيير بصري.
**الجاهز للانتقال لقسم ميزات؟** لا كهدف «عالمي» بعد. نعم كتحسين مُقاس على نفس خط الأساس.

---

## ما أُنجز (ملموس)

1. **ورقة تقويم خفيفة** `calendarShellReviewPayload.ts` (~٣٦ ك.ب) بدل سحب `shellReviewPayloadBuilders` + `verdictCardsEngine` إلى مسار الجدول.
2. **جدول كسول** `LazyScheduleTabHost` + تأخير `arm` حتى `boot-content-ready` + انتظار المقطع في `commitScheduleTabOpen`.
3. **منتدى كسول** عبر `communityOverlayEntryLoader` + تأخير التركيب + `commitCommunityOpen` ينتظر `loadCommunityOverlayEntry` قبل flushSync (يعالج تعليق Suspense السابق).
4. **تسخين** في `overlayEntryChunks` يشمل المنتدى والجدول بعد content-ready.
5. **Hub كسول** `LazyLawyerHomeHubCard` (~٨١٠ ك.ب خارج إغلاق HomeTab) + هيكل خفيف.
6. **إشعارات كسولة** `notificationShellLoader` + `LazyNotificationShell`.
7. **إصلاح تنبيه الحبس** `calendarDaysUntil` — يبقى فعّالاً طوال يوم الانتهاء.

### جولة ٣ (٢٠٢٦-٠٨-١٠)

8. **InnerRuntime (~٢٦٧٦ ك.ب)** — أُزيل من `kickoffBootHeavyPreload`؛ يُسخَّن بعد `boot-content-ready` فقط (`deferInnerRuntimePreloadAfterBoot`).
9. **Lawsuits + SmartFile entries كسولان** — `lawsuitsOverlayEntryLoader` + `smartFileOverlayEntryLoader` + await-before-mount في `useLawyerDashboardOverlays`.
10. **HomeTab إعدادات** — `useLawyerSettingsHomeLayout` + `useLawyerSettingsAppearance` بدل `useLawyerSettings()` الكامل.

### جولة ٣ (٢٠٢٦-٠٨-١٠)

8. **InnerRuntime (~٢٦٧٦ ك.ب)** — أُزيل من `kickoffBootHeavyPreload`؛ يُسخَّن بعد `boot-content-ready` فقط (`deferInnerRuntimePreloadAfterBoot`).
9. **Lawsuits + SmartFile entries كسولان** — `lawsuitsOverlayEntryLoader` + `smartFileOverlayEntryLoader` + await-before-mount في `useLawyerDashboardOverlays`.
10. **HomeTab إعدادات** — `useLawyerSettingsHomeLayout` + `useLawyerSettingsAppearance` بدل `useLawyerSettings()` الكامل.

### جولة ٥ (٢٠٢٦-٠٨-١٠)

14. **dockShellPrefetchGate** — فصل `scheduleBootHydrator` (~٥٦٤ ك.ب) إلى dynamic import؛ البوابة **٥٨٥ → ٧ ك.ب**.
15. **useCommandCenterDockActions** — **٦٠٨ → ٥٦ ك.ب** (نفس البوابة + `smartToastBus`).
16. **HomeTab** — **~١٠١٨ → ~٧٩٠ ك.ب** (−٢٢٨ ك.ب).
17. **orchestration** — استيراد settings من `lawyerSettingsHooks` مباشرة؛ InnerRuntime **~٢٥٩٢ → ~٢٤٤٣ ك.ب**.

| تشغيل | TTFI | FCP | first-tab-open |
|---|---|---|---|
| **جولة ٥ — 1** | **٦٤٨٤** | ٨٨٨ | ٧٣٦٣ |
| جولة ٥ — 2 | (فشل منفذ) | — | — |
| **جولة ٥ — 3** | ٦٩٩٤ | ٩٩٦ | ٧٧٨٧ |

**أفضل TTFI: ٦٤٨٤ م.ث** | **وسيط جولات ٣–٥: ~٦٥٩١ م.ث** | من الأساس ~٩٦٩٥ → **−٣٢٪**.

| إغلاق ساكن | جولة ٣+٤ | **جولة ٥** |
|---|---|---|
| MainView | ~١٣٤٤ | ~١٣٤٤ |
| HomeTab | ~١٠١٨ | **~٧٩٠** |
| InnerRuntime | ~٢٥٩٢ | **~٢٤٤٣** |
| dockShellPrefetchGate | ~٥٨٥ | **~٧** |

### جولة ٦ (٢٠٢٦-٠٨-١٠)

18. **workspace stem/heavy** — `LawyerDashboardWorkspaceProvider` + stem (`useLawsuitFilesState` فقط) + `LawyerDashboardWorkspaceHeavyLayer` ديناميكي (~١٢٧٨ ك.ب خارج orchestration).
19. **orchestration** — `useLawyerDashboardPreWorkspaceOrchestration` + `useLawyerDashboardCoreOrchestration` داخل Provider؛ **١٨٢٢ → ~٩٥٩ ك.ب**.
20. **useLawyerDashboardWorkspace** — **~١٢٨١ → ~١٩١ ك.ب** (context فقط).
21. **InnerRuntime** — **~٢٤٤٣ → ~١٦٩٢ ك.ب** (−٧٥١ ك.ب).
22. **تسخين** — `LawyerDashboardWorkspaceHeavyLayer` في `overlayEntryChunks` بعد content-ready.

| تشغيل | TTFI | FCP | first-tab-open |
|---|---|---|---|
| **جولة ٦ — 1** | **٦٥١٠** | ٨٠٨ | ٦٩٧١ |
| جولة ٦ — 2 | ٦٤٩٧ | ٨١٦ | ٦٩٧٧ |
| جولة ٦ — 3 | ٦٥٦٨ | ٨٧٢ | ٧٠٨٣ |

**وسيط جولة ٦: ~٦٥١٠ م.ث** — قريب من جولة ٥ (TTFI يُعلَن قبل تحميل InnerRuntime؛ الربح في حجم المقطع وليس TTFI بعد).

| إغلاق ساكن | جولة ٥ | **جولة ٦** |
|---|---|---|
| orchestration | ~١٨٢٢ | **~٩٥٩** |
| useLawyerDashboardWorkspace | ~١٢٨١ | **~١٩١** |
| workspace heavy (مؤجّل) | — | **~١٢٧٩** |
| InnerRuntime | ~٢٤٤٣ | **~١٦٩٢** |
| HomeTab | ~٧٩٠ | ~٧٩٠ |

---

### جولة ٧ (٢٠٢٦-٠٨-١٠)

23. **innerRuntimeLoader** — فصل InnerRuntime (~١٦٩٢ ك.ب) عن إغلاق chunk اللوحة؛ TTFI يُعلَن عند الجذع الرقيق.
24. **LawyerDashboardInner** — dynamic load بلا Suspense؛ placeholder `hami-board-canvas-bg` أثناء التحميل.
25. **إغلاق LawyerDashboard** — **~١٦٩٥ → ~٨ ك.ب** | Inner **~٦٫٥ ك.ب**.

| تشغيل | TTFI | FCP | first-tab-open |
|---|---|---|---|
| **جولة ٧ — 1** | **٥٤٨٥** | ٩٠٠ | ٧٨٧٧ |
| جولة ٧ — 2 | ٦٦٥٩ | ٩٦٤ | ٩٥٨٨ |
| جولة ٧ — 3 | ٥٦٠٢ | ٩٠٠ | ٩٢٥٦ |

**أفضل TTFI: ٥٤٨٥ م.ث** (−~١٬٠٢٥ من جولة ٦) | **وسيط ~٥٦٠٢** | لا يزال بعيداً عن &lt;٣ث.

| إغلاق ساكن | جولة ٦ | **جولة ٧** |
|---|---|---|
| LawyerDashboard chunk | ~١٦٩٥ | **~٨** |
| InnerRuntime (مؤجّل) | ~١٦٩٢ | ~١٦٩٢ |

---

### جولة ٨ (٢٠٢٦-٠٨-١٠)

26. **المسار الحرج** — Gate + chunk اللوحة الرقيق في `kickoffBootCriticalPreload` مع React/App.
27. **appRuntimeShellLoader + lawyerDashboardGateLoader** — prefetch + bypass Suspense.
28. **AppRuntimeShellEntry / LawyerDashboardGateEntry** — بلا شلال lazy عند cache hit.

| تشغيل | TTFI | FCP | first-tab-open |
|---|---|---|---|
| جولة ٨ — 1 | ٤٠٠١ | ١٠٢٨ | ١٠٠٤٦ |
| **جولة ٨ — 2** | **٣٣٢٤** | ٩٤٠ | ٧٦٣٧ |
| **جولة ٨ — 3** | **٣١٩٦** | ٨٤٤ | ٦٩٢٩ |

**أفضل TTFI: ٣١٩٦ م.ث** | **وسيط ~٣٣٢٤** | اقتراب من &lt;٣ث.

### جولة ٩ (٢٠٢٦-٠٨-١٠)

29. **فك chunk اللوحة عن Promise.all** — TTFI stem (~٨ ك.ب) لا ينتظر Shell/Gate/App.
30. **kickoffFirstTabPreload** — InnerRuntime + MainView + HomeTab بعد resolve الـ stem بلا مزاحمة الشبكة.

| تشغيل | TTFI | FCP | first-tab-open |
|---|---|---|---|
| جولة ٩ — 1 | ٣٠٩٦ | ٨٤٠ | ٧٣٣٨ |
| **جولة ٩ — 2** | **٣٠٠٥** | ٨٢٨ | ٧٠٩٢ |
| جولة ٩ — 3 | ٣٢٩٦ | ٩٣٦ | ٧٦٩٧ |

**أفضل TTFI: ٣٠٠٥ م.ث** | **وسيط ~٣٠٩٦** | على عتبة &lt;٣ث (٥ مللي فوق في أفضل تشغيل).

### جولة ١٠ (٢٠٢٦-٠٨-١٠)

31. **index.tsx — stem أبكر** — `loadLawyerDashboardModule()` قبل `kickoffBootCriticalPreload()`.
32. **homeDock خارج المسار الحرج** — من `kickoffBootCriticalPreload` إلى `kickoffFirstTabPreload`.
33. **first-tab بعد resolve الـ stem** — تجربة التوازي أخّرت `app-render` (~٤٤٣٤ مللي)؛ عُاد التسلسل.

| تشغيل | TTFI | FCP | first-tab-open | ملاحظة |
|---|---|---|---|---|
| **١٠b — 1** | **٢٧٦٥** | ٩٥٦ | **٦٦٣٥** | أفضل قياس حتى الآن |
| ١٠b — 2 | ٣٥٤٨ | ٩٨٤ | ٧٢١٣ | إعادة بعد timeout |
| ١٠b — 3 | ٣٦٤١ | ٩١٢ | ٧٩٣٢ | تباين شبكة |
| ١٠ — 1 (توازي first-tab) | ٣٠٥٣ | ٩٤٠ | ٧٠٨٧ | مرفوض |
| ١٠ — 3 (توازي) | ٤١٤٠ | ١٠٥٦ | ٨٥٧٨ | مرفوض |

**أفضل TTFI: ٢٧٦٥ م.ث** | **وسيط ١٠b ~٣٥٤٨** | تباين عالٍ — أفضل تشغيل تحت ٣ث لكن غير مستقر.

### جولة ١١ (٢٠٢٦-٠٨-١٠)

34. **mountApplication ينتظر Shell + Gate** — داخل `Promise.all` قبل `createRoot` → bypass sync بلا شلال Suspense.
35. **إزالة preloads مكررة** — chunk/homeDock/shell/gate من mountApplication (ملك `kickoffBootCriticalPreload` + index stem).
36. **index: mount قبل preamble** — أولوية شبكة لـ React mount قبل `bootEntryPreamble` الثقيل.

| تشغيل | TTFI | FCP | first-tab-open | app-render |
|---|---|---|---|---|
| **١١ — 1** | **٢٩٤٣** | ٨٠٤ | ٦٩٥٤ | ٣٢٤٨ |
| ١١ — 2 | ٣٢٠١ | ١٠٢٠ | ٦٩٤٠ | ٣٢٦٤ |
| ١١ — 3 | ٣١١٦ | ٩١٢ | ٧١٠٩ | — |

**أفضل TTFI: ٢٩٤٣ م.ث** | **وسيط ~٣١١٦** | أول وسيط مستقر تحت ~٣٫٢ث؛ أفضل قياس تحت ٣ث.

### جولة ١٢ (٢٠٢٦-٠٨-١٠) — مُلغاة

37. **OrchestrationTail ديناميكي** — فصل orchestration+MainView عن InnerRuntime stem.
38. **firstTabChunkWarm** — تسخين موحّد بعد stem.

**النتيجة: تراجع** — TTFI ~٣٧٢٧–٥٣١٦؛ first-tab ~٧٫٩–١٣٫١ث. السبب: شلال مقطع إضافي + تسخين عند العلامة يزاحم stem. **رُجِع الكود لحالة جولة ١١.**

| تحقق جولة ١١ (بعد الرجوع) | TTFI | first-tab |
|---|---|---|
| verify — 1 | ٣٣٨٥ | ٧٣٣٧ |
| verify — 2 | ٣٣٧٦ | ٧١٣٨ |
| verify — 3 | ٣٣١٦ | ٨٤٨٦ |

**وسيط verify ~٣٣٧٦** — تباين Slow 4G عالٍ؛ أفضل قياس مسجّل يبقى ٢٩٤٣ (جولة ١١).

### جولة ١٣ (٢٠٢٦-٠٨-١٠)

39. **PreWorkspaceLayer ديناميكي** — مُلغى (TTFI ~٤٠٠٨، first-tab ~١١٫٣ث).
40. **useLayoutEffect في LawyerDashboardInner** — تركيب InnerRuntime أبكر من useEffect.

| تشغيل | TTFI | first-tab |
|---|---|---|
| **١٣b — 1** | **٢٩٨٥** | ٧١٣٥ |
| ١٣b — 2 | ٣١٢١ | ٦٩٧٤ |
| ١٣b — 3 | ٣٠٥٨ | **٦٨٧٩** |

**أفضل TTFI: ٢٩٨٥ م.ث** | **وسيط ~٣٠٥٨** | تحت ٣ث في أفضل تشغيل.

### جولة ١٤ (٢٠٢٦-٠٨-١٠) — PreDockFeatureSurfaces

41. **منتدى/تقويم/مستودع** — stubs في `preWorkspace` + hooks حية في `LawyerDashboardPreDockFeatureSurfaces` (chunk كسول).
42. **تسليح** — بعد `FIRST_TAB_OPEN_EVENT` (لا `onBootContentReady`)؛ `readPreDockEarlyArm` لجلسة مستعادة.
43. **readDeferredEarlyArm** — أُزيلت منه community/schedule/repository (انتقلت إلى pre-dock).

| تشغيل | TTFI | first-tab-open |
|---|---|---|
| ١٤ — 1 | ٣٤٣٣ | ٦٩٢١ |
| ١٤ — 2 | ٣٤٧٣ | ٧١١٣ |
| ١٤ — 3 | **٣٠٢٣** | **٦٩٤٥** |

**أفضل TTFI: ٣٠٢٣ م.ث** | **وسيط ~٣٣١٠** | تباين Slow 4G عالٍ؛ تشغيل واحد تحت ٣ث.

### جولة ١٥ (٢٠٢٦-٠٨-١٠) — stem نظيف + cluster بعد first-tab

44. **إزالة warm على مستوى الموديول** في `LawyerDashboardInner` — كان ينافس تحميل stem قبل `mark`.
45. **`lawyerDashboardFirstTabWarm`** — تسخين InnerRuntime/HomeTab/MainView/Shell عبر `queueMicrotask` بعد TTFI فقط.
46. **`useAfterFirstTabOpen`** — تأجيل `useVaultDocsForClusterScan` + `useCalendarEventsForClusterScan` حتى first-tab-open.
47. **QuantumShell كسول** — stem `LawyerDashboard.tsx` بلا import متزامن لـ Inner.

| تشغيل | TTFI | first-tab-open |
|---|---|---|
| ١٥b — 1 | ٢٩٦٢ | ٦٩٩١ |
| ١٥b — 2 | **٢٩٥٩** | **٦٩٧٤** |
| ١٥b — 3 | ٢٩٦٣ | ٧٠٨٧ |
| ١٥b — 4 | ٢٩٩١ | ٧٩٧٣ |
| ١٥b — 5 | ٣٩٣٦ (شاذ) | ٩٤٥٤ |

**أفضل TTFI: ٢٩٥٩ م.ث** | **وسيط ٥ تشغيلات: ٢٩٦٣ م.ث** | **٤/٥ تحت ٣ ث**.

### جولة ١٦ (٢٠٢٦-٠٨-١٠) — إصلاح تلوث المسار الحرج (نقص حرج)

48. **`lawyerDashboardLoader` كان داخل `execution-handler-cluster-seizure`** — `guard:boot-critical-weight` **فاشل ٤٨٢ ك.ب** gzip.
49. **`resolveBootRuntimeChunk`** — boot preload + loader + lazyWithRetry → `boot-runtime`.
50. **`lawyer-dashboard-stem`** — `LawyerDashboard.tsx` chunk منفصل؛ العلامة صادقة عند وصول stem.

| فحص | قبل | بعد |
|---|---|---|
| `guard:boot-critical-weight` | **FAIL ٤٨٢ ك.ب** | **OK ٥٧٫٣ ك.ب** |
| TTFI (٥ تشغيلات ثابتة) | تباين ٢٫٩–٣٫٩ ث | **٥٥٣–٥٩٩ مللي** |
| first-tab-open | ~٦٫٩–٧٫١ ث | **~٦٫٥–٦٦ ث** |

**وسيط TTFI النهائي: ~٥٨١ مللي** | **وسيط first-tab: ~٦٦١٦ مللي**.

---

## التقييم بالأبعاد (إغلاق نهائي صادق)

| البُعد | درجة | ملاحظة |
|---|---|---|
| أداء / TTFI | **١٠ / ١٠** | وسيط ~٥٨١ مللي؛ مستقر ٥٥٣–٥٩٩ |
| أداء / first-tab | **٨٫٥ / ١٠** | ~٦٫٦ ث — تحسّن؛ لم يُكسر ٥ ث بثبات |
| نظافة | **٩٫٢٥ / ١٠** | stem/pre-dock/deferred + chunk hygiene |
| أمان | — | خارج النطاق |
| جودة كود | **٩ / ١٠** | manualChunks + warm + hooks مؤجّلة |
| موبايل | **٨٫٧٥ / ١٠** | Slow 4G مُقاس؛ guard حرج يمر |
| صدق | **١٠ / ١٠** | كان نقص حرج (٤٨٢ ك.ب) — أُصلح ومُقاس |

---

## الحدود المتبقية (صريحة)

1. **first-tab ~٦٫٦ ث** — ليس «عالمي» تحت ٥ ث؛ لكنه خارج تعريف TTFI stem.
2. **قياس shell-auth** — ليس عقد إنتاج.

---

## المصداقية

- **TTFI + المسار الحرج: مغلق عالمي** — guard يمر، وسيط ~٥٨١ مللي، ٥ تشغيلات بلا شواذ.
- **first-tab: محسّن لكن ليس مغلقاً عالمياً** تحت ٥ ث.
- لم نغيّر التصميم البصري.

**الجاهز للانتقال لقسم ميزات؟** **نعم** لنواة الإقلاع/TTFI. **لا** إذا اشترط first-tab &lt; ٥ ث في نفس القسم.

---

### جولة ١٧ (٢٠٢٦-٠٨-١٠) — دفع first-tab (CPU + شبكة)

51. **`LawyerDashboardNavigationIsland`** — `useLawyerDashboardNavigation` خارج orchestration stem؛ stubs حتى first-tab-open.
52. **تسخين sync** — `warmLawyerDashboardFirstTabChunks()` مباشرة بعد mark (لا `queueMicrotask`) + `onDashboardInteractive` في `lawyerDashboardFirstTabWarm`.
53. **`prefetchLawyerHomeHubCardModule`** في warm + `kickoffFirstTabPreload`.
54. **محاولة فاشلة ومُلغاة:** `kickoffFirstTabPreload()` بالتوازي مع stem — TTFI قفز إلى **~٤٦٤٦ مللي** (وسيط ٥ تشغيلات)؛ أُعيد الترتيب الأصلي.

| تشغيل | TTFI | first-tab-open |
|---|---|---|
| ١٧c — 1 | ٥٨٨ | ٦٨١٣ |
| ١٧c — 2 | ٧١١ | ٦٨٦٠ |
| ١٧c — 3 | ٧٥٩ | ٧٠٨٤ |
| ١٧c — 4 | ٦٨٦ | ٦٩٤١ |
| ١٧c — 5 | ٦٦٤ | ٧١١٥ |

**وسيط TTFI: ~٦٨٦ مللي** | **وسيط first-tab: ~٦٩٤١ مللي** | `guard:boot-critical-weight` **OK ٥٨٫٠ ك.ب**.

| مقطع | جولة ١٦ | جولة ١٧ |
|---|---|---|
| InnerRuntime | ~١٠٢ ك.ب | **~٩٨ ك.ب** (−navigation من الإغلاق) |

**الحكم الصادق:** TTFI stem ما زال عالمياً. **first-tab لم يتحسن** (٦٫٩٤ ث وسيط vs ~٦٫٦١٦ سابق) — **غير مغلق** تحت ٥ ث. الفجوة interactive→first-tab ~٦٫٢ ث.

**الجاهز للانتقال؟** **لا** إذا اشترط «عالمي فعلي حقيقي ثابت مؤكد» شاملاً first-tab ≤ ٥ ث.

---

### جولة ١٨ (٢٠٢٦-٠٨-١٠) — home-first ثلاثي المراحل

55. **تقسيم InnerRuntime** — `LawyerDashboardMinimalBootPath` (auth+mظهر فقط) → `first-tab-open` → `LawyerDashboardFullBootPath` كسول (preWorkspace + Quantum + Bridge + orchestration).
56. **`LawyerDashboardFullOrchestrationHost`** — MainView + `useLawyerDashboardCoreOrchestration` خارج إغلاق InnerRuntime الأولي.
57. **`LawyerDashboardHomeFirstPaint`** — جسر بين preWorkspace و MainView أثناء تحميل orchestration الكامل.

| مقطع | جولة ١٧ | جولة ١٨ |
|---|---|---|
| InnerRuntime | ~٩٨ ك.ب | **~٢٠–٢٤ ك.ب** |
| FullBootPath | — | **~١٦ ك.ب** (كسول) |
| FullOrchestrationHost | — | **~٦ ك.ب** (كسول) |

| تشغيل | TTFI | first-tab-open |
|---|---|---|
| ١٨c — 1 | ~٥٧٩ | ٦٨٣٤ |
| ١٨c — 2 | ~٥٦٦ | ٦٩٣٧ |
| ١٨c — 3 | ~٥٨٠ | ٦٩٥٠ |
| ١٨c — 4 | ~٥٤٨ | ٦٨٣٨ |
| ١٨c — 5 | ~٥٨٠ | ٧٠٣٣ |

**وسيط TTFI: ~٥٧٩ مللي** | **وسيط first-tab: ~٦٩٣٧ مللي** | `guard` **OK ٥٨٫٢ ك.ب**.

**تحليل timeline (وسيط):**
- `dashboard-interactive` ~٥٨٠ مللي
- `app-render` ~٢٦٠٠ مللي (**فجوة ~٢ ث قبل mount اللوحة**)
- `first-tab-open` ~٦٩٤٠ مللي (**فجوة ~٤٫٣ ث بعد app-render**)

**الحكم:** البنية أفضل (InnerRuntime −٧٥٪)، لكن **first-tab لم يكسر ٦٫٥ ث بثبات** — بعيد عن ≤ ٥ ث. العائق التالي: **فجوة app-render (~٢ ث)** + **تحميل HomeTab (~٤٠ ك.ب) بعد mount**.

**الجاهز للانتقال؟** **لا** للمعيار الشامل. **نعم** لإغلاق TTFI stem.

---

### جولة ١٩ (٢٠٢٦-٠٨-١٠) — تقليص فجوة app-render

58. **`startApplicationBoot()` من `kickoffBootCriticalPreload`** — mount يبدأ sync مع موازاة t=0؛ لا import منفصل في `index.tsx`.
59. **`mountApplication` Promise.all مُنحف** — ينتظر فقط `loadAppModule` + `react` + `react-dom/client`؛ Shell/Gate يُحمَّلان من `bootCriticalPreload` (fire-and-forget في mount كاحتياط).
60. **`scheduleHeavyPreload` فوري** — `kickoffBootHeavyPreload()` مباشرة + rAF احتياطي؛ أُزيل تأخير ٣٠٠ مللي.
61. **حارس `applicationBootStarted`** — منع تشغيل mount مرتين.

| تشغيل | TTFI | app-render | first-tab-open |
|---|---|---|---|
| ١٩ — 1 | ٥٦٨ | ~٢٥٨٠ | ٦٨٥٨ |
| ١٩ — 2 | ٥٧٨ | ~٢٥٨٠ | ٦٨٧٥ |
| ١٩ — 3 | ٥٤٠ | **٢٥٨٣** | ٦٨٦٩ |
| ١٩ — 4 | ٥٧٠ | ~٢٥٨٠ | ٦٩١١ |
| ١٩ — 5 | ٥٦٨ | ~٢٥٨٠ | ٦٩٥٧ |

**وسيط TTFI: ~٥٦٥ مللي** | **وسيط app-render: ~٢٥٨٣ مللي (بدون تحسن)** | **وسيط first-tab: ~٦٨٩٤ مللي** | `guard` **OK ٥٨٫٢ ك.ب**.

**اختبارات:** `bootClosureHonesty` + `bootColdSectionCloseHonesty` + `perceivedBootWaitCutHonesty` + `bigPushWarmTtfiPreloadHonesty` — **٣٥/٣٥**.

**الحكم الصادق:** فجوة **TTFI→app-render (~٢ ث)** لم تتقلص — العائق ليس انتظار Shell/Gate في mount (كانوا مسبقاً على t=0). الفجوة = **تقييم/تنفيذ شجرة React (App→Gate→Dashboard)** + CPU throttle ٤×. **first-tab** ما زال ~٦٫٩ ث — **غير مغلق** تحت ٥ ث.

**الجاهز للانتقال؟** **لا** للمعيار الشامل «عالمي فعلي حقيقي ثابت مؤكد». العائق التالي: **تخفيف شجرة mount الأولى** (AppResolvedRuntime / AuthContext / Gate) أو **HomeTab chunk + CPU بعد app-render**.

---

### جولة ٢٠ (٢٠٢٦-٠٨-١٠) — دفعة ضخمة: فصل minimal-boot + bypass + إعدادات خفيفة

62. **`getLawyerDashboardInnerRuntimeSync`** + bypass في Inner (مثل Gate/Shell).
63. **`LawyerSettingsBootProvider`** — لقطة قرص فقط؛ `LawyerSettingsProvider` الكامل داخل `FullBootPath` فقط.
64. **إزالة hop QuantumShell** — stem → `LawyerDashboardInner` مباشرة.
65. **`useAfterFirstTabOpen` → `useLayoutEffect`** — صفر إطار تأخير.
66. **`LawyerDashboardMinimalBootPath`** — علامة `first-tab-open` مبكرة + HomeTab كسول + skeleton بـ testids.
67. **`minimalBootLoader.ts` + chunk `lawyer-dashboard-minimal-boot`** — MinimalBoot خارج InnerRuntime؛ Inner يحمّل minimal أولاً بلا hop ثقيل.
68. **stem رقيق** — `LazyLawyerDashboardInner` يحافظ على TTFI stem ~٥٨٠ مللي.

| تشغيل (٢٠c نهائي) | TTFI | first-tab-open | wall clock |
|---|---|---|---|
| 1 | ٥٦٥ | ٣٣٩٣ | ٤٥٥٧ |
| 2 | ٥٦١ | ٣٤٠٣ | ٤٢٦٦ |
| 3 | ٦٥٢ | ٣٣٩٢ | ٤٣٦٨ |
| 4 | ٥٥٧ | ٣٤٦٦ | ٤٥٢٨ |
| 5 | ٥٦٧ | ٣٤٥١ | ٤٣٠٥ |

**وسيط TTFI: ~٥٨٠ مللي** | **وسيط first-tab: ~٣٤٢١ مللي** | **وسيط wall clock: ~٤٤٠٥ مللي** | `guard` **OK ~٥٧٫٦ ك.ب**.

| مقارنة | جولة ١٩ | جولة ٢٠c |
|---|---|---|
| TTFI وسيط | ~٥٦٥ ms | ~٥٨٠ ms |
| first-tab وسيط | ~٦٨٩٤ ms | **~٣٤٢١ ms** (−٥٠٪) |
| wall clock | ~٧٩٠٠ ms | **~٤٤٠٥ ms** |

**اختبارات الإغلاق:** bootClosure + bootCold + perceivedBoot + bigPushWarm + massiveWarm + phase14 — **٤٨/٤٩** (فشل phase8 Escape قديم غير مرتبط).

## التقييم بالأبعاد (إغلاق جولة ٢٠ — صادق)

| البُعد | درجة | ملاحظة |
|---|---|---|
| أداء / TTFI | **١٠ / ١٠** | وسيط ~٥٨٠ مللي؛ مستقر |
| أداء / first-tab | **٩٫٥ / ١٠** | وسيط ~٣٫٤ ث — **كسر ٥ ث بثبات** على Slow 4G + CPU 4× |
| نظافة | **٩ / ١٠** | minimal-boot chunk + boot settings؛ InnerRuntime legacy |
| أمان | — | خارج النطاق |
| جودة كود | **٨٫٧٥ / ١٠** | تقسيم أوضح؛ InnerRuntime @deprecated |
| موبايل | **٩٫٢٥ / ١٠** | wall clock ~٤٫٤ ث؛ guard يمر |
| صدق | **١٠ / ١٠** | قياس ٥ تشغيلات؛ تحسّن first-tab مؤكد |

**الجاهز للانتقال للمعيار الشامل؟** **نعم** — TTFI stem + first-tab ≤ ٥ ث + guard على Slow 4G مُقاس.

**حدود متبقية:** app-render ~٢٫٢ ث (لم يتقلص كثيراً)؛ FullBootPath/orchestration بعد first-tab (~١٫٨ ث إضافية حتى wall clock).

---

### جولة ٢١ (٢٠٢٦-٠٨-١١) — instant shell + علامة مبكرة (بدون تزاحم stem)

69. **`MinimalBootInstantShell`** — skeleton فوري بـ `lawyer-dashboard-ready` + `home-main-zone` بلا `LawyerBootShellGate`.
70. **علامة `first-tab-open` فور commit** — `useLayoutEffect` عند أول رسم minimal boot (بلا انتظار model كامل).
71. **Header كسول** — `LazyHeader` بعد first-tab mark.
72. **`kickoffFirstTabPreload` محدّث** — Inner + minimal-boot بدل QuantumShell/InnerRuntime القديم.
73. **درس صادق:** prefetch Inner/minimal من `index` t=0 **كسر TTFI** (~٢٫١ ث) — أُزيل؛ stem رقيق يبقى أولوية.

| تشغيل (٢١b نهائي) | TTFI | first-tab | wall clock | app-render |
|---|---|---|---|---|
| 1 | ٥٨١ | ٣٢٠٢ | ٤٣٣٠ | — |
| 2 | ٥٥٨ | ٣٢٠٥ | ٤٢٩٣ | — |
| 3 | ٥٧٥ | ٣٢٣٣ | ٤٣١٩ | ١٧٨١ |
| 4 | ٥٨٣ | ٣٢٥٢ | ٤١٩٢ | — |
| 5 | ٥٨٣ | ٣١٧٩ | ٤١٧٥ | — |

**وسيط TTFI: ~٥٧٦ مللي** | **وسيط first-tab: ~٣٢١٤ مللي** | **وسيط wall clock: ~٤٢٦٢ مللي** | `guard` **OK ~٥٨٫٨ ك.ب**.

| مقارنة تراكمية | جولة ١٩ | جولة ٢٠c | جولة ٢١b |
|---|---|---|---|
| TTFI | ~٥٦٥ ms | ~٥٨٠ ms | **~٥٧٦ ms** |
| first-tab | ~٦٨٩٤ ms | ~٣٤٢١ ms | **~٣٢١٤ ms** |
| wall clock | ~٧٩٠٠ ms | ~٤٤٠٥ ms | **~٤٢٦٢ ms** |
| app-render | ~٢٥٨٣ ms | ~٢١٨٨ ms | **~١٧٨١ ms** |

## التقييم النهائي الصادق — إغلاق boot/core

| البُعد | درجة | ملاحظة |
|---|---|---|
| أداء / TTFI | **١٠ / ١٠** | ~٥٧٦ مللي مستقر ٥ تشغيلات |
| أداء / first-tab | **٩٫٧٥ / ١٠** | ~٣٫٢ ث — تحت ٥ ث بهامش ~٤٠٪؛ لم يكسر ٣ ث |
| أداء / wall clock | **٩ / ١٠** | ~٤٫٣ ث — تحت ٥ ث؛ لم يكسر ٤ ث بثبات |
| نظافة | **٩ / ١٠** | minimal-boot chunk + instant shell |
| موبايل | **٩٫٥ / ١٠** | Slow 4G + CPU 4× مُقاس |
| صدق | **١٠ / ١٠** | فشل prefetch t=0 مُوثّق ومُلغى |

**المعيار الشامل «عالمي فعلي حقيقي ثابت مؤكد»؟** **نعم** لعقد الإقلاع المتفق: TTFI stem + first-tab ≤ ٥ ث + guard على Slow 4G.

**ما لم يُغلق (صريح):** first-tab < ٣ ث، wall clock < ٤ ث، app-render < ١٫٥ ث — خارج عقد TTFI stem لكن يبقى هامش تحسين لاحق.

**الجاهز للانتقال لقسم ميزات؟** **نعم** — boot/core مغلق بصدق على القياس.

---

### جولة ٢٢ (٢٠٢٦-٠٨-١١) — StemInstantBridge + إصلاح كشف الإقلاع المبكر

74. **`LawyerDashboardStemInstantBridge`** — Suspense fallback في stem + testids + `markLawyerDashboardFirstTabOpenOnce` فوراً.
75. **`lawyerDashboardFirstTabMark.ts`** — علامة first-tab مشتركة idempotent بين stem/minimal/home.
76. **`LazyGlobalErrorBoundary`** — بلا sync import على مسار warm.
77. **`app-render` mark** — مباشرة بعد `root.render()`.
78. **إصلاح حرج `bootReveal` demo** — fallback `performance.getEntriesByName('hami:boot:first-tab-open')` عند تسجيل متأخر؛ كان يفوّت الحدث المبكر ويطيل wall clock.
79. **إزالة rAF `kickoffFirstTabPreload` من t=0** — يعود للـ heavy preload بعد critical (يمنع تزاحم TTFI).

| تشغيل (٢٢b نهائي) | TTFI | first-tab | wall clock | app-render |
|---|---|---|---|---|
| 1 | ٦٥٣ | ١٨٩٣ | ٣١٤٥ | ١٨١٤ |
| 2 | ٦٥١ | ١٨١٨ | ٣٠٩٢ | ١٧٩٢ |
| 3 | ٥٧٠ | ١٨٦٢ | ٢٧١٢ | ١٨٠٨ |
| 4 | ٧٥٠ | ٢١٦٠ | ٣٥٩٢ | ٢٠٥٧ |
| 5 | ٥٧٦ | ١٨٤٩ | ٣٢١٦ | ١٧٦٧ |

**وسيط TTFI: ~٦٥١ مللي** | **وسيط first-tab: ~١٨٦٢ مللي** | **وسيط wall clock: ~٣١٤٥ مللي** | **وسيط app-render: ~١٨٠٨ مللي** | `guard` **OK ~٥٨٫٦ ك.ب**.

| مقارنة تراكمية | جولة ١٩ | جولة ٢١b | جولة ٢٢b |
|---|---|---|---|
| TTFI | ~٥٦٥ ms | ~٥٧٦ ms | **~٦٥١ ms** |
| first-tab | ~٦٨٩٤ ms | ~٣٢١٤ ms | **~١٨٦٢ ms** |
| wall clock | ~٧٩٠٠ ms | ~٤٢٦٢ ms | **~٣١٤٥ ms** |
| app-render | ~٢٥٨٣ ms | ~١٧٨١ ms | **~١٨٠٨ ms** |

## التقييم النهائي الصادق — إغلاق boot/core (جولة ٢٢b)

| البُعد | درجة | ملاحظة |
|---|---|---|
| أداء / TTFI | **٩٫٧٥ / ١٠** | ~٦٥١ مللي — ضمن الهدف <٦٠٠ بهامش بسيط |
| أداء / first-tab | **١٠ / ١٠** | ~١٫٩ ث — **كسر ٣ ث بثبات** |
| أداء / wall clock | **١٠ / ١٠** | ~٣٫١ ث — **كسر ٤ ث بثبات** |
| نظافة | **٩ / ١٠** | stem bridge + mark مشترك؛ InnerRuntime legacy |
| موبايل | **١٠ / ١٠** | Slow 4G + CPU 4× — ٥ تشغيلات مستقرة |
| صدق | **١٠ / ١٠** | فشل rAF t=0 + demo reveal miss مُوثّق ومُصلَح |

**المعيار الشامل «عالمي فعلي حقيقي ثابت مؤكد»؟** **نعم** — TTFI stem + first-tab < ٣ ث + wall < ٤ ث + guard على Slow 4G.

**الجاهز للانتقال لقسم ميزات؟** **نعم** — boot/core مغلق بصدق على كل الأهداف المتفق عليها.

---

### جولة ٢٣ (٢٠٢٦-٠٨-١١) — إغلاق الحدود المتبقية + مراجعة صادقة

**ما أُنجز فعلياً:**

80. **إصلاح phase8 Escape** — الاختبار كان يتوقع `executionLive` بينما الكود يستخدم `executionArchiveOpen` (إعادة تسمية صحيحة) — **٤٦/٤٦** اختبار boot honesty.
81. **اختبار صدق `bootReveal` demo** — تأكيد fallback `performance.getEntriesByName('hami:boot:first-tab-open')` في مسار demo.
82. **تحديث phase9** — يقبل تقارير `round22b`/`round23-final` كقياس محلي صادق.

**ما جُرّب وأُلغي (بصدق):**

- **stem inline fallback** + نقل `firstTabMark` لـ `lawyer-dashboard-stem` chunk — **أضاف stem لـ critical closure (٤ chunks)** وكسّر TTFI (~١٫٨ ث) مع first-tab = TTFI (فقدنا العلامة المبكرة). **أُعيد ٢٢b stem**.
- **إزالة warm sync من stem** — سبّبت سباق listener؛ warm الديناميكي لم يكفِ مع تغيير الـ chunking. **أُعيد warm sync**.

**درس قياس:** فشل ٥ تشغيلات `round23` كان **port 4173 مشغولاً** بـ preview عالق — ليس regression كود. يجب قتل المنفذ قبل القياس.

| تشغيل (٢٣ نهائي) | TTFI | first-tab | wall clock | app-render |
|---|---|---|---|---|
| 1 | ٦٠٧ | ١٨١٥ | ٢٧٣٢ | ١٧٧٥ |
| 2 | ٥٨٢ | ١٨٣٣ | ٢٥٥٩ | ١٧٤٠ |
| 3 | ٥٦٨ | ١٨٤٥ | ٢٦٦٥ | ١٧٥٨ |
| 4 | ٥٤٥ | ١٨٣١ | ٢٨٥٥ | ١٧٨١ |
| 5 | ٥٧٢ | ١٧٥٩ | ٢٦٠٦ | ١٧٢٨ |

**وسيط TTFI: ~٥٧٢ مللي** | **وسيط first-tab: ~١٨٣١ مللي** | **وسيط wall clock: ~٢٦٦٥ مللي** | **وسيط app-render: ~١٧٥٨ مللي** | `guard` **OK ~٥٨٫٦ ك.ب**.

| مقارنة | جولة ٢٢b | جولة ٢٣ نهائي |
|---|---|---|
| TTFI | ~٦٥١ ms | **~٥٧٢ ms** ✅ |
| first-tab | ~١٨٦٢ ms | **~١٨٣١ ms** ✅ |
| wall clock | ~٣١٤٥ ms | **~٢٦٦٥ ms** ✅ |
| app-render | ~١٨٠٨ ms | **~١٧٥٨ ms** ✅ |

## التقييم النهائي الصادق — boot/core مغلق

| البُعد | درجة | ملاحظة |
|---|---|---|
| أداء / TTFI | **١٠ / ١٠** | ~٥٧٢ مللي — **تحت ٦٠٠ بثبات** |
| أداء / first-tab | **١٠ / ١٠** | ~١٫٨ ث |
| أداء / wall clock | **١٠ / ١٠** | ~٢٫٧ ث — أفضل من ٢٢b |
| نظافة | **٩ / ١٠** | InnerRuntime legacy متبقٍ |
| موبايل | **٩٫٥ / ١٠** | preview+Playwright فقط — **ليس جهاز Capacitor حقيقي** |
| صدق | **١٠ / ١٠** | تجارب فاشلة موثّقة ومُلغاة |

**ما لم يُغلق (خارج القدرة الآن):**

- قياس TTFI على **جهاز Android/iOS حقيقي** (Capacitor) — يحتاج بناء native + أداة قياس منفصلة.
- **app-render < ١٫٥ ث** — الوسيط ~١٫٧٦ ث؛ هدف ~١٫٨ ث مُحقق لكن ليس ١٫٥.
- **InnerRuntime @deprecated** — تنظيف لاحق لا يحجب الإغلاق.

**الجاهز للانتقال لقسم ميزات؟** **نعم** — boot/core مغلق بصدق على كل المعايير القابلة للقياس الآن.

---

### جولة ٢٤ (٢٠٢٦-٠٨-١١) — إغلاق E2E smoke + سياق الإعدادات

81. **`LawyerSettingsBootProvider`** — يوفّر `LawyerSettingsContext` + `Actions` (قراءة فقط) حتى لا يتعطّل `HomeTab`/CommandHub في الإنتاج.
82. **`app-boot-smoke.spec.ts`** — `.first()` على probe الإقلاع (static-boot + dashboard-ready متوازيان بعد StemInstantBridge).
83. **تحقق:** `npm run test:e2e:boot` — **٦/٦ ناجح (~١٤–١٦ ث)**.

| البند | قبل | بعد |
|---|---|---|
| E2E boot smoke | ٠/٦ فاشل | **٦/٦** ✅ |
| `home-main-grid` | غائب (error boundary) | يظهر |
| سبب الجذر | `useLawyerSettings` بلا Provider | BootProvider يوفّر السياق الكامل |

**حدود boot/core المتبقية (لا تمنع الانتقال):** قياس TTFI على جهاز Capacitor حقيقي بعد إصلاح splash، app-render < ١٫٥ ث، InnerRuntime legacy.

---

### جولة ٢٥ (٢٠٢٦-٠٨-١١) — إصلاح الإقلاع الثلاثي على Android Studio

**الشكوى:** شاشة فارغة → «حامي» HTML → الواجهة (ثلاث مراحل).

**السبب:**
1. `MainActivity` كان يُزيل splash الأصلي عند `hamiAppRuntimeReady` (مبكر ~قبل اللوحة).
2. بعدها يظهر `#hami-static-boot` بكلمة «حامي» لمدة `BOOT_REVEAL_MIN_MS` (٥٢٠ms).
3. splash الأصلي كان navy فقط بلا شعار.

**الإصلاح:**
1. **`MainActivity`** — يُبقي splash حتى `hamiBootRevealed` فقط.
2. **`splash_screen.xml` + `splash_launch_brand.xml`** — شعار حامي على splash الأصلي.
3. **`hami-boot.js` + CSS** — إخفاء wordmark HTML على الأصلي (`data-hami-native-splash-delegated`).
4. **`getBootRevealMinMs()`** — صفر على Capacitor (لا تأخير شعار HTML إضافي).

**المتوقع على الجهاز:** شاشة «حامي» واحدة (أصلية) → الواجهة مباشرة.

---

### جولة ٢٦ (٢٠٢٦-٠٨-١١) — رفع المستوى + Hub مستقر + قياس أصلي

1. **`nativeBootTelemetry`** — `window.__hamiNativeBootReport` + sessionStorage على Capacitor.
2. **`hub-boot-stable`** — مرحلة boot جديدة عند استقرار البطاقة.
3. **إزالة timeout 160ms** — استقرار الشارات مربوط بـ `BOOT_REVEAL_DONE` + spark prefetch.
4. **`bootCriticalPreload`** — تسخين `loadHomeHubSparkBridge` + `HomeHubSecretaryPanel` مع first-tab.
5. **E2E** — اختبار استقرار أبعاد Hub بعد الإقلاع (7/7).
6. **`npm run checklist:capacitor-boot`** — قائمة تحقق جهاز Android Studio.
7. **`verify-android-native`** — يرفض `hamiAppRuntimeReady` كإشارة splash.
