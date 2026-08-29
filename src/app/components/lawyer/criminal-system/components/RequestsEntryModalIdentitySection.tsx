import React from 'react';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';
import { RequestModalEntryLanes } from '../criminalDashboardLazyRequestUi';
import { ProceduralBacklinks } from './ProceduralBacklinks';
import { RequestsEntryModalReadOnlyField } from './RequestsEntryModalReadOnlyField';

type EntryLanesProps = React.ComponentProps<typeof RequestModalEntryLanes>;
type BacklinksProps = React.ComponentProps<typeof ProceduralBacklinks>;

export type RequestsEntryModalIdentitySectionProps = {
    isRequestModalViewOnly: boolean;
    editingRequestId: string | null | undefined;
    activeRequestProceduralReferences: BacklinksProps['references'];
    navigateToProceduralItem: BacklinksProps['onNavigate'];
    requestModalLane: string;
    reqDate: string;
    setReqDate: (value: string) => void;
    reqType: string;
    reqIsAppealable: boolean;
    reqIsComplaintReferralEntry: boolean;
    reqReferredCourtName: string;
    isCustomJudicialEntry: boolean;
    customJudicialConcernedPartyId: string;
    customJudicialConcernedPartyOptions: Array<{ id: string; label: string }>;
    isEffectiveTrialCourtStage: boolean;
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: EntryLanesProps['defendantsPartyMix'];
    mixedInvestigationScopedDefendantNames: EntryLanesProps['mixedInvestigationScopedDefendantNames'];
    defendantCustodyStatuses: string[];
    reqJudicialEntryScope: EntryLanesProps['reqJudicialEntryScope'];
    reqJuvenileDetentionLocked: boolean;
    isAllDefendantsUnknown: boolean;
    reqEntryLane: EntryLanesProps['reqEntryLane'];
    reqTypeTemplate: string;
    reqCustomTypeName: string;
    reqStatus: EntryLanesProps['reqStatus'];
    reqJudgeMargin: string;
    reqDecisionDate: string;
    reqDetentionStartDate: string;
    reqDetentionEndDate: string;
    reqLegalArticleBasis: string;
    reqNeedsDetentionDateRange: boolean;
    showRequestPartySection: boolean;
    reqIsOrderEnforcementEntry: boolean;
    isRequestFinalStatus: boolean;
    reqDecisionBeforeRequest: boolean;
    fugitiveDefendants: EntryLanesProps['assetSeizureFugitives'];
    reqSeizureSelectedDefendantIds: EntryLanesProps['assetSeizureSelectedDefendantIds'];
    reqSeizureDraftsByDefendant: EntryLanesProps['assetSeizureDraftsByDefendant'];
    setReqSeizureSelectedDefendantIds: EntryLanesProps['onAssetSeizureSelectedChange'];
    onAssetSeizureDraftsChange: NonNullable<EntryLanesProps['onAssetSeizureDraftsChange']>;
    onApplyJudicialTemplate: EntryLanesProps['onApplyJudicialTemplate'];
    onApplyLawyerTemplate: EntryLanesProps['onApplyLawyerTemplate'];
    onClearEntryLane: EntryLanesProps['onClearEntryLane'];
    setReqCustomTypeName: (value: string) => void;
    setReqType: (value: string) => void;
    setReqIsAppealable: EntryLanesProps['onAppealableChange'];
    setReqStatus: EntryLanesProps['onStatusChange'];
    setReqJudgeMargin: EntryLanesProps['onJudgeMarginChange'];
    setReqDecisionDate: EntryLanesProps['onDecisionDateChange'];
    setReqDetentionStartDate: EntryLanesProps['onDetentionStartChange'];
    setReqDetentionEndDate: EntryLanesProps['onDetentionEndChange'];
    setReqLegalArticleBasis: EntryLanesProps['onLegalArticleBasisChange'];
    setReqReferredCourtName: EntryLanesProps['onReferredCourtNameChange'];
    setReqDefendantIds: (ids: string[]) => void;
};

export function RequestsEntryModalIdentitySection(props: RequestsEntryModalIdentitySectionProps) {
    const {
        isRequestModalViewOnly,
        editingRequestId,
        activeRequestProceduralReferences,
        navigateToProceduralItem,
        requestModalLane,
        reqDate,
        setReqDate,
        reqType,
        reqIsAppealable,
        reqIsComplaintReferralEntry,
        reqReferredCourtName,
        isCustomJudicialEntry,
        customJudicialConcernedPartyId,
        customJudicialConcernedPartyOptions,
        isEffectiveTrialCourtStage,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        mixedInvestigationScopedDefendantNames,
        defendantCustodyStatuses,
        reqJudicialEntryScope,
        reqJuvenileDetentionLocked,
        isAllDefendantsUnknown,
        reqEntryLane,
        reqTypeTemplate,
        reqCustomTypeName,
        reqStatus,
        reqJudgeMargin,
        reqDecisionDate,
        reqDetentionStartDate,
        reqDetentionEndDate,
        reqLegalArticleBasis,
        reqNeedsDetentionDateRange,
        showRequestPartySection,
        reqIsOrderEnforcementEntry,
        isRequestFinalStatus,
        reqDecisionBeforeRequest,
        fugitiveDefendants,
        reqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
        setReqSeizureSelectedDefendantIds,
        onAssetSeizureDraftsChange,
        onApplyJudicialTemplate,
        onApplyLawyerTemplate,
        onClearEntryLane,
        setReqCustomTypeName,
        setReqType,
        setReqIsAppealable,
        setReqStatus,
        setReqJudgeMargin,
        setReqDecisionDate,
        setReqDetentionStartDate,
        setReqDetentionEndDate,
        setReqLegalArticleBasis,
        setReqReferredCourtName,
        setReqDefendantIds,
    } = props;

    return (
        <>
            {isRequestModalViewOnly && editingRequestId ? (
                <ProceduralBacklinks
                    references={activeRequestProceduralReferences}
                    onNavigate={navigateToProceduralItem}
                />
            ) : null}

            {isRequestModalViewOnly ? (
                <>
                    <RequestsEntryModalReadOnlyField
                        label={
                            requestModalLane === 'judicial' ? 'تاريخ القرار' : 'تاريخ الطلب'
                        }
                        value={reqDate}
                    />
                    <RequestsEntryModalReadOnlyField label="نوع الطلب / الإجراء" value={reqType} />
                    {reqIsAppealable ? (
                        <RequestsEntryModalReadOnlyField
                            label="قابلية التمييز"
                            value="نعم — إجراء مخصص قابل للطعن"
                        />
                    ) : null}
                    {reqIsComplaintReferralEntry && reqReferredCourtName.trim() ? (
                        <RequestsEntryModalReadOnlyField
                            label="المحكمة الجديدة"
                            value={reqReferredCourtName}
                        />
                    ) : null}
                    {isCustomJudicialEntry ? (
                        <RequestsEntryModalReadOnlyField
                            label="الأمر يخص من"
                            value={
                                customJudicialConcernedPartyId
                                    ? customJudicialConcernedPartyOptions.find(
                                          (p) => p.id === customJudicialConcernedPartyId,
                                      )?.label ?? '—'
                                    : 'قرار عام للإضبارة'
                            }
                        />
                    ) : null}
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            {requestModalLane === 'judicial' ? 'تاريخ القرار' : 'تاريخ الطلب'}
                        </label>
                        <input
                            type="date"
                            data-testid={CRIMINAL_DOSSIER_TEST_IDS.requestDate}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={reqDate}
                            onChange={(e) => setReqDate(e.target.value)}
                        />
                    </div>
                    <RequestModalEntryLanes
                        activeLane={requestModalLane}
                        trialCourtManualOnly={isEffectiveTrialCourtStage}
                        isInvestigationPhase={isInvestigationPhase}
                        defendantsPartyMix={
                            isInvestigationPhase
                                ? investigationDefendantsPartyMix
                                : 'adults_only'
                        }
                        defendantCustodyStatuses={defendantCustodyStatuses}
                        reqJudicialEntryScope={reqJudicialEntryScope}
                        mixedInvestigationScopedDefendantNames={
                            mixedInvestigationScopedDefendantNames
                        }
                        reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                        isAllDefendantsUnknown={isAllDefendantsUnknown}
                        reqEntryLane={reqEntryLane}
                        reqTypeTemplate={reqTypeTemplate}
                        reqCustomTypeName={reqCustomTypeName}
                        reqIsAppealable={reqIsAppealable}
                        reqStatus={reqStatus}
                        reqJudgeMargin={reqJudgeMargin}
                        reqDecisionDate={reqDecisionDate}
                        reqDate={reqDate}
                        reqDetentionStartDate={reqDetentionStartDate}
                        reqDetentionEndDate={reqDetentionEndDate}
                        reqLegalArticleBasis={reqLegalArticleBasis}
                        reqReferredCourtName={reqReferredCourtName}
                        reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                        hideGlobalDetentionFields={
                            showRequestPartySection && !isRequestModalViewOnly
                        }
                        hideGlobalBailFields={
                            showRequestPartySection && !isRequestModalViewOnly
                        }
                        reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                        isRequestFinalStatus={isRequestFinalStatus}
                        reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                        assetSeizureFugitives={fugitiveDefendants}
                        assetSeizureSelectedDefendantIds={reqSeizureSelectedDefendantIds}
                        assetSeizureDraftsByDefendant={reqSeizureDraftsByDefendant}
                        onAssetSeizureSelectedChange={setReqSeizureSelectedDefendantIds}
                        onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                        onApplyJudicialTemplate={onApplyJudicialTemplate}
                        onApplyLawyerTemplate={onApplyLawyerTemplate}
                        onClearEntryLane={onClearEntryLane}
                        onCustomTypeNameChange={(value) => {
                            setReqCustomTypeName(value);
                            setReqType(value);
                        }}
                        onAppealableChange={setReqIsAppealable}
                        onStatusChange={setReqStatus}
                        onJudgeMarginChange={setReqJudgeMargin}
                        onDecisionDateChange={setReqDecisionDate}
                        onDetentionStartChange={setReqDetentionStartDate}
                        onDetentionEndChange={setReqDetentionEndDate}
                        onLegalArticleBasisChange={setReqLegalArticleBasis}
                        onReferredCourtNameChange={setReqReferredCourtName}
                        customJudicialConcernedParties={customJudicialConcernedPartyOptions}
                        customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                        onCustomJudicialConcernedPartyChange={(partyId) =>
                            setReqDefendantIds(partyId ? [partyId] : [])
                        }
                    />
                </>
            )}
        </>
    );
}
