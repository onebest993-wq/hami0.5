import { RequestModalJudicialLane } from './RequestModalJudicialLane';
import { RequestModalLawyerLane } from './RequestModalLawyerLane';
import type { RequestModalEntryLanesProps } from './requestModalEntryLanes.types';

export type { SeizedAssetDraft, RequestModalEntryLanesProps } from './requestModalEntryLanes.types';

export const RequestModalEntryLanes = ({
    activeLane,
    reqEntryLane,
    reqTypeTemplate,
    reqCustomTypeName,
    reqIsAppealable = false,
    reqStatus,
    reqJudgeMargin,
    reqDecisionDate,
    reqDate,
    reqDetentionStartDate,
    reqDetentionEndDate,
    reqLegalArticleBasis,
    reqReferredCourtName,
    reqNeedsDetentionDateRange,
    hideGlobalDetentionFields = false,
    hideGlobalBailFields = false,
    reqIsOrderEnforcementEntry,
    isRequestFinalStatus,
    reqDecisionBeforeRequest,
    trialCourtManualOnly = false,
    isInvestigationPhase = false,
    defendantsPartyMix = 'adults_only',
    reqJudicialEntryScope = null,
    mixedInvestigationScopedDefendantNames = [],
    reqJuvenileDetentionLocked = false,
    isAllDefendantsUnknown = false,
    reqBailKind = '',
    reqBailAmount = '',
    reqBailGuarantors = [],
    assetSeizureFugitives = [],
    assetSeizureSelectedDefendantIds = [],
    assetSeizureDraftsByDefendant = {},
    onAssetSeizureSelectedChange,
    onAssetSeizureDraftsChange,
    onApplyJudicialTemplate,
    onApplyLawyerTemplate,
    onClearEntryLane,
    onCustomTypeNameChange,
    onAppealableChange,
    onStatusChange,
    onJudgeMarginChange,
    onDecisionDateChange,
    onDetentionStartChange,
    onDetentionEndChange,
    onLegalArticleBasisChange,
    onReferredCourtNameChange,
    onBailKindChange,
    onBailAmountChange,
    onBailGuarantorsChange,
    customJudicialConcernedParties = [],
    customJudicialConcernedPartyId = '',
    onCustomJudicialConcernedPartyChange,
}: RequestModalEntryLanesProps) => {
    return (
        <>
            {activeLane === 'judicial' ? (
                <RequestModalJudicialLane
                    reqEntryLane={reqEntryLane}
                    reqTypeTemplate={reqTypeTemplate}
                    reqCustomTypeName={reqCustomTypeName}
                    reqIsAppealable={reqIsAppealable}
                    reqDate={reqDate}
                    reqDetentionStartDate={reqDetentionStartDate}
                    reqDetentionEndDate={reqDetentionEndDate}
                    reqLegalArticleBasis={reqLegalArticleBasis}
                    reqReferredCourtName={reqReferredCourtName}
                    reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                    hideGlobalDetentionFields={hideGlobalDetentionFields}
                    hideGlobalBailFields={hideGlobalBailFields}
                    reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                    trialCourtManualOnly={trialCourtManualOnly}
                    isInvestigationPhase={isInvestigationPhase}
                    defendantsPartyMix={defendantsPartyMix}
                    reqJudicialEntryScope={reqJudicialEntryScope}
                    mixedInvestigationScopedDefendantNames={mixedInvestigationScopedDefendantNames}
                    reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                    isAllDefendantsUnknown={isAllDefendantsUnknown}
                    reqBailKind={reqBailKind}
                    reqBailAmount={reqBailAmount}
                    reqBailGuarantors={reqBailGuarantors}
                    assetSeizureFugitives={assetSeizureFugitives}
                    assetSeizureSelectedDefendantIds={assetSeizureSelectedDefendantIds}
                    assetSeizureDraftsByDefendant={assetSeizureDraftsByDefendant}
                    onAssetSeizureSelectedChange={onAssetSeizureSelectedChange}
                    onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                    onApplyJudicialTemplate={onApplyJudicialTemplate}
                    onClearEntryLane={onClearEntryLane}
                    onCustomTypeNameChange={onCustomTypeNameChange}
                    onAppealableChange={onAppealableChange}
                    onDetentionStartChange={onDetentionStartChange}
                    onDetentionEndChange={onDetentionEndChange}
                    onLegalArticleBasisChange={onLegalArticleBasisChange}
                    onReferredCourtNameChange={onReferredCourtNameChange}
                    onBailKindChange={onBailKindChange}
                    onBailAmountChange={onBailAmountChange}
                    onBailGuarantorsChange={onBailGuarantorsChange}
                    customJudicialConcernedParties={customJudicialConcernedParties}
                    customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                    onCustomJudicialConcernedPartyChange={onCustomJudicialConcernedPartyChange}
                />
            ) : null}

            {activeLane === 'lawyer' ? (
                <RequestModalLawyerLane
                    reqEntryLane={reqEntryLane}
                    reqCustomTypeName={reqCustomTypeName}
                    reqStatus={reqStatus}
                    reqJudgeMargin={reqJudgeMargin}
                    reqDecisionDate={reqDecisionDate}
                    reqDate={reqDate}
                    isRequestFinalStatus={isRequestFinalStatus}
                    reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                    onApplyLawyerTemplate={onApplyLawyerTemplate}
                    onCustomTypeNameChange={onCustomTypeNameChange}
                    onStatusChange={onStatusChange}
                    onJudgeMarginChange={onJudgeMarginChange}
                    onDecisionDateChange={onDecisionDateChange}
                />
            ) : null}
        </>
    );
};
