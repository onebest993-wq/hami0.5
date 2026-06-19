import { DECISION_BTN_DEBTOR_APPEAL_NOTICE } from '../decisionCardPresentation';
import { appealDebtorGrievanceNoticeLabel, type AppealUiPerspective } from '../appealUiLabels';
import type { AppealWorkflowCardProps } from './appealWorkflowCardTypes';
import type { useAppealWorkflowCardDerivedState } from './useAppealWorkflowCardDerivedState';
import { AppealProceedingsToggle } from './AppealProceedingsToggle';

type Derived = ReturnType<typeof useAppealWorkflowCardDerivedState>;

type AppealWorkflowCardDetailsSectionProps = {
    appealPerspective?: AppealUiPerspective;
    derived: Derived;
    showDetails: boolean;
    onToggleDetails: () => void;
};

export function AppealWorkflowCardDetailsSection({
    appealPerspective,
    derived,
    showDetails,
    onToggleDetails,
}: AppealWorkflowCardDetailsSectionProps) {
    const {
        showDetailsSection,
        showAppealDetailsToggle,
        pipelineRow,
        showDebtorGrievanceNotice,
        appealWindowClosed,
        isFinalLocked,
        showExecutorPendingFooter,
    } = derived;

    if (!showDetailsSection) return null;

    return (
        <div className="mt-1 border-t border-white/5 pt-2 space-y-1">
            {showAppealDetailsToggle ? (
                <AppealProceedingsToggle
                    pipelineRow={pipelineRow}
                    appealPerspective={appealPerspective}
                    showDetails={showDetails}
                    onToggle={onToggleDetails}
                />
            ) : null}
            {showDebtorGrievanceNotice ? (
                <span className={`${DECISION_BTN_DEBTOR_APPEAL_NOTICE} pointer-events-none`}>
                    {appealDebtorGrievanceNoticeLabel(appealPerspective)}
                </span>
            ) : null}
            {appealWindowClosed && !isFinalLocked ? (
                <p className="text-[10px] leading-relaxed text-slate-300">
                    انتهت مهلة الطعن وأصبح القرار باتاً.
                </p>
            ) : null}
            {showExecutorPendingFooter ? (
                <p className="text-[10px] leading-relaxed text-blue-400/80">قيد المعالجة</p>
            ) : null}
        </div>
    );
}

type AppealWorkflowCardActionsPanelProps = AppealWorkflowCardProps & {
    derived: Derived;
};

export function AppealWorkflowCardActionsPanel({
    decision,
    derived,
    renderAppealDeadlineLapseActions,
    renderAppealEntryButtons,
    renderAppealGrievanceDecideButtons,
    renderAppealTamyeezPhasePanel,
    renderAppealAwaitingCassationButtons,
    transitionAppealWorkflow,
}: AppealWorkflowCardActionsPanelProps) {
    const {
        canShowInitialAppealActions,
        windows,
        cassTips,
        pipelineRow,
        appealWindowClosed,
    } = derived;

    return (
        <div className="mt-2 flex min-w-0 flex-col gap-1.5 text-right">
            {renderAppealDeadlineLapseActions(decision)}
            {canShowInitialAppealActions ? renderAppealEntryButtons(decision, windows) : null}
            {(decision.appealStatus === 'tadhallum_filed' || decision.appealPhase === 'grievance') &&
            !String(decision.appealResult ?? '').trim() &&
            !windows.isPastGrievanceDeadline
                ? renderAppealGrievanceDecideButtons(decision, 'appealsTab', windows)
                : null}
            {decision.appealStatus === 'tamyeez_filed' &&
            decision.appealMethod === 'tamyeez'
                ? renderAppealTamyeezPhasePanel(decision, 'appealsTab', cassTips, (v) =>
                      transitionAppealWorkflow(
                          decision,
                          { tamyeezDecisionNumber: v },
                          'حفظ رقم القرار التمييزي',
                          `تم حفظ رقم القرار التمييزي: ${v}`,
                          'amber',
                      ),
                  )
                : null}
            {renderAppealAwaitingCassationButtons(
                pipelineRow,
                'appealsTab',
                appealWindowClosed,
                true,
            )}
        </div>
    );
}
