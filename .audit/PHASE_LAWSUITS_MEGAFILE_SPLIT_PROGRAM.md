# PHASE: Lawsuits Mega-File Split Program

**Wave:** 6 **CLOSED** — `.audit/PHASE_LAWSUITS_MEGAFILE_SPLIT_WAVE6.md`  
**Also:** W3–W5 closed  
**Date:** 2026-08-21  
**Scope:** Lawsuits mega-file split — practical ≥450 closed in lawsuits/execution/urgent/AOF  
**Intentional residuals:** orchestration spine · DossierBody Lazy · Judgment keep-mounted · FOC/Community/Vault out of scope

---

## Wave 1 — completed splits (reference)

### 1) `criminalStageUtils.ts` → procedural + defendant-status modules

| File | Before | After |
|------|--------|-------|
| `criminal-system/criminalStageUtils.ts` | **1020** | **709** (barrel + timeline/merge/party remain) |
| `criminal-system/criminalProceduralStageUtils.ts` | — | **248** (new) |
| `criminal-system/criminalDefendantStatusUtils.ts` | — | **267** (new) |

**Tests:** `criminalStageUtils.test.ts` — **44/44 passed**

### 2) `cassationEngine.ts` → filing/meta module

| File | Before | After |
|------|--------|-------|
| `criminal-system/cassationEngine.ts` | **914** | **768** (mutations + filing apply remain) |
| `criminal-system/cassationFilingMeta.ts` | — | **254** (new) |

**Tests:** `cassationEngine.test.ts` — **18/18 passed**

---

## Wave 2 — completed splits

### 1) `criminalStageUtils.ts` → timeline + merge + party modules

| File | Before (post-W1) | After |
|------|------------------|-------|
| `criminal-system/criminalStageUtils.ts` | **709** | **123** (barrel only) |
| `criminal-system/criminalTimelineCategoryUtils.ts` | — | **237** (new) |
| `criminal-system/criminalMergeStageUtils.ts` | — | **236** (new) |
| `criminal-system/criminalActionPartyUtils.ts` | — | **167** (new) |

**Peeled clusters**
- Private-right waiver + article 130 + investigation timeline categories / display normalize / category predicates (`criminalTimelineCategoryUtils.ts`)
- `caseStage` / operational / merge eligibility / merge bucket helpers (`criminalMergeStageUtils.ts`)
- `CriminalActionParty` + display/anonymize/build-party + log-status labels (`criminalActionPartyUtils.ts`)

**Public path:** `./criminalStageUtils` still re-exports every previous symbol.

**Tests:** `criminalStageUtils.test.ts` **44/44** + `criminalStageUtils.newCaseStage.test.ts` **3/3**

---

### 2) `cassationEngine.ts` → filing apply + result apply + shared mutation helpers

| File | Before (post-W1) | After |
|------|------------------|-------|
| `criminal-system/cassationEngine.ts` | **768** | **32** (barrel only) |
| `criminal-system/cassationMutationShared.ts` | — | **67** (new) |
| `criminal-system/cassationFilingApply.ts` | — | **193** (new) |
| `criminal-system/cassationResultApply.ts` | — | **520** (new) |

**Peeled clusters**
- Shared id/timeline/personal-stage helpers (`cassationMutationShared.ts`)
- `InitiateCassationPayload` + `migrateLegacyCassationToProceeding` + `applyCassationFiling` (`cassationFilingApply.ts`)
- Guards + `recordCassationResult` + remand journey + `applyCassationOutcome` (`cassationResultApply.ts`)

**Public path:** `./cassationEngine` re-exports all peeled symbols (import path unchanged).

**Tests:** `cassationEngine.test.ts` — **18/18 passed**

---

### 3) `JudicialDecisionsLedger.tsx` → shared chrome + Preparatory/Dispositive cards

| File | Before | After |
|------|--------|-------|
| `components/JudicialDecisionsLedger.tsx` | **1005** | **316** (root + public types) |
| `components/JudicialDecisionsLedgerCardShared.tsx` | — | **282** (new) |
| `components/JudicialDecisionsLedgerPreparatoryCard.tsx` | — | **242** (new) |
| `components/JudicialDecisionsLedgerDispositiveCard.tsx` | — | **231** (new) |

**Peeled clusters**
- Header/Body/Footer chrome + badges/buttons moved as-is (no className/style edits)
- `PreparatoryCard` / `DispositiveCard` JSX moved verbatim into sibling modules
- Ledger root keeps public props/types and list orchestration

**Public path:** `./components/JudicialDecisionsLedger` unchanged for consumers.

**Tests:** `JudicialDecisionsLedger.test.tsx` **3/3** + `judicialDecisionsLedgerEngine.test.ts` **8/8**

---

## Skipped this wave (with reason)

| Candidate | LOC now | Decision |
|-----------|---------|----------|
| `useCriminalDashboardResolvedOrchestration.ts` | **996** | Already decomposed into hooks + pure modules (`resolveCriminalDashboardHeaderTitle`, `assembleCriminalDashboardModalsHostProps`, `computeCriminalDashboardForceModalsHost`, …). Remaining body is wiring — **no solid pure peel without incomplete surgery** |
| `Form_Urgent_Actions.tsx` | **561** | Deferred; lower ROI than completed peels this session |

---

## Test summary (Wave 2)

```
criminalStageUtils.test.ts              44 passed
criminalStageUtils.newCaseStage.test.ts  3 passed
cassationEngine.test.ts                 18 passed
JudicialDecisionsLedger.test.tsx         3 passed
judicialDecisionsLedgerEngine.test.ts    8 passed
TOTAL                                   76 passed
```

---

## Wave 3 — completed (engines) — summary

See full closure: `.audit/PHASE_LAWSUITS_MEGAFILE_SPLIT_WAVE3.md`

| Target | Before → barrel |
|--------|-----------------|
| `cassationResultApply.ts` | 520 → ~47 |
| `visitationScheduleEngine.ts` | 892 → ~81 |
| `investigationDefendantPurge.ts` | 879 → ~63 |
| `stageJourney.ts` | 848 → ~66 |
| `executorSeizureDecisionQueue.ts` | ~2526 → ~118 (+ deep peels) |
| `judicialDecisionsEngine.ts` | 774 → ~56 |
| `appealStageTransition.ts` | ~664 → ~27 |

**Form_Urgent_Actions** was already ~110 (doc Wave 3 candidate was stale). Orchestration hook still deferred.

---

## Wave 4 — completed (UI hosts) — summary

Full table: `.audit/PHASE_LAWSUITS_MEGAFILE_SPLIT_WAVE4.md`

Highlights: Summons Hub 1488→232 · ModalsHost→29 · EntryLanes→126 · TrialsTab→340 · StageCloser→192 · LegalCodes→360 · SmartFileMainPanel→273 · decisionAppealPeriodEngine→66 barrel · + InstrumentDetails / submit hook / witness / canvas / header / RequestsEntry.

---

## Wave 5 — completed (residuals) — summary

Full: `.audit/PHASE_LAWSUITS_MEGAFILE_SPLIT_WAVE5.md`

TreeNode 521→169 · DossierBody→554 · stageFinalDecision→49 barrel · procedural hooks→11 · caseModel→50 · trialActions→22 · RequestsTab/Appeal/AddDoc peels · orchestration 996→922 (spine kept for structure tests).

---

## Optional Wave 6

ملفات ~450–500 (viewProps، StatementModal host، migrate، pause actions، …) — فقط بطلب صريح.  
Orchestration / Judgment keep-mounted: حدود متعمّدة.

---

## Honesty / limits

- Waves 1–5 = برنامج التقسيم **العملي** لقسم الدعاوى.
- Visual untouched.
- Not every ≥450 file peeled.
