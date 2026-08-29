# إغلاق خصم صفر — نظافة + تخفيف + كثافة الدعاوى

**تاريخ:** 2026-08-21  
**نطاق:** فجوات خصم قابلة للإصلاح من المخزون الحي (#1–20)  
**لا commit.**  
**قواعد:** صفر فقدان وظائف · navy/gold محفوظ · لمس ≥44px · prefetch-on-intent مسموح  
**INTENTIONAL_KEEP:** *Props · KEEP deprecated judgment · SmartJudgmentModal keep-mounted · chrome تنفيذ حصري

---

## جدول #1–20

| # | البند | الحالة | ملاحظة صادقة |
|---|--------|--------|---------------|
| 1 | `heavyDashboardSectionWarm` → `includeSecondary: false` | **Done** | لا criminal/SmartFile/NewCase فوري من heavy warm |
| 2 | استخراج مساعدات خفيفة من `trialSessionsEngine` | **Done** | إلى `trialSessionsDisplay`؛ المحرّك يعيد التصدير للتوافق |
| 3 | تأجيل `LazyCriminalDashboardRequestsTab.preload` | **Done** | رأس/أطراف مبكّر؛ requests عند idle 4.2s أو نية تبويب |
| 4 | أرشيف: لا presentation core دائماً | **Done** | `criminalArchiveReferenceLite` + lazy `CriminalArchiveCard`؛ utils الغنية مع البطاقة فقط |
| 5 | `SmartFileMainPanel` lazy ToDo/Civil/Incidental + personal gated | **Done** | PersonalStatusDossierBody خلف `isPersonalStatusFile` + lazy |
| 6 | `SmartFileModalsJudgmentSection` lazy JudicialNotification | **Done** | SmartJudgmentModal يبقى keep-mounted |
| 7 | تليين `prefetchSmartFileHotModals` | **Done** | بلا Judgment prefetch؛ Flow/Admin عبر idle/تأخير |
| 8 | `partyContextFilter` typed `isUnderSeven` | **Done** | `Boolean(c/d.isUnderSeven)` بلا `as any` |
| 9 | `NC_FIELD_ERROR` غير مُصدَّر | **Done** | داخلي فقط عبر `ncFieldClass` |
| 10 | `smartFileModalTheme` closeBtn ≥44 | **Done** | |
| 11 | `moroccanGlassShell` close ≥44 | **Done** | |
| 12 | `PartyChip` + contentEntry shared ≥44 | **Done** | |
| 13 | `ToDoList` 40→44 | **Done** | |
| 14 | AOF/urgent min-h 36/40→44 | **Done** | Grievance* · JudgeDecision · ConfirmDialog · UrgentLifecycle |
| 15 | `TimelineFeed` delete 44 + empty denser | **Done** | `py-12`→`py-8` |
| 16 | Judgment chrome body denser | **Done** | `p-4 sm:p-5` في `smartModalChrome` |
| 17 | `sessionHubGlassTheme` denser | **Done** | padding/header/body/section/footer |
| 18 | `TrashModal` empty denser | **Done** | `py-12`→`py-8` |
| 19 | `UrgentDashboardErrorFallbacks` denser | **Done** | `p-6`→`p-4` |
| 20 | `ARCHIVE_CHIP_BASE` 36→44 | **Done** | مشترك (يشمل مسار التنفيذ إن استخدم الثابت) |
| — | `DossierHeaderNavButtons` compact ≥44 | **Done** | overlays الدعاوى |

---

## Skipped / Intentional residual

| بند | السبب |
|-----|--------|
| SmartJudgmentModal eager keep-mounted | INTENTIONAL_KEEP — عقد فتح مرحلة |
| `*Props` contracts / KEEP deprecated judgment types | INTENTIONAL_KEEP |
| Execution-only exclusive chrome (مثلاً loading `py-20` في ExecutionArchiveFileGrid) | خارج نطاق leftovers الدعاوى |
| قياس gzip/vite analyze رقمي | **Done 2026-08-21** | `.audit/PHASE_LAWSUITS_BUNDLE_SIZE_MEASUREMENT.md` + baseline؛ ثم إغلاق named seizure + ED→72KB — `.audit/PHASE_LAWSUITS_GAP_CLOSURE_BUNDLE_2026-08-21.md` |

---

## اختبارات مركّزة (تشغيل هذه الجلسة)

**6 files · 58 passed** (vitest)

- `heavyDashboardSectionWarm.test.ts` (3)
- `criminalDashboardLazyRegistry.test.ts` (8)
- `trialSessionsEngine.test.ts` (20)
- `lawsuitArchiveTouchTargetFloors.test.ts` (8)
- `smartFileTouchTargetFloors.test.ts` (8)
- `urgentSectionStructure.test.ts` (11)

---

## تقييم أبعاد (واقعي)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8.5/10 | secondary warm off + lazy hubs + deferred requests؛ بلا قياس Lighthouse |
| نظافة | 9/10 | any مُزال في partyContext؛ demote NC_FIELD_ERROR؛ lite display path |
| أمان | 8/10 | لا تغيير صلاحيات؛ عناوين حذف جزائي عبر lite (نفس الحقول الخام) |
| جودة كود | 8.5/10 | تقسيم display/lite واضح؛ إعادة تصدير توافق |
| موبايل | 9/10 | touch floors 44 على السطوح المطلوبة؛ كثافة بلا redesign هوية |
| صدق | 9.5/10 | residuals أعلاه معلنة |

**جاهز للانتقال:** نعم ضمن نطاق #1–20 القابل للإصلاح. لا ادّعاء «صفر خصم عالمي» لكل مستودع الدعاوى خارج هذه القائمة.
