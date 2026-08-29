import type { GuarantorBailKind, GuarantorPerson } from '../criminalStore';
import {
    isAssetSeizureTemplate,
    isComplaintCourtReferralTemplate,
    isCustomJudicialTemplate,
    isDefendantBailTemplate,
    isJuvenileJudgeCassationAppealableTemplate,
} from '../proceduralRequestTypes';
import {
    resolveInvestigationJudicialEntryScope,
    type InvestigationDefendantsPartyMix,
} from '../juvenileInvestigationRules';
import { JudicialPartyScopeNotice } from './JudicialPartyScopeNotice';
import { RequestModalAssetSeizureFields } from './RequestModalAssetSeizureFields';
import { RequestModalJudicialAppealableToggle } from './RequestModalJudicialAppealableToggle';
import { RequestModalJudicialBailFields } from './RequestModalJudicialBailFields';
import {
    RequestModalJudicialComplaintReferralFields,
    RequestModalJudicialCustomDecisionFields,
    RequestModalJudicialTrialCourtManualFields,
} from './RequestModalJudicialCustomAndReferralFields';
import { RequestModalJudicialDetentionFields } from './RequestModalJudicialDetentionFields';
import { RequestModalJudicialTemplateSelect } from './RequestModalJudicialTemplateSelect';
import type {
    AssetSeizureFugitive,
    SeizedAssetDraft,
} from './requestModalEntryLanes.types';

export type RequestModalJudicialLaneProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    reqTypeTemplate: string;
    reqCustomTypeName: string;
    reqIsAppealable?: boolean;
    reqDate: string;
    reqDetentionStartDate: string;
    reqDetentionEndDate: string;
    reqLegalArticleBasis: string;
    reqReferredCourtName: string;
    reqNeedsDetentionDateRange: boolean;
    hideGlobalDetentionFields?: boolean;
    hideGlobalBailFields?: boolean;
    reqIsOrderEnforcementEntry: boolean;
    trialCourtManualOnly?: boolean;
    isInvestigationPhase?: boolean;
    defendantsPartyMix?: InvestigationDefendantsPartyMix;
    reqJudicialEntryScope?: 'adult' | 'juvenile' | null;
    mixedInvestigationScopedDefendantNames?: readonly string[];
    reqJuvenileDetentionLocked?: boolean;
    isAllDefendantsUnknown?: boolean;
    reqBailKind?: GuarantorBailKind | '';
    reqBailAmount?: string;
    reqBailGuarantors?: GuarantorPerson[];
    assetSeizureFugitives?: AssetSeizureFugitive[];
    assetSeizureSelectedDefendantIds?: string[];
    assetSeizureDraftsByDefendant?: Record<string, SeizedAssetDraft[]>;
    onAssetSeizureSelectedChange?: (ids: string[]) => void;
    onAssetSeizureDraftsChange?: (defendantId: string, drafts: SeizedAssetDraft[]) => void;
    onApplyJudicialTemplate: (template: string, groupScope?: 'adult' | 'juvenile' | null) => void;
    onClearEntryLane: () => void;
    onCustomTypeNameChange: (value: string) => void;
    onAppealableChange?: (value: boolean) => void;
    onDetentionStartChange: (value: string) => void;
    onDetentionEndChange: (value: string) => void;
    onLegalArticleBasisChange: (value: string) => void;
    onReferredCourtNameChange: (value: string) => void;
    onBailKindChange?: (kind: GuarantorBailKind | '') => void;
    onBailAmountChange?: (value: string) => void;
    onBailGuarantorsChange?: (list: GuarantorPerson[]) => void;
    customJudicialConcernedParties?: { id: string; label: string }[];
    customJudicialConcernedPartyId?: string;
    onCustomJudicialConcernedPartyChange?: (partyId: string) => void;
};

export const RequestModalJudicialLane = ({
    reqEntryLane,
    reqTypeTemplate,
    reqCustomTypeName,
    reqIsAppealable = false,
    reqDate,
    reqDetentionStartDate,
    reqDetentionEndDate,
    reqLegalArticleBasis,
    reqReferredCourtName,
    reqNeedsDetentionDateRange,
    hideGlobalDetentionFields = false,
    hideGlobalBailFields = false,
    reqIsOrderEnforcementEntry,
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
    onClearEntryLane,
    onCustomTypeNameChange,
    onAppealableChange,
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
}: RequestModalJudicialLaneProps) => {
    const reqIsComplaintReferralEntry = isComplaintCourtReferralTemplate(reqTypeTemplate);
    const reqIsDefendantBailEntry = isDefendantBailTemplate(reqTypeTemplate);
    const reqIsAssetSeizureEntry = isAssetSeizureTemplate(reqTypeTemplate);
    const isJuvenileAutoAppealable = isJuvenileJudgeCassationAppealableTemplate(reqTypeTemplate);
    const mixedInvestigationPartyScope =
        isInvestigationPhase &&
        defendantsPartyMix === 'mixed' &&
        reqEntryLane === 'judicial' &&
        reqTypeTemplate.trim()
            ? resolveInvestigationJudicialEntryScope(
                  reqTypeTemplate,
                  reqJudicialEntryScope,
                  defendantsPartyMix,
              )
            : undefined;

    return (
            <div className="rounded-xl border border-sky-500/35 bg-sky-950/20 p-3 space-y-3">
                <div className="text-sky-100 text-xs font-black whitespace-normal break-words">
                    🏛️ قرارات القاضي
                </div>
                <RequestModalJudicialTrialCourtManualFields
                    trialCourtManualOnly={trialCourtManualOnly}
                    reqTypeTemplate={reqTypeTemplate}
                    reqCustomTypeName={reqCustomTypeName}
                    reqIsAppealable={reqIsAppealable}
                    onCustomTypeNameChange={onCustomTypeNameChange}
                    onAppealableChange={onAppealableChange}
                    customJudicialConcernedParties={customJudicialConcernedParties}
                    customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                    onCustomJudicialConcernedPartyChange={onCustomJudicialConcernedPartyChange}
                />
                <RequestModalJudicialTemplateSelect
                    reqEntryLane={reqEntryLane}
                    reqTypeTemplate={reqTypeTemplate}
                    trialCourtManualOnly={trialCourtManualOnly}
                    isInvestigationPhase={isInvestigationPhase}
                    defendantsPartyMix={defendantsPartyMix}
                    isAllDefendantsUnknown={isAllDefendantsUnknown}
                    assetSeizureFugitiveCount={assetSeizureFugitives.length}
                    onApplyJudicialTemplate={onApplyJudicialTemplate}
                    onClearEntryLane={onClearEntryLane}
                />
                {mixedInvestigationPartyScope ? (
                    <JudicialPartyScopeNotice
                        scope={mixedInvestigationPartyScope}
                        defendantNames={mixedInvestigationScopedDefendantNames}
                    />
                ) : null}
                {reqEntryLane === 'judicial' &&
                isJuvenileAutoAppealable &&
                !isCustomJudicialTemplate(reqTypeTemplate) &&
                !trialCourtManualOnly ? (
                    <div className="flex">
                        <RequestModalJudicialAppealableToggle
                            reqTypeTemplate={reqTypeTemplate}
                            reqIsAppealable={reqIsAppealable}
                            onAppealableChange={onAppealableChange}
                        />
                    </div>
                ) : null}
                <RequestModalJudicialComplaintReferralFields
                    reqEntryLane={reqEntryLane}
                    show={reqIsComplaintReferralEntry}
                    trialCourtManualOnly={trialCourtManualOnly}
                    reqReferredCourtName={reqReferredCourtName}
                    onReferredCourtNameChange={onReferredCourtNameChange}
                />
                <RequestModalJudicialCustomDecisionFields
                    reqEntryLane={reqEntryLane}
                    show={isCustomJudicialTemplate(reqTypeTemplate)}
                    trialCourtManualOnly={trialCourtManualOnly}
                    reqTypeTemplate={reqTypeTemplate}
                    reqCustomTypeName={reqCustomTypeName}
                    reqIsAppealable={reqIsAppealable}
                    onCustomTypeNameChange={onCustomTypeNameChange}
                    onAppealableChange={onAppealableChange}
                    customJudicialConcernedParties={customJudicialConcernedParties}
                    customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                    onCustomJudicialConcernedPartyChange={onCustomJudicialConcernedPartyChange}
                />
                <RequestModalJudicialDetentionFields
                    reqEntryLane={reqEntryLane}
                    reqDate={reqDate}
                    reqDetentionStartDate={reqDetentionStartDate}
                    reqDetentionEndDate={reqDetentionEndDate}
                    reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                    hideGlobalDetentionFields={hideGlobalDetentionFields}
                    trialCourtManualOnly={trialCourtManualOnly}
                    reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                    onDetentionStartChange={onDetentionStartChange}
                    onDetentionEndChange={onDetentionEndChange}
                />
                {reqEntryLane === 'judicial' && reqIsOrderEnforcementEntry && !trialCourtManualOnly ? (
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                            المادة القانونية المستند عليها *
                        </label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={reqLegalArticleBasis}
                            onChange={(e) => onLegalArticleBasisChange(e.target.value)}
                        />
                    </div>
                ) : null}
                <RequestModalJudicialBailFields
                    reqEntryLane={reqEntryLane}
                    reqIsDefendantBailEntry={reqIsDefendantBailEntry}
                    hideGlobalBailFields={hideGlobalBailFields}
                    trialCourtManualOnly={trialCourtManualOnly}
                    reqBailKind={reqBailKind}
                    reqBailAmount={reqBailAmount}
                    reqBailGuarantors={reqBailGuarantors}
                    onBailKindChange={onBailKindChange}
                    onBailAmountChange={onBailAmountChange}
                    onBailGuarantorsChange={onBailGuarantorsChange}
                />
                {reqEntryLane === 'judicial' && reqIsAssetSeizureEntry ? (
                    <RequestModalAssetSeizureFields
                        assetSeizureFugitives={assetSeizureFugitives}
                        assetSeizureSelectedDefendantIds={assetSeizureSelectedDefendantIds}
                        assetSeizureDraftsByDefendant={assetSeizureDraftsByDefendant}
                        onAssetSeizureSelectedChange={onAssetSeizureSelectedChange}
                        onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                    />
                ) : null}
            </div>
    );
};
