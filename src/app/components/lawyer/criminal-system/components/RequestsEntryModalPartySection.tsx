import React from 'react';
import {
    ConcernedPartyDecisionPicker,
} from '../criminalDashboardLazyRequestUi';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';
import { UnknownDefendantPartyBlockedRow } from './UnknownDefendantPartyBlockedRow';
import { ExpirationReasonFields } from './ExpirationReasonFields';
import { formatConcernedPartyLabel } from '../criminalStageUtils';
import { formatConcernedPartyLabelWithContext } from '../partyContextFilter';
import { isDefendantTargetRequestTemplate } from '../requestPartySelection';
import { isInvestigationExpirationJudicialTemplate } from '../proceduralRequestTypes';
import { RequestsEntryModalReadOnlyField } from './RequestsEntryModalReadOnlyField';

type PartyPickerProps = React.ComponentProps<typeof ConcernedPartyDecisionPicker>;
type ScopePickerProps = React.ComponentProps<typeof DefendantDecisionScopePicker>;

export type RequestsEntryModalPartySectionProps = {
    isRequestModalViewOnly: boolean;
    showPurgeDefendantPicker: boolean;
    defendants: ScopePickerProps['defendants'];
    reqDefendantIds: string[];
    setReqDefendantIds: (ids: string[]) => void;
    reqTypeTemplate: string;
    isInvestigationPhase: boolean;
    reqInvestigationExpirationReason: string;
    reqInvestigationExpirationCustomDetail: string;
    setReqInvestigationExpirationReason: (value: string) => void;
    setReqInvestigationExpirationCustomDetail: (value: string) => void;
    showRequestPartySection: boolean;
    allParties: PartyPickerProps['parties'];
    requestEligibleParties: PartyPickerProps['parties'];
    autoRequestPartyLabel: string;
    autoConcernedPartyLabel: string;
    showPartyPickerFormUi: boolean;
    reqIsDefendantBailEntry: boolean;
    showJuvenileJudgeConcernedPartyPicker: boolean;
    requestModalLane: string;
    reqNeedsDetentionDateRange: boolean;
    reqBailByPartyId: PartyPickerProps['bailByPartyId'];
    patchReqBailForParty: NonNullable<PartyPickerProps['onBailChange']>;
    reqBailUnified: boolean;
    handleReqBailUnifiedChange: (unified: boolean) => void;
    reqDetentionUnified: boolean;
    handleReqDetentionUnifiedChange: (unified: boolean) => void;
    reqDetentionByPartyId: PartyPickerProps['detentionByPartyId'];
    patchReqDetentionForParty: NonNullable<PartyPickerProps['onDetentionChange']>;
    reqDate: string;
    reqJuvenileDetentionLocked: boolean;
    showUnknownPartyNoticeInRequestModal: boolean;
    unknownDefendantsForPartyDisplay: Array<{ id: string; fullName?: string }>;
    showJuvenileArrestLegalHint: boolean;
};

export function RequestsEntryModalPartySection(props: RequestsEntryModalPartySectionProps) {
    const {
        isRequestModalViewOnly,
        showPurgeDefendantPicker,
        defendants,
        reqDefendantIds,
        setReqDefendantIds,
        reqTypeTemplate,
        isInvestigationPhase,
        reqInvestigationExpirationReason,
        reqInvestigationExpirationCustomDetail,
        setReqInvestigationExpirationReason,
        setReqInvestigationExpirationCustomDetail,
        showRequestPartySection,
        allParties,
        requestEligibleParties,
        autoRequestPartyLabel,
        autoConcernedPartyLabel,
        showPartyPickerFormUi,
        reqIsDefendantBailEntry,
        showJuvenileJudgeConcernedPartyPicker,
        requestModalLane,
        reqNeedsDetentionDateRange,
        reqBailByPartyId,
        patchReqBailForParty,
        reqBailUnified,
        handleReqBailUnifiedChange,
        reqDetentionUnified,
        handleReqDetentionUnifiedChange,
        reqDetentionByPartyId,
        patchReqDetentionForParty,
        reqDate,
        reqJuvenileDetentionLocked,
        showUnknownPartyNoticeInRequestModal,
        unknownDefendantsForPartyDisplay,
        showJuvenileArrestLegalHint,
    } = props;

    return (
        <>
            {showPurgeDefendantPicker && !isRequestModalViewOnly ? (
                <DefendantDecisionScopePicker
                    defendants={defendants}
                    selectedIds={reqDefendantIds}
                    onChange={setReqDefendantIds}
                    proceduralTemplate={reqTypeTemplate}
                />
            ) : null}

            {isInvestigationPhase &&
            isInvestigationExpirationJudicialTemplate(reqTypeTemplate) &&
            !isRequestModalViewOnly ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-800/20 p-2.5">
                    <ExpirationReasonFields
                        reason={reqInvestigationExpirationReason}
                        customDetail={reqInvestigationExpirationCustomDetail}
                        onReasonChange={setReqInvestigationExpirationReason}
                        onCustomDetailChange={setReqInvestigationExpirationCustomDetail}
                        compact
                    />
                </div>
            ) : null}

            {showRequestPartySection ? (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-2">
                    {isRequestModalViewOnly ? (
                        <RequestsEntryModalReadOnlyField
                            label="الطرف المعني بالطلب"
                            value={
                                reqDefendantIds
                                    .map((rid) => allParties.find((p) => p.id === rid))
                                    .filter(Boolean)
                                    .map((p) =>
                                        formatConcernedPartyLabelWithContext(p!, {
                                            showDeceasedBadge: true,
                                        }),
                                    )
                                    .join(' • ') ||
                                autoRequestPartyLabel ||
                                autoConcernedPartyLabel ||
                                (requestEligibleParties[0]
                                    ? formatConcernedPartyLabel(requestEligibleParties[0]!)
                                    : '—')
                            }
                        />
                    ) : (
                        <>
                            {showPartyPickerFormUi ? (
                                <ConcernedPartyDecisionPicker
                                    parties={requestEligibleParties}
                                    selectedIds={reqDefendantIds}
                                    onChange={setReqDefendantIds}
                                    label={
                                        reqIsDefendantBailEntry
                                            ? 'المتهمون المعنيون بالكفالة *'
                                            : showJuvenileJudgeConcernedPartyPicker
                                              ? 'المقصود بالإجراء *'
                                              : requestModalLane === 'judicial'
                                                ? 'الأشخاص المعنيون بالقرار *'
                                                : isDefendantTargetRequestTemplate(reqTypeTemplate)
                                                  ? 'الأشخاص المعنيون بالقرار *'
                                                  : 'الأطراف المعنيون بالطلب *'
                                    }
                                    showPerPartyCards
                                    showBailFields={reqIsDefendantBailEntry}
                                    showDetentionFields={reqNeedsDetentionDateRange}
                                    bailByPartyId={reqBailByPartyId}
                                    onBailChange={patchReqBailForParty}
                                    unifiedBailMode={reqBailUnified}
                                    onUnifiedBailModeChange={handleReqBailUnifiedChange}
                                    unifiedDetentionMode={reqDetentionUnified}
                                    onUnifiedDetentionModeChange={handleReqDetentionUnifiedChange}
                                    detentionByPartyId={reqDetentionByPartyId}
                                    onDetentionChange={patchReqDetentionForParty}
                                    requestDate={reqDate}
                                    juvenileDetentionLocked={reqJuvenileDetentionLocked}
                                    formatPartyLabel={(party) =>
                                        formatConcernedPartyLabelWithContext(party, {
                                            showDeceasedBadge: true,
                                        })
                                    }
                                    unknownPartyRows={
                                        showUnknownPartyNoticeInRequestModal ? (
                                            <div className="space-y-2">
                                                {unknownDefendantsForPartyDisplay.map((d) => (
                                                    <UnknownDefendantPartyBlockedRow
                                                        key={d.id}
                                                        fullName={String(d.fullName ?? '')}
                                                    />
                                                ))}
                                            </div>
                                        ) : undefined
                                    }
                                />
                            ) : null}
                            {showJuvenileArrestLegalHint ? (
                                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] font-bold text-sky-100/95 whitespace-normal break-words leading-relaxed">
                                    (تنبيه قانوني: يُمنع احتجاز الحدث في مراكز الشرطة، ويودع وجوباً في دار الملاحظة)
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            ) : null}
        </>
    );
}
