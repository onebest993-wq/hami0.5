import { useCallback, useMemo, useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { pickExecutionSparkNudgeQueue } from '@/app/spark/engine/sparkExecutionEngine';
import { useSparkNudgeHostShellBridge } from '@/app/spark/shell/useSparkNudgeHostShellBridge';
import { buildExecutionShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { SparkSmartHeaderChip } from '@/app/spark/ui/SparkSmartHeaderChip';
import { useSparkActiveNudgeFromQueue } from '@/app/spark/ui/useSparkActiveNudge';
import { useExecutionBoundVaultDocs } from '@/app/spark/vault/useExecutionBoundVaultDocs';
import { requestSparkOpenVaultDoc } from '@/app/spark/focus/sparkVaultDocFocus';

export type SparkExecutionActionHandlers = {
    onOpenSummons?: () => void;
    onOpenDecisions?: () => void;
    onRecordDetentionJudge?: () => void;
    onResumeLifecycle?: () => void;
    onOpenCoercive?: () => void;
    onOpenFollowup?: () => void;
    onOpenTimeline?: () => void;
    onOpenSeizureRequests?: () => void;
    onOpenEmployeeAssignment?: () => void;
    onOpenFinancialCenter?: () => void;
};

export type SparkExecutionNudgeHostProps = {
    executionData: ExecutionFile;
    executionPaused?: boolean;
    decisionsStorageExecutionId?: string;
    disabled?: boolean;
    runtimeOverlay?: ExecutionSparkRuntimeOverlay;
    actions: SparkExecutionActionHandlers;
    /** header-chip = شريحة مضيئة بجانب هيدر الإضبارة؛ banner = شريط كامل في المحتوى */
    presentation?: 'header-chip' | 'banner';
};

export function SparkExecutionNudgeHost({
    executionData,
    executionPaused = false,
    decisionsStorageExecutionId,
    disabled = false,
    runtimeOverlay,
    actions,
    presentation = 'header-chip',
}: SparkExecutionNudgeHostProps) {
    const [chipOpen, setChipOpen] = useState(false);
    const boundVaultDocs = useExecutionBoundVaultDocs(executionData, !disabled);

    const ctx = useMemo(
        () =>
            buildExecutionSparkContext({
                executionData,
                executionPaused,
                decisionsStorageExecutionId,
                runtimeOverlay,
                boundVaultDocs,
            }),
        [
            boundVaultDocs,
            decisionsStorageExecutionId,
            executionData,
            executionPaused,
            runtimeOverlay,
        ],
    );

    const nudgeQueue = useMemo(
        () => (disabled ? [] : pickExecutionSparkNudgeQueue(ctx, 5)),
        [ctx, disabled],
    );

    const reviewPayload = useMemo(
        () => (disabled ? null : buildExecutionShellReviewPayload(ctx)),
        [ctx, disabled],
    );

    const { nudge, visibleQueue, handleLater: queueLater, handleDismiss: queueDismiss, hideAfterFollow } =
        useSparkActiveNudgeFromQueue({
            disabled,
            dossierKey: ctx.dossierKey,
            queue: nudgeQueue,
        });

    const runAction = useCallback(
        (actionId: string, targetFileId?: string) => {
            switch (actionId) {
                case 'open_summons':
                    actions.onOpenSummons?.();
                    break;
                case 'open_decisions':
                    actions.onOpenDecisions?.();
                    break;
                case 'record_detention_judge':
                    actions.onRecordDetentionJudge?.();
                    break;
                case 'resume_lifecycle':
                    actions.onResumeLifecycle?.();
                    break;
                case 'open_coercive':
                    actions.onOpenCoercive?.();
                    break;
                case 'open_followup':
                    actions.onOpenFollowup?.();
                    break;
                case 'open_timeline':
                    actions.onOpenTimeline?.();
                    break;
                case 'open_seizure_requests':
                    actions.onOpenSeizureRequests?.();
                    break;
                case 'open_employee_assignment':
                    actions.onOpenEmployeeAssignment?.();
                    break;
                case 'open_financial_center':
                    actions.onOpenFinancialCenter?.();
                    break;
                case 'open_vault_doc':
                    requestSparkOpenVaultDoc(targetFileId ?? '');
                    break;
                default:
                    break;
            }
        },
        [actions],
    );

    const handleFollow = useCallback(() => {
        if (!nudge?.action) return;
        runAction(nudge.action.actionId, nudge.targetFileId);
        hideAfterFollow();
        setChipOpen(false);
    }, [hideAfterFollow, nudge, runAction]);

    const handleLater = useCallback(() => {
        queueLater();
        setChipOpen(false);
    }, [queueLater]);

    const handleDismiss = useCallback(() => {
        queueDismiss();
        setChipOpen(false);
    }, [queueDismiss]);

    useSparkNudgeHostShellBridge({
        surface: 'execution',
        dossierKey: ctx.dossierKey,
        dossierLabel:
            String(executionData.fileNumber ?? '').trim() ||
            ctx.dossierKey.replace(/^execution:/, ''),
        nudge: visibleQueue[0] ?? null,
        passiveNudges: visibleQueue,
        reviewPayload,
        onFollow: (actionId) => {
            const match = visibleQueue.find((item) => item.action?.actionId === actionId);
            runAction(actionId, match?.targetFileId);
        },
        disabled,
    });

    if (!nudge) return null;

    if (presentation === 'header-chip') {
        return (
            <SparkSmartHeaderChip
                nudge={nudge}
                open={chipOpen}
                onOpenChange={setChipOpen}
                onFollow={nudge.action ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        );
    }

    return (
        <div className="px-3 pt-2 sm:px-4" dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
