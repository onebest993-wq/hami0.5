import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import {
    TrialDepositionModal,
    StageFinalDecisionModal,
    StageCloserModal,
} from './criminalDashboardLazyModals';

export type CriminalDashboardModalsHostTrialProps = Pick<
    CriminalDashboardModalsHostProps,
    | 'id'
    | 'defendants'
    | 'complainants'
    | 'showLegalToast'
    | 'caseSovereignContext'
    | 'isStageFinalDecisionOpen'
    | 'setIsStageFinalDecisionOpen'
    | 'trialFinalDecisionSessionIdRef'
    | 'stageFinalDecisionError'
    | 'setStageFinalDecisionError'
    | 'inferredStageFinalPresence'
    | 'submitStageFinalDecision'
    | 'isStageCloserOpen'
    | 'stageCloserOrchestrator'
    | 'caseStage'
    | 'isCassationStage'
    | 'isInvestigationPhase'
    | 'isJuvenileTrial'
    | 'isTrialCourtStage'
    | 'isPrivateRightWaived'
    | 'juvenileAccused'
    | 'firstJuvenileDefendant'
    | 'firstJuvenileSocialWorkflow'
    | 'patchSocialInquiryReport'
    | 'submitStageCloser'
    | 'activeTab'
    | 'isEffectiveTrialCourtStage'
    | 'isTrialDepositionModalOpen'
    | 'setIsTrialDepositionModalOpen'
    | 'editingTrialDeposition'
    | 'setEditingTrialDeposition'
    | 'sortedTrialSessionsForDepositions'
    | 'addTrialDeposition'
    | 'updateTrialDeposition'
>;

/** مودالات المحاكمة: القرار الختامي السيادي، الغلق الختامي، محاضر المرافعة. */
export function CriminalDashboardModalsHostTrial({
    id,
    defendants,
    complainants,
    showLegalToast,
    caseSovereignContext,
    isStageFinalDecisionOpen,
    setIsStageFinalDecisionOpen,
    trialFinalDecisionSessionIdRef,
    stageFinalDecisionError,
    setStageFinalDecisionError,
    inferredStageFinalPresence,
    submitStageFinalDecision,
    isStageCloserOpen,
    stageCloserOrchestrator,
    caseStage,
    isCassationStage,
    isInvestigationPhase,
    isJuvenileTrial,
    isTrialCourtStage,
    isPrivateRightWaived,
    juvenileAccused,
    firstJuvenileDefendant,
    firstJuvenileSocialWorkflow,
    patchSocialInquiryReport,
    submitStageCloser,
    activeTab,
    isEffectiveTrialCourtStage,
    isTrialDepositionModalOpen,
    setIsTrialDepositionModalOpen,
    editingTrialDeposition,
    setEditingTrialDeposition,
    sortedTrialSessionsForDepositions,
    addTrialDeposition,
    updateTrialDeposition,
}: CriminalDashboardModalsHostTrialProps) {
    return (
        <>
            {caseSovereignContext ? (
                <StageFinalDecisionModal
                    open={isStageFinalDecisionOpen}
                    onClose={() => {
                        trialFinalDecisionSessionIdRef.current = null;
                        setIsStageFinalDecisionOpen(false);
                        setStageFinalDecisionError('');
                    }}
                    error={stageFinalDecisionError}
                    defendants={defendants}
                    caseContext={caseSovereignContext}
                    inferredPresenceType={inferredStageFinalPresence}
                    onSubmit={submitStageFinalDecision}
                />
            ) : null}

            {isStageCloserOpen ? (
                <StageCloserModal
                    closer={stageCloserOrchestrator}
                    defendants={defendants}
                    caseStage={caseStage}
                    isCassationStage={isCassationStage}
                    isInvestigationPhase={isInvestigationPhase}
                    isJuvenileTrial={isJuvenileTrial}
                    isTrialCourtStage={isTrialCourtStage}
                    isPrivateRightWaived={isPrivateRightWaived}
                    juvenileAccused={juvenileAccused}
                    firstJuvenileDefendant={firstJuvenileDefendant}
                    firstJuvenileSocialWorkflow={firstJuvenileSocialWorkflow}
                    patchSocialInquiryReport={patchSocialInquiryReport}
                    onSubmit={submitStageCloser}
                />
            ) : null}

            <TrialDepositionModal
                isOpen={activeTab === 'statements' && isEffectiveTrialCourtStage && isTrialDepositionModalOpen}
                initialDeposition={editingTrialDeposition}
                sessions={sortedTrialSessionsForDepositions}
                complainants={complainants}
                defendants={defendants}
                onClose={() => {
                    setEditingTrialDeposition(null);
                    setIsTrialDepositionModalOpen(false);
                }}
                onCreate={(payload) => {
                    const err = addTrialDeposition(id, payload);
                    if (err) {
                        showLegalToast(err, 4500);
                    }
                }}
                onUpdate={(depositionId, patch) => {
                    const err = updateTrialDeposition(id, depositionId, patch);
                    if (err) {
                        showLegalToast(err, 4500);
                    }
                }}
                onError={(msg) => {
                    showLegalToast(msg, 4500);
                }}
            />
        </>
    );
}
