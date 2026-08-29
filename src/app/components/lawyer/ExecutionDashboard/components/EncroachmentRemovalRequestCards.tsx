import React from 'react';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import type { EncroachmentRemovalRequestCardsProps } from './EncroachmentRemovalRequestCards.types';
import { EncroachmentSurveyorRequestCard } from './encroachmentRemoval/EncroachmentSurveyorRequestCard';
import { EncroachmentMachineryRequestCard } from './encroachmentRemoval/EncroachmentMachineryRequestCard';
import {
    useEncroachmentDecisionRows,
    useEncroachmentLatestDecision,
    useEncroachmentOpenAppeals,
} from './encroachmentRemoval/encroachmentDecisionHelpers';

export const EncroachmentRemovalRequestCards: React.FC<EncroachmentRemovalRequestCardsProps> = ({
    variant = 'full',
    decisionsStorageExecutionId,
    inlineActionGateKey,
    setInlineActionGateKey,
    showToast,
    onExpenseRecorded,
}) => {
    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const decisionRows = useEncroachmentDecisionRows(decisions);
    const latestDecision = useEncroachmentLatestDecision(decisions);
    const openAppeals = useEncroachmentOpenAppeals(executionId);
    const [detailsOpen, setDetailsOpen] = React.useState<Record<string, boolean>>({});

    const surveyorRow = latestDecision('surveyor_appointment');
    const machineryRow = latestDecision('machinery_entry_permit');

    return (
        <>
            <EncroachmentSurveyorRequestCard
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                executionId={executionId}
                decisionRows={decisionRows}
                surveyorRow={surveyorRow}
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                showToast={showToast}
                onExpenseRecorded={onExpenseRecorded}
                onOpenAppeals={openAppeals}
                detailsOpen={detailsOpen}
                setDetailsOpen={setDetailsOpen}
            />
            {variant === 'full' ? (
                <EncroachmentMachineryRequestCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    executionId={executionId}
                    decisionRows={decisionRows}
                    machineryRow={machineryRow}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    onExpenseRecorded={onExpenseRecorded}
                    onOpenAppeals={openAppeals}
                    detailsOpen={detailsOpen}
                    setDetailsOpen={setDetailsOpen}
                />
            ) : null}
        </>
    );
};
