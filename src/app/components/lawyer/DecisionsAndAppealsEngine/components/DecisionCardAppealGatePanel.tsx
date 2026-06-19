import type { Decision } from '../types';
import type { DecisionCardProps } from './decisionCardTypes';
import type { useDecisionCardDerivedState } from './useDecisionCardDerivedState';
import { DECISION_NOTICE_GLASS } from '../decisionCardPresentation';

type Derived = ReturnType<typeof useDecisionCardDerivedState>;

type DecisionCardAppealGatePanelProps = Pick<
    DecisionCardProps,
    'renderAppealAwaitingCassationButtons' | 'renderAppealGrievanceDecideButtons'
> & {
    decision: Decision;
    derived: Derived;
};

export function DecisionCardAppealGatePanel({
    decision,
    derived,
    renderAppealAwaitingCassationButtons,
    renderAppealGrievanceDecideButtons,
}: DecisionCardAppealGatePanelProps) {
    const {
        isManualLedgerCard,
        requestAppealGate,
        appealCycleSealed,
        awaitingCreditorCassationEntry,
        pipelineRow,
        appealWindowClosed,
        canManageAppealHere,
        windows,
    } = derived;

    if (
        isManualLedgerCard ||
        requestAppealGate.kind === 'continue' ||
        decision.isArchived ||
        appealCycleSealed
    ) {
        return null;
    }

    return (
        <div className="space-y-2">
            {!awaitingCreditorCassationEntry ? (
                <div
                    className={`${DECISION_NOTICE_GLASS} ${
                        requestAppealGate.kind === 'lifecycle_reset'
                            ? 'border-violet-400/15 text-violet-100/90'
                            : requestAppealGate.kind === 'paused'
                              ? 'border-amber-400/15 text-amber-100/90'
                              : 'border-rose-400/15 text-rose-100/90'
                    }`}
                >
                    {requestAppealGate.message}
                </div>
            ) : null}
            <div className="flex flex-col gap-2">
                {requestAppealGate.kind === 'paused' ? (
                    <>
                        {awaitingCreditorCassationEntry || requestAppealGate.showWaiveCassation
                            ? renderAppealAwaitingCassationButtons(
                                  pipelineRow,
                                  'previousCard',
                                  appealWindowClosed,
                                  canManageAppealHere,
                              )
                            : (pipelineRow.appealStatus === 'tadhallum_filed' ||
                                    pipelineRow.appealPhase === 'grievance') &&
                                !windows.isPastGrievanceDeadline
                              ? renderAppealGrievanceDecideButtons(
                                    pipelineRow,
                                    'previousCard',
                                    windows,
                                )
                              : null}
                    </>
                ) : null}
            </div>
        </div>
    );
}
