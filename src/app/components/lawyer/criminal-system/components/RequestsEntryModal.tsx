import React from 'react';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';
import {
    ConcernedPartyDecisionPicker,
    LawyerRequestAttachmentsEditor,
    LawyerRequestMarginsMiniTimeline,
    RequestMarginAddButton,
    RequestModalEntryLanes,
    RequestStarToggle,
} from '../criminalDashboardLazyRequestUi';
import { ProceduralBacklinks } from './ProceduralBacklinks';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';
import { UnknownDefendantPartyBlockedRow } from './UnknownDefendantPartyBlockedRow';
import { ExpirationReasonFields } from './ExpirationReasonFields';
import { formatLawyerRequestStatusLabel } from '../criminalStagePresentationCore';
import { formatConcernedPartyLabel } from '../criminalStageUtils';
import { formatConcernedPartyLabelWithContext } from '../partyContextFilter';
import { isLawyerRequestFinalStatus } from '../lawyerRequestStatusMachine';
import {
    canAddLawyerRequestFollowUpMarginLite,
    canEditLawyerRequestAttachmentsLite,
} from '../criminalRequestsEntryLite';
import { isDefendantTargetRequestTemplate } from '../requestPartySelection';
import { isInvestigationExpirationJudicialTemplate } from '../proceduralRequestTypes';
import type { CriminalRequestsOrchestratorSlice } from '../orchestrators/criminalOrchestratorSliceTypes';
import type { LawyerRequest } from '../criminalStore';

const RequestReadOnlyField = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-3 py-1 min-w-0 border-b border-white/[0.06] last:border-0">
        <span className="text-[#A0AEC0] text-[10px] font-light shrink-0 pt-0.5">{label}</span>
        <span className="text-white/95 text-[11px] font-medium text-left whitespace-normal break-words min-w-0 flex-1">
            {value.trim() || '—'}
        </span>
    </div>
);

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
        reqIsStarred,
        setReqIsStarred,
        setRequestMarginModalOpen,
    } = requests;

    return (
        <div
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            data-testid={CRIMINAL_DOSSIER_TEST_IDS.requestsModal}
            data-request-lane={requestModalLane}
        >
            <div className="w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="text-white font-black text-sm whitespace-normal break-words">
                            {isRequestModalViewOnly
                                ? requestModalLane === 'lawyer'
                                    ? 'عرض تفاصيل طلب المحامي'
                                    : 'عرض تفاصيل قرار القاضي'
                                : requestModalLane === 'lawyer'
                                  ? 'طلبات المحامي'
                                  : 'تسجيل قرار قضائي'}
                        </div>
                        <RequestStarToggle
                            starred={
                                isRequestModalViewOnly
                                    ? modalLinkedRequest?.isStarred === true
                                    : reqIsStarred
                            }
                            disabled={
                                isRequestModalViewOnly
                                    ? !editingRequestId ||
                                      isTimelineArchiveReadOnly ||
                                      isDashboardReadOnly
                                    : false
                            }
                            onToggle={() => {
                                if (isRequestModalViewOnly && editingRequestId) {
                                    toggleRequestStar(caseId, editingRequestId);
                                } else {
                                    setReqIsStarred((v) => !v);
                                }
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {isRequestModalViewOnly && editingRequestId ? (
                        <ProceduralBacklinks
                            references={activeRequestProceduralReferences}
                            onNavigate={navigateToProceduralItem}
                        />
                    ) : null}

                    {isRequestModalViewOnly ? (
                        <>
                            <RequestReadOnlyField
                                label={
                                    requestModalLane === 'judicial' ? 'تاريخ القرار' : 'تاريخ الطلب'
                                }
                                value={reqDate}
                            />
                            <RequestReadOnlyField label="نوع الطلب / الإجراء" value={reqType} />
                            {reqIsAppealable ? (
                                <RequestReadOnlyField label="قابلية التمييز" value="نعم — إجراء مخصص قابل للطعن" />
                            ) : null}
                            {reqIsComplaintReferralEntry && reqReferredCourtName.trim() ? (
                                <RequestReadOnlyField label="المحكمة الجديدة" value={reqReferredCourtName} />
                            ) : null}
                            {isCustomJudicialEntry ? (
                                <RequestReadOnlyField
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
                                defendantCustodyStatuses={defendants.map((d) => String(d.status ?? ''))}
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
                                <RequestReadOnlyField
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

                    {isRequestModalViewOnly ? (
                        <>
                            <RequestReadOnlyField label="التفاصيل" value={reqNote} />
                            <RequestReadOnlyField
                                label={reqIsJudicialDecisionEntry ? 'نوع التسجيل' : 'حالة الطلب'}
                                value={formatLawyerRequestStatusLabel(reqStatus)}
                            />
                            {isLawyerRequestFinalStatus(reqStatus) && !reqIsJudicialDecisionEntry ? (
                                <RequestReadOnlyField label="قرار / هامش القاضي الختامي" value={reqJudgeMargin} />
                            ) : null}
                            {isLawyerRequestFinalStatus(reqStatus) && !reqIsJudicialDecisionEntry ? (
                                <RequestReadOnlyField label="تاريخ قرار القاضي" value={reqDecisionDate} />
                            ) : null}
                            {Object.entries(reqDetentionByPartyId).map(([partyId, draft]) => {
                                if (!draft.startDate.trim() && !draft.endDate.trim()) return null;
                                const party = allParties.find((p) => p.id === partyId);
                                const label = party
                                    ? formatConcernedPartyLabelWithContext(party, {
                                          showDeceasedBadge: true,
                                      })
                                    : partyId;
                                return (
                                    <div
                                        key={partyId}
                                        className="rounded-xl border border-slate-700/60 bg-slate-800/25 p-3 space-y-1"
                                    >
                                        <div className="text-white/70 text-xs font-black">{label}</div>
                                        {draft.startDate.trim() ? (
                                            <RequestReadOnlyField
                                                label="تاريخ بدء التوقيف"
                                                value={draft.startDate}
                                            />
                                        ) : null}
                                        {draft.endDate.trim() ? (
                                            <RequestReadOnlyField
                                                label="تاريخ انتهاء التوقيف"
                                                value={draft.endDate}
                                            />
                                        ) : null}
                                    </div>
                                );
                            })}
                            {!Object.keys(reqDetentionByPartyId).length && reqDetentionStartDate.trim() ? (
                                <RequestReadOnlyField
                                    label="تاريخ بدء التوقيف"
                                    value={reqDetentionStartDate}
                                />
                            ) : null}
                            {!Object.keys(reqDetentionByPartyId).length && reqDetentionEndDate.trim() ? (
                                <RequestReadOnlyField
                                    label="تاريخ انتهاء التوقيف"
                                    value={reqDetentionEndDate}
                                />
                            ) : null}
                            {reqIsOrderEnforcementEntry && reqLegalArticleBasis.trim() ? (
                                <RequestReadOnlyField
                                    label="المادة القانونية المستند عليها"
                                    value={reqLegalArticleBasis}
                                />
                            ) : null}
                            {modalLinkedRequest?.margins?.length ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        هوامش ومتابعات
                                    </label>
                                    <LawyerRequestMarginsMiniTimeline margins={modalLinkedRequest.margins} />
                                </div>
                            ) : null}
                            {!isTimelineArchiveReadOnly &&
                            !isDashboardReadOnly &&
                            modalLinkedRequest &&
                            canAddLawyerRequestFollowUpMarginLite(modalLinkedRequest) ? (
                                <RequestMarginAddButton onClick={() => setRequestMarginModalOpen(true)} />
                            ) : null}
                            {(modalLinkedRequest?.attachments?.length ?? 0) > 0 ||
                            (modalLinkedRequest &&
                                canEditLawyerRequestAttachmentsLite(modalLinkedRequest)) ? (
                                <div className="rounded-xl border border-slate-700/60 bg-slate-800/25 p-3">
                                    <label className="block text-white/70 text-xs mb-2 whitespace-normal break-words">
                                        مرفقات القرار
                                        {modalLinkedRequest &&
                                        !canEditLawyerRequestAttachmentsLite(modalLinkedRequest)
                                            ? ' (للقراءة — الطلب مقفول)'
                                            : ''}
                                    </label>
                                    <LawyerRequestAttachmentsEditor
                                        attachments={modalLinkedRequest?.attachments ?? []}
                                        readOnly={
                                            isTimelineArchiveReadOnly ||
                                            isDashboardReadOnly ||
                                            !modalLinkedRequest ||
                                            !canEditLawyerRequestAttachmentsLite(modalLinkedRequest)
                                        }
                                        onAddSimulated={() => {
                                            if (!editingRequestId) return;
                                            const n = (modalLinkedRequest?.attachments?.length ?? 0) + 1;
                                            addRequestAttachment(
                                                caseId,
                                                editingRequestId,
                                                `نسخة القرار الموثقة رقم ${n}`,
                                            );
                                        }}
                                        onRemove={(attachmentId) => {
                                            if (editingRequestId) {
                                                removeRequestAttachment(caseId, editingRequestId, attachmentId);
                                            }
                                        }}
                                    />
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    {reqIsJudicialDecisionEntry ? 'تفاصيل / وقائع القرار *' : 'التفاصيل *'}
                                </label>
                                <textarea
                                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.requestNote}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                                    value={reqNote}
                                    onChange={(e) => setReqNote(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        {isRequestModalViewOnly ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-700/60 transition whitespace-normal break-words"
                            >
                                إغلاق
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.requestSubmit}
                                    onClick={onSubmit}
                                    disabled={
                                        !requestFormBaseValid ||
                                        (reqIsLawyerMotionEntry &&
                                            isRequestFinalStatus &&
                                            !requestFormFinalValid)
                                    }
                                    className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                >
                                    {reqIsJudicialDecisionEntry
                                        ? 'توثيق القرار في السجل'
                                        : isRequestFinalStatus
                                          ? 'حفظ هامش القاضي وقفل'
                                          : 'تسجيل الطلب'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
