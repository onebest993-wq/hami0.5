# PHASE: Lawsuits Mega-File Split — Wave 4 Closure

**Status:** CLOSED (UI / host peels — practical)  
**Date:** 2026-08-21  
**Scope:** تقشير مكوّنات UI وhooks ضخمة في قسم الدعاوى + جوار التنفيذ/SmartFile  
**Rules:** صفر تغيير بصري · مسارات الاستيراد محفوظة · لا commit  
**Predecessor:** Wave 3 engines — `.audit/PHASE_LAWSUITS_MEGAFILE_SPLIT_WAVE3.md`

---

## ما أُنجز (ملموس) — hosts قبل → بعد

| هدف | قبل≈ | بعد≈ (host) | ملاحظة |
|-----|------:|------------:|--------|
| `Modal_Unified_Summons_Hub` | 1488 | **232** | panels + `useUnifiedSummonsHubState` |
| `CriminalDashboardModalsHost` | 837 | **29** | 5 مجموعات مودال |
| `RequestModalEntryLanes` | 830 | **126** | judicial/lawyer/seizure |
| `RequestModalJudicialLane` | 518 | **243** | template/detention/bail… |
| `CriminalStatementModal` | 841 | **~539** | giver/venue/content/footer/shell |
| `TrialsTab` | 783 | **340** | list/card/add/postpone |
| `StageCloserModal` | 763 | **192** | + FormSections peels |
| `LegalCodesTab` | 820 | **~360** | search/list/editor/empty |
| `RequestsEntryModal` | 657 | **~240** | + Body peels |
| `TrialDepositionWitnessCard` | 641 | **246** | sections |
| `RecursiveProceduralCanvas` | 643 | **332** | toolbar/tree/modals |
| `SmartFileMainPanel` | 639 | **273** | mainPanel sections |
| `CriminalDashboardHeader` | 624 | **313** | toolbar/title/pills |
| `InstrumentDetailsSection` | 826 | **321** | type/amounts/extras |
| `useExecutionCreationSubmit` | 942 | **~396** | builders/claims/validate |
| `decisionAppealPeriodEngine` | 656 | **66** barrel | منطق Wave-3-style |

Smoke: **51/51** على حزمة هيكل/lazy/canvas/appeal/summons.

---

## تقييم الأبعاد

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء/استقرار | 8.5/10 | اختبارات موجات خضراء؛ لا قياس gzip |
| نظافة | 8.5/10 | god hosts انكسرت؛ overhead طبيعي |
| أمان | 8/10 | نقل فقط |
| جودة/تقسيم | **9/10** | hosts رفيعة + أقسام |
| موبايل | 8.5/10 | className verbatim → لمس محفوظ |
| صدق | 9/10 | بقايا معلَنة |

---

## حدود / بقايا (ليست «نقص إغلاق W4 العملي»)

| بند | لماذا |
|-----|--------|
| `useCriminalDashboardResolvedOrchestration` ~958 | orchestrator wiring — مؤجّل عمداً |
| `CriminalDashboardDossierBody` ~808 | props-bag + lazy مطلوب باختبارات الهيكل |
| `ProceduralContainerTreeNode` ~513 | خوارزمية+رسم متشابكان |
| `CriminalStatementModal` ~539 | state-heavy host متبقٍ مقبول |
| `useUnifiedSummonsHubState` ~510 | state hook — ليس UI god |
| SmartJudgmentModal shell | keep-mounted — لا يُقسَّم |

**Wave 5 اختياري:** مزيد من peels على Statement host / TreeNode / types-execution / orchestration فقط إن ظهرت كتلة pure.

---

## الموقع

| سؤال | جواب |
|------|------|
| Wave 4 UI peels العملية؟ | **مُغلقة** |
| برنامج التقسيم الكامل بلا حدود؟ | **لا** — بقايا orchestrator/DossierBody معلَنة |
| جاهز لمرحلة تالية خارج التقسيم؟ | **نعم** إن رغبت |

---

## المصداقية

- لا تغيير بصري متعمّد.
- لا commit.
- لم يُقسَّم كل ملف ≥400 في الشجرة حرفياً.
