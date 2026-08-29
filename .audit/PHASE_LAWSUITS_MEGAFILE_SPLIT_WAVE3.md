# PHASE: Lawsuits Mega-File Split — Wave 3 Closure

**Status:** CLOSED (engines / logic peels)  
**Date:** 2026-08-21  
**Scope:** قسم الدعاوى + محركات جوار التنفيذ المرتبطة  
**Rules:** منطق فقط · مسارات الاستيراد محفوظة · لا تغيير بصري · لا commit  
**Agents:** cassation · visitation · purge · stageJourney · seizure · judicial · appealStage · seizure residual peels

---

## ما أُنجز (ملموس)

### A — Cassation result apply
| File | Before → After |
|------|----------------|
| `cassationResultApply.ts` | 520 → **47** barrel+outcome |
| `cassationRemandJourneyApply.ts` | **129** new |
| `cassationResultRecord.ts` | **368** new |
| Tests | cassationEngine **18/18** |

### B — Visitation schedule engine
| File | Before → After |
|------|----------------|
| `visitationScheduleEngine.ts` | 892 → **81** barrel |
| labels / dates / sessions / calendar / print | peels |
| Tests | domain visitation **16** + related **34** |

### C — Investigation defendant purge
| File | Before → After |
|------|----------------|
| `investigationDefendantPurge.ts` | 879 → **63** barrel |
| scope / closure / apply | peels |
| Tests | purge **31** + investigation related **24** |

### D — Stage journey
| File | Before → After |
|------|----------------|
| `stageJourney.ts` | 848 → **66** barrel |
| types/labels/transitions/build/query/repair | peels |
| Tests | stageJourney+cassation+stageUtils **83** |

### E — Executor seizure decision queue (W3b+c)
| File | Before → After |
|------|----------------|
| `executorSeizureDecisionQueue.ts` | ~2526 → **~118** barrel |
| Types / Read* / Append* / Patch | peels متدرجة حتى Seizure/Coercive/Eviction + Governing Hub/Personal/Eviction |
| Tests | seizure/executorDecision **35–44** per wave |

### F — Judicial decisions engine
| File | Before → After |
|------|----------------|
| `judicialDecisionsEngine.ts` | 774 → **56** barrel |
| eligibility / cassationHelpers / listHelpers | peels |
| Tests | **80** across 6 files |

### G — Appeal stage transition (SmartFile)
| File | Before → After |
|------|----------------|
| `appealStageTransition.ts` | ~664 → **27** barrel |
| apply / remand / correction / shared | peels |
| Tests | **38/38** (4 files) |

---

## تقييم الأبعاد (صادق)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء / استقرار | 8.5/10 | اختبارات الموجات نجحت؛ لا ادّعاء قياس gzip |
| نظافة | 8.5/10 | monoliths انكسرت؛ overhead استيراد طبيعي بعد التقسيم |
| أمان | 8/10 | لا تغيير صلاحيات؛ نقل منطق فقط |
| جودة / تقسيم | **9/10** | barrels + clusters واضحة |
| موبايل | 8/10 | بلا مساس UI؛ لا regression لمس متعمّد |
| صدق | 9/10 | بقايا معلَنة أدناه |

---

## حدود / بقايا عمدية أو مؤجّلة (Wave 4)

| بند | لماذا ليس «نقص إغلاق W3 engines» |
|-----|----------------------------------|
| `investigationDefendantScopeUtils` ~492 | كتلة scope متماسكة؛ تقشير اختياري |
| `judicialDecisionListHelpers` ~452 | coalesce/normalize مترابط |
| `executorSeizureDecisionQueueReadResolve` ~422 | سياق resolve؛ تحت عتبة الوحش السابقة |
| `useCriminalDashboardResolvedOrchestration` ~996 | **orchestrator wiring** — ليس محركاً غير مقسّم |
| UI gods: Summons Hub ~1488، StatementModal، ModalsHost، TrialsTab… | **Wave 4** — peel JSX حرفياً فقط |
| `types/execution.ts` ~1500 | أنواع؛ P2 |
| SmartJudgmentModal shell | keep-mounted — لا يُقسَّم الغلاف |

---

## الموقع

| سؤال | جواب |
|------|------|
| موجة 3 محركات / منطق؟ | **مُغلقة** |
| برنامج التقسيم الكامل لقسم الدعاوى؟ | **لا** — يتبقى Wave 4 (UI peels) + اختياري type/store |
| جاهز للانتقال إلى Wave 4؟ | **نعم** |

---

## المصداقية

- لم يُقسَّم كل ملف ≥400 في الشجرة حرفياً.
- لم يُغيَّر شكل/CSS.
- لم يُعمل commit.
- نسبة حجم الحزم النهائية **غير** مُقاسة في هذه الموجة.
