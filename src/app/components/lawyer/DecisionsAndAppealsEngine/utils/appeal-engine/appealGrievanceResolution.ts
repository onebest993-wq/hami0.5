import type { Decision } from '../../types';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
} from '../appealRequestOrigin';
import { appealGrievanceOutcomeClockPatch } from './appealDates';
import {
    cassationEntryPartyAfterGrievanceGrant,
    resolveAppealBaseBranch,
    resolveGrievanceFilerActor,
} from './appealActorFiling';
import { isManualExecutorLedgerDecision } from './manualExecutorIdentity';
import { buildManualExecutorGrievanceOutcomePatch } from './manualExecutorGrievanceOutcome';

/** true = المُطعّن فاز بالتظلم (قبول التظلم) */
export function grievancePetitionGranted(d: Decision, grievanceAccepted: boolean): boolean {
    if (!grievanceAccepted) return false;
    if (isManualExecutorLedgerDecision(d)) return true;

    const hub = hubWithInferredAppealOrigin(d);
    const filer = resolveGrievanceFilerActor(d);
    const filerIsDebtor = filer === 'debtor';
    const branch = resolveAppealBaseBranch(hub);
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);

    if (!creditorRow) {
        return filerIsDebtor;
    }

    if (branch === 'after_rejection') {
        return filer === 'lawyer';
    }
    return filerIsDebtor;
}

function attachGrievanceOutcomeCassationClock(
    patch: Partial<Decision>,
    outcomeIssuedYmd?: string
): Partial<Decision> {
    const needsClock =
        Boolean(patch.awaitingCassationEntryBy) ||
        patch.grievanceRejectedAwaitingTamyeez === true ||
        patch.grievanceAcceptedAwaitingDebtorTamyeez === true;
    if (!needsClock) return patch;
    return { ...patch, ...appealGrievanceOutcomeClockPatch(outcomeIssuedYmd) };
}

export function buildGrievanceResolutionPatch(
    d: Decision,
    grievanceAccepted: boolean,
    all?: Decision[],
    outcomeIssuedYmd?: string
): Partial<Decision> {
    const underlying =
        all && all.length > 0 ? resolveUnderlyingDecisionHub(d, all) : d;
    if (isManualExecutorLedgerDecision(d) || isManualExecutorLedgerDecision(underlying)) {
        return buildManualExecutorGrievanceOutcomePatch(d, grievanceAccepted, outcomeIssuedYmd);
    }
    const hub = hubWithInferredAppealOrigin(d);
    const granted = grievancePetitionGranted(d, grievanceAccepted);
    const branch = resolveAppealBaseBranch(hub);
    const appealResult: NonNullable<Decision['appealResult']> = grievanceAccepted
        ? 'قبول التظلم'
        : 'رد التظلم';
    const phys = hub.executorOutcome;
    const creditorRow = isCreditorInitiatedExecutorRequest(hub);

    /** تظلم المدين على طلب دائن موافق عليه (حجز/تخلية/جبري…) — إيقاف مؤقت لا إعادة دورة */
    if (
        grievanceAccepted &&
        creditorRow &&
        (phys === 'approved' || phys === 'alternative') &&
        branch === 'after_approval' &&
        resolveGrievanceFilerActor(d) === 'debtor'
    ) {
        return attachGrievanceOutcomeCassationClock(
            {
                appealPhase: null,
                appealStatus: 'pending',
                appealResult,
                appealWorkflowState: 'PENDING_APPEAL_LAWYER',
                executorOutcome: phys,
                status: 'accepted',
                awaitingCassationEntryBy: 'lawyer',
                grievanceRejectedAwaitingTamyeez: false,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                appealMethod: 'tadhallum',
                noAppealChosen: false,
            },
            outcomeIssuedYmd
        );
    }

    if (granted) {
        const outcome =
            branch === 'after_rejection'
                ? { executorOutcome: 'approved' as const, status: 'accepted' as const }
                : { executorOutcome: 'approved' as const, status: 'accepted' as const };
        const cassationParty = cassationEntryPartyAfterGrievanceGrant(d);
        if (cassationParty) {
            return attachGrievanceOutcomeCassationClock(
                {
                    appealPhase: null,
                    appealStatus: 'pending',
                    appealResult,
                    appealWorkflowState:
                        cassationParty === 'debtor'
                            ? ('PENDING_APPEAL_DEBTOR' as const)
                            : ('PENDING_APPEAL_LAWYER' as const),
                    ...outcome,
                    awaitingCassationEntryBy: cassationParty,
                    grievanceRejectedAwaitingTamyeez: false,
                    grievanceAcceptedAwaitingDebtorTamyeez: cassationParty === 'debtor',
                    appealMethod: 'tadhallum',
                    noAppealChosen: false,
                },
                outcomeIssuedYmd
            );
        }
        return {
            appealPhase: null,
            appealStatus: 'final',
            appealResult,
            appealWorkflowState:
                branch === 'after_rejection' ? ('FINAL_ACCEPTED' as const) : ('FINAL_REJECTED' as const),
            ...outcome,
            awaitingCassationEntryBy: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            appealMethod: 'tadhallum',
            noAppealChosen: false,
        };
    }

    const standing =
        branch === 'after_rejection'
            ? { executorOutcome: 'rejected' as const, status: 'rejected' as const }
            : { executorOutcome: 'approved' as const, status: 'accepted' as const };

    if (branch === 'after_approval') {
        return attachGrievanceOutcomeCassationClock(
            {
                appealPhase: null,
                appealStatus: 'pending',
                appealResult,
                appealWorkflowState: 'PENDING_APPEAL_DEBTOR',
                ...standing,
                awaitingCassationEntryBy: 'debtor',
                grievanceRejectedAwaitingTamyeez: true,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                appealMethod: null,
                noAppealChosen: false,
            },
            outcomeIssuedYmd
        );
    }

    return attachGrievanceOutcomeCassationClock(
        {
            appealPhase: null,
            appealStatus: 'pending',
            appealResult,
            appealWorkflowState: 'NONE',
            ...standing,
            grievanceRejectedAwaitingTamyeez: true,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            awaitingCassationEntryBy: d.appealActor ?? null,
            appealMethod: null,
            noAppealChosen: false,
        },
        outcomeIssuedYmd
    );
}
