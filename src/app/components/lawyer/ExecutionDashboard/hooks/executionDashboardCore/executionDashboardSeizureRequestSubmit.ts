import type { TimelineEvent } from '@/app/types/execution';
import { appendPendingExecutorSeizureDecision } from '@/app/utils/executorSeizureDecisionQueue';

export type SeizureRequestSubmitDeps = {
    exId: string;
    nextTimelineId: () => string;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
};

export type SubmitPropertySeizureRequestParams = {
    subjectDraft: string;
    onSubmitted: () => void;
};

export type SubmitMovableSeizureRequestParams = {
    subjectDraft: string;
    onSubmitted: () => void;
};

export function runSubmitPropertySeizureRequest(
    { subjectDraft, onSubmitted }: SubmitPropertySeizureRequestParams,
    deps: SeizureRequestSubmitDeps,
): void {
    const { exId, nextTimelineId, pushTimelineEvent, showToast } = deps;
    if (!exId || exId === 'undefined') return;
    const subject = String(subjectDraft || '').trim() || 'طلب حجز عقار';
    const body = `موضوع الطلب:\n${subject}`;
    const did = appendPendingExecutorSeizureDecision({
        executionId: exId,
        requestTitle: 'طلب حجز عقار — قيد البت لدى المنفذ',
        requestBody: body,
        seizureSubtype: 'property',
    });
    if (!did) {
        showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
            decisionsLink: true,
            decisionsTab: 'current',
        });
        return;
    }
    const now = new Date().toISOString();
    pushTimelineEvent({
        id: nextTimelineId(),
        date: now.slice(0, 10),
        timestamp: now,
        title: '📋 طلب حجز عقار — قيد البت',
        description: body,
        type: 'decision',
        source: 'محضر المتابعة',
        metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
    });
    showToast('تم إرسال طلب حجز العقار إلى القرارات والطعون.', 'success', {
        decisionsLink: true,
        decisionId: did,
        decisionsTab: 'current',
    });
    onSubmitted();
}

export function runSubmitMovableSeizureRequest(
    { subjectDraft, onSubmitted }: SubmitMovableSeizureRequestParams,
    deps: SeizureRequestSubmitDeps,
): void {
    const { exId, nextTimelineId, pushTimelineEvent, showToast } = deps;
    if (!exId || exId === 'undefined') return;
    const subject = String(subjectDraft || '').trim() || 'طلب حجز مال منقول';
    const body = `موضوع الطلب:\n${subject}`;
    const did = appendPendingExecutorSeizureDecision({
        executionId: exId,
        requestTitle: 'طلب حجز مال منقول — قيد البت لدى المنفذ',
        requestBody: body,
        seizureSubtype: 'movable_auction',
    });
    if (!did) {
        showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
            decisionsLink: true,
            decisionsTab: 'current',
        });
        return;
    }
    const now = new Date().toISOString();
    pushTimelineEvent({
        id: nextTimelineId(),
        date: now.slice(0, 10),
        timestamp: now,
        title: '📦 طلب حجز مال منقول — قيد البت',
        description: body,
        type: 'decision',
        source: 'محضر المتابعة',
        metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
    });
    showToast('تم إرسال طلب الحجز إلى القرارات والطعون.', 'success', {
        decisionsLink: true,
        decisionId: did,
        decisionsTab: 'current',
    });
    onSubmitted();
}
