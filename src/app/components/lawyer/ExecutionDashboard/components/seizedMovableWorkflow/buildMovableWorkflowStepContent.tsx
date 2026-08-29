import React from 'react';
import { buildMovableWorkflowStepHistory } from '../../utils/movableSeizureWorkflowUtils';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import { MOVABLE_WORKFLOW_ACTION_SHELL, MOVABLE_WORKFLOW_BTN } from './seizedMovableWorkflowConstants';
import {
    movableWorkflowActionClick,
    movableWorkflowApprovedInlineResume,
    movableWorkflowDoneStepHistoryShell,
    movableWorkflowInlineSaveShell,
} from './seizedMovableWorkflowUiHelpers';
import { buildMovableWorkflowValuedLaneContent } from './movableWorkflowStepValuedLane';
import { buildMovableWorkflowLateStepContent } from './movableWorkflowStepLateContent';

export type { MovableWorkflowStepContentDeps } from './movableWorkflowStepContent.types';
import type { MovableWorkflowStepContentDeps } from './movableWorkflowStepContent.types';

export function buildMovableWorkflowStepContent(
    deps: MovableWorkflowStepContentDeps,
    stepIndex: number,
): React.ReactNode {
    const {
        activeIdx,
        decisions,
        normStatus,
        m,
        movableId,
        renderInlineForStep,
        hasPendingSubtype,
        submitSubtype,
        expertApprovedUnsaved,
        renderStepPendingMirror,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        inlineFocusKey,
        pendingDecisionId,
    } = deps;

    if (stepIndex > activeIdx) return null;
    if (stepIndex < activeIdx) {
        return movableWorkflowDoneStepHistoryShell(
            buildMovableWorkflowStepHistory(stepIndex, m, decisions, movableId),
        );
    }

    const inline = renderInlineForStep(stepIndex);
    const hasMark = Boolean(String(m.seizureMarkLetterNumber || '').trim());
    const norm = normalizeSeizureWorkflowStatus(normStatus);

    if (stepIndex === 0 && norm === 'seized' && !hasMark) {
        return inline;
    }

    if (stepIndex === 1 && norm === 'seized' && hasMark) {
        if (hasPendingSubtype('movable_expert')) {
            const pending = renderStepPendingMirror(1, 'movable_expert');
            if (pending) return pending;
        }
        const expertInlineReady =
            expertApprovedUnsaved ||
            (inlineFocusKey === 'experts' && Boolean(String(pendingDecisionId || '').trim()));
        if (expertInlineReady) {
            if (dismissedApprovedInlineForStep === 1) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على انتداب الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            const shell = movableWorkflowInlineSaveShell(inline);
            if (shell) return shell;
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب انتداب خبراء لتقدير المال المنقول.',
                            'طلب انتداب خبراء — مال منقول (قيد البت لدى المنفذ)',
                            'movable_expert',
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                >
                    طلب انتداب خبراء للتقدير
                </button>
            </div>
        );
    }

    if (stepIndex === 2) {
        const valued = buildMovableWorkflowValuedLaneContent(deps, inline);
        if (valued != null) return valued;
    }

    const late = buildMovableWorkflowLateStepContent(deps, stepIndex, inline);
    if (late !== undefined) return late;

    return inline;
}

export { resolveMovableWorkflowPendingRowForStep } from './resolveMovableWorkflowPendingRowForStep';
