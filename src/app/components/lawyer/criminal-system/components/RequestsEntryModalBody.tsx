import React from 'react';
import {
    ConcernedPartyDecisionPicker,
    RequestModalEntryLanes,
} from '../criminalDashboardLazyRequestUi';
import { ProceduralBacklinks } from './ProceduralBacklinks';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';
import type { CriminalRequestsOrchestratorSlice } from '../orchestrators/criminalOrchestratorSliceTypes';
import type { LawyerRequest } from '../criminalStore';
import { RequestsEntryModalDetailsSection } from './RequestsEntryModalDetailsSection';
import { RequestsEntryModalIdentitySection } from './RequestsEntryModalIdentitySection';
import { RequestsEntryModalPartySection } from './RequestsEntryModalPartySection';

type EntryLanesProps = React.ComponentProps<typeof RequestModalEntryLanes>;
type PartyPickerProps = React.ComponentProps<typeof ConcernedPartyDecisionPicker>;
type ScopePickerProps = React.ComponentProps<typeof DefendantDecisionScopePicker>;
type BacklinksProps = React.ComponentProps<typeof ProceduralBacklinks>;

export type RequestsEntryModalBodyProps = {
    caseId: string;
    requests: CriminalRequestsOrchestratorSlice;
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
    reqIsDefendantBailEntry: boolean;
    reqIsComplaintReferralEntry: boolean;
    isCustomJudicialEntry: boolean;
    showPurgeDefendantPicker: boolean;
    showRequestPartySection: boolean;
    showPartyPickerFormUi: boolean;
    showJuvenileJudgeConcernedPartyPicker: boolean;
    showUnknownPartyNoticeInRequestModal: boolean;
    showJuvenileArrestLegalHint: boolean;
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
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
    onApplyJudicialTemplate: EntryLanesProps['onApplyJudicialTemplate'];
    onApplyLawyerTemplate: EntryLanesProps['onApplyLawyerTemplate'];
    onClearEntryLane: EntryLanesProps['onClearEntryLane'];
    onAssetSeizureDraftsChange: NonNullable<EntryLanesProps['onAssetSeizureDraftsChange']>;
    patchReqBailForParty: NonNullable<PartyPickerProps['onBailChange']>;
    patchReqDetentionForParty: NonNullable<PartyPickerProps['onDetentionChange']>;
    handleReqBailUnifiedChange: (unified: boolean) => void;
    handleReqDetentionUnifiedChange: (unified: boolean) => void;
    navigateToProceduralItem: BacklinksProps['onNavigate'];
    addRequestAttachment: (caseId: string, requestId: string, name: string) => void;
    removeRequestAttachment: (caseId: string, requestId: string, attachmentId: string) => void;
};

export function RequestsEntryModalBody(props: RequestsEntryModalBodyProps) {
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
        reqIsDefendantBailEntry,
        reqIsComplaintReferralEntry,
        isCustomJudicialEntry,
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
        onApplyJudicialTemplate,
        onApplyLawyerTemplate,
        onClearEntryLane,
        onAssetSeizureDraftsChange,
        patchReqBailForParty,
        patchReqDetentionForParty,
        handleReqBailUnifiedChange,
        handleReqDetentionUnifiedChange,
        navigateToProceduralItem,
        addRequestAttachment,
        removeRequestAttachment,
    } = props;

    const {
        requestModalLane,
        reqDate,
        setReqDate,
        reqType,
        setReqType,
        reqTypeTemplate,
        reqEntryLane,
        reqJudicialEntryScope,
        reqCustomTypeName,
        setReqCustomTypeName,
        reqIsAppealable,
        setReqIsAppealable,
        reqNote,
        setReqNote,
        reqInvestigationExpirationReason,
        setReqInvestigationExpirationReason,
        reqInvestigationExpirationCustomDetail,
        setReqInvestigationExpirationCustomDetail,
        reqStatus,
        setReqStatus,
        reqJudgeMargin,
        setReqJudgeMargin,
        reqDecisionDate,
        setReqDecisionDate,
        reqDefendantIds,
        setReqDefendantIds,
        reqDetentionStartDate,
        setReqDetentionStartDate,
        reqDetentionEndDate,
        setReqDetentionEndDate,
        reqDetentionByPartyId,
        reqLegalArticleBasis,
        setReqLegalArticleBasis,
        reqReferredCourtName,
        setReqReferredCourtName,
        reqBailByPartyId,
        reqBailUnified,
        reqDetentionUnified,
        reqSeizureSelectedDefendantIds,
        setReqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
        editingRequestId,
        setRequestMarginModalOpen,
    } = requests;

    return (
        <>
            <RequestsEntryModalIdentitySection
                isRequestModalViewOnly={isRequestModalViewOnly}
                editingRequestId={editingRequestId}
                activeRequestProceduralReferences={activeRequestProceduralReferences}
                navigateToProceduralItem={navigateToProceduralItem}
                requestModalLane={requestModalLane}
                reqDate={reqDate}
                setReqDate={setReqDate}
                reqType={reqType}
                reqIsAppealable={reqIsAppealable}
                reqIsComplaintReferralEntry={reqIsComplaintReferralEntry}
                reqReferredCourtName={reqReferredCourtName}
                isCustomJudicialEntry={isCustomJudicialEntry}
                customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                customJudicialConcernedPartyOptions={customJudicialConcernedPartyOptions}
                isEffectiveTrialCourtStage={isEffectiveTrialCourtStage}
                isInvestigationPhase={isInvestigationPhase}
                investigationDefendantsPartyMix={investigationDefendantsPartyMix}
                mixedInvestigationScopedDefendantNames={mixedInvestigationScopedDefendantNames}
                defendantCustodyStatuses={defendants.map((d) => String(d.status ?? ''))}
                reqJudicialEntryScope={reqJudicialEntryScope}
                reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                isAllDefendantsUnknown={isAllDefendantsUnknown}
                reqEntryLane={reqEntryLane}
                reqTypeTemplate={reqTypeTemplate}
                reqCustomTypeName={reqCustomTypeName}
                reqStatus={reqStatus}
                reqJudgeMargin={reqJudgeMargin}
                reqDecisionDate={reqDecisionDate}
                reqDetentionStartDate={reqDetentionStartDate}
                reqDetentionEndDate={reqDetentionEndDate}
                reqLegalArticleBasis={reqLegalArticleBasis}
                reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                showRequestPartySection={showRequestPartySection}
                reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                isRequestFinalStatus={isRequestFinalStatus}
                reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                fugitiveDefendants={fugitiveDefendants}
                reqSeizureSelectedDefendantIds={reqSeizureSelectedDefendantIds}
                reqSeizureDraftsByDefendant={reqSeizureDraftsByDefendant}
                setReqSeizureSelectedDefendantIds={setReqSeizureSelectedDefendantIds}
                onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                onApplyJudicialTemplate={onApplyJudicialTemplate}
                onApplyLawyerTemplate={onApplyLawyerTemplate}
                onClearEntryLane={onClearEntryLane}
                setReqCustomTypeName={setReqCustomTypeName}
                setReqType={setReqType}
                setReqIsAppealable={setReqIsAppealable}
                setReqStatus={setReqStatus}
                setReqJudgeMargin={setReqJudgeMargin}
                setReqDecisionDate={setReqDecisionDate}
                setReqDetentionStartDate={setReqDetentionStartDate}
                setReqDetentionEndDate={setReqDetentionEndDate}
                setReqLegalArticleBasis={setReqLegalArticleBasis}
                setReqReferredCourtName={setReqReferredCourtName}
                setReqDefendantIds={setReqDefendantIds}
            />

            <RequestsEntryModalPartySection
                isRequestModalViewOnly={isRequestModalViewOnly}
                showPurgeDefendantPicker={showPurgeDefendantPicker}
                defendants={defendants}
                reqDefendantIds={reqDefendantIds}
                setReqDefendantIds={setReqDefendantIds}
                reqTypeTemplate={reqTypeTemplate}
                isInvestigationPhase={isInvestigationPhase}
                reqInvestigationExpirationReason={reqInvestigationExpirationReason}
                reqInvestigationExpirationCustomDetail={reqInvestigationExpirationCustomDetail}
                setReqInvestigationExpirationReason={setReqInvestigationExpirationReason}
                setReqInvestigationExpirationCustomDetail={setReqInvestigationExpirationCustomDetail}
                showRequestPartySection={showRequestPartySection}
                allParties={allParties}
                requestEligibleParties={requestEligibleParties}
                autoRequestPartyLabel={autoRequestPartyLabel}
                autoConcernedPartyLabel={autoConcernedPartyLabel}
                showPartyPickerFormUi={showPartyPickerFormUi}
                reqIsDefendantBailEntry={reqIsDefendantBailEntry}
                showJuvenileJudgeConcernedPartyPicker={showJuvenileJudgeConcernedPartyPicker}
                requestModalLane={requestModalLane}
                reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                reqBailByPartyId={reqBailByPartyId}
                patchReqBailForParty={patchReqBailForParty}
                reqBailUnified={reqBailUnified}
                handleReqBailUnifiedChange={handleReqBailUnifiedChange}
                reqDetentionUnified={reqDetentionUnified}
                handleReqDetentionUnifiedChange={handleReqDetentionUnifiedChange}
                reqDetentionByPartyId={reqDetentionByPartyId}
                patchReqDetentionForParty={patchReqDetentionForParty}
                reqDate={reqDate}
                reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                showUnknownPartyNoticeInRequestModal={showUnknownPartyNoticeInRequestModal}
                unknownDefendantsForPartyDisplay={unknownDefendantsForPartyDisplay}
                showJuvenileArrestLegalHint={showJuvenileArrestLegalHint}
            />

            <RequestsEntryModalDetailsSection
                isRequestModalViewOnly={isRequestModalViewOnly}
                reqNote={reqNote}
                setReqNote={setReqNote}
                reqIsJudicialDecisionEntry={reqIsJudicialDecisionEntry}
                reqStatus={reqStatus}
                reqJudgeMargin={reqJudgeMargin}
                reqDecisionDate={reqDecisionDate}
                reqDetentionByPartyId={reqDetentionByPartyId}
                allParties={allParties}
                reqDetentionStartDate={reqDetentionStartDate}
                reqDetentionEndDate={reqDetentionEndDate}
                reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                reqLegalArticleBasis={reqLegalArticleBasis}
                modalLinkedRequest={modalLinkedRequest}
                isTimelineArchiveReadOnly={isTimelineArchiveReadOnly}
                isDashboardReadOnly={isDashboardReadOnly}
                setRequestMarginModalOpen={setRequestMarginModalOpen}
                editingRequestId={editingRequestId}
                caseId={caseId}
                addRequestAttachment={addRequestAttachment}
                removeRequestAttachment={removeRequestAttachment}
            />
        </>
    );
}
