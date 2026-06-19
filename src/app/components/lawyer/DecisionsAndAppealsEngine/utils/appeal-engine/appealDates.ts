import { createElement, type ReactNode } from 'react';
import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';
import type { ExecutionDecisionAppealPhase, ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from '../../types';
import {
    decisionCardGlassClasses,
    type DecisionCardEnforcementVisual,
} from '../../decisionCardGlassShell';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    appealRelabelTimelineMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    EXECUTOR_QUEUE_REQUEST_KINDS,
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
    isCreditorPartyRequest,
    isDecisionLikeRow,
    resolveRequestFilerFromDebtorAgentView,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
} from './manualExecutorIdentity';

export const GRIEVANCE_APPEAL_WINDOW_DAYS = 3;
/** مهلة التمييز: 7 أيام من اليوم التالي لإصدار القرار أو صدور التظلم */
export const CASSATION_APPEAL_WINDOW_DAYS = 7;

export function ymdToLocalDate(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || '').trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setHours(0, 0, 0, 0);
    return d;
}

export function localDateToYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function todayYmd(): string {
    return localDateToYmd(new Date());
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
    const d = ymdToLocalDate(ymd);
    if (!d) return ymd;
    d.setDate(d.getDate() + days);
    return localDateToYmd(d);
}

/** أيام من اليوم التالي لتاريخ الإصدار (يوم الإصدار نفسه = -1) */
export function appealWindowDaysElapsedFromIssueYmd(
    issueYmd: string,
    today: Date = new Date()
): number {
    const issue = ymdToLocalDate(issueYmd);
    if (!issue) return 999;
    const windowStart = new Date(issue);
    windowStart.setDate(windowStart.getDate() + 1);
    windowStart.setHours(0, 0, 0, 0);
    const t = new Date(today);
    t.setHours(0, 0, 0, 0);
    return Math.floor((t.getTime() - windowStart.getTime()) / 86400000);
}

export function decisionAppealClockYmd(d: { date?: string; resolvedAt?: string }): string {
    if (d.resolvedAt) {
        const dt = new Date(d.resolvedAt);
        if (!Number.isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    }
    const raw = String(d.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const dt2 = new Date(raw);
    if (!Number.isNaN(dt2.getTime())) {
        const y = dt2.getFullYear();
        const m = String(dt2.getMonth() + 1).padStart(2, '0');
        const day = String(dt2.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return raw.slice(0, 10);
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

/** ساعة التمييز: من القرار، أو من صدور التظلم/التمديد إن وُجد */
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

export function appealWindowsForDecision(
    d: Decision,
    today: Date = new Date()
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
        !grievancePending && grievanceDays >= 0 && grievanceDays < GRIEVANCE_APPEAL_WINDOW_DAYS;
    const canTamyeez =
        !grievancePending && cassationDays >= 0 && cassationDays < CASSATION_APPEAL_WINDOW_DAYS;

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

/** يوم انتهاء المهلة بالضبط — لا قبله ولا بعده */
export function resolveAppealDeadlineExpiryKind(d: Decision): AppealDeadlineExpiryKind | null {
    if (d.appealDeadlinePerpetuallyEnforced || d.isArchived) return null;
    if (d.appealSourceDecisionId) return null;
    if (!decisionHasAppealClock(d)) return null;
    if (isManualExecutorLedgerDecision(d) && resolveExecutorDecisionStatusFlag(d) === 3) {
        return null;
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
