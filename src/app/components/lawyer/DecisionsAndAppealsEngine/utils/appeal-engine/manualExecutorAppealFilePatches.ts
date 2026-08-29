import type { Decision } from '../../types';
import { appealWindowsForDecision, appealGrievanceFilingClockPatch } from './appealDates';
import type { ExecutorDecisionStatusFlag } from './appealTypes';
import { manualExecutorAwaitingCassationParty } from './manualExecutorAppealActors';
import { manualExecutorTimelineLog } from './manualExecutorGrievanceOutcome';
import { manualExecutorArchiveClosurePatch } from './manualExecutorArchiveReconcile';

export function buildManualExecutorAppealFilePatch(
    row: Decision,
    appellant: 'lawyer' | 'debtor',
    appealKind: 'tadhallum' | 'tamyeez'
): Partial<Decision> {
    const windows = appealWindowsForDecision(row);
    if (appealKind === 'tadhallum' && !windows.canTadhallum) return {};
    if (appealKind === 'tamyeez' && !windows.canTamyeez) return {};
    const appellantAr = appellant === 'lawyer' ? 'طالب التنفيذ' : 'المدين';
    const kindAr =
        appealKind === 'tadhallum'
            ? 'تظلم أمام المنفذ العدل'
            : 'طعن تمييزي أمام محكمة الاستئناف';
    const isGrievance = appealKind === 'tadhallum';
    return {
        executorDecisionStatusFlag: 2,
        manualExecutorAppealAppellant: appellant,
        manualExecutorAppealKind: appealKind,
        manualExecutorWorkflowPhase: isGrievance ? 'grievance_pending' : 'cassation_pending',
        manualExecutorGrievanceOutcome: undefined,
        manualExecutorEnforced: undefined,
        ...(isGrievance ? appealGrievanceFilingClockPatch() : {}),
        appealTimelineLogs: [
            manualExecutorTimelineLog(
                `تسجيل طعن — الطاعن: ${appellantAr} | النوع: ${kindAr}`,
                'amber'
            ),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

/** تسمية زر تسجيل التمييز — الطرف المتضرر من نتيجة التظلم فقط */
export function manualExecutorCassationEntryButtonLabel(
    party: 'lawyer' | 'debtor'
): string {
    return party === 'debtor' ? 'تمييز من قبل المدين' : 'تمييز من قبل الدائن';
}

/** شارة إعلامية — بعد تسجيل التمييز (لا زر إجراء) */
export function manualExecutorCassationFiledNoticeLabel(
    party: 'lawyer' | 'debtor'
): string {
    return party === 'debtor' ? 'قام المدين بتمييز القرار' : 'قام الدائن بتمييز القرار';
}

export function buildManualExecutorCassationFilePatch(row: Decision): Partial<Decision> {
    const party =
        manualExecutorAwaitingCassationParty(row) ?? row.manualExecutorAppealAppellant;
    if (!party) return {};
    const appellantAr = party === 'lawyer' ? 'طالب التنفيذ (الدائن)' : 'المدين';
    return {
        executorDecisionStatusFlag: 2,
        manualExecutorAppealKind: 'tamyeez',
        manualExecutorWorkflowPhase: 'cassation_pending',
        manualExecutorGrievanceOutcome: row.manualExecutorGrievanceOutcome,
        manualExecutorAppealAppellant: party,
        grievanceOutcomeIssuedYmd: row.grievanceOutcomeIssuedYmd,
        cassationAppealClockYmd: row.cassationAppealClockYmd,
        appealPhase: 'cassation',
        appealStatus: 'tamyeez_filed',
        appealTimelineLogs: [
            manualExecutorTimelineLog(
                `تسجيل تمييز — الطاعن: ${appellantAr} | طعن تمييزي أمام محكمة الاستئناف`,
                'amber'
            ),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

export function buildManualExecutorCassationNaqdPatch(row: Decision): Partial<Decision> {
    const appellant = row.manualExecutorAppealAppellant;
    if (!appellant) return {};
    const nextFlag: ExecutorDecisionStatusFlag = appellant === 'lawyer' ? 3 : 1;
    return {
        executorDecisionStatusFlag: nextFlag,
        manualExecutorWorkflowPhase: undefined,
        appealStatus: 'final',
        appealResult: 'نقض القرار',
        appealPhase: null,
        appealWorkflowState: appellant === 'lawyer' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED',
        ...manualExecutorArchiveClosurePatch(),
        appealTimelineLogs: [
            manualExecutorTimelineLog('نتيجة التمييز: نقض القرار', nextFlag === 1 ? 'emerald' : 'rose'),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

export function buildManualExecutorCassationRadLaheezaPatch(row: Decision): Partial<Decision> {
    const appellant = row.manualExecutorAppealAppellant;
    if (!appellant) return {};
    const nextFlag: ExecutorDecisionStatusFlag = appellant === 'lawyer' ? 1 : 3;
    return {
        executorDecisionStatusFlag: nextFlag,
        manualExecutorWorkflowPhase: undefined,
        appealStatus: 'final',
        appealResult: 'رد اللائحة',
        appealPhase: null,
        appealWorkflowState: appellant === 'lawyer' ? 'FINAL_ACCEPTED' : 'FINAL_REJECTED',
        ...manualExecutorArchiveClosurePatch(),
        appealTimelineLogs: [
            manualExecutorTimelineLog('نتيجة التمييز: رد اللائحة', nextFlag === 1 ? 'amber' : 'rose'),
            ...(Array.isArray(row.appealTimelineLogs) ? row.appealTimelineLogs : []),
        ],
    };
}

/** @deprecated استخدم buildManualExecutorCassationNaqdPatch */
export function buildManualExecutorAppealWonPatch(row: Decision): Partial<Decision> {
    return buildManualExecutorCassationNaqdPatch(row);
}

/** @deprecated استخدم buildManualExecutorCassationRadLaheezaPatch */
export function buildManualExecutorAppealLostPatch(row: Decision): Partial<Decision> {
    return buildManualExecutorCassationRadLaheezaPatch(row);
}
