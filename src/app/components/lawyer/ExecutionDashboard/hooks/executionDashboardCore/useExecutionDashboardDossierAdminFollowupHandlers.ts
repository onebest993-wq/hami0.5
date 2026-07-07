// @ts-nocheck
import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { SPECIAL_REQUEST_MANUAL_MODE } from '../../components/requestsTabConstants';
import { useStandardSubmit } from '@/app/hooks/useStandardSubmit';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

type UseExecutionDashboardDossierAdminFollowupHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string | undefined;
    specialRequestDate: string;
    specialRequestManualTitle: string;
    specialRequestContent: string;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setSpecialRequestTemplatePick: Dispatch<SetStateAction<string>>;
    setSpecialRequestContent: Dispatch<SetStateAction<string>>;
    setSpecialRequestManualTitle: Dispatch<SetStateAction<string>>;
    setSpecialRequestDate: Dispatch<SetStateAction<string>>;
};

export function useExecutionDashboardDossierAdminFollowupHandlers({
    executionData,
    decisionsStorageExecutionId,
    specialRequestDate,
    specialRequestManualTitle,
    specialRequestContent,
    nextTimelineId,
    pushTimelineEvent,
    showToast,
    setSpecialRequestTemplatePick,
    setSpecialRequestContent,
    setSpecialRequestManualTitle,
    setSpecialRequestDate,
}: UseExecutionDashboardDossierAdminFollowupHandlersParams) {
    const { runSubmit: runSpecialFollowupSubmit } = useStandardSubmit({
        validate: () => {
            const d = specialRequestDate.trim();
            if (!d) return false;
            return Boolean(specialRequestManualTitle.trim()) && Boolean(specialRequestContent.trim());
        },
        validationMessage: 'أكمل موضوع الطلب والتاريخ والتفاصيل',
        submit: async () => {
            const [
                { appendSpecialFollowupRequest },
                { dispatchDomainIsolationBlocked, isFollowupRequestKindAllowed },
            ] = await Promise.all([
                import('@/app/utils/specialFollowupDecisionQueue'),
                import('@/app/utils/executionDomainIsolation'),
            ]);

            const followupGate = isFollowupRequestKindAllowed(
                executionData as Record<string, unknown> | null | undefined,
                decisionsStorageExecutionId,
                'special_followup',
            );
            if (!followupGate.allowed) {
                dispatchDomainIsolationBlocked(followupGate.reasonAr, 'special_followup');
                return false;
            }

            const d = specialRequestDate.trim();
            const content = specialRequestContent.trim();
            const title = specialRequestManualTitle.trim() || 'طلب يدوي';
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content: content || title,
                decisionTitle: title,
                payloadJson: JSON.stringify({
                    kind: 'manual_followup',
                    v: 1,
                }),
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            const now = new Date().toISOString();
            const fullBody = `بتاريخ ${d}:\n\n${content || title}`;
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: `${title} — قيد البت`,
                description: fullBody,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            setSpecialRequestTemplatePick(SPECIAL_REQUEST_MANUAL_MODE);
            setSpecialRequestContent('');
            setSpecialRequestManualTitle('');
            setSpecialRequestDate(getLocalTodayYmd());
        },
        onClose: () => {},
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ — افتح «القرارات والطعون» من الشريط عند الحاجة',
        showToast,
        successToastOptions: { decisionsLink: true },
    });

    return useMemo(
        () => ({
            runSpecialFollowupSubmit,
        }),
        [runSpecialFollowupSubmit],
    );
}
