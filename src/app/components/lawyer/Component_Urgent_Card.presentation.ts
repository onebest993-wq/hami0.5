import { formatDateText, formatRequestNumberText } from './Dashboard_Active_Order_File/utils/formatters';
import type { UrgentCase, UrgentCaseStatus } from './Component_Urgent_Card.types';
import {
    URGENT_GRIEVANCE_DAYS,
    getUrgentCasePhaseLabel,
    urgentGrievanceDeadline,
} from './Component_Urgent_Card.status';

const STATUS_BADGE_CLASS: Record<UrgentCaseStatus, string> = {
    critical: 'text-rose-300',
    warning: 'text-amber-300',
    safe: 'text-[#E6C673]',
    expired: 'text-slate-300',
    completed: 'text-emerald-300',
};

export function urgentCaseStatusBadgeClass(status: UrgentCaseStatus): string {
    return STATUS_BADGE_CLASS[status] ?? 'text-white/70';
}

export function buildUrgentCardPresentation(case_data: UrgentCase) {
    const notificationBase = case_data.notificationDate ? new Date(case_data.notificationDate) : null;
    const deadlineDays =
        typeof case_data.deadlineDays === 'number' && case_data.deadlineDays > 0
            ? case_data.deadlineDays
            : URGENT_GRIEVANCE_DAYS;
    const grievanceDeadline = notificationBase
        ? urgentGrievanceDeadline(notificationBase, deadlineDays)
        : null;
    const targetDate =
        case_data.type === 'state_order'
            ? grievanceDeadline
            : case_data.sessionDate
              ? new Date(case_data.sessionDate)
              : case_data.deadlineDate
                ? new Date(case_data.deadlineDate)
                : null;
    const targetLabel = case_data.sessionDate ? 'موعد الجلسة' : 'الموعد النهائي';
    const targetText = targetDate ? targetDate.toLocaleDateString('ar-IQ') : null;

    const courtLabel = (case_data.courtName?.trim() || case_data.court?.trim() || '').trim();
    const applicantName = case_data.applicantName?.trim() || case_data.party1Name?.trim() || '';
    const opponentName = case_data.party2Name?.trim() || '';

    const metaRows = [
        case_data.requestNumber
            ? {
                  label: 'رقم الطلب',
                  value: formatRequestNumberText(case_data.requestNumber, case_data.requestDate),
              }
            : null,
        courtLabel ? { label: 'المحكمة', value: courtLabel } : null,
        case_data.requestDate ? { label: 'تاريخ الطلب', value: formatDateText(case_data.requestDate) } : null,
        case_data.judgeName?.trim() ? { label: 'القاضي', value: case_data.judgeName.trim() } : null,
        case_data.feeReceiptNumber?.trim()
            ? {
                  label: 'وصل الرسوم',
                  value: `${case_data.feeReceiptNumber.trim()}${
                      case_data.feeReceiptDate ? ` · ${formatDateText(case_data.feeReceiptDate)}` : ''
                  }`,
              }
            : null,
    ].filter((row): row is { label: string; value: string } => row !== null);

    const hearing = case_data.sessionDate
        ? { label: 'موعد الجلسة', ymd: formatDateText(case_data.sessionDate) }
        : targetText
          ? { label: targetLabel, ymd: targetText }
          : null;

    const parties =
        applicantName || opponentName
            ? {
                  left: applicantName
                      ? { name: applicantName, role: 'الطالب', isClient: case_data.clientRole === 'applicant' }
                      : null,
                  right: opponentName
                      ? {
                            name: opponentName,
                            role: 'المطلوب ضده',
                            isClient: case_data.clientRole === 'respondent',
                        }
                      : null,
                  leftTone: 'primary' as const,
                  rightTone: 'defendant' as const,
              }
            : null;

    return {
        phaseLabel: getUrgentCasePhaseLabel(case_data),
        metaRows,
        hearing,
        parties,
        statusBadgeClass: urgentCaseStatusBadgeClass(case_data.status),
    };
}
