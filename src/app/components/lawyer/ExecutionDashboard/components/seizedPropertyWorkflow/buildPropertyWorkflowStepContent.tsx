import React from 'react';
import { buildPropertyWorkflowStepHistory } from '../../utils/propertySeizureWorkflowUtils';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import { PROPERTY_WORKFLOW_ACTION_SHELL, PROPERTY_WORKFLOW_BTN } from './seizedPropertyWorkflowConstants';
import {
    propertyWorkflowActionClick,
    propertyWorkflowApprovedInlineResume,
    propertyWorkflowDoneStepHistoryShell,
    propertyWorkflowInlineSaveShell,
} from './seizedPropertyWorkflowUiHelpers';
import { buildPropertyWorkflowValuedLaneContent } from './propertyWorkflowStepValuedLane';
import { buildPropertyWorkflowLateStepContent } from './propertyWorkflowStepLateContent';

export type { PropertyWorkflowStepContentDeps } from './propertyWorkflowStepContent.types';
import type { PropertyWorkflowStepContentDeps } from './propertyWorkflowStepContent.types';

export function buildPropertyWorkflowStepContent(
    deps: PropertyWorkflowStepContentDeps,
    stepIndex: number,
): React.ReactNode {
    const {
        activeIdx,
        decisions,
        normStatus,
        p,
        propertyId,
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
        return propertyWorkflowDoneStepHistoryShell(
            buildPropertyWorkflowStepHistory(stepIndex, p, decisions, propertyId),
        );
    }

    const inline = renderInlineForStep(stepIndex);
    const hasMark = Boolean(String(p.seizureMarkLetterNumber || '').trim());
    const norm = normalizeSeizureWorkflowStatus(normStatus);

    if (stepIndex === 0 && norm === 'seized' && !hasMark) {
        return inline;
    }

    if (stepIndex === 1 && norm === 'seized' && hasMark) {
        if (hasPendingSubtype('property_expert')) {
            const pending = renderStepPendingMirror(1, 'property_expert');
            if (pending) return pending;
        }
        const expertInlineReady =
            expertApprovedUnsaved ||
            (inlineFocusKey === 'experts' && Boolean(String(pendingDecisionId || '').trim()));
        if (expertInlineReady) {
            if (dismissedApprovedInlineForStep === 1) {
                return propertyWorkflowApprovedInlineResume(
                    'تمت الموافقة على انتداب الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            const shell = propertyWorkflowInlineSaveShell(inline);
            if (shell) return shell;
        }
        return (
            <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={propertyWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب انتداب خبراء لتقدير العقار.',
                            'طلب انتداب خبراء — عقار (قيد البت لدى المنفذ)',
                            'property_expert',
                        ),
                    )}
                    className={`${PROPERTY_WORKFLOW_BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                >
                    طلب انتداب خبراء للتقدير
                </button>
            </div>
        );
    }

    if (stepIndex === 2) {
        const valued = buildPropertyWorkflowValuedLaneContent(deps, inline);
        if (valued != null) return valued;
    }

    const late = buildPropertyWorkflowLateStepContent(deps, stepIndex, inline);
    if (late !== undefined) return late;

    return inline;
}

export { resolvePropertyWorkflowPendingRowForStep } from './resolvePropertyWorkflowPendingRowForStep';
