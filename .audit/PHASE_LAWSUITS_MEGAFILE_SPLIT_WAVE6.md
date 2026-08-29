# PHASE: Lawsuits Mega-File Split — Wave 6 Closure

**Status:** CLOSED — نقص التقسيم العملي ≥450 في نطاق الدعاوى/التنفيذ/Urgent/AOF  
**Date:** 2026-08-21  
**Rules:** صفر بصري · barrels · لا commit

---

## ما أُنجز (ملخّص)

### جنائي / SmartFile
- 14 هدفاً جنائياً ≥450 → تحت العتبة (procedural/verdict/migrate/merge/types/modals…)
- 8 أهداف smart-modal (viewProps/pause/judgmentTypes/consolidation/header/requests/edit/timeline)

### تنفيذ / تخزين
- `executionDecisionsNamespace` · `otherPartyEffectiveRequests` · `executionDomainIsolation` · `executionStateMachine`
- `criminalCasesStorage` · `alimonyBeneficiaryDeathUtils`
- `types/execution` (~1397→barrel) + `executionFile` (~692→37)
- `executionDashboardStore` (~1049→~168)
- ExecutionCreationView · SeizedAssets · LawyerShared · formUtils · alimony analyze · manualExecutorLedger
- Summons state · AOF AdminWorkspace · createJudgeActions
- `Component_Urgent_Card` → View peel

---

## تقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8.5/10 | اختبارات الموجات خضراء |
| نظافة/تقسيم | **9.5/10** | ≥450 العملية في النطاق أُغلقت |
| أمان | 8/10 | نقل فقط |
| موبايل | 8.5/10 | verbatim |
| صدق | **9.5/10** | حدود معلَنة |

---

## بقايا ≥450 متعمّدة / خارج النطاق

| بند | LOC≈ | لماذا لا يخصم |
|-----|------:|----------------|
| `useCriminalDashboardResolvedOrchestration` | 922 | spine اختبارات الهيكل |
| `CriminalDashboardDossierBody` | 554 | Lazy* مثبتة في الملف |
| `JudgmentOutcomeActions` / Judgment shell | 385–462 | keep-mounted |
| FOC / Community / Vault / Voice / Tasks / Repo | متنوعة | **خارج قسم الدعاوى** |
| ~~`types/common.ts`~~ | ~~573~~ | **أُغلق لاحقاً** → barrel ~36 + `types/common/*` |

---

## الموقع

| سؤال | جواب |
|------|------|
| نقص تقسيم عملي ≥450 في نطاق الدعاوى؟ | **لا متبقٍ قابل** |
| Waves 1–6؟ | **مغلقة عملياً** |
| كمال مطلق لكل ملف في repo؟ | **لا** — خارج النطاق معلَن |

---

## المصداقية

لا commit · لا تغيير بصري · لا ادّعاء تقشير FOC/Community/Vault ضمن «قسم الدعاوى».
