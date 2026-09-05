import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    addCreationCommit,
    buildCreationRevealQueue,
    focusCreationStep,
    isCreationStepRevealed,
    nextCreationRevealStep,
    pruneCreationCommitsToQueue,
    type CreationRevealContext,
    type CreationRevealStep,
} from './executionCreationRevealSteps';

export type CommitCreationStepOptions = {
    /** false = لا تخطف المؤشر (كتابة / blur / رجوع لتعديل) */
    focusNext?: boolean;
};

export function useExecutionCreationSequentialReveal(ctx: CreationRevealContext) {
    const queue = useMemo(
        () =>
            buildCreationRevealQueue({
                docType: ctx.docType,
                hasAmountStep: ctx.hasAmountStep,
                showLawyerFees: ctx.showLawyerFees,
            }),
        [ctx.docType, ctx.hasAmountStep, ctx.showLawyerFees],
    );
    const [committed, setCommitted] = useState<Set<CreationRevealStep>>(() => new Set());

    useEffect(() => {
        setCommitted((prev) => {
            const next = pruneCreationCommitsToQueue(prev, queue);
            if (next.size === prev.size && [...next].every((step) => prev.has(step))) {
                return prev;
            }
            return next;
        });
    }, [queue]);

    const isRevealed = useCallback(
        (step: CreationRevealStep) => isCreationStepRevealed(step, queue, committed),
        [committed, queue],
    );

    const commitStep = useCallback(
        (step: CreationRevealStep, opts?: CommitCreationStepOptions) => {
            if (!queue.includes(step)) return;
            let newlyAdded = false;
            setCommitted((prev) => {
                if (prev.has(step)) return prev;
                newlyAdded = true;
                return addCreationCommit(prev, step, queue);
            });
            if (!newlyAdded || opts?.focusNext === false) return;
            const following = nextCreationRevealStep(step, queue);
            if (following) focusCreationStep(following);
        },
        [queue],
    );

    return { queue, isRevealed, commitStep };
}
