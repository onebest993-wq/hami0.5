// @ts-nocheck
import { useMemo, useRef } from 'react';
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
    const draftRef = useRef({
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestContent,
        executionData,
        decisionsStorageExecutionId,
    });
    draftRef.current = {
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestContent,
        executionData,
        decisionsStorageExecutionId,
    };

    const { runSubmit: runSpecialFollowupSubmit } = useStandardSubmit({
        validate: () => {
            const {
                specialRequestDate: date,
                specialRequestManualTitle: title,
                specialRequestContent: content,
            } = draftRef.current;
            const d = date.trim();
            if (!d) return false;
            return Boolean(title.trim()) && Boolean(content.trim());
        },
        validationMessage: 'أكمل موضوع الطلب والتاريخ والتفاصيل',
        submit: async () => {
            const {
                specialRequestDate: date,
                specialRequestManualTitle: manualTitle,
                specialRequestContent: content,
                executionData: execData,
                decisionsStorageExecutionId: storageId,
            } = draftRef.current;
            const [
                { appendSpecialFollowupRequest },
                { dispatchDomainIsolationBlocked, isFollowupRequestKindAllowed },
            ] = await Promise.all([
                import('@/app/utils/specialFollowupDecisionQueue'),
                import('@/app/utils/executionDomainIsolation'),
            ]);

            const followupGate = isFollowupRequestKindAllowed(
                execData as Record<string, unknown> | null | undefined,
                storageId,
                'special_followup',
            );
            if (!followupGate.allowed) {
                dispatchDomainIsolationBlocked(followupGate.reasonAr, 'special_followup');
                return false;
            }

            const d = date.trim();
            const trimmedContent = content.trim();
            const title = manualTitle.trim() || 'طلب يدوي';
            const decisionId = appendSpecialFollowupRequest({
                executionId: storageId,
                requestDate: d,
                content: trimmedContent || title,
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
            const fullBody = `بتاريخ ${d}:\n\n${trimmedContent || title}`;
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
