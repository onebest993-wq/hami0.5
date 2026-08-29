# إغلاق موجات النظافة 4–6 — قسم الدعاوى

**تاريخ:** 2026-08-21  
**نطاق:** نظافة ذرّية (حذف/demote/توحيد أنواع) — بلا إعادة تصميم بصري — بلا commit

## صدق

- Wave 4 سُجّلت سابقاً في البرنامج الكامل؛ هذا الملف يغلق **5–6** ويذكر المتبقي بأمانة.
- كل حذف/demote في Wave 5 مُسبوق بـ Grep؛ ما ظهر مستخدماً بقي.
- Wave 6: تخفيض `as any` في hydrate helpers المستهدفة فقط — **ليس** mass على `criminalStorePersistMigrate*`.

---

## Wave 5 — جدول منجز / متخطّى

| # | البند | الحالة | الدليل |
|---|--------|--------|--------|
| 1 | `prefetchCriminalLegalCodesTab` / `prefetchCriminalProceduralCanvas` | Verified closed (W4) | Grep صفر |
| 2 | `PS_CHROME_BTN` | Done | حُذف من `personalStatusDossierTheme` + import الميت |
| 3 | pearl aliases الميتة | Verified W4 + demote داخلي | aliases المستعملة (`PS_PANEL_ELEPHANT`) بقيت؛ ظلال/tile نفس-الملف demote |
| 4 | Form re-exports `URGENT_PETITION_PRIMARY` / `actionTypeOptions` | Done | أُزيلا من `Form_Urgent_Actions/constants`؛ deep من domain |
| 5 | `onToggle={() => {}}` legacy thirdParties | Done | `PartyChip` props اختيارية؛ legacy بلا noop |
| 6 | `isLawsuitFileArchived` ↔ `isLawsuitArchived` | Done | عام: `isLawsuitArchived`؛ داخلي: `lawsuitTargetIsArchived` |
| 7 | `UrgentSubmitContext` | Verified closed (W4) | type غير مُصدَّر |
| 8 | `criminalStageUtils` dead helpers | Done | حذف timeline/badge بلا مستوردين خارجي؛ demote داخلي لما يخدم exports حيّة |
| 9 | fake `lazy(Promise.resolve(TrialsTab))` | Done | `TrialsTab` ثابت في `CriminalDashboardRequestsTab` |
| 10 | dedupe timeline filters store ↔ ExecutionDossierScope | **Skipped** | execution-only + مخاطر تراجع؛ لا قيمة دعاوى مباشرة |
| 11 | `personalHubTheme` ≡ pearl | Done | غلاف حُذف؛ `hubTheme('personal')` → pearl مباشرة |

### Wave 5 — أمثلة محذوفات criminalStageUtils (ثقة عالية)

`INVESTIGATION_LOCK_MUTATION_ERROR`, badges (`COMPLAINANT_*` / `DEFENDANT_*` / `MUTUAL_*` / `JUVENILE_PARTY_*`), `PHYSICAL_LOCATION_*` + `formatPhysicalLocationLabel`, `isTrialTimelineCategory` + `LEGACY_TRIAL_*`, `sortTimelineEventsDesc` / `buildCombinedTimelineView`, bail/detention extension wrappers الميتة، `partyColumnBadge`, `representationRoleBadge` + `OFFICE_REPRESENTATION_OPTIONS`, `formatCriminalStageOptionLabel`, `hasJuvenileComplainant`, `isAdultOnlyDefendantStatus`, closure helper functions (النوع `InvestigationClosureReason` بقي لـ model).

---

## Wave 6 — تخفيض `as any` (hydrate)

| ملف | قبل (تقريبي) | بعد | أسلوب |
|-----|---------------|-----|--------|
| `applyCaseRecord.ts` | ~17× `as any` | **0** | حقول `PersistedCaseRecord` + `ymdPrefix` / `asObjectRecord` |
| `useOrderFilePartyWorkspace.ts` | ~10× `as any` | **0** | `OrderFilePartyCaseData` + `asPartyRows` |
| `criminalStorePersistMigrate*` | — | **Skipped** | خارج الموجة |

---

## اختبارات

```
vitest run … (criminalStageUtils, lawsuitTrash/mutationGuard, personal-status structure/overlayZ,
  Dashboard_Active_Order_File, Form_Urgent_Actions, domain/urgent, criminalDashboardLazyRegistry,
  casePhaseFilterEngine, executionDashboardTimelineScope)
→ 17 files / 123 tests passed
```

---

## تقييم الأبعاد (صادق — Waves 5–6 فقط)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء/استقرار | 8/10 | اختبارات مركّزة خضراء؛ لا قياس runtime جهاز |
| نظافة | 8/10 | P0/P1 المستهدفة أُغلقت؛ تكرار timeline تنفيذ متبقٍ عمداً |
| أمان | 7/10 | توحيد archive API أوضح؛ لا مراجعة أمنية كاملة |
| جودة كود | 8/10 | demote/حذف + تضييق أنواع hydrate |
| موبايل | 7/10 | لا تغيير بصري؛ PartyChip touch path للـ main لم يُكسر |
| صدق | 9/10 | skip معلن؛ دين `as any` خارج الهدف معلن |

---

## دين نظافة متبقٍ (مرتّب)

1. **تكرار فلاتر timeline التنفيذ** (store ↔ domain) — يحتاج موجة execution منفصلة باختبارات نطاق.
2. **`as any` في Active Order File** خارج الملفين المستهدفين (persist / lifecycle / بعض derived hooks).
3. **`UseOrderFileHydrateArgs.caseData: any`** و setters واسعة في مسارات أخرى.
4. **criminal PersistMigrate typing** — مؤجّل عمداً (سلوك حساس).
5. **P2 stubs / حقول @deprecated** — قرار منتج لا حذف آلي.
6. **ملفات ضخمة / تقسيم** — خارج نطاق cleanliness الذري.

**جاهز للانتقال لمرحلة تالية؟** نعم لـ Wave 7+ (execution dedupe أو `as any` أوسع أو stubs سياسة) — بشرط عدم خلطها بإعادة تصميم.
