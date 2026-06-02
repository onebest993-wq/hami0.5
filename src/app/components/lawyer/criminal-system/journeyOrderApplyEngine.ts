import type { CaseStage, JourneyNode, ProceduralTransitionActionId } from '@/app/types/criminal';
import type { CriminalCase, StageConclusion } from './criminalStore';
import { isTrialCaseStage, resolveCaseStageFromRecord } from './criminalStageUtils';
import {
    findTransitionOption,
    getCurrentJourneyNode,
    hasActiveJourneyFork,
    proceduralActionFromConclusion,
} from './stageJourney';

export type PendingJourneyOrder = {
    actionId: ProceduralTransitionActionId;
    summary: string;
    sourceFinalDecision?: StageConclusion;
};

function mainlineCurrentNode(journey: JourneyNode[]): JourneyNode | null {
    const currents = journey.filter((n) => n.status === 'current');
    const main = currents.find((n) => !String(n.branchId ?? '').trim());
    return main ?? currents[0] ?? getCurrentJourneyNode(journey) ?? null;
}

function hasTrialCurrentNode(journey: JourneyNode[]): boolean {
    return journey.some(
        (n) => n.status === 'current' && (n.stage === 'misdemeanor' || n.stage === 'felony'),
    );
}

function inferReferralActionId(caseRecord: CriminalCase, conclusion?: StageConclusion): ProceduralTransitionActionId {
    const fromConclusion = conclusion?.stageType;
    if (fromConclusion === 'felony') return 'refer_felony';
    if (fromConclusion === 'misdemeanor' || fromConclusion === 'juvenile') return 'refer_misdemeanor';
    const recordStage = resolveCaseStageFromRecord(caseRecord);
    if (recordStage === 'felony') return 'refer_felony';
    const stored = String(caseRecord.basics?.stage ?? '').trim();
    if (stored === 'محكمة الجنايات') return 'refer_felony';
    return 'refer_misdemeanor';
}

function buildReferralPayload(caseRecord: CriminalCase, actionId: ProceduralTransitionActionId) {
    const isFelony = actionId === 'refer_felony';
    return {
        courtName: String(caseRecord.location?.courtName ?? '').trim() || (isFelony ? 'محكمة الجنايات' : 'محكمة الجنح'),
        caseNumber: String(
            caseRecord.courtCaseNumber ?? caseRecord.location?.caseNumber ?? '',
        ).trim(),
        stage: (isFelony ? 'محكمة الجنايات' : 'محكمة الجنح') as 'محكمة الجنح' | 'محكمة الجنايات',
    };
}

/** قرار/إحالة مسجّلة لكن مسار الرأس لم يُحدَّث بعد — يُعرض زر «تطبيق الأمر». */
export function resolvePendingJourneyOrder(caseRecord: CriminalCase | undefined): PendingJourneyOrder | null {
    if (!caseRecord || caseRecord.isArchived) return null;

    const journey = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : [];
    if (!journey.length) return null;

    const current = mainlineCurrentNode(journey);
    if (!current) return null;

    const journeyStage = current.stage;
    const recordStage = resolveCaseStageFromRecord(caseRecord);
    const finalDecision = caseRecord.finalDecision;

    if (finalDecision) {
        const routeActionId = proceduralActionFromConclusion(
            finalDecision.decisionType,
            journeyStage,
            caseRecord.basics?.crimeType,
        );
        if (routeActionId) {
            const option = findTransitionOption(journeyStage, routeActionId);
            if (option && option.targetStage !== journeyStage) {
                const alreadyAtTarget = journey.some(
                    (n) => n.status === 'current' && n.stage === option.targetStage,
                );
                if (!alreadyAtTarget) {
                    return {
                        actionId: routeActionId,
                        summary: option.menuLabel,
                        sourceFinalDecision: finalDecision,
                    };
                }
            }
        }

        if (finalDecision.decisionType === 'referral' && journeyStage === 'investigation' && !hasTrialCurrentNode(journey)) {
            const actionId = inferReferralActionId(caseRecord, finalDecision);
            const option = findTransitionOption('investigation', actionId);
            if (option) {
                return {
                    actionId,
                    summary: option.menuLabel,
                    sourceFinalDecision: finalDecision,
                };
            }
        }
    }

    if (
        isTrialCaseStage(recordStage) &&
        journeyStage === 'investigation' &&
        !hasTrialCurrentNode(journey) &&
        !hasActiveJourneyFork(journey)
    ) {
        const actionId = inferReferralActionId(caseRecord);
        const option = findTransitionOption('investigation', actionId);
        if (option) {
            const courtNum = String(
                caseRecord.courtCaseNumber ?? caseRecord.location?.caseNumber ?? '',
            ).trim();
            if (courtNum || String(caseRecord.location?.courtName ?? '').trim()) {
                return {
                    actionId,
                    summary: `${option.menuLabel} — مزامنة مسار الإضبارة`,
                };
            }
        }
    }

    return null;
}

export function pendingJourneyOrderRequiresReferralMeta(order: PendingJourneyOrder): boolean {
    return (
        order.actionId === 'refer_misdemeanor' ||
        order.actionId === 'refer_felony' ||
        order.actionId === 'misdemeanor_to_felony_jurisdiction' ||
        order.actionId === 'felony_to_misdemeanor_jurisdiction'
    );
}

export function buildReferralMetaForPendingOrder(
    caseRecord: CriminalCase,
    order: PendingJourneyOrder,
): { courtName: string; caseNumber: string; stage: 'محكمة الجنح' | 'محكمة الجنايات' } | null {
    const caseNumber = String(
        caseRecord.courtCaseNumber ?? caseRecord.location?.caseNumber ?? '',
    ).trim();
    const courtName = String(caseRecord.location?.courtName ?? '').trim();

    if (order.actionId === 'misdemeanor_to_felony_jurisdiction') {
        if (!caseNumber) return null;
        return {
            courtName: courtName || 'محكمة الجنايات',
            caseNumber,
            stage: 'محكمة الجنايات',
        };
    }
    if (order.actionId === 'felony_to_misdemeanor_jurisdiction') {
        if (!caseNumber) return null;
        return {
            courtName: courtName || 'محكمة الجنح',
            caseNumber,
            stage: 'محكمة الجنح',
        };
    }
    if (!pendingJourneyOrderRequiresReferralMeta(order)) return null;
    const payload = buildReferralPayload(caseRecord, order.actionId);
    if (!payload.caseNumber.trim()) return null;
    return payload;
}
