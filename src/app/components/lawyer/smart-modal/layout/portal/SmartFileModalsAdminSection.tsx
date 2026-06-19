import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import {
    LazyExtraordinaryAppealModal,
    LazyMaterialErrorCorrectionModal,
    LazyJudgeRecusalModal,
    LazyTransferJurisdictionModal,
    LazyCaseConsolidationModal,
    LazyCaseLinkModal,
    LazyCorrespondenceModal,
    LazyAppealBriefOutcomeModal,
} from '../../lazySmartFileModalChunks';

export function SmartFileModalsAdminSection(props: SmartFileModalsPortalProps) {
    const {
        showExtraordinaryAppealModal,
        setShowExtraordinaryAppealModal,
        showMaterialErrorModal,
        setShowMaterialErrorModal,
        showJudgeRecusalModal,
        setShowJudgeRecusalModal,
        showTransferJurisdictionModal,
        setShowTransferJurisdictionModal,
        showCaseConsolidationModal,
        setShowCaseConsolidationModal,
        showCaseLinkModal,
        setShowCaseLinkModal,
        showCorrespondenceModal,
        setShowCorrespondenceModal,
        appealOutcomeTask,
        setAppealOutcomeTask,
        currentStage,
        consolidationCurrentFileId,
        consolidationCurrentCaseNo,
        consolidationCurrentClientName,
        consolidationCurrentCourt,
        consolidationCurrentStageLabel,
        consolidationCandidates,
        onConsolidationCreateNew,
        onConsolidationMergeExisting,
        onConsolidationExternalRef,
        caseLinkCurrentFileId,
        caseLinkCurrentCaseNo,
        caseLinkCandidates,
        onCaseLinkExisting,
        onCaseLinkExternal,
        handlers: h,
    } = props;

    return (
        <>
                {!!showExtraordinaryAppealModal && (
                    <LazyExtraordinaryAppealModal
                        key="extra-appeal"
                        isOpen
                        onClose={() => setShowExtraordinaryAppealModal(false)}
                        onConfirm={h.handleExtraordinaryAppeal}
                        type={
                            typeof showExtraordinaryAppealModal === 'string'
                                ? showExtraordinaryAppealModal
                                : ''
                        }
                        currentCourt={currentStage.court}
                    />
                )}
                {showMaterialErrorModal && (
                    <LazyMaterialErrorCorrectionModal
                        key="material-error"
                        isOpen={!!showMaterialErrorModal}
                        onClose={() => setShowMaterialErrorModal(null)}
                        onConfirm={h.handleMaterialErrorCorrection}
                        correctionType={showMaterialErrorModal}
                    />
                )}
                {showJudgeRecusalModal && (
                    <LazyJudgeRecusalModal
                        key="judge-recusal"
                        isOpen={showJudgeRecusalModal}
                        onClose={() => setShowJudgeRecusalModal(false)}
                        onConfirm={h.handleJudgeRecusal}
                    />
                )}
                {showTransferJurisdictionModal && (
                    <LazyTransferJurisdictionModal
                        key="transfer-jurisdiction"
                        isOpen={showTransferJurisdictionModal}
                        onClose={() => setShowTransferJurisdictionModal(false)}
                        onConfirm={h.handleTransferJurisdiction}
                    />
                )}
                {showCaseConsolidationModal && (
                    <LazyCaseConsolidationModal
                        key="case-consolidation"
                        isOpen={showCaseConsolidationModal}
                        onClose={() => setShowCaseConsolidationModal(false)}
                        currentFileId={consolidationCurrentFileId}
                        currentCaseNo={consolidationCurrentCaseNo}
                        currentClientName={consolidationCurrentClientName}
                        currentCourt={consolidationCurrentCourt}
                        currentStageLabel={consolidationCurrentStageLabel}
                        candidates={consolidationCandidates}
                        onCreateNew={(data) => onConsolidationCreateNew?.(data)}
                        onMergeExisting={(data) => onConsolidationMergeExisting?.(data)}
                        onExternalRef={(data) => onConsolidationExternalRef?.(data)}
                    />
                )}
                {showCaseLinkModal && (
                    <LazyCaseLinkModal
                        key="case-link"
                        isOpen={showCaseLinkModal}
                        onClose={() => setShowCaseLinkModal(false)}
                        currentFileId={caseLinkCurrentFileId}
                        currentCaseNo={caseLinkCurrentCaseNo}
                        candidates={caseLinkCandidates}
                        onLinkExisting={(data) => onCaseLinkExisting?.(data)}
                        onLinkExternal={(data) => onCaseLinkExternal?.(data)}
                    />
                )}
                {showCorrespondenceModal && (
                    <LazyCorrespondenceModal
                        key="correspondence"
                        isOpen={showCorrespondenceModal}
                        onClose={() => setShowCorrespondenceModal(false)}
                        onConfirm={h.handleCorrespondence}
                    />
                )}
                {appealOutcomeTask ? (
                    <LazyAppealBriefOutcomeModal
                        key="appeal-brief-outcome"
                        isOpen={Boolean(appealOutcomeTask)}
                        taskTitle={appealOutcomeTask.title}
                        onClose={() => setAppealOutcomeTask(null)}
                        onConfirm={(outcome) =>
                            h.handleAppealBriefOutcome(appealOutcomeTask.id, outcome)
                        }
                    />
                ) : null}
        </>
    );
}
