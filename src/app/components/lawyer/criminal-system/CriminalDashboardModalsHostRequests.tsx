import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import {
    ProceduralLinkedTimelineModal,
    RequestsEntryModal,
    BailForfeitureModal,
} from './criminalDashboardLazyModals';
import { RequestQuickFinalizeModal } from './criminalDashboardRequestFlowLazyModals';
import { RequestMarginPromptModal } from './criminalDashboardLazyRequestUi';

export type CriminalDashboardModalsHostRequestsProps = Pick<
    CriminalDashboardModalsHostProps,
    | 'id'
    | 'defendants'
    | 'showLegalError'
    | 'isInvestigationPhase'
    | 'isTimelineArchiveReadOnly'
    | 'isDashboardReadOnly'
    | 'activeTab'
    | 'isEffectiveTrialCourtStage'
    | 'isRequestsModalOpen'
    | 'requestsOrchestrator'
    | 'isRequestModalViewOnly'
    | 'investigationDefendantsPartyMix'
    | 'mixedInvestigationScopedDefendantNames'
    | 'reqJuvenileDetentionLocked'
    | 'isAllDefendantsUnknown'
    | 'reqNeedsDetentionDateRange'
    | 'reqIsOrderEnforcementEntry'
    | 'isRequestFinalStatus'
    | 'reqDecisionBeforeRequest'
    | 'reqIsJudicialDecisionEntry'
    | 'reqIsLawyerMotionEntry'
    | 'reqIsDefendantBailEntry'
    | 'reqIsComplaintReferralEntry'
    | 'isCustomJudicialEntry'
    | 'requestFormBaseValid'
    | 'requestFormFinalValid'
    | 'showPurgeDefendantPicker'
    | 'showRequestPartySection'
    | 'showPartyPickerFormUi'
    | 'showJuvenileJudgeConcernedPartyPicker'
    | 'showUnknownPartyNoticeInRequestModal'
    | 'showJuvenileArrestLegalHint'
    | 'allParties'
    | 'requestEligibleParties'
    | 'fugitiveDefendants'
    | 'customJudicialConcernedPartyOptions'
    | 'customJudicialConcernedPartyId'
    | 'autoRequestPartyLabel'
    | 'autoConcernedPartyLabel'
    | 'unknownDefendantsForPartyDisplay'
    | 'modalLinkedRequest'
    | 'activeRequestProceduralReferences'
    | 'closeRequestsModal'
    | 'submitRequest'
    | 'applyJudicialTemplate'
    | 'applyLawyerTemplate'
    | 'clearRequestEntryLane'
    | 'onAssetSeizureDraftsChange'
    | 'patchReqBailForParty'
    | 'patchReqDetentionForParty'
    | 'handleReqBailUnifiedChange'
    | 'handleReqDetentionUnifiedChange'
    | 'navigateToProceduralItem'
    | 'toggleRequestStar'
    | 'addRequestAttachment'
    | 'removeRequestAttachment'
    | 'requestMarginModalOpen'
    | 'setRequestMarginModalOpen'
    | 'editingRequestId'
    | 'addRequestMargin'
    | 'quickFinalizeRequest'
    | 'quickFinalizeStatus'
    | 'quickFinalizeMargin'
    | 'quickFinalizeDate'
    | 'setQuickFinalizeStatus'
    | 'setQuickFinalizeMargin'
    | 'setQuickFinalizeDate'
    | 'closeQuickFinalizeModal'
    | 'submitQuickFinalize'
    | 'linkedTimelineFromProcedural'
    | 'setLinkedTimelineFromProcedural'
    | 'linkedTimelineProceduralReferences'
    | 'forfeitureModal'
    | 'setForfeitureModal'
    | 'updateBailForfeiture'
>;

/**
 * مودالات الطلبات: إدخال الطلب، الهامش، الإغلاق السريع، التايم لاين الإجرائي، مصادرة الكفالة.
 */
export function CriminalDashboardModalsHostRequests({
    id,
    defendants,
    showLegalError,
    isInvestigationPhase,
    isTimelineArchiveReadOnly,
    isDashboardReadOnly,
    activeTab,
    isEffectiveTrialCourtStage,
    isRequestsModalOpen,
    requestsOrchestrator,
    isRequestModalViewOnly,
    investigationDefendantsPartyMix,
    mixedInvestigationScopedDefendantNames,
    reqJuvenileDetentionLocked,
    isAllDefendantsUnknown,
    reqNeedsDetentionDateRange,
    reqIsOrderEnforcementEntry,
    isRequestFinalStatus,
    reqDecisionBeforeRequest,
    reqIsJudicialDecisionEntry,
    reqIsLawyerMotionEntry,
    reqIsDefendantBailEntry,
    reqIsComplaintReferralEntry,
    isCustomJudicialEntry,
    requestFormBaseValid,
    requestFormFinalValid,
    showPurgeDefendantPicker,
    showRequestPartySection,
    showPartyPickerFormUi,
    showJuvenileJudgeConcernedPartyPicker,
    showUnknownPartyNoticeInRequestModal,
    showJuvenileArrestLegalHint,
    allParties,
    requestEligibleParties,
    fugitiveDefendants,
    customJudicialConcernedPartyOptions,
    customJudicialConcernedPartyId,
    autoRequestPartyLabel,
    autoConcernedPartyLabel,
    unknownDefendantsForPartyDisplay,
    modalLinkedRequest,
    activeRequestProceduralReferences,
    closeRequestsModal,
    submitRequest,
    applyJudicialTemplate,
    applyLawyerTemplate,
    clearRequestEntryLane,
    onAssetSeizureDraftsChange,
    patchReqBailForParty,
    patchReqDetentionForParty,
    handleReqBailUnifiedChange,
    handleReqDetentionUnifiedChange,
    navigateToProceduralItem,
    toggleRequestStar,
    addRequestAttachment,
    removeRequestAttachment,
    requestMarginModalOpen,
    setRequestMarginModalOpen,
    editingRequestId,
    addRequestMargin,
    quickFinalizeRequest,
    quickFinalizeStatus,
    quickFinalizeMargin,
    quickFinalizeDate,
    setQuickFinalizeStatus,
    setQuickFinalizeMargin,
    setQuickFinalizeDate,
    closeQuickFinalizeModal,
    submitQuickFinalize,
    linkedTimelineFromProcedural,
    setLinkedTimelineFromProcedural,
    linkedTimelineProceduralReferences,
    forfeitureModal,
    setForfeitureModal,
    updateBailForfeiture,
}: CriminalDashboardModalsHostRequestsProps) {
    return (
        <>
            {activeTab === 'requests' && isRequestsModalOpen ? (
                <RequestsEntryModal
                    caseId={id}
                    requests={requestsOrchestrator}
                    isRequestModalViewOnly={isRequestModalViewOnly}
                    isEffectiveTrialCourtStage={isEffectiveTrialCourtStage}
                    isInvestigationPhase={isInvestigationPhase}
                    investigationDefendantsPartyMix={investigationDefendantsPartyMix}
                    mixedInvestigationScopedDefendantNames={mixedInvestigationScopedDefendantNames}
                    reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                    isAllDefendantsUnknown={isAllDefendantsUnknown}
                    reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                    reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                    isRequestFinalStatus={isRequestFinalStatus}
                    reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                    reqIsJudicialDecisionEntry={reqIsJudicialDecisionEntry}
                    reqIsLawyerMotionEntry={reqIsLawyerMotionEntry}
                    reqIsDefendantBailEntry={reqIsDefendantBailEntry}
                    reqIsComplaintReferralEntry={reqIsComplaintReferralEntry}
                    isCustomJudicialEntry={isCustomJudicialEntry}
                    requestFormBaseValid={requestFormBaseValid}
                    requestFormFinalValid={requestFormFinalValid}
                    showPurgeDefendantPicker={showPurgeDefendantPicker}
                    showRequestPartySection={showRequestPartySection}
                    showPartyPickerFormUi={showPartyPickerFormUi}
                    showJuvenileJudgeConcernedPartyPicker={showJuvenileJudgeConcernedPartyPicker}
                    showUnknownPartyNoticeInRequestModal={showUnknownPartyNoticeInRequestModal}
                    showJuvenileArrestLegalHint={showJuvenileArrestLegalHint}
                    isTimelineArchiveReadOnly={isTimelineArchiveReadOnly}
                    isDashboardReadOnly={isDashboardReadOnly}
                    defendants={defendants}
                    allParties={allParties}
                    requestEligibleParties={requestEligibleParties}
                    fugitiveDefendants={fugitiveDefendants}
                    customJudicialConcernedPartyOptions={customJudicialConcernedPartyOptions}
                    customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                    autoRequestPartyLabel={autoRequestPartyLabel}
                    autoConcernedPartyLabel={autoConcernedPartyLabel}
                    unknownDefendantsForPartyDisplay={unknownDefendantsForPartyDisplay}
                    modalLinkedRequest={modalLinkedRequest}
                    activeRequestProceduralReferences={activeRequestProceduralReferences}
                    onClose={closeRequestsModal}
                    onSubmit={submitRequest}
                    onApplyJudicialTemplate={applyJudicialTemplate}
                    onApplyLawyerTemplate={applyLawyerTemplate}
                    onClearEntryLane={clearRequestEntryLane}
                    onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                    patchReqBailForParty={patchReqBailForParty}
                    patchReqDetentionForParty={patchReqDetentionForParty}
                    handleReqBailUnifiedChange={handleReqBailUnifiedChange}
                    handleReqDetentionUnifiedChange={handleReqDetentionUnifiedChange}
                    navigateToProceduralItem={navigateToProceduralItem}
                    toggleRequestStar={toggleRequestStar}
                    addRequestAttachment={addRequestAttachment}
                    removeRequestAttachment={removeRequestAttachment}
                />
            ) : null}

            <RequestMarginPromptModal
                open={requestMarginModalOpen}
                onClose={() => setRequestMarginModalOpen(false)}
                onSubmit={(text) => {
                    if (editingRequestId) addRequestMargin(id, editingRequestId, text);
                }}
            />

            <RequestQuickFinalizeModal
                open={Boolean(quickFinalizeRequest)}
                request={quickFinalizeRequest}
                nextStatus={quickFinalizeStatus}
                judgeMargin={quickFinalizeMargin}
                decisionDate={quickFinalizeDate}
                onStatusChange={setQuickFinalizeStatus}
                onJudgeMarginChange={setQuickFinalizeMargin}
                onDecisionDateChange={setQuickFinalizeDate}
                onClose={closeQuickFinalizeModal}
                onSave={submitQuickFinalize}
            />

            <ProceduralLinkedTimelineModal
                open={linkedTimelineFromProcedural !== null}
                event={linkedTimelineFromProcedural}
                proceduralReferences={linkedTimelineProceduralReferences}
                onNavigateToProcedural={navigateToProceduralItem}
                onClose={() => setLinkedTimelineFromProcedural(null)}
            />

            <BailForfeitureModal
                open={Boolean(forfeitureModal)}
                modal={forfeitureModal}
                onChangeNote={(note) =>
                    setForfeitureModal((prev) => (prev ? { ...prev, forfeitureNote: note } : prev))
                }
                onClose={() => setForfeitureModal(null)}
                onSubmit={() => {
                    if (!forfeitureModal) return;
                    const d = defendants.find((x) => String(x.id) === forfeitureModal.defendantId);
                    if (!d) return;
                    try {
                        updateBailForfeiture(id, forfeitureModal.defendantId, {
                            forfeitureNote: forfeitureModal.forfeitureNote,
                        });
                    } catch {
                        showLegalError();
                        return;
                    }
                    setForfeitureModal(null);
                }}
            />
        </>
    );
}
