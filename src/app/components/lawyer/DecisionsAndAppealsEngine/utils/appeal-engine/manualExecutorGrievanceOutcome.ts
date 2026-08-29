import type { Decision } from '../../types';
import { todayYmd } from './appealDates';
import { manualExecutorCassationPartyAfterGrievance } from './manualExecutorAppealActors';

function manualExecutorTimelineLog(
    message: string,
    tone: 'emerald' | 'rose' | 'amber' | 'slate'
): NonNullable<Decision['appealTimelineLogs']>[number] {
    return {
        id:
            (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ??
            `mel_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        message,
        tone,
    };
}

/**
 * @deprecated للبيانات القديمة والاختبارات فقط.
 * المسار الفعلي لـ «إضافة قرار»: buildManualExecutorGrievanceOutcomePatch
 */
export function buildManualExecutorGrievanceResolutionPatch(
    d: Decision,
    grievanceAccepted: boolean
): Partial<Decision> {
    const appealResult: NonNullable<Decision['appealResult']> = grievanceAccepted
        ? 'قبول التظلم'
        : 'رد التظلم';
    const cassationParty = manualExecutorCassationPartyAfterGrievance(d, grievanceAccepted);

    if (!cassationParty) {
        return {
            appealPhase: null,
            appealStatus: 'final',
            appealResult,
            appealWorkflowState: 'FINAL_ACCEPTED',
            awaitingCassationEntryBy: null,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            appealMethod: 'tadhallum',
            noAppealChosen: false,
        };
    }

    const workflowState =
        cassationParty === 'debtor' ? ('PENDING_APPEAL_DEBTOR' as const) : ('PENDING_APPEAL_LAWYER' as const);

    if (grievanceAccepted) {
        return {
            appealPhase: null,
            appealStatus: 'pending',
            appealResult,
            appealWorkflowState: workflowState,
            awaitingCassationEntryBy: cassationParty,
            grievanceRejectedAwaitingTamyeez: false,
            grievanceAcceptedAwaitingDebtorTamyeez: false,
            appealMethod: 'tadhallum',
            noAppealChosen: false,
        };
    }

    return {
        appealPhase: null,
        appealStatus: 'pending',
        appealResult,
        appealWorkflowState: workflowState,
        awaitingCassationEntryBy: cassationParty,
        grievanceRejectedAwaitingTamyeez: true,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        appealMethod: null,
        noAppealChosen: false,
    };
}

export function buildManualExecutorGrievanceOutcomePatch(
    row: Decision,
    accepted: boolean,
    outcomeIssuedYmd?: string
): Partial<Decision> {
    const label = accepted ? 'قُبل التظلم' : 'رُدّ التظلم';
    const ymd = String(outcomeIssuedYmd || todayYmd()).trim().slice(0, 10);
    const resolution = buildManualExecutorGrievanceResolutionPatch(row, accepted);
    const cassationParty = manualExecutorCassationPartyAfterGrievance(row, accepted);

    return {
        ...resolution,
        executorDecisionStatusFlag: 2,
        manualExecutorGrievanceOutcome: accepted ? 'accepted' : 'rejected',
        manualExecutorWorkflowPhase: cassationParty ? 'cassation_unlocked' : undefined,
        grievanceOutcomeIssuedYmd: ymd,
        cassationAppealClockYmd: ymd,
        appealTimelineLogs: [
            manualExecutorTimelineLog(
                `نتيجة التظلم أمام المنفذ: ${label} | تاريخ إصدار القرار: ${ymd}`,
                accepted ? 'emerald' : 'amber'
            ),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

export { manualExecutorTimelineLog };
