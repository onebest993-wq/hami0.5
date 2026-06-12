import React, { useMemo } from 'react';
import { ExecutorDecisionFollowupMirror } from './ExecutorDecisionFollowupMirror';
import {
    findDossierControlDecisionRow,
    shouldShowDossierControlExecutorStrip,
} from '../utils/dossierControlDecisions';
import type { DossierActionType } from './DossierActionsModal';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';

export type DossierExecutorDecisionStripProps = {
    executionId: string;
    parentExecutionId?: string;
    actionType: DossierActionType;
    decisions: Record<string, unknown>[];
    onOutcomeApplied?: () => void;
    appealPerspective?: AppealUiPerspective;
};

/** مرآة قرار المنفذ داخل بطاقة التحكم بالإضبارة — مربوطة بنفس صف القرارات */
export const DossierExecutorDecisionStrip: React.FC<DossierExecutorDecisionStripProps> = ({
    executionId,
    parentExecutionId,
    actionType,
    decisions,
    onOutcomeApplied,
    appealPerspective = 'creditor_agent',
}) => {
    const exId = String(executionId || '').trim();
    const parentId = String(parentExecutionId || executionId || '').trim();
    const visible = useMemo(
        () =>
            shouldShowDossierControlExecutorStrip({
                executionId: exId,
                parentExecutionId: parentId,
                actionType,
                decisions,
                appealPerspective,
            }),
        [actionType, appealPerspective, decisions, exId, parentId]
    );

    const row = useMemo(
        () =>
            visible
                ? findDossierControlDecisionRow(decisions, actionType, {
                      parentExecutionId: parentId,
                      appealPerspective,
                  })
                : null,
        [actionType, appealPerspective, decisions, parentId, visible]
    );

    if (!visible || !row || !exId) return null;

    return (
        <div className="border-t border-white/10 px-4 pb-2 pt-2" dir="rtl">
            <ExecutorDecisionFollowupMirror
                executionId={exId}
                parentExecutionId={parentId}
                row={row}
                requestKind="special_followup"
                className="border-0 bg-transparent p-0"
                appealPerspective={appealPerspective}
            />
        </div>
    );
};
