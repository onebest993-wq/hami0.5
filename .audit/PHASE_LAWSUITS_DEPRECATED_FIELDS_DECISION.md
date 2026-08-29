# PHASE — Deprecated persisted model fields (Lawsuits / Criminal)

**Date:** 2026-08-21  
**Scope:** `criminal-system/` models & engines · `smart-modal/smartFile` judgment types · `LawyerNewCase` third-party legacy fields  
**Rule:** Never remove fields still read by persist migrate or live UI. SAFE_REMOVE only when Grep-proven zero readers in prod + migrate.

## Summary counts

| Class | Count |
|-------|------:|
| **KEEP** | 13 |
| **ALIAS_ONLY** | 8 |
| **SAFE_REMOVE** | 3 |
| **Total inventoried** | 24 |

## SAFE_REMOVE — implemented this phase

| Symbol | Location | Evidence |
|--------|----------|----------|
| `ThirdParty.entryType` | `LawyerNewCase/types.ts` | Grep: only declaration; no migrate/UI reader |
| `ThirdParty.role` | `LawyerNewCase/types.ts` | Grep: only declaration; display path uses `roleLabel` / `entryMode` (`partiesFromThirdPartyPayload`) |
| `ThirdParty.alignment` | `LawyerNewCase/types.ts` | Grep: only declaration; no migrate/UI reader |

**Deleted:** the three optional properties above from the `ThirdParty` interface (comments + fields). Runtime JSON may still carry unknown keys; nothing in Hami read them.

---

## KEEP — still read for old saved data / live UI

| # | Symbol | File | Why kept | Migrate / reader path |
|---|--------|------|----------|------------------------|
| 1 | `Statement.witnessKind` | `criminalCaseModel.ts` | Old witness side enum | `criminalStorePersistMigrateNormalize` · `CriminalStatementModal` · `StatementLogCard` |
| 2 | `LawyerRequest.decisionArchived` | `criminalCaseModel.ts` | Legacy lock flag → `isLocked` | `criminalStorePersistMigrateNormalize` · `lawyerRequestStatusMachine` · CRUD actions |
| 3 | `CriminalCase.cassationCaseDetails` | `criminalCaseModel.ts` | Pre-`cassationProceeding` blob | `criminalStorePersistMigrate` · `cassationEngine` · dashboard dossier body |
| 4 | `CriminalCase.mergedFromCaseIds` | `criminalCaseModel.ts` | Pre-`mergedCaseIds` list | `criminalCaseMergeUtils` / `resolveMergedCaseIds` |
| 5 | `StageFinalPenaltyBlock.accessory_penalties` | `stageFinalDecisionEngine.ts` | Old penalty string | `stageFinalDecisionEngine` · `verdictCardsEngine` |
| 6 | `TrialDepositionComparison.trialText` | `trialDepositionsEngine.ts` | Old comparison text | `normalizeTrialDepositionComparison` · `statementLinking` · UI fallback |
| 7 | `TrialDepositionComparison.investigationText` | `trialDepositionsEngine.ts` | Same | Same + `TrialDepositionWitnessCard` |
| 8 | `LEGACY_DECRIMINALIZATION_REASON` | `stageExpirationReasons.ts` | Old expiration value `decriminalization` | `isStageExpirationReason` · `stageExpirationReasonLabel` · `ExpirationReasonFields` |
| 9 | `ARREST_SUMMON_TEMPLATE` | `proceduralRequestTypes.ts` | Unified arrest/summon template | `LEGACY_TEMPLATE_ALIASES` / `normalizeProceduralRequestTemplate` · `useCriminalRequestTemplateHandlers` |
| 10 | `INVESTIGATION_CLOSURE_FINAL_TEMPLATE` | `proceduralRequestTypes.ts` | Old final-closure title | Alias map → personal final closure · purge tests / normalize |
| 11 | `ProceduralNoteItem.contextRef` | `proceduralContainersModel.ts` | Free-text context before `link` | `proceduralContainersNormalize` · `proceduralItemLink` · canvas/modals |
| 12 | `JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY` | `smartFile/judgmentTypes.ts` | Legacy judgment picker value | `isNonMeritTerminationType` · `judgmentConfirm/scenarioArchive` |
| 13 | `INVESTIGATION_ARTICLE_130_DECISIONS` | `criminalStageUtils.ts` | Fixed Art. 130 option list for closer UI | `StageCloserModal` (+ unit tests) |

---

## ALIAS_ONLY — wrappers / stubs kept for compat or tests

| # | Symbol | File | Why kept | Readers |
|---|--------|------|----------|---------|
| 1 | `sendCaseToCassation` | `criminalStoreStateLifecycleSlice.types.ts` (+ store actions) | Thin path into `initiateCassationProceeding` | Store tests / merge tests |
| 2 | `isPriorStageLawyerRequestOrderSealed` | `requestActionEngine.ts` | Alias of `isPriorStageRecordAppealsSealed` | `requestActionEngine.test.ts` |
| 3 | `formatInvestigationPurgeDecisionDisplayTitle` | `proceduralRequestTypes.ts` | Alias of `formatJudicialTemplateDisplayLabel` | `JudicialDecisionsLedger` · purge tests |
| 4 | `isDetentionRequestTemplate` | `proceduralRequestTypes.ts` | Alias of `isDetentionDecisionTemplate` | `proceduralCassationResults` · `complainantCassationGovernance` |
| 5 | `shouldAutoSplitJuvenileMixedDraft` | `juvenileMixedCaseSplitEngine.ts` | Always `false`; no auto-split | Unit tests only |
| 6 | `resolveJuvenileJudgeDecisionTemplates` | `juvenileInvestigationRules.ts` | Compat wrapper for juvenile exclusive templates | `judicialTemplatesForPartyScope` |
| 7 | `RETRIAL_TARGET_STAGE_OPTIONS` | `LawyerNewCase/validation.ts` | Alias of `UNDERLYING_STAGE_OPTIONS` | `civilJudiciaryScenarios.test.ts` |
| 8 | `isRetrialStage` | `LawyerNewCase/validation.ts` | Alias of `isExtraordinaryProcedureStage` | Same test file |

---

## Honest limits

- Extra JSON keys on old `thirdParties` blobs (`entryType` / `role` / `alignment`) are ignored; no migrate step rewrites them away (unnecessary — zero readers).
- ALIAS_ONLY exports were **not** deleted: prod or tests still import them.
- No visual redesign; comment-only tighten on KEEP/ALIAS.
- Commit: not requested / not performed.

## Verification

- Grep inventory of `@deprecated` under scoped trees before/after.
- SAFE_REMOVE proven by workspace Grep (LawyerNewCase + smartFile third-party paths).
- Related tests: LawyerNewCase client/third-party + civil scenarios (run in-session after delete).
