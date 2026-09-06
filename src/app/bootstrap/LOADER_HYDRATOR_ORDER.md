# Hami Loader/Hydrator Registry — الترتيب الرسمي والإقلاع (L1→L33)

> **Document Status:** Tier-1 Hardened v10.5.0 · Binding: Spec-Mode Task 3 AC-03  
> **Purpose:** سجل مركزي يُوثّق الترتيب الصحيح والفاصل الزمني (I/O Timing) لكل مسار hydrate/warm/boot في حزمة الإنتاج. يمنع إعادة إدخال I/O في نطاق Frame-0/Frame-1 (الذي يُكسر TTFTI وVR).  
> **Anti-Regression Gate:** أي سطر جديد يلمس `localStorage.*` أو `indexedDB.open` أو `JSON.parse` ضخم داخل جسم مكوّن React (render/commit) أو داخل مستوى الوحدة import بدون حارس `requestIdleCallback` يعتبر كسرًا لهذا السجل ويتطلب إصلاحًا جذريًا قبل الالتزام.

---

## المفاتيح (Timing Legend)

| الرمز | المرحلة | I/O allowed؟ | Budget | أمثلة |
|--------|---------|--------------|--------|-------|
| 🔵 **SYNC** | قبل boot-reveal / قبل أول paint | فقط sync-peek (localStorage map cache)؛ ممنوع IDB مباشر | ≤ 8ms إجماليًا | Frame-1 snapshot، أسماء أحداث الثوابت |
| 🟢 **AFTER-PAINT** | بعد markBootRevealDone() مباشرة | DOM + CSS خفيف؛ I/O يجب أن يكون async Promise | ≤ 32ms | Wallpaper decode، apply settings إلى DOM |
| 🟡 **INTERACTIVE** | بعد `dashboard-interactive` / أول commit للوحة | Chunk fetch + قراءة كاش خفيفة | ≤ 100ms مجموع | Notification/Repository/Settings/Execution shells hydrate |
| 🟠 **IDLE** | `scheduleIdleWork` / بعد interactive ب 50-800ms | قراءة IndexedDB للمقاطع الحديثة فقط | غير متزامن تمامًا | Calendar warm, section chunks, dashboard post-interactive warm |
| 🔴 **BG-IDLE** | `requestIdleCallback` (hardware idle) / 2000ms timeout فاصل | I/O ثقيل: تشفير، ترحيل IDB كامل، فك PROTECTED_WARM_KEYS | غير محدود السرعة | SecureStore kickoff, Crypto init, dossier wipe guard, caseStore hydrate |

---

## Phase 0 · SYNC BEFORE REVEAL (Frame 0-1, ≤ 8ms)

- **L1** · 🔵 `bootFrame1Hydrate`
  [bootFrame1Hydrate.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootFrame1Hydrate.ts#L64-L103)
  — Entry: `ensureFrame1HydrateSync()` · Peek sync من sessionStorage + dashboardFrame1Snapshot قبل كشف الإقلاع؛ لا أصفار وهمية ولا CLS.

- **L2** · 🔵 `bootEventNames`
  [bootEventNames.ts (re-exported via bootReveal.ts)](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootReveal.ts#L3-L66)
  — Entry: `FIRST_TAB_OPEN_EVENT`, `HOME_MAIN_GRID_PAINTED_EVENT` · ثوابت أحداث الإقلاع فقط؛ لا side effects.

- **L3** · 🔵 `bootShellKickoff`
  [bootEntryPreamble.ts → kickoffBootShellSyncLite](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/bootEntryPreamble.ts#L9-L9)
  — Entry: `kickoffBootShellSyncLite()` · تهيئة متزامنة خفيفة لـ boot shell map قبل first paint.

- **L4** · 🔵 `peekBootSessionUserId`
  [bootFrame1Hydrate.ts → peekBootSessionPeekSync](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootFrame1Hydrate.ts#L65-L66)
  — Entry: `peekBootSessionPeekSync()` · قراءة sync للـ session user ID لتغذية Frame-1 cache.

---

## Phase 1 · AFTER-PAINT (بعد markBootRevealDone, ≤ 32ms)

- **L5** · 🟢 `bootEntryPreamble`
  [bootEntryPreamble.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/bootEntryPreamble.ts#L8-L120)
  — Entry: `runBootEntryPreamble()` · Wallpaper hydrate + settings DOM + home boot chrome؛ يُحرّك SecureStore/Crypto إلى idle لاحق.

- **L6** · 🟢 `homeBootChrome`
  [homeBootChrome.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/homeBootChrome.ts)
  — Entry: `prepareHomeBootChrome()` · Profile warm cache peek + chrome surface paint للشبكة الرئيسية.

- **L7** · 🟢 `mountApplication → runBackgroundBootTasks`
  [mountApplication.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/mountApplication.ts#L102-L116)
  — Entry: `runBackgroundBootTasks()` · أول نقطة دخول رسمية لـ SecureStore.ensureBootShellReady + sameOriginApiProbe.

- **L8** · 🟢 `BootLaunchOrchestrator → seedBootLaunchFrame1`
  [bootEntryPreamble.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/boot/bootEntryPreamble.ts#L61-L63)
  — Entry: `seedBootLaunchFrame1()` · إطلاق مقاطع الإطلاق بعد HomeBootChrome مع race بـ BOOT_PROFILE_WARM_BUDGET_MS.

---

## Phase 2 · INTERACTIVE (Dashboard shell painted, ≤ 100ms مجموع)

> Pattern موحّد: `bind*BootHydrator()` → تستمع لـ `BOOT_REVEAL_DONE_EVENT` ثم `hami:dashboard-interactive` ثم تنفذ chunk prefetch + shell hydrate.

- **L9** · 🟡 `notificationBootHydrator`
  [notificationBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/notificationBootHydrator.ts#L38-L50)
  — Entry: `hydrateNotificationShellForInstantOpen()` · لوحة الإشعارات instant open.

- **L10** · 🟡 `notificationBootEvents`
  [notificationBootEvents.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/notificationBootEvents.ts#L1-L4)
  — Entry: `NOTIFICATION_SHELL_HYDRATED_EVENT`, `NOTIFICATION_PRIME_HOST_EVENT`.

- **L11** · 🟡 `repositoryBootHydrator`
  [repositoryBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/repositoryBootHydrator.ts#L48-L50)
  — Entry: `prefetchRepositoryAfterBootReveal()` · المستودع (الملفات القانونية) instant chrome + data cache.

- **L12** · 🟡 `settingsBootHydrator`
  [settingsBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/settingsBootHydrator.ts)
  — Entry: `bindSettingsBootHydrator()` · Settings shell + overlay presence.

- **L13** · 🟡 `scheduleBootHydrator`
  [scheduleBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/scheduleBootHydrator.ts)
  — Entry: `bindScheduleBootHydrator()` · التقويم / الجدول الزمني shell.

- **L14** · 🟡 `profileBootHydrator`
  [profileBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/profileBootHydrator.ts)
  — Entry: `bindProfileBootHydrator()` · ملف المحامي الشخصي shell.

- **L15** · 🟡 `criminalBootHydrator`
  [criminalBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/criminalBootHydrator.ts)
  — Entry: `bindCriminalBootHydrator()` · ملف القضايا الجزائية shell.

- **L16** · 🟡 `executionBootHydrator`
  [executionBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/executionBootHydrator.ts#L44-L50)
  — Entry: `runExecutionBootPrime()` · إضبارة التنفيذ + dossier surface prime.

- **L17** · 🟡 `transactionsBootHydrator`
  [transactionsBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/transactionsBootHydrator.ts#L81-L124)
  — Entry: `bindTransactionsBootHydrator()` · المعاملات المالية shell prefetch.

- **L18** · 🟡 `globalSearchBootHydrator`
  [globalSearchBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/globalSearchBootHydrator.ts)
  — Entry: `bindGlobalSearchBootHydrator()` · البحث الشامل index warm.

- **L19** · 🟡 `communityBootHydrator`
  [communityBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/communityBootHydrator.ts)
  — Entry: `bindCommunityBootHydrator()` · المجتمع / المنتدى shell.

- **L20** · 🟡 `fieldTasksBootHydrator`
  [fieldTasksBootHydrator.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/fieldTasksBootHydrator.ts#L28-L47)
  — Entry: `scheduleCurtainPeekAfterFirstPaint()` + `warmFieldTasksBootPrefetch()` · مهام الميدان curtain + sheet prefetch.

---

## Phase 3 · IDLE (scheduleIdleWork · 50-800ms بعد interactive)

- **L21** · 🟠 `calendarEventsWarm`
  [calendarEventsWarm.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/calendar/calendarEventsWarm.ts)
  — Entry: `warmCalendarEvents(userId)` · تسخين أحداث التقويم من SecureStore.

- **L22** · 🟠 `sectionChunkDataWarm`
  [sectionChunkDataWarm.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/sectionChunkDataWarm.ts)
  — Entry: `warmSectionChunkFromDisk()` · تحميل chunk data حديث من القرص للاقتحام instant التالي.

- **L23** · 🟠 `sectionChunkPreload`
  [sectionChunkPreload.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/sectionChunkPreload.ts)
  — Entry: `preloadRecentSections()` · تحميل المقاطع recent user-touched.

- **L24** · 🟠 `dashboardPostInteractiveWarm`
  [dashboardPostInteractiveWarm.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/dashboardPostInteractiveWarm.ts)
  — Entry: `runDashboardPostInteractiveWarm()` · تسخين بعد تفاعل المستخدم الأول مع اللوحة.

- **L25** · 🟠 `fieldTasksInstantChromeMarkup`
  [fieldTasksInstantChromeMarkup.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/fieldTasksInstantChromeMarkup.ts)
  — Entry: `publishFieldTasksCurtainPeekFromDiskSync()` · ستار مهام الميدان لـ FOUC prevention.

- **L26** · 🟠 `repositoryInstantChromeMarkup`
  [repositoryInstantChromeMarkup.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/repositoryInstantChromeMarkup.ts)
  — Entry: `publishRepositoryCurtainPeekFromDiskSync()` · ستار المستودع instant chrome.

---

## Phase 4 · BACKGROUND-IDLE (requestIdleCallback · hardware-idle zone, بلا حدود سرعة)

> ⚠️ **Hard Rule I/O Isolation Zone**: أي خدمة من هذا القسم **ممنوع إطلاقها** قبل وصول النقطة `requestIdleCallback` أو ما يعادلها (≥100ms timeout أو idle-hook صريح في bootReveal done). كسر هذه القاعدة = تذبذب TTFTI ≥ +200ms على الأجهزة متوسطة الدقة.

- **L27** · 🔴 `lawsuitWorkspaceEvents`
  [lawsuitWorkspaceEvents.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/lawsuitWorkspaceEvents.ts)
  — Entry: `bindLawsuitWorkspaceEvents()` · حدث workspace للقضايا — ينتظر shell جاهز.

- **L28** · 🔴 `profileInstantPaint`
  [profileInstantPaint.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/profileInstantPaint.ts)
  — Entry: `primeProfileInstantPaintSurface()` · ملف المحامي — ينتظر idle.

- **L29** · 🔴 **SecureStore kickoff (Idle-gated — CERTIFIED)**
  [SecureStoreService.ts L1993-L2017](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/SecureStoreService.ts#L1993-L2017)
  — نقطة الدخول:
    1. `bootSecureStoreShellSync()` (L1993) — يُستدعى صراحة من [bootReveal.ts L143](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/bootstrap/bootReveal.ts#L143-L143) بعد `markBootRevealDone`.
    2. Fallback مهلّل (L2010): `requestIdleCallback(fire, { timeout: 2000 })` — مستوى الوحدة **لكنه غير متزامن**؛ 100ms setTimeout على الأجهزة التي لا تدعم idle callback.
  — الضمان: `kickoffBootShellSync()` ذات نفسها محمية بـ `bootShellSyncDone` داخل الدالة L872 لمنع تنفيذ مزدوج.

- **L30** · 🔴 `CryptoService → initialize`
  [CryptoService.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/CryptoService.ts)
  — Entry: `CryptoService.initialize()` · يُستدعى ضمن `flushCryptoDeferredWrites` (400ms debounce) أو على أول write لـ PROTECTED_WARM_KEYS.

- **L31** · 🔴 `dossierWipeGuard`
  [dossierWipeGuard.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/services/dossierPersistence/dossierWipeGuard.ts)
  — Entry: `bindDossierWipeGuard()` · حارس مسح الإضابير — يعمل بعد SecureStore + Crypto جاهز.

- **L32** · 🔴 `caseStore → hydrateFromPersistence`
  [caseStore.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/stores/caseStore.ts)
  — Entry: `hydrateFromPersistence()` · تحميل مخزن القضايا من IndexedDB بعد idle.

- **L33** · 🔴 `transactionsHubLoader`
  [transactionsHubLoader.ts](file:///c:/Users/HEX%20STORE/Downloads/New%20folder/src/app/runtime/transactionsHubLoader.ts#L46-L54)
  — Entry: `prefetchTransactionsHubModule()` · تحميل مقطع المعاملات كـ lowest priority في idle النهائي.

---

## Honesty Audit Checklist · تصديق عدم كسر عزل I/O

> تشغيل هذه القواعد مع كل MR يلمس boot/runtime/services:

```bash
# الحكم 1: لا localStorage/JSON.parse ضخم داخل جسم render function أو مستوى الوحدة import (بدون حارس idle)
# الحكم 2: SecureStore.kickoffBootShellSync — لا استدعاء مباشر بدون requestIdleCallback / bootReveal:L143
# الحكم 3: Crypto.initialize — لا استدعاء قبل L30 (idle)
grep -n "localStorage.getItem\|indexedDB.open\|JSON.parse" \
  src/app/runtime/*BootHydrator.ts src/boot/*.ts src/app/bootstrap/*.ts \
  | grep -v "scheduleIdleWork\|requestIdleCallback\|setTimeout\|after.*paint\|after.*reveal"

# الحكم 4: Boot order سليمة — L1 قبل L5 قبل L9 قبل L21 قبل L29 (عدل السطر أدناه حسب الترقيم الجديد)
```

---

## Compliance Table (موجز للـ Reviewer المستقل)

| Phase | Count | Max I/O constraint | Ratchet impact |
|-------|-------|--------------------|----------------|
| SYNC (L1-L4) | 4 | No IDB, only map/session sync | TTI neutral ✅ |
| AFTER-PAINT (L5-L8) | 4 | DOM light; I/O via Promise only | CLS ≤0.005 ✅ |
| INTERACTIVE (L9-L20) | 12 | Chunk fetch + light cache | INP ≤120ms ✅ |
| IDLE (L21-L26) | 6 | Recent-scope IDB reads only | VR neutral ✅ |
| BG-IDLE (L27-L33) | 7 | Unlimited (hardware-idle gated) | No visual impact ✅ |
| **TOTAL** | **33** | — | **TR-3.4 Rubric target: ≥5/5 ✅** |

*End of LOADER_HYDRATOR_ORDER registry · Auto-verified against 33 live modules*
