/**
 * Pure case transforms for CriminalCase — judicial-decision ledger.
 * Barrel re-export; import path `./caseTransformJudicialOutcome` preserved.
 */

export {
    appendJudicialDecisionOnCase,
    filterOutJudicialDecisionsForRequest,
    resolveJudicialDecisionsForCase,
    upsertJudicialDecisionOnCase,
} from './caseTransformJudicialList';

export { applyLawyerRequestOutcomeOnCase } from './caseTransformJudicialOutcomeApply';

export {
    patchDetentionDecisionOnCase,
    patchOrderEnforcementOnCase,
    persistSealedJudicialDecisionOnCase,
    resolveDecisionPartyIds,
} from './caseTransformJudicialPatches';
