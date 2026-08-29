import type { CaseStage } from '@/app/types/criminal';
import { applyAbsentiaObjectionExpiry } from './verdictCardAbsentiaExpiry';
import type { CriminalCase, StageConclusion } from './criminalCaseModel';
import {
    computeAppealDeadline,
    findTrialVerdictSession,
    normalizeTrialSessions,
} from './trialSessionsEngine';
import { resolveCurrentJourneyNodeId } from './stageJourney';
import type { VerdictCard } from './verdictCardTypes';
import { isVerdictCardOutcome, verdictOutcomeLabel } from './verdictCardPresentation';
import { normalizeVerdictCards } from './verdictCardNormalize';

export function buildVerdictCardFromConclusion(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): VerdictCard | null {
    const outcome = conclusion.decisionType;
    if (!isVerdictCardOutcome(outcome)) return null;
    const issuedAt = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const nodeId = resolveCurrentJourneyNodeId(caseRecord.stageJourney);
    const details = String(conclusion.details ?? '').trim();
    return {
        id: `verdict_${conclusion.id}`,
        outcome,
        issuedAt,
        appealDeadline: computeAppealDeadline(issuedAt),
        sourceConclusionId: conclusion.id,
        proceduralNodeId: nodeId || undefined,
        defendantIds: conclusion.defendantIds?.length ? conclusion.defendantIds : undefined,
        decisionDraft: details || undefined,
    };
}

export function upsertVerdictCardFromConclusion(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): CriminalCase {
    const built = buildVerdictCardFromConclusion(caseRecord, conclusion);
    if (!built) return caseRecord;
    const list = normalizeVerdictCards(caseRecord.verdictCards);
    const idx = list.findIndex(
        (c) => c.id === built.id || c.sourceConclusionId === built.sourceConclusionId,
    );
    if (idx >= 0) {
        const merged = { ...list[idx]!, ...built, decisionDraft: list[idx]!.decisionDraft ?? built.decisionDraft };
        const next = list.map((c, i) => (i === idx ? merged : c));
        return { ...caseRecord, verdictCards: next };
    }
    return { ...caseRecord, verdictCards: [...list, built] };
}

export function migrateVerdictCardsOnCase(caseRecord: CriminalCase): CriminalCase {
    let next: CriminalCase = { ...caseRecord, verdictCards: normalizeVerdictCards(caseRecord.verdictCards) };
    const fd = caseRecord.finalDecision;
    if (fd && isVerdictCardOutcome(fd.decisionType)) {
        next = upsertVerdictCardFromConclusion(next, fd);
    } else {
        const session = findTrialVerdictSession(normalizeTrialSessions(caseRecord.trials));
        if (session?.verdict) {
            const pseudo: StageConclusion = {
                id: `trial_${session.id}`,
                stageType: resolveCaseStageType(caseRecord.caseStage),
                decisionType: session.verdict.outcome,
                date: session.verdict.date,
                details: `حكم ${verdictOutcomeLabel(session.verdict.outcome)} — الجلسة ${session.sessionNumber}`,
            };
            next = upsertVerdictCardFromConclusion(next, pseudo);
        }
    }
    return next;
}

function resolveCaseStageType(stage: CaseStage | undefined): StageConclusion['stageType'] {
    if (stage === 'felony') return 'felony';
    if (stage === 'investigation') return 'investigation';
    return 'misdemeanor';
}

/** يُحدّث بطاقات الغيابي المنقضية مهلة اعتراضها — للعرض والحفظ. */
export function resolveVerdictCardsLifecycle(cards: VerdictCard[], referenceDate = new Date()): VerdictCard[] {
    return normalizeVerdictCards(cards).map((c) => applyAbsentiaObjectionExpiry(c, referenceDate));
}
