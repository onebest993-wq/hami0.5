import React from 'react';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';
import {
    ConcernedPartyDecisionPicker,
    RequestModalEntryLanes,
} from '../criminalDashboardLazyRequestUi';
import { ProceduralBacklinks } from './ProceduralBacklinks';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';
import type { CriminalRequestsOrchestratorSlice } from '../orchestrators/criminalOrchestratorSliceTypes';
import type { LawyerRequest } from '../criminalStore';
import { RequestsEntryModalBody } from './RequestsEntryModalBody';
import { RequestsEntryModalFooter } from './RequestsEntryModalFooter';
import { RequestsEntryModalHeader } from './RequestsEntryModalHeader';

type EntryLanesProps = React.ComponentProps<typeof RequestModalEntryLanes>;
type PartyPickerProps = React.ComponentProps<typeof ConcernedPartyDecisionPicker>;
type ScopePickerProps = React.ComponentProps<typeof DefendantDecisionScopePicker>;
type BacklinksProps = React.ComponentProps<typeof ProceduralBacklinks>;

export type RequestsEntryModalProps = {
    caseId: string;
    /** حالة المودال بالكامل — من useCriminalRequestsOrchestrator */
    requests: CriminalRequestsOrchestratorSlice;

    // مشتقات جاهزة من الـ runtime (صلاحية النموذج، أنواع الإدخال، الأقسام الظاهرة)
    isRequestModalViewOnly: boolean;
    isEffectiveTrialCourtStage: boolean;
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: EntryLanesProps['defendantsPartyMix'];
    mixedInvestigationScopedDefendantNames: EntryLanesProps['mixedInvestigationScopedDefendantNames'];
    reqJuvenileDetentionLocked: boolean;
    isAllDefendantsUnknown: boolean;
    reqNeedsDetentionDateRange: boolean;
    reqIsOrderEnforcementEntry: boolean;
    isRequestFinalStatus: boolean;
    reqDecisionBeforeRequest: boolean;
    reqIsJudicialDecisionEntry: boolean;
    reqIsLawyerMotionEntry: boolean;
    reqIsDefendantBailEntry: boolean;
    reqIsComplaintReferralEntry: boolean;
    isCustomJudicialEntry: boolean;
    requestFormBaseValid: boolean;
    requestFormFinalValid: boolean;
    showPurgeDefendantPicker: boolean;
    showRequestPartySection: boolean;
    showPartyPickerFormUi: boolean;
    showJuvenileJudgeConcernedPartyPicker: boolean;
    showUnknownPartyNoticeInRequestModal: boolean;
    showJuvenileArrestLegalHint: boolean;
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;

    // بيانات الأطراف والقوائم
    defendants: ScopePickerProps['defendants'];
    allParties: PartyPickerProps['parties'];
    requestEligibleParties: PartyPickerProps['parties'];
    fugitiveDefendants: EntryLanesProps['assetSeizureFugitives'];
    customJudicialConcernedPartyOptions: Array<{ id: string; label: string }>;
    customJudicialConcernedPartyId: string;
    autoRequestPartyLabel: string;
    autoConcernedPartyLabel: string;
    unknownDefendantsForPartyDisplay: Array<{ id: string; fullName?: string }>;
    modalLinkedRequest: LawyerRequest | null;
    activeRequestProceduralReferences: BacklinksProps['references'];

    // أفعال يديرها الـ runtime (متجر + تنقّل)
    onClose: () => void;
    onSubmit: () => void;
    onApplyJudicialTemplate: EntryLanesProps['onApplyJudicialTemplate'];
    onApplyLawyerTemplate: EntryLanesProps['onApplyLawyerTemplate'];
    onClearEntryLane: EntryLanesProps['onClearEntryLane'];
    onAssetSeizureDraftsChange: NonNullable<EntryLanesProps['onAssetSeizureDraftsChange']>;
    patchReqBailForParty: NonNullable<PartyPickerProps['onBailChange']>;
    patchReqDetentionForParty: NonNullable<PartyPickerProps['onDetentionChange']>;
    handleReqBailUnifiedChange: (unified: boolean) => void;
    handleReqDetentionUnifiedChange: (unified: boolean) => void;
    navigateToProceduralItem: BacklinksProps['onNavigate'];
    toggleRequestStar: (caseId: string, requestId: string) => void;
    addRequestAttachment: (caseId: string, requestId: string, name: string) => void;
    removeRequestAttachment: (caseId: string, requestId: string, attachmentId: string) => void;
};

/**
 * مودال تسجيل/عرض طلبات المحامي وقرارات القاضي
 * — مستخرَج من CriminalDashboardResolvedRuntime ضمن تفكيك المكوّن العملاق.
 * الحالة تعيش في useCriminalRequestsOrchestrator وتُمرَّر كاملة عبر `requests`.
 */
export function RequestsEntryModal(props: RequestsEntryModalProps) {
    const {
        caseId,
        requests,
        isRequestModalViewOnly,
        isEffectiveTrialCourtStage,
        isInvestigationPhase,
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
        isTimelineArchiveReadOnly,
        isDashboardReadOnly,
        defendants,
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
        onClose,
        onSubmit,
        onApplyJudicialTemplate,
        onApplyLawyerTemplate,
        onClearEntryLane,
        onAssetSeizureDraftsChange,
        patchReqBailForParty,
        patchReqDetentionForParty,
        handleReqBailUnifiedChange,
        handleReqDetentionUnifiedChange,
        navigateToProceduralItem,
        toggleRequestStar,
        addRequestAttachment,
        removeRequestAttachment,
    } = props;

    const {
        requestModalLane,
        editingRequestId,
        reqIsStarred,
        setReqIsStarred,
    } = requests;

    return (
        <div
            className="fixed inset-0 z-[250] bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            data-testid={CRIMINAL_DOSSIER_TEST_IDS.requestsModal}
            data-request-lane={requestModalLane}
        >
            <div className="w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                <RequestsEntryModalHeader
                    requestModalLane={requestModalLane}
                    isRequestModalViewOnly={isRequestModalViewOnly}
                    modalLinkedRequest={modalLinkedRequest}
                    editingRequestId={editingRequestId}
                    reqIsStarred={reqIsStarred}
                    setReqIsStarred={setReqIsStarred}
                    isTimelineArchiveReadOnly={isTimelineArchiveReadOnly}
                    isDashboardReadOnly={isDashboardReadOnly}
                    caseId={caseId}
                    onClose={onClose}
                    toggleRequestStar={toggleRequestStar}
                />

                <div className="p-4 space-y-3">
                    <RequestsEntryModalBody
                        caseId={caseId}
                        requests={requests}
                        isRequestModalViewOnly={isRequestModalViewOnly}
                        isEffectiveTrialCourtStage={isEffectiveTrialCourtStage}
                        isInvestigationPhase={isInvestigationPhase}
                        investigationDefendantsPartyMix={investigationDefendantsPartyMix}
                        mixedInvestigationScopedDefendantNames={
                            mixedInvestigationScopedDefendantNames
                        }
                        reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                        isAllDefendantsUnknown={isAllDefendantsUnknown}
                        reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                        reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                        isRequestFinalStatus={isRequestFinalStatus}
                        reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                        reqIsJudicialDecisionEntry={reqIsJudicialDecisionEntry}
                        reqIsDefendantBailEntry={reqIsDefendantBailEntry}
                        reqIsComplaintReferralEntry={reqIsComplaintReferralEntry}
                        isCustomJudicialEntry={isCustomJudicialEntry}
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
                        onApplyJudicialTemplate={onApplyJudicialTemplate}
                        onApplyLawyerTemplate={onApplyLawyerTemplate}
                        onClearEntryLane={onClearEntryLane}
                        onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                        patchReqBailForParty={patchReqBailForParty}
                        patchReqDetentionForParty={patchReqDetentionForParty}
                        handleReqBailUnifiedChange={handleReqBailUnifiedChange}
                        handleReqDetentionUnifiedChange={handleReqDetentionUnifiedChange}
                        navigateToProceduralItem={navigateToProceduralItem}
                        addRequestAttachment={addRequestAttachment}
                        removeRequestAttachment={removeRequestAttachment}
                    />
                    <RequestsEntryModalFooter
                        isRequestModalViewOnly={isRequestModalViewOnly}
                        reqIsJudicialDecisionEntry={reqIsJudicialDecisionEntry}
                        reqIsLawyerMotionEntry={reqIsLawyerMotionEntry}
                        isRequestFinalStatus={isRequestFinalStatus}
                        requestFormBaseValid={requestFormBaseValid}
                        requestFormFinalValid={requestFormFinalValid}
                        onClose={onClose}
                        onSubmit={onSubmit}
                    />
                </div>
            </div>
        </div>
    );
}
