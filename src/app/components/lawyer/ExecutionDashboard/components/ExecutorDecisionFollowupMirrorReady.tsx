import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
    resolveExecutorRequestFollowupBlockFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { ExecutorDecisionFollowupMirrorViews } from './ExecutorDecisionFollowupMirrorViews';
export type ExecutorDecisionFollowupMirrorProps = {
    executionId: string | undefined;
    row: Record<string, unknown> | null;
    requestKind?: string;
    personalCoerciveSubtype?: string;
    className?: string;
    /** داخل ExecutionInlineAccordion — العنوان في رأس الخطوة، لا تكرار هنا */
    compact?: boolean;
    onResubmitRequest?: () => void;
    resubmitSubmitting?: boolean;
    disabled?: boolean;
    onWaiveInitialAppealApplied?: (result: {
        ok: boolean;
        mergedRowId?: string;
        title?: string;
        message?: string;
    }) => void;
    appealPerspective?: AppealUiPerspective;
    /** إضبارة الأم — لاكتشاف اكتمال طلبات التحكم بالإضبارة من السجل الزمني */
    parentExecutionId?: string;
    onOutcomeApplied?: () => void;
};

/** مرآة قرار المنفذ في المحضر — نفس صف التخزين الذي تُعرض عليه بطاقة القرارات */
export const ExecutorDecisionFollowupMirrorReady: React.FC<ExecutorDecisionFollowupMirrorProps> = ({
    executionId,
    row,
    requestKind,
    personalCoerciveSubtype,
    className = '',
    compact = false,
    disabled: mirrorDisabled = false,
    onWaiveInitialAppealApplied,
    appealPerspective = 'creditor_agent',
    parentExecutionId,
    onOutcomeApplied,
}) => {
    const exId = String(executionId || '').trim();
    const decisionId = row ? String((row as { id?: string }).id || '').trim() : '';
    const [liveRow, setLiveRow] = useState<Record<string, unknown>>(row as Record<string, unknown>);

    useEffect(() => {
        if (!row) return;
        setLiveRow(row as Record<string, unknown>);
    }, [row, decisionId, (row as { executorOutcome?: string })?.executorOutcome]);

    // الخروج المبكر يسكن تحت كل الخطافات: `row` يصل فارغاً ثم يمتلئ، فالخروج فوقها
    // كان يُبدّل عدد الخطافات بين رسمتين ويُسقط React.
    const viewRow = liveRow;
    const hasRow = Boolean(exId && decisionId && row);

    const rejected = isExecutorRowRejectedAndFinal(viewRow);
    const approved = isExecutorRowEffectivelyApproved(viewRow);
    const pending =
        String((viewRow as { executorOutcome?: string }).executorOutcome ?? 'pending') === 'pending' ||
        String((viewRow as { executorOutcome?: string }).executorOutcome ?? '') === '';
    const withdrawn =
        String((viewRow as { executorOutcome?: string }).executorOutcome || '') === 'withdrawn' ||
        (viewRow as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true;

    const handleResolved = useCallback(
        (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
            decisionId?: string;
        }) => {
            if (!result.ok || !result.outcome) return;
            setLiveRow((prev) => ({
                ...prev,
                executorOutcome: result.outcome,
                resolvedAt: new Date().toISOString(),
                status: result.outcome === 'rejected' ? 'rejected' : 'accepted',
            }));
            onOutcomeApplied?.();
        },
        [onOutcomeApplied],
    );

    const openDecisions = useCallback(
        (tab: 'current' | 'previous' | 'appeals' = 'previous') => {
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId: exId, tab, decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [exId, decisionId]
    );

    const rk = String(requestKind || (viewRow as { requestKind?: string }).requestKind || '').trim();
    const pcSub =
        personalCoerciveSubtype ||
        String((viewRow as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '').trim();

    const allDecisions = useMemo(
        () => (exId ? (readExecutorDecisionsArray(exId) as unknown as Decision[]) : []),
        [exId, viewRow, decisionId],
    );

    const followupBlock = useMemo(() => {
        if (!viewRow) return null;
        return resolveExecutorRequestFollowupBlockFromRecord(
            viewRow,
            allDecisions as unknown as Record<string, unknown>[],
            appealPerspective
        );
    }, [allDecisions, viewRow, appealPerspective]);

    if (!hasRow) return null;
    const creditorPartyApproved =
        appealPerspective === 'debtor_agent' &&
        approved &&
        isCreditorInitiatedExecutorRequest(hubWithInferredAppealOrigin(viewRow as unknown as Decision));

    const inlineDecisionActionsProps = {
        executionId: exId,
        decisionId,
        decisionRow: viewRow,
        requestKind: rk || undefined,
        personalCoerciveSubtype: pcSub || undefined,
        suppressNavigatorToast: true,
        onResolved: handleResolved,
    };

    return (
        <ExecutorDecisionFollowupMirrorViews
            className={className}
            compact={compact}
            exId={exId}
            decisionId={decisionId}
            viewRow={viewRow}
            allDecisions={allDecisions}
            appealPerspective={appealPerspective}
            parentExecutionId={parentExecutionId}
            mirrorDisabled={mirrorDisabled}
            onWaiveInitialAppealApplied={onWaiveInitialAppealApplied}
            withdrawn={withdrawn}
            approved={approved}
            rejected={rejected}
            pending={pending}
            followupBlock={followupBlock}
            rk={rk}
            creditorPartyApproved={creditorPartyApproved}
            inlineDecisionActionsProps={inlineDecisionActionsProps}
            openDecisions={openDecisions}
        />
    );
};
