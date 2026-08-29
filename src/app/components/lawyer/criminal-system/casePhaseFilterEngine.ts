/**
 * Public case-phase filter API — barrel re-exporting split modules.
 * Import path `./casePhaseFilterEngine` is preserved for all consumers.
 */

export type {
    CasePhaseFilter,
    CaseRecordPhase,
    DecisionsScopeFilter,
    DecisionsScopeOption,
    ScopeRecordItem,
} from './casePhaseFilterTypes';

export {
    caseRecordPhaseShortLabel,
    filterByCasePhase,
    partitionStatementsByPhase,
    resolveJudicialDecisionCasePhase,
    resolveLawyerRequestCasePhase,
    resolveRecordCasePhase,
    resolveTrialPhasePivotMs,
} from './casePhaseResolveCore';

export {
    resolveRecordJourneyStage,
    resolveRecordJourneyStageLabel,
} from './casePhaseJourneyStage';

export {
    buildDecisionsScopeFilterOptions,
    countDecisionsScopeDisplayTotal,
    defaultDecisionsScopeForStage,
    filterByDecisionsScope,
    filterTrialSessionsByDecisionsScope,
    isFirstInvestigationStageOnly,
    shouldShowDecisionsScopeFilterBar,
} from './casePhaseDecisionsScope';

export {
    isInvestigationClosedProceduralRoot,
    resolveProceduralRootCasePhase,
} from './casePhaseProceduralRoots';
