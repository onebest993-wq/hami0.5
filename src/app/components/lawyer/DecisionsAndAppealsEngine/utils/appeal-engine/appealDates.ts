import type { Decision } from '../../types';
import { formatDateNumeric } from './decisionCardFormatting';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
} from './manualExecutorIdentity';
import { EXECUTOR_QUEUE_REQUEST_KINDS } from '../appealRequestOrigin';
import {
    addCalendarDaysYmd,
    daysElapsedFromAnchorYmd,
    isYmdWindowOpen,
    lastDayOfYmdWindow,
    localDateToYmd,
    normalizeYmd,
    todayYmd,
    windowBoundsYmd,
    ymdToLocalDate,
} from '@/app/utils/executionYmdCalendar';

export {
    addCalendarDaysYmd,
    localDateToYmd,
    todayYmd,
    ymdToLocalDate,
};

/** مهلة التظلم أمام المنفذ — 3 أيام تقويمية من يوم الإصدار */
export const GRIEVANCE_APPEAL_WINDOW_DAYS = 3;
/** مهلة التمييز — 7 أيام تقويمية من يوم الإصدار أو من قرار التظلم */
export const CASSATION_APPEAL_WINDOW_DAYS = 7;

const APPEAL_WINDOW_MODE = 'inclusive_same_day' as const;

export function appealWindowBoundsYmd(issueYmd: string, windowDays: number) {
    return windowBoundsYmd(issueYmd, windowDays, APPEAL_WINDOW_MODE);
}

export function resolveAppealLastDeadlineYmd(
    kind: 'tadhallum' | 'tamyeez',
    decisionYmd: string,
    cassationClockYmd: string,
): string {
    const issueYmd =
        kind === 'tadhallum'
            ? decisionYmd
            : String(cassationClockYmd || decisionYmd).trim() || decisionYmd;
    const windowDays =
        kind === 'tadhallum' ? GRIEVANCE_APPEAL_WINDOW_DAYS : CASSATION_APPEAL_WINDOW_DAYS;
    return lastDayOfYmdWindow(issueYmd, windowDays, APPEAL_WINDOW_MODE);
}

export function appealWindowDaysElapsedFromIssueYmd(
    issueYmd: string,
    today: Date = new Date(),
): number {
    return daysElapsedFromAnchorYmd(issueYmd, today, APPEAL_WINDOW_MODE);
}

export function decisionAppealClockYmd(d: { date?: string; resolvedAt?: string }): string {
    const fromDate = normalizeYmd(d.date);
    if (fromDate) return fromDate;
    const fromResolved = normalizeYmd(d.resolvedAt);
    if (fromResolved) return fromResolved;
    return String(d.date ?? '').trim().slice(0, 10);
}

export function isOpenGrievancePipeline(row: Decision): boolean {
    if (isManualExecutorLedgerDecision(row)) {
        return resolveManualExecutorWorkflowPhase(row) === 'grievance_pending';
    }
    return (
        (row.appealStatus === 'tadhallum_filed' || row.appealPhase === 'grievance') &&
        !String(row.appealResult ?? '').trim()
    );
}

export function decisionHasAppealClock(row: Decision): boolean {
    if (isManualExecutorLedgerDecision(row)) return true;
    if (row.appealRequestOrigin === 'executor_side') return true;
    if (
        row.requestKind &&
        EXECUTOR_QUEUE_REQUEST_KINDS.includes(row.requestKind) &&
        (row.executorOutcome === 'approved' ||
            row.executorOutcome === 'rejected' ||
            row.executorOutcome === 'alternative')
    ) {
        return true;
    }
    if (
        !row.requestKind &&
        (row.appealRequestOrigin === 'creditor_side' || row.appealRequestOrigin === 'debtor_side') &&
        row.executorOutcome === 'rejected'
    ) {
        return true;
    }
    return false;
}

export function resolveGrievanceIssuedYmd(d: Decision): string | null {
    if (String(d.grievanceIssuedYmd || '').trim()) {
        return String(d.grievanceIssuedYmd).slice(0, 10);
    }
    if (
        isManualExecutorLedgerDecision(d) &&
        (d.manualExecutorAppealKind === 'tadhallum' ||
            resolveManualExecutorWorkflowPhase(d) === 'grievance_pending')
    ) {
        const logs = Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : [];
        for (const log of logs) {
            if (/تظلم|تسجيل طعن/.test(String(log.message || '')) && log.at) {
                return decisionAppealClockYmd({ date: log.at });
            }
        }
    }
    if (d.appealStatus === 'tadhallum_filed' || d.appealPhase === 'grievance') {
        const logs = Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : [];
        for (const log of logs) {
            if (/تظلم/.test(String(log.message || '')) && log.at) {
                return decisionAppealClockYmd({ date: log.at });
            }
        }
    }
    return null;
}

export function resolveCassationAppealClockYmd(d: Decision): string {
    if (String(d.cassationAppealClockYmd || '').trim()) {
        return String(d.cassationAppealClockYmd).slice(0, 10);
    }
    if (String(d.grievanceOutcomeIssuedYmd || '').trim()) {
        return String(d.grievanceOutcomeIssuedYmd).slice(0, 10);
    }
    const grievanceYmd = resolveGrievanceIssuedYmd(d);
    if (grievanceYmd && !d.manualExecutorGrievanceOutcome) {
        return decisionAppealClockYmd(d);
    }
    return decisionAppealClockYmd(d);
}

export function isGrievancePendingAwaitingOutcome(d: Decision): boolean {
    return isOpenGrievancePipeline(d);
}

export function formatAppealClockYmdLabel(ymd: string): string {
    const raw = String(ymd || '').trim().slice(0, 10);
    if (!raw) return '—';
    return formatDateNumeric(raw);
}

export function appealGrievanceFilingClockPatch(): Partial<Decision> {
    return {
        grievanceIssuedYmd: todayYmd(),
    };
}

/** بعد إصدار قرار التظلم — تبدأ مهلة التمييز من هذا التاريخ */
export function appealGrievanceOutcomeClockPatch(
    outcomeIssuedYmd?: string
): Pick<Decision, 'grievanceOutcomeIssuedYmd' | 'cassationAppealClockYmd'> {
    const ymd = String(outcomeIssuedYmd || todayYmd()).trim().slice(0, 10);
    return {
        grievanceOutcomeIssuedYmd: ymd,
        cassationAppealClockYmd: ymd,
    };
}

export function appealWindowsForDecision(
    d: Decision,
    today: Date = new Date(),
): {
    canTadhallum: boolean;
    canTamyeez: boolean;
    daysElapsed: number;
    grievanceDaysElapsed: number;
    cassationDaysElapsed: number;
    isPastGrievanceDeadline: boolean;
    isPastTamyeezDeadline: boolean;
    decisionClockYmd: string;
    cassationClockYmd: string;
} {
    const decisionClockYmd = decisionAppealClockYmd(d);
    const grievancePending = isGrievancePendingAwaitingOutcome(d);
    const cassationClockYmd = grievancePending ? '' : resolveCassationAppealClockYmd(d);
    const grievanceDays = appealWindowDaysElapsedFromIssueYmd(decisionClockYmd, today);
    const cassationDays = cassationClockYmd
        ? appealWindowDaysElapsedFromIssueYmd(cassationClockYmd, today)
        : -1;
    const canTadhallum =
        !grievancePending &&
        isYmdWindowOpen(grievanceDays, GRIEVANCE_APPEAL_WINDOW_DAYS);
    const canTamyeez =
        !grievancePending &&
        isYmdWindowOpen(cassationDays, CASSATION_APPEAL_WINDOW_DAYS);

    return {
        canTadhallum,
        canTamyeez,
        daysElapsed: cassationDays,
        grievanceDaysElapsed: grievanceDays,
        cassationDaysElapsed: cassationDays,
        isPastGrievanceDeadline: grievanceDays >= GRIEVANCE_APPEAL_WINDOW_DAYS,
        isPastTamyeezDeadline:
            !grievancePending && cassationDays >= CASSATION_APPEAL_WINDOW_DAYS,
        decisionClockYmd,
        cassationClockYmd: cassationClockYmd || resolveCassationAppealClockYmd(d),
    };
}

/** @deprecated استخدم appealWindowsForDecision */
export function appealWindowsFromClockYmd(clockYmd: string): {
    canTadhallum: boolean;
    canTamyeez: boolean;
    daysElapsed: number;
    isPastGrievanceDeadline: boolean;
    isPastTamyeezDeadline: boolean;
} {
    const w = appealWindowsForDecision({ date: clockYmd } as Decision);
    return {
        canTadhallum: w.canTadhallum,
        canTamyeez: w.canTamyeez,
        daysElapsed: w.daysElapsed,
        isPastGrievanceDeadline: w.isPastGrievanceDeadline,
        isPastTamyeezDeadline: w.isPastTamyeezDeadline,
    };
}

export type AppealDeadlineWindows = ReturnType<typeof appealWindowsForDecision>;

export type AppealDeadlineExpiryKind = 'grievance' | 'cassation';

export function resolveAppealDeadlineExpiryKind(d: Decision): AppealDeadlineExpiryKind | null {
    if (d.appealDeadlinePerpetuallyEnforced || d.isArchived) return null;
    if (d.appealSourceDecisionId) return null;
    if (!decisionHasAppealClock(d)) return null;
    if (isManualExecutorLedgerDecision(d) && resolveExecutorDecisionStatusFlag(d) === 3) {
        return null;
    }
    if (isManualExecutorLedgerDecision(d)) {
        const phase = resolveManualExecutorWorkflowPhase(d);
        if (phase === 'cassation_pending') {
            return null;
        }
    }
    if (d.appealStatus === 'final') return null;

    const w = appealWindowsForDecision(d);
    if (isOpenGrievancePipeline(d)) {
        if (w.grievanceDaysElapsed === GRIEVANCE_APPEAL_WINDOW_DAYS) {
            return 'grievance';
        }
        return null;
    }
    if (w.cassationDaysElapsed === CASSATION_APPEAL_WINDOW_DAYS) {
        return 'cassation';
    }
    return null;
}

export function shouldShowAppealDeadlineLapseActions(d: Decision): boolean {
    return resolveAppealDeadlineExpiryKind(d) !== null;
}

export function appealDeadlineLapsePanelMessage(kind: AppealDeadlineExpiryKind): string {
    if (kind === 'grievance') {
        return 'اليوم آخر يوم لمهلة التظلم — اضغط إنهاء المدة لإغلاق مسار التظلم.';
    }
    return 'اليوم آخر يوم لمهلة التمييز — اضغط إنهاء المدة ليصبح القرار نافذاً نهائياً ويُؤرشف.';
}
