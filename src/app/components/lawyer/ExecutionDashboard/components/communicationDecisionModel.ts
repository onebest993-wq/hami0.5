/**
 * نموذج قرارات المخاطبات — predicates + عرض الحالة (منطق خالص).
 * يُطبَّق على **كل** أقسام/أنواع التنفيذ (مالي، ميداني، حضانة، …) عبر تبويب
 * «المخاطبات» الموحّد في محضر المتابعة — لا يعتمد على claimType.
 */
import {
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export const COMMUNICATION_KEYWORD = 'إرسال كتاب / مخاطبة جهة';

export function isCommunicationDecision(decision: Record<string, unknown>): boolean {
    const t = String(decision?.title || '');
    return t.includes(COMMUNICATION_KEYWORD) || /مخاطبة جهة/i.test(t);
}

/** المخاطبات تُسجَّل في السجل — لا تمرّ بموافقة/رفض المنفذ داخل محضر المتابعة */
function isCommunicationJournalOnlyWorkflow(decision: Record<string, unknown>): boolean {
    return isCommunicationDecision(decision);
}

function hasResult(decision: Record<string, unknown>): boolean {
    if (isNoResponseConfirmed(decision)) return false;
    return Boolean(decision?.deputationResultDetails) || decision?.deputationClosed === true;
}

function isFollowupDismissed(decision: Record<string, unknown>): boolean {
    return decision?.deputationFollowupDismissed === true;
}

export function isNoResponseConfirmed(decision: Record<string, unknown>): boolean {
    return decision?.deputationNoResponseConfirmed === true;
}

function isCommunicationFollowupComplete(decision: Record<string, unknown>): boolean {
    return hasResult(decision) || isFollowupDismissed(decision);
}

export function isAwaitingCommunicationResult(
    decision: Record<string, unknown>,
    decisionRows: Record<string, unknown>[],
): boolean {
    if (!isCommunicationDecision(decision)) return false;
    const rejected = isExecutorRowRejectedAndFinal(decision);
    if (rejected) return false;
    if (isCommunicationFollowupComplete(decision)) return false;
    return true;
}

type CommunicationEventTrailItem = {
    date: string;
    label: string;
    detail?: string;
};

export type CommunicationDisplayContext = {
    directorate: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'danger' | 'neutral' | 'muted';
    /** تاريخ الكتاب المُرسل (ليس تاريخ إنشاء الطلب في النظام) */
    letterDate: string;
    referenceLabel: string;
    /** عنوان حاوية المرجع (إجابة واردة أو كتاب تأكيد) */
    referenceTitle: string;
    outcomeTitle: string;
    outcomeBody: string;
    /** مضمون الكتاب المُرسل (من body بعد إزالة تاريخ الترويسة) */
    letterBody: string;
    /** مضمون الإجابة الواردة — فارغ إن لم تُسجَّل إجابة */
    responseBody: string;
    /** مرجع الإجابة (تاريخ/رقم) */
    responseReference: string;
    /** الأحداث التي مرّ بها الكتاب */
    eventTrail: CommunicationEventTrailItem[];
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

function extractLetterBodyFromDecision(decision: unknown): string {
    const rawBody = String((decision as { body?: string })?.body || '').trim();
    return rawBody.replace(/^بتاريخ\s+[\d-]+:\s*/i, '').trim() || rawBody;
}

function isNoResponseResultText(text: string): boolean {
    return /عدم ورود إجابة|تم التأكيد على الكتاب السابق/i.test(text);
}

function isDismissResultText(text: string): boolean {
    return /تم تجاهل متابعة نتيجة المخاطبة/i.test(text);
}

type TimelineEventLike = {
    date?: string;
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
};

function collectTimelineTrailForDecision(
    decisionId: string,
    timelineEvents: TimelineEventLike[],
): CommunicationEventTrailItem[] {
    const did = String(decisionId || '').trim();
    if (!did) return [];
    const threadKey = `executor_decision:${did}`;
    const items: CommunicationEventTrailItem[] = [];
    for (const ev of timelineEvents) {
        const meta = (ev.metadata ?? {}) as Record<string, unknown>;
        const rowId = String(meta.decisionRowId ?? '').trim();
        const key = String(meta.timelineThreadKey ?? '').trim();
        if (rowId !== did && key !== threadKey) continue;
        const label = String(ev.title || '').trim();
        if (!label) continue;
        items.push({
            date: String(ev.date || '').trim().slice(0, 10),
            label,
            detail: String(ev.description || '').trim() || undefined,
        });
    }
    return items;
}

function buildStateEventTrail(decision: Record<string, unknown>): CommunicationEventTrailItem[] {
    const trail: CommunicationEventTrailItem[] = [];
    const letterDate = String(decision?.date || '').trim().slice(0, 10);
    const directorate = String(decision?.deputationTargetDirectorate || '').trim();
    const letterBody = extractLetterBodyFromDecision(decision);

    trail.push({
        date: letterDate,
        label: 'تسجيل الكتاب في السجل',
        detail: [
            directorate ? `الجهة: ${directorate}` : '',
            letterBody ? letterBody.slice(0, 120) + (letterBody.length > 120 ? '…' : '') : '',
        ]
            .filter(Boolean)
            .join(' — '),
    });

    if (isNoResponseConfirmed(decision)) {
        const confDate = String(decision?.deputationReferralDate || '').trim().slice(0, 10);
        trail.push({
            date: confDate || letterDate,
            label: 'تأكيد عدم ورود إجابة',
            detail: buildNoResponseConfirmationDetails({
                previousLetterDate: letterDate,
                confirmationDate: confDate,
            }),
        });
    }

    if (isFollowupDismissed(decision)) {
        trail.push({
            date: letterDate,
            label: 'تجاهل متابعة النتيجة',
            detail: 'تم تجاهل متابعة نتيجة المخاطبة.',
        });
    }

    if (
        hasResult(decision) &&
        !isNoResponseConfirmed(decision) &&
        !isFollowupDismissed(decision)
    ) {
        const ref = String(decision?.deputationReferralDate || '').trim();
        const response = String(decision?.deputationResultDetails || '').trim();
        const responseDate = ref.split(/\s+/)[0]?.slice(0, 10) || letterDate;
        trail.push({
            date: responseDate,
            label: 'تسجيل الإجابة الواردة',
            detail: [ref ? `مرجع: ${ref}` : '', response].filter(Boolean).join('\n'),
        });
    }

    return trail;
}

function buildCommunicationEventTrail(
    decision: unknown,
    timelineEvents?: TimelineEventLike[],
): CommunicationEventTrailItem[] {
    const row = (decision ?? {}) as Record<string, unknown>;
    const decisionId = String(row.id || '').trim();
    const fromTimeline = collectTimelineTrailForDecision(
        decisionId,
        Array.isArray(timelineEvents) ? timelineEvents : [],
    );
    if (fromTimeline.length > 0) {
        return fromTimeline.sort((a, b) =>
            (a.date || '').localeCompare(b.date || '', undefined, { numeric: true }),
        );
    }
    return buildStateEventTrail(row);
}

export function buildCommunicationDisplayContext(
    decision: Record<string, unknown>,
    decisionRows: Record<string, unknown>[],
    timelineEvents?: TimelineEventLike[],
): CommunicationDisplayContext {
    const title = String(decision?.title || '').trim() || COMMUNICATION_KEYWORD;
    const directorateFromTitle = title.includes('— ')
        ? title.split('— ').slice(1).join('— ').trim()
        : title;
    const directorate =
        String(decision?.deputationTargetDirectorate || '').trim() || directorateFromTitle;
    const rejected = isExecutorRowRejectedAndFinal(decision);
    const journalOnly = isCommunicationJournalOnlyWorkflow(decision);
    const approved =
        journalOnly || isExecutorRowApprovedWorkflowActive(decision, decisionRows);
    const pending =
        !journalOnly &&
        (String(decision?.executorOutcome ?? 'pending') === 'pending' ||
            String(decision?.executorOutcome ?? '') === '');
    const dismissed = isFollowupDismissed(decision);
    const noResponse = isNoResponseConfirmed(decision);
    const hasRes = hasResult(decision);
    const letterDate = String(decision?.date || '').trim().slice(0, 10);
    const referenceLabel = String(decision?.deputationReferralDate || '').trim();
    const letterBody = extractLetterBodyFromDecision(decision);
    let responseBody = '';
    let responseReference = '';

    let statusLabel = '—';
    let statusTone: CommunicationDisplayContext['statusTone'] = 'neutral';
    if (rejected) {
        statusLabel = 'مرفوض';
        statusTone = 'danger';
    } else if (pending) {
        statusLabel = 'قيد البت';
        statusTone = 'warning';
    } else if (journalOnly && !hasRes && !dismissed && !noResponse) {
        statusLabel = 'بانتظار النتيجة';
        statusTone = 'warning';
    } else if (approved) {
        if (noResponse) {
            statusLabel = 'عدم ورود إجابة';
            statusTone = 'warning';
        } else if (dismissed) {
            statusLabel = 'تم التجاهل';
            statusTone = 'muted';
        } else if (hasRes && String(decision?.deputationResultDetails || '').trim()) {
            statusLabel = 'مكتمل';
            statusTone = 'success';
        } else {
            statusLabel = 'بانتظار النتيجة';
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
                previousLetterDate: letterDate,
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
        const rawBody = String(decision?.body || '').trim();
        outcomeBody =
            rawBody.replace(/^بتاريخ\s+[\d-]+:\s*/i, '').trim() ||
            rawBody ||
            `مخاطبة جهة: ${directorate}`;
    }

    if (noResponse) {
        responseBody = '';
        responseReference = referenceLabel;
    } else if (dismissed) {
        responseBody = '';
        responseReference = '';
    } else if (hasRes) {
        const resultText = String(decision?.deputationResultDetails || '').trim();
        if (resultText && !isNoResponseResultText(resultText) && !isDismissResultText(resultText)) {
            responseBody = resultText;
            responseReference = referenceLabel;
        }
    }

    const eventTrail = buildCommunicationEventTrail(decision, timelineEvents);

    return {
        directorate,
        statusLabel,
        statusTone,
        letterDate,
        referenceLabel,
        referenceTitle,
        outcomeTitle,
        outcomeBody,
        letterBody,
        responseBody,
        responseReference,
        eventTrail,
    };
}

export const STATUS_TONE_CLASS: Record<CommunicationDisplayContext['statusTone'], string> = {
    success: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
    danger: 'border-rose-500/35 bg-rose-500/10 text-rose-100',
    neutral: 'border-slate-500/35 bg-slate-500/10 text-slate-200',
    muted: 'border-slate-600/35 bg-slate-800/50 text-slate-400',
};
