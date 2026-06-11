import React, { useMemo } from 'react';
import { ExecutorDecisionFollowupMirror } from './ExecutorDecisionFollowupMirror';
import { findDossierControlDecisionRow } from '../utils/dossierControlDecisions';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { DossierActionType } from './DossierActionsModal';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';

export type DossierExecutorDecisionStripProps = {
    executionId: string;
    actionType: DossierActionType;
    decisions: Record<string, unknown>[];
    onOutcomeApplied?: () => void;
    appealPerspective?: AppealUiPerspective;
};

/** مرآة قرار المنفذ داخل بطاقة التحكم بالإضبارة — مربوطة بنفس صف القرارات */
export const DossierExecutorDecisionStrip: React.FC<DossierExecutorDecisionStripProps> = ({
    executionId,
    actionType,
    decisions,
    onOutcomeApplied,
    appealPerspective = 'creditor_agent',
}) => {
    const exId = String(executionId || '').trim();
    const row = useMemo(
        () => findDossierControlDecisionRow(decisions, actionType),
        [decisions, actionType]
    );

    if (!row || !exId) return null;
    if (isExecutorRowRejectedAndFinal(row) && isExecutorHubRowSuperseded(row)) return null;

    return (
        <div className="border-t border-white/10 px-4 pb-2 pt-2" dir="rtl">
            <ExecutorDecisionFollowupMirror
                executionId={exId}
                row={row}
                requestKind="special_followup"
                className="border-0 bg-transparent p-0"
                appealPerspective={appealPerspective}
            />
        </div>
    );
};
