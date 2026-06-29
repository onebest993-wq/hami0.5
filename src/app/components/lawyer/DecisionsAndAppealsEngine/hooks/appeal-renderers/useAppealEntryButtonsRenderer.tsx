import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import DecisionHintTooltip from '../../components/DecisionHintTooltip';
import { ExecutorSideAppealEntryPanel } from '../../components/ExecutorSideAppealEntryPanel';
import { canWaiveInitialAppeal } from '@/app/utils/waiveInitialAppeal';
import {
    creditorAgentDebtorIsSoleAppellant,
    decisionAppealClockYmd,
    isSettledExecutorQueueRequest,
    resolveHarmedPartyAppealActor,
    resolveUnderlyingDecisionHub,
    type AppealDeadlineWindows,
} from '../../utils';
import {
    appealCreditorAgentDebtorHarmedNotice,
    appealInitialCassationEntryButtonLabel,
    appealInitialCassationTimeline,
    appealInitialGrievanceEntryButtonLabel,
    appealInitialGrievanceTimeline,
} from '../../appealUiLabels';
import {
    DECISION_APPEAL_TOOLBAR_BTN_PRIMARY,
    DECISION_APPEAL_TOOLBAR_BTN_SECONDARY,
    DECISION_APPEAL_TOOLBAR_ROW,
} from '../../decisionCardPresentation';
import {
    APPEAL_ORIGINAL_LOCKED_HINT,
    DECISION_BTN_APPEAL_CHALLENGE,
    DECISION_BTN_PRIMARY_WFULL,
    DECISION_BTN_SECONDARY_WFULL,
} from './appealRendererButtonClasses';

export function useAppealEntryButtonsRenderer(args: UseDecisionsAppealsAppealRenderersArgs) {
    const {
        appealPerspective,
        decisions,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        commitQueueRequestAppealEntry,
        applyWaiveInitialAppeal,
    } = args;

    const renderAppealEntryButtons = (
        decision: Decision,
        windows: AppealDeadlineWindows,
        opts?: { pathLockedOnOriginal?: boolean; lockedBecauseActiveCopy?: boolean }
    ) => {
        const pathLocked = Boolean(opts?.pathLockedOnOriginal);
        const locked = Boolean(opts?.lockedBecauseActiveCopy);

        const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
        if (
            decision.manualExecutorLedgerEntry === true ||
            appealHub.manualExecutorLedgerEntry === true
        ) {
            return null;
        }

        const decisionAppealYmd = decisionAppealClockYmd(decision);

        if (decision.appealRequestOrigin === 'executor_side') {
            const grievanceOpen =
                (decision.appealStatus === 'tadhallum_filed' ||
                    decision.appealPhase === 'grievance') &&
                !String(decision.appealResult ?? '').trim();
            if (grievanceOpen) {
                return null;
            }
            const showWaiveExecutorAppeal = canWaiveInitialAppeal(
                decision,
                decisions,
                appealPerspective
            );
            const debtorOnly = creditorAgentDebtorIsSoleAppellant(decision, appealPerspective);
            return (
                <ExecutorSideAppealEntryPanel
                    windows={windows}
                    locked={locked}
                    debtorOnly={debtorOnly}
                    cassationOnly={decision.cassationOnlyAppeal === true}
                    appealPerspective={appealPerspective}
                    challengeBtnClass={DECISION_BTN_APPEAL_CHALLENGE}
                    primaryBtnClass={DECISION_BTN_PRIMARY_WFULL}
                    secondaryBtnClass={DECISION_BTN_SECONDARY_WFULL}
                    showWaive={showWaiveExecutorAppeal}
                    onWaive={() => applyWaiveInitialAppeal(decision)}
                    onCommit={(stage, appellants) =>
                        commitExecutorSideAppealEntry(decision, stage, appellants)
                    }
                    decisionAppealYmd={decisionAppealYmd}
                />
            );
        }

        if (isSettledExecutorQueueRequest(appealHub)) {
            const queueActor = resolveHarmedPartyAppealActor(decision, appealPerspective);
            if (!queueActor) return null;

            const debtorOnly = queueActor === 'debtor';
            const showWaiveInitialAppeal = canWaiveInitialAppeal(
                decision,
                decisions,
                appealPerspective
            );
            const panel = (
                <div className="flex w-full min-w-0 flex-col gap-2">
                    {debtorOnly && appealPerspective === 'creditor_agent' ? (
                        <p className="text-[10px] leading-relaxed text-slate-400 text-right">
                            {appealCreditorAgentDebtorHarmedNotice()}
                        </p>
                    ) : null}
                    <ExecutorSideAppealEntryPanel
                        windows={windows}
                        locked={locked}
                        debtorOnly={debtorOnly}
                        cassationOnly={decision.cassationOnlyAppeal === true}
                        appealPerspective={appealPerspective}
                        challengeBtnClass={DECISION_BTN_APPEAL_CHALLENGE}
                        primaryBtnClass={DECISION_BTN_PRIMARY_WFULL}
                        secondaryBtnClass={DECISION_BTN_SECONDARY_WFULL}
                        showWaive={showWaiveInitialAppeal}
                        onWaive={() => applyWaiveInitialAppeal(decision)}
                        presetAppellant={queueActor}
                        decisionAppealYmd={decisionAppealYmd}
                        onCommit={(stage) => commitQueueRequestAppealEntry(decision, stage)}
                    />
                </div>
            );
            return pathLocked ? (
                <DecisionHintTooltip label={APPEAL_ORIGINAL_LOCKED_HINT}>{panel}</DecisionHintTooltip>
            ) : (
                panel
            );
        }

        const actor = resolveHarmedPartyAppealActor(decision, appealPerspective);
        if (!actor) return null;

        const cassationOnly = decision.cassationOnlyAppeal === true;
        const showWaiveInitialAppeal = canWaiveInitialAppeal(
            decision,
            decisions,
            appealPerspective
        );
        const panel = (
            <div className={DECISION_APPEAL_TOOLBAR_ROW}>
                {!cassationOnly ? (
                    <button
                        type="button"
                        disabled={!windows.canTadhallum || pathLocked || locked}
                        onClick={() =>
                            transitionAppealWorkflow(
                                decision,
                                {
                                    noAppealChosen: false,
                                    appealActor: actor,
                                    appealMethod: 'tadhallum',
                                    appealWorkflowState:
                                        actor === 'debtor'
                                            ? 'PENDING_APPEAL_DEBTOR'
                                            : 'PENDING_APPEAL_LAWYER',
                                    appealStatus: 'tadhallum_filed',
                                    appealPhase: 'grievance',
                                },
                                'تسجيل تظلم',
                                appealInitialGrievanceTimeline(appealPerspective, actor),
                                'amber'
                            )
                        }
                        className={DECISION_APPEAL_TOOLBAR_BTN_PRIMARY}
                    >
                        {appealInitialGrievanceEntryButtonLabel(appealPerspective, actor)}
                    </button>
                ) : null}
                <button
                    type="button"
                    disabled={!windows.canTamyeez || pathLocked || locked}
                    onClick={() =>
                        transitionAppealWorkflow(
                            decision,
                            {
                                noAppealChosen: false,
                                appealActor: actor,
                                appealMethod: 'tamyeez',
                                appealWorkflowState:
                                    actor === 'debtor'
                                        ? 'PENDING_APPEAL_DEBTOR'
                                        : 'PENDING_APPEAL_LAWYER',
                                appealStatus: 'tamyeez_filed',
                                appealPhase: 'cassation',
                            },
                            'تسجيل تمييز',
                            appealInitialCassationTimeline(appealPerspective, actor),
                            'amber'
                        )
                    }
                    className={DECISION_APPEAL_TOOLBAR_BTN_PRIMARY}
                >
                    {appealInitialCassationEntryButtonLabel(
                        appealPerspective,
                        actor,
                        cassationOnly
                    )}
                </button>
                {showWaiveInitialAppeal ? (
                    <button
                        type="button"
                        disabled={pathLocked || locked}
                        onClick={() => applyWaiveInitialAppeal(decision)}
                        className={DECISION_APPEAL_TOOLBAR_BTN_SECONDARY}
                    >
                        لا حاجة للطعن
                    </button>
                ) : null}
            </div>
        );
        return pathLocked ? (
            <DecisionHintTooltip label={APPEAL_ORIGINAL_LOCKED_HINT}>{panel}</DecisionHintTooltip>
        ) : (
            panel
        );
    };

    return { renderAppealEntryButtons };
}
