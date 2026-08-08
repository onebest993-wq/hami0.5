import { useCallback, useMemo } from 'react';
import type { LifecyclePanelProps } from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/LifecyclePanelProps';
import { buildUrgentSparkContext } from '@/app/spark/context/urgentSparkContext';
import { pickActiveUrgentSparkNudge } from '@/app/spark/engine/sparkUrgentEngine';
import { useSparkNudgeHostShellBridge } from '@/app/spark/shell/useSparkNudgeHostShellBridge';
import { buildUrgentShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';

export type SparkUrgentNudgeHostProps = {
    caseId: string;
    requestNumber?: string;
    caseLabel?: string;
    isFinalized?: boolean;
    lifecycle: Pick<
        LifecyclePanelProps,
        | 'fileStatus'
        | 'activeLifecycleStep'
        | 'judgeDecision'
        | 'executionData'
        | 'grievanceData'
        | 'grievanceDecisionNotificationConfirmed'
        | 'cassationData'
    >;
    disabled?: boolean;
    onConfirmGrievanceNotification?: () => void;
    onReviewExecution?: () => void;
    onReviewCassation?: () => void;
};

export function SparkUrgentNudgeHost({
    caseId,
    requestNumber,
    caseLabel,
    isFinalized = false,
    lifecycle,
    disabled = false,
    onConfirmGrievanceNotification,
    onReviewExecution,
    onReviewCassation,
}: SparkUrgentNudgeHostProps) {
    const ctx = useMemo(
        () =>
            buildUrgentSparkContext({
                caseId,
                requestNumber,
                caseLabel,
                isFinalized,
                fileStatus: lifecycle.fileStatus,
                activeLifecycleStep: lifecycle.activeLifecycleStep,
                judgeDecision: lifecycle.judgeDecision,
                executionData: lifecycle.executionData,
                grievanceData: lifecycle.grievanceData,
                grievanceDecisionNotificationConfirmed: lifecycle.grievanceDecisionNotificationConfirmed,
                cassationData: lifecycle.cassationData,
            }),
        [caseId, caseLabel, isFinalized, lifecycle, requestNumber],
    );

    const active = useMemo(
        () => (disabled ? null : pickActiveUrgentSparkNudge(ctx)),
        [ctx, disabled],
    );

    const reviewPayload = useMemo(
        () => (disabled ? null : buildUrgentShellReviewPayload(ctx)),
        [ctx, disabled],
    );

    const { nudge, handleLater, handleDismiss, hideAfterFollow } = useSparkActiveNudge({
        disabled,
        dossierKey: ctx.dossierKey,
        active,
    });

    const runAction = useCallback(
        (actionId: string) => {
            switch (actionId) {
                case 'confirm_grievance_notification':
                    onConfirmGrievanceNotification?.();
                    break;
                case 'review_execution':
                    onReviewExecution?.();
                    break;
                case 'review_cassation':
                    onReviewCassation?.();
                    break;
                default:
                    break;
            }
        },
        [onConfirmGrievanceNotification, onReviewCassation, onReviewExecution],
    );

    const handleFollow = useCallback(() => {
        if (!nudge?.action) return;
        runAction(nudge.action.actionId);
        hideAfterFollow();
    }, [hideAfterFollow, nudge, runAction]);

    useSparkNudgeHostShellBridge({
        surface: 'lawsuit',
        dossierKey: ctx.dossierKey,
        dossierLabel: ctx.caseLabel,
        nudge: active,
        reviewPayload,
        onFollow: runAction,
        disabled,
    });

    if (!nudge) return null;

    return (
        <div className="px-4 pb-2" dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
