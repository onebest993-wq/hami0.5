import { useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
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
            ] = await Promise.all([
                import('@/app/utils/specialFollowupDecisionQueue'),
            ]);

            const execRecord = execData as Record<string, unknown> | null | undefined;
            const resolvedStorageId = (() => {
                const fromResolver = resolveDecisionsStorageExecutionId(storageId, execRecord);
                if (fromResolver !== 'default') return fromResolver;
                return String(storageId || execRecord?.id || '').trim();
            })();
            if (!resolvedStorageId) {
                showToast('تعذّر الإرسال — معرّف الإضبارة غير جاهز', 'error', { decisionsLink: false });
                return false;
            }

            const d = date.trim();
            const trimmedContent = content.trim();
            const title = manualTitle.trim() || 'طلب يدوي';
            const payloadJson = JSON.stringify({
                kind: 'manual_followup',
                v: 1,
                source: 'followup_admin',
            });
            const decisionId = appendSpecialFollowupRequest({
                executionId: resolvedStorageId,
                requestDate: d,
                content: trimmedContent || title,
                decisionTitle: title,
                payloadJson,
                executionData: execRecord,
                adminRequestsTab: true,
            });
            if (!decisionId) {
                showToast('تعذّر إرسال الطلب — أعد المحاولة', 'warning', { decisionsLink: true });
                return false;
            }
            try {
                const { flushExecutorDecisionsStorageAwait } = await import(
                    '@/app/utils/executionDecisionsNamespace'
                );
                await flushExecutorDecisionsStorageAwait(resolvedStorageId, execRecord);
            } catch {
                /* ignore */
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
            return true;
        },
        onClose: () => {},
        successMessage:
            'تم إرسال الطلب إلى مركز القرارات — يظهر في سجل الطلبات أدناه مع اختصار قرار المنفذ',
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
