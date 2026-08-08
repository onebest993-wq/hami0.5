import { useCallback, useMemo } from 'react';
import {
    buildExecutionCreationSparkContext,
    type ExecutionCreationSparkDraft,
    EXECUTION_CREATION_DOSSIER_KEY,
} from '@/app/spark/context/executionCreationSparkContext';
import { pickExecutionCreationSparkNudgeQueue } from '@/app/spark/engine/sparkExecutionCreationEngine';
import { readSparkAuditNudge } from '@/app/spark/audit/sparkAuditNudgeStore';
import { useSparkNudgeHostShellBridge } from '@/app/spark/shell/useSparkNudgeHostShellBridge';
import { buildExecutionCreationShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudgeFromQueue } from '@/app/spark/ui/useSparkActiveNudge';
import { useDebouncedValue } from '@/app/spark/ui/useDebouncedValue';
import { SPARK_SHELL_REVIEW_DEBOUNCE_MS } from '@/app/spark/policy/sparkAnalysisPolicy';

export type SparkExecutionCreationNudgeHostProps = {
    draft: ExecutionCreationSparkDraft;
    disabled?: boolean;
    className?: string;
    onFollow?: (actionId: string) => void;
};

export function SparkExecutionCreationNudgeHost({
    draft,
    disabled = false,
    className = 'px-4 pb-2',
    onFollow,
}: SparkExecutionCreationNudgeHostProps) {
    const debouncedDraft = useDebouncedValue(draft);
    const shellDraft = useDebouncedValue(draft, SPARK_SHELL_REVIEW_DEBOUNCE_MS);
    const ctx = useMemo(() => buildExecutionCreationSparkContext(debouncedDraft), [debouncedDraft]);

    const nudgeQueue = useMemo(
        () => (disabled ? [] : pickExecutionCreationSparkNudgeQueue(ctx, 5)),
        [ctx, disabled],
    );

    const reviewPayload = useMemo(() => {
        if (disabled) return null;
        return buildExecutionCreationShellReviewPayload(
            buildExecutionCreationSparkContext(shellDraft),
        );
    }, [disabled, shellDraft]);

    const auditNudge = useMemo(
        () => (disabled ? null : readSparkAuditNudge(EXECUTION_CREATION_DOSSIER_KEY)),
        [disabled, draft],
    );

    const { nudge, visibleQueue, handleLater, handleDismiss, hideAfterFollow } =
        useSparkActiveNudgeFromQueue({
            disabled,
            dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
            queue: nudgeQueue,
        });

    const runAction = useCallback(
        (actionId: string) => {
            onFollow?.(actionId);
        },
        [onFollow],
    );

    const handleFollow = useCallback(() => {
        if (!nudge?.action) return;
        runAction(nudge.action.actionId);
        hideAfterFollow();
    }, [hideAfterFollow, nudge, runAction]);

    useSparkNudgeHostShellBridge({
        surface: 'execution',
        dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
        dossierLabel: String(draft.fileNumber ?? '').trim() || 'مسودة تنفيذ',
        nudge: visibleQueue[0] ?? null,
        passiveNudges: visibleQueue,
        auditNudge,
        reviewPayload,
        onFollow: runAction,
        disabled,
    });

    if (!nudge) return null;

    return (
        <div className={className} dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action && onFollow ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
