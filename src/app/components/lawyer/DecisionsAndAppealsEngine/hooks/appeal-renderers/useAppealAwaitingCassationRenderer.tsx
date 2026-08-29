import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import {
    canWaiveLawyerAwaitingCassation,
    resolveEffectiveAwaitingCassationParty,
    resolveUnderlyingDecisionHub,
    type DecisionsAppealsAppealSlot,
} from '../../utils';
import {
    appealCassationEntryLabels,
    appealInitialGrievanceEntryButtonLabel,
} from '../../appealUiLabels';
import { DECISION_BTN_DEBTOR_APPEAL_NOTICE } from '../../decisionCardPresentation';
import { DECISION_BTN_PRIMARY_WFULL, DECISION_BTN_SECONDARY_WFULL } from './appealRendererButtonClasses';

export function useAppealAwaitingCassationRenderer(args: UseDecisionsAppealsAppealRenderersArgs) {
    const {
        appealPerspective,
        decisions,
        transitionAppealWorkflow,
        applyWaiveCassationAfterDebtorGrievance,
    } = args;

        const renderAppealAwaitingCassationButtons = (
            decision: Decision,
            variant: DecisionsAppealsAppealSlot,
            appealWindowClosed: boolean,
            manageAppealGate: boolean
        ) => {
            if (!manageAppealGate) return null;
            const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
            const isManualLedger =
                decision.manualExecutorLedgerEntry === true ||
                appealHub.manualExecutorLedgerEntry === true;
            if (isManualLedger) return null;
            const lawyerBtnClass =
                variant === 'appealsTab'
                    ? DECISION_BTN_PRIMARY_WFULL
                    : `mb-3 ${DECISION_BTN_PRIMARY_WFULL}`;
            const awaitingParty = resolveEffectiveAwaitingCassationParty(decision, undefined, decisions);
            if (!awaitingParty) return null;
            const cassationWindowOpen = !appealWindowClosed;
            return (
                <>
                    {awaitingParty === 'debtor' &&
                        cassationWindowOpen && (() => {
                            const labels = appealCassationEntryLabels(appealPerspective, 'debtor');
                            return (
                            <button
                                type="button"
                                onClick={() =>
                                    transitionAppealWorkflow(
                                        decision,
                                        {
                                            noAppealChosen: false,
                                            appealActor: 'debtor',
                                            appealMethod: 'tamyeez',
                                            appealWorkflowState: 'PENDING_APPEAL_DEBTOR',
                                            appealStatus: 'tamyeez_filed',
                                            appealPhase: 'cassation',
                                            grievanceRejectedAwaitingTamyeez: false,
                                            grievanceAcceptedAwaitingDebtorTamyeez: false,
                                            awaitingCassationEntryBy: null,
                                        },
                                        labels.timelineTitle,
                                        labels.timelineDescription,
                                        'amber'
                                    )
                                }
                                className={
                                    appealPerspective === 'debtor_agent'
                                        ? lawyerBtnClass
                                        : DECISION_BTN_DEBTOR_APPEAL_NOTICE
                                }
                            >
                                {labels.button}
                            </button>
                            );
                        })()}
                    {awaitingParty === 'lawyer' &&
                        cassationWindowOpen &&
                        (() => {
                            const labels = appealCassationEntryLabels(appealPerspective, 'lawyer');
                            return (
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        transitionAppealWorkflow(
                                            decision,
                                            {
                                                noAppealChosen: false,
                                                appealActor: 'lawyer',
                                                appealMethod: 'tamyeez',
                                                appealWorkflowState: 'PENDING_APPEAL_LAWYER',
                                                appealStatus: 'tamyeez_filed',
                                                appealPhase: 'cassation',
                                                grievanceRejectedAwaitingTamyeez: false,
                                                grievanceAcceptedAwaitingDebtorTamyeez: false,
                                                awaitingCassationEntryBy: null,
                                            },
                                            labels.timelineTitle,
                                            labels.timelineDescription,
                                            'amber'
                                        )
                                    }
                                    className={
                                        appealPerspective === 'debtor_agent'
                                            ? DECISION_BTN_DEBTOR_APPEAL_NOTICE
                                            : lawyerBtnClass
                                    }
                                >
                                    {appealPerspective === 'debtor_agent'
                                        ? appealInitialGrievanceEntryButtonLabel(
                                              appealPerspective,
                                              'lawyer'
                                          )
                                        : labels.button}
                                </button>
                                {appealPerspective !== 'debtor_agent' &&
                                canWaiveLawyerAwaitingCassation(decision, decisions) ? (
                                    <button
                                        type="button"
                                        onClick={() => applyWaiveCassationAfterDebtorGrievance(decision)}
                                        className={DECISION_BTN_SECONDARY_WFULL}
                                    >
                                        لا حاجة للتمييز
                                    </button>
                                ) : null}
                            </div>
                            );
                        })()}
                </>
            );
        };

    return { renderAppealAwaitingCassationButtons };
}
