/**
 * نموذج قرارات المخاطبات — predicates + عرض الحالة (منطق خالص).
 */
import {
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export const COMMUNICATION_KEYWORD = 'إرسال كتاب / مخاطبة جهة';

export function isCommunicationDecision(decision: any): boolean {
    const t = String(decision?.title || '');
    return t.includes(COMMUNICATION_KEYWORD) || /مخاطبة جهة/i.test(t);
}

export function hasResult(decision: any): boolean {
    return Boolean(decision?.deputationResultDetails) || decision?.deputationClosed === true;
}

export function isFollowupDismissed(decision: any): boolean {
    return decision?.deputationFollowupDismissed === true;
}

export function isNoResponseConfirmed(decision: any): boolean {
    return decision?.deputationNoResponseConfirmed === true;
}

export function isCommunicationFollowupComplete(decision: any): boolean {
    return hasResult(decision) || isFollowupDismissed(decision) || isNoResponseConfirmed(decision);
}

export function isAwaitingCommunicationResult(
    decision: any,
    decisionRows: Record<string, unknown>[],
): boolean {
    const rejected = isExecutorRowRejectedAndFinal(decision);
    const approved = isExecutorRowApprovedWorkflowActive(decision, decisionRows);
    return approved && !rejected && !isCommunicationFollowupComplete(decision);
}

export type CommunicationDisplayContext = {
    directorate: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'danger' | 'neutral' | 'muted';
    requestDate: string;
    referenceLabel: string;
    /** عنوان حاوية المرجع (إجابة واردة أو كتاب تأكيد) */
    referenceTitle: string;
    outcomeTitle: string;
    outcomeBody: string;
};

/** نص نتيجة «عدم ورود إجابة» — يشير إلى الكتاب السابق وتاريخه */
export function buildNoResponseConfirmationDetails(input: {
    previousLetterDate?: string;
    confirmationDate?: string;
}): string {
    const prev = String(input.previousLetterDate || '').trim().slice(0, 10);
    const conf = String(input.confirmationDate || '').trim().slice(0, 10);
    const onPrev = prev
        ? `تم التأكيد على الكتاب السابق المؤرّخ في ${prev}`
        : 'تم التأكيد على الكتاب السابق';
    const base = `${onPrev} — عدم ورود إجابة من الجهة المخاطبة.`;
    if (!conf) return base;
    return `${base}\nتاريخ كتاب التأكيد: ${conf}`;
}

export function buildCommunicationDisplayContext(
    decision: any,
    decisionRows: Record<string, unknown>[],
): CommunicationDisplayContext {
    const title = String(decision?.title || '').trim() || COMMUNICATION_KEYWORD;
    const directorateFromTitle = title.includes('— ')
        ? title.split('— ').slice(1).join('— ').trim()
        : title;
    const directorate =
        String(decision?.deputationTargetDirectorate || '').trim() || directorateFromTitle;
    const rejected = isExecutorRowRejectedAndFinal(decision);
    const approved = isExecutorRowApprovedWorkflowActive(decision, decisionRows);
    const pending =
        String(decision?.executorOutcome ?? 'pending') === 'pending' ||
        String(decision?.executorOutcome ?? '') === '';
    const dismissed = isFollowupDismissed(decision);
    const noResponse = isNoResponseConfirmed(decision);
    const hasRes = hasResult(decision);
    const requestDate = String(decision?.date || decision?.resolvedAt || '').trim().slice(0, 10);
    const referenceLabel = String(decision?.deputationReferralDate || '').trim();

    let statusLabel = '—';
    let statusTone: CommunicationDisplayContext['statusTone'] = 'neutral';
    if (rejected) {
        statusLabel = 'مرفوض';
        statusTone = 'danger';
    } else if (pending) {
        statusLabel = 'قيد البت';
        statusTone = 'warning';
    } else if (approved) {
        if (noResponse) {
            statusLabel = 'موافق — عدم ورود إجابة';
            statusTone = 'warning';
        } else if (dismissed) {
            statusLabel = 'موافق — مُتجاهَل';
            statusTone = 'muted';
        } else if (hasRes && String(decision?.deputationResultDetails || '').trim()) {
            statusLabel = 'مكتمل';
            statusTone = 'success';
        } else {
            statusLabel = 'موافق — بانتظار النتيجة';
            statusTone = 'warning';
        }
    }

    let outcomeTitle = 'مضمون الإجابة';
    let outcomeBody = String(decision?.deputationResultDetails || '').trim();
    let referenceTitle = 'مرجع الإجابة';
    if (noResponse) {
        outcomeTitle = 'النتيجة';
        outcomeBody =
            outcomeBody ||
            buildNoResponseConfirmationDetails({
                previousLetterDate: requestDate,
                confirmationDate: referenceLabel,
            });
        referenceTitle = 'تاريخ كتاب التأكيد';
    } else if (dismissed) {
        outcomeTitle = 'المتابعة';
        outcomeBody = outcomeBody || 'تم تجاهل متابعة نتيجة المخاطبة.';
    } else if (rejected) {
        outcomeTitle = 'ملاحظة';
        outcomeBody =
            String(decision?.executorNote || decision?.body || '').trim() ||
            'تم رفض الطلب من قبل المنفذ.';
    } else if (!outcomeBody) {
        outcomeTitle = 'تفاصيل الطلب';
        outcomeBody = String(decision?.body || '').trim() || '—';
    }

    return {
        directorate,
        statusLabel,
        statusTone,
        requestDate,
        referenceLabel,
        referenceTitle,
        outcomeTitle,
        outcomeBody,
    };
}

export const STATUS_TONE_CLASS: Record<CommunicationDisplayContext['statusTone'], string> = {
    success: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
    danger: 'border-rose-500/35 bg-rose-500/10 text-rose-100',
    neutral: 'border-slate-500/35 bg-slate-500/10 text-slate-200',
    muted: 'border-slate-600/35 bg-slate-800/50 text-slate-400',
};

export function extractDirectorate(title: string): string {
    if (!title.includes('— ')) return title;
    return title.split('— ').slice(1).join('— ').trim() || title;
}
