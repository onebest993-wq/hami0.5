import React from 'react';
import { AppealDeadlineLapsePanel } from '../../components/AppealDeadlineLapsePanel';
import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import {
    appealDeadlineLapsePanelMessage,
    buildAppealPerpetualEnforcementPatch,
    buildGrievanceDeadlineLapsePatch,
    resolveAppealDeadlineExpiryKind,
} from '../../utils';
import { DECISION_BTN_PRIMARY_WFULL } from './appealRendererButtonClasses';

export function useAppealDeadlineLapseRenderer(args: UseDecisionsAppealsAppealRenderersArgs) {
    const { decisions, patchDecisionRow, logAppealTimeline, setDecisionsHubTab } = args;

    const handleEndAppealDeadline = React.useCallback(
        (decisionId: string) => {
            const row = decisions.find((d) => d.id === decisionId);
            if (!row) return;
            const kind = resolveAppealDeadlineExpiryKind(row);
            if (!kind) return;
            if (kind === 'grievance') {
                patchDecisionRow(decisionId, buildGrievanceDeadlineLapsePatch(row, decisions));
                logAppealTimeline('إنهاء مهلة التظلم', 'أُغلق مسار التظلم — يبقى مسار التمييز إن كانت مهلته سارية');
                return;
            }
            patchDecisionRow(decisionId, buildAppealPerpetualEnforcementPatch(row));
            logAppealTimeline(
                'إنهاء مهلة التمييز',
                'انتهت مهلة التمييز — القرار نافذٌ نهائياً وأُرشف'
            );
            queueMicrotask(() => setDecisionsHubTab('archive'));
        },
        [decisions, patchDecisionRow, logAppealTimeline]
    );

    const renderAppealDeadlineLapseActions = (decision: Decision) => {
        const kind = resolveAppealDeadlineExpiryKind(decision);
        if (!kind) return null;
        return (
            <AppealDeadlineLapsePanel
                message={appealDeadlineLapsePanelMessage(kind)}
                onEndDeadline={() => handleEndAppealDeadline(decision.id)}
                btnPrimaryClass={DECISION_BTN_PRIMARY_WFULL}
            />
        );
    };

    return { renderAppealDeadlineLapseActions };
}
