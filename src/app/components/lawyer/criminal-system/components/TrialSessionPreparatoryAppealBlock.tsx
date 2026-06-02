import React from 'react';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import { DecisionCardAppealFooter } from './DecisionCardAppealFooter';
import {
    shouldShowTrialPreparatoryAppealActions,
} from '../trialSessionPreparatoryDecisionEngine';

export type TrialSessionPreparatoryAppealBlockProps = {
    decision: JudicialDecision;
    caseStage: CaseStage;
    readOnly?: boolean;
    userRole?: CriminalCaseUserRole;
    onCassationAppeal: () => void;
    onInterventionCassation: () => void;
    onCassationCorrection: () => void;
    onDeclareJudgmentFinal: () => void;
    onRecordAppealResult?: () => void;
};

export const TrialSessionPreparatoryAppealBlock = ({
    decision,
    caseStage,
    readOnly,
    userRole,
    onCassationAppeal,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRecordAppealResult,
}: TrialSessionPreparatoryAppealBlockProps) => {
    const showAppeals = shouldShowTrialPreparatoryAppealActions(decision, caseStage);

    if (!showAppeals) return null;

    return (
        <DecisionCardAppealFooter
            decision={decision}
            caseStage={caseStage}
            decisionRecordStage={caseStage}
            readOnly={readOnly}
            userRole={userRole}
            onCassationAppeal={onCassationAppeal}
            onInterventionCassation={onInterventionCassation}
            onCassationCorrection={onCassationCorrection}
            onDeclareJudgmentFinal={onDeclareJudgmentFinal}
            onRecordAppealResult={onRecordAppealResult}
        />
    );
};
