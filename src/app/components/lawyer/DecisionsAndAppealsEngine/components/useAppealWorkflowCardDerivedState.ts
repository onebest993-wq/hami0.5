import type { AppealUiPerspective } from '../appealUiLabels';
import type { Decision } from '../types';
import {
    appealWindowsForDecision,
    cassationButtonTitles,
    cleanTitle,
    deriveDecisionHubStatus,
    appealPipelineRowForCard,
    buildAppealProceedingsForDecision,
    resolveCreditorRequestAppealGate,
    resolveCreditorDecisionEnforcementState,
    isExecutorDecisionAppealFinal,
    resolveDebtorAgentRequestFateLine,
    shouldHideDebtorAgentFateLine,
    isCreditorInitiatedExecutorRequest,
    resolveAppealWorkflowPhaseLabel,
    resolveRequestFilerFromDebtorAgentView,
    resolveUnderlyingDecisionHub,
    formatDateNumeric,
} from '../utils';
import type { AppealWorkflowCardProps } from './appealWorkflowCardTypes';
import { decisionHasAppealActivity } from './decisionCardDerived/decisionAppealActivity';

type UseAppealWorkflowCardDerivedStateArgs = Pick<
    AppealWorkflowCardProps,
    | 'decision'
    | 'decisions'
    | 'appealPerspective'
    | 'requestNeedsExecutorOutcome'
    | 'buildDecisionCardStatus'
    | 'canShowAppealInitialForDecision'
>;

export function useAppealWorkflowCardDerivedState({
    decision,
    decisions,
    appealPerspective = 'creditor_agent',
    requestNeedsExecutorOutcome,
    buildDecisionCardStatus,
    canShowAppealInitialForDecision,
}: UseAppealWorkflowCardDerivedStateArgs) {
    const state = decision.appealWorkflowState ?? 'NONE';
    const windows = appealWindowsForDecision(decision);
    const appealWindowClosed = !windows.canTamyeez;
    const hasAppealActivity = decisionHasAppealActivity(decision);
    const isFinalLocked =
        state === 'FINAL_ACCEPTED' ||
        state === 'FINAL_REJECTED' ||
        state === 'REVOKED_BY_APPEAL' ||
        Boolean(decision.appealResult) ||
        decision.appealStatus === 'final';
    const canShowInitialAppealActions =
        !decision.appealSourceDecisionId &&
        state === 'NONE' &&
        !hasAppealActivity &&
        !isFinalLocked &&
        !appealWindowClosed &&
        canShowAppealInitialForDecision(decision);
    const cassTips = cassationButtonTitles(decision, appealPerspective);
    const underlyingHub = resolveUnderlyingDecisionHub(decision, decisions);
    const showDebtorGrievanceNotice =
        !windows.isPastGrievanceDeadline &&
        decision.appealActor === 'debtor' &&
        decision.appealMethod === 'tadhallum' &&
        decision.appealStatus === 'tadhallum_filed' &&
        (state === 'PENDING_APPEAL_LAWYER' || state === 'PENDING_APPEAL_DEBTOR') &&
        (appealPerspective !== 'debtor_agent' ||
            !isCreditorInitiatedExecutorRequest(underlyingHub));
    const titleClean = cleanTitle(decision.title);
    const hubStatus = deriveDecisionHubStatus(decision, requestNeedsExecutorOutcome);
    const showExecutorPendingFooter = hubStatus === 'pending';
    const { statusPillEl } = buildDecisionCardStatus(decision, appealWindowClosed, decisions);
    const pipelineRow = appealPipelineRowForCard(decision, decisions);
    const appealProceedings = buildAppealProceedingsForDecision(pipelineRow, appealPerspective);
    const requestAppealGate = resolveCreditorRequestAppealGate(
        decision,
        pipelineRow,
        appealPerspective,
    );
    const settled = !requestNeedsExecutorOutcome(decision);
    const phaseLabel = resolveAppealWorkflowPhaseLabel(pipelineRow, appealPerspective);
    const hubTitleClean = cleanTitle(underlyingHub.title);
    const isAppealCopy = Boolean(decision.appealSourceDecisionId);
    const showHubLink = isAppealCopy && underlyingHub.id !== decision.id && hubTitleClean;
    const appealLegallyFinal = isExecutorDecisionAppealFinal(decision, pipelineRow, {
        appealWindowClosed,
        appealTrackActive: hasAppealActivity && !appealWindowClosed,
    });
    const enforcementState = resolveCreditorDecisionEnforcementState(decision, pipelineRow, {
        hubTab: 'appeals',
        appealLegallyFinal,
        needsExecutor: requestNeedsExecutorOutcome(decision),
        appealPerspective,
        allDecisions: decisions,
    });
    const dateStr = formatDateNumeric(decision.date);
    const hideDebtorFateLine = shouldHideDebtorAgentFateLine(
        enforcementState.pillLabel,
        requestAppealGate,
    );
    const showAppealDetailsToggle = appealProceedings.length > 0;
    const requestFiler =
        appealPerspective === 'debtor_agent'
            ? resolveRequestFilerFromDebtorAgentView(underlyingHub)
            : undefined;
    const debtorFateLine =
        appealPerspective === 'debtor_agent' && settled && !hideDebtorFateLine
            ? resolveDebtorAgentRequestFateLine(enforcementState, requestAppealGate)
            : null;
    const showDetailsSection =
        showDebtorGrievanceNotice ||
        appealProceedings.length > 0 ||
        (appealWindowClosed && !isFinalLocked) ||
        showExecutorPendingFooter;

    return {
        state,
        windows,
        appealWindowClosed,
        isFinalLocked,
        canShowInitialAppealActions,
        cassTips,
        underlyingHub,
        showDebtorGrievanceNotice,
        titleClean,
        showExecutorPendingFooter,
        statusPillEl,
        pipelineRow,
        appealProceedings,
        requestAppealGate,
        settled,
        phaseLabel,
        hubTitleClean,
        isAppealCopy,
        showHubLink,
        enforcementState,
        dateStr,
        hideDebtorFateLine,
        showAppealDetailsToggle,
        requestFiler,
        debtorFateLine,
        showDetailsSection,
        appealPerspective,
    };
}
