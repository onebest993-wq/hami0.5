import type { CriminalCase, StageConclusion } from './criminalCaseModel';
import {
    resolveCaseSovereignContext,
    syncCaseSovereignContext,
} from './caseClassificationEngine';
import { resolveCaseStageFromRecord } from './criminalStageRuntimeCore';
import {
    buildStageConclusionFromForm,
    enrichVerdictCardFromForm,
    inferDecisionCaseTypeFromContext,
    validateStageFinalDecisionForm,
    type StageFinalDecisionFormPayload,
} from './stageFinalDecisionEngine';
import { normalizeVerdictCards } from './verdictCardsEngine';

export type RegisterStageFinalDecisionMeta = {
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
};

export type PreparedStageFinalDecision = {
    syncedCase: CriminalCase;
    conclusion: StageConclusion;
    cardId: string;
    caseType: ReturnType<typeof inferDecisionCaseTypeFromContext>;
};

function resolveStageConclusionType(
    caseStage: ReturnType<typeof resolveCaseStageFromRecord>,
): StageConclusion['stageType'] {
    if (caseStage === 'felony') return 'felony';
    if (caseStage === 'investigation') return 'investigation';
    return 'misdemeanor';
}

export function prepareStageFinalDecisionOnCase(
    target: CriminalCase,
    payload: StageFinalDecisionFormPayload,
    meta: RegisterStageFinalDecisionMeta,
): { error: string | null; prepared: PreparedStageFinalDecision | null } {
    const syncedCase = syncCaseSovereignContext(target);
    const sovereignContext = resolveCaseSovereignContext(syncedCase);
    const validationErr = validateStageFinalDecisionForm(payload, sovereignContext);
    if (validationErr) {
        return { error: validationErr, prepared: null };
    }

    const caseStage = syncedCase.caseStage ?? resolveCaseStageFromRecord(syncedCase);
    const conclusion = buildStageConclusionFromForm(
        payload,
        resolveStageConclusionType(caseStage),
        meta.defendantStatusAtDecision,
    );

    return {
        error: null,
        prepared: {
            syncedCase,
            conclusion,
            cardId: `verdict_${conclusion.id}`,
            caseType: inferDecisionCaseTypeFromContext(sovereignContext, caseStage),
        },
    };
}

export function applyStageFinalVerdictCardOnCase(
    caseRecord: CriminalCase,
    payload: StageFinalDecisionFormPayload,
    prepared: PreparedStageFinalDecision,
): CriminalCase {
    const cards = normalizeVerdictCards(caseRecord.verdictCards);
    const idx = cards.findIndex(
        (card) =>
            card.id === prepared.cardId ||
            card.sourceConclusionId === prepared.conclusion.id,
    );
    if (idx < 0) return caseRecord;

    const enriched = enrichVerdictCardFromForm(cards[idx]!, payload, prepared.caseType);
    return {
        ...caseRecord,
        verdictCards: cards.map((card, index) => (index === idx ? enriched : card)),
    };
}
