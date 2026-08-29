import React from 'react';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';
import {
    LawyerRequestAttachmentsEditor,
    LawyerRequestMarginsMiniTimeline,
    RequestMarginAddButton,
} from '../criminalDashboardLazyRequestUi';
import { formatLawyerRequestStatusLabel } from '../criminalStagePresentationCore';
import { formatConcernedPartyLabelWithContext } from '../partyContextFilter';
import { isLawyerRequestFinalStatus } from '../lawyerRequestStatusMachine';
import {
    canAddLawyerRequestFollowUpMarginLite,
    canEditLawyerRequestAttachmentsLite,
} from '../criminalRequestsEntryLite';
import type { LawyerRequest } from '../criminalStore';
import type { PartyDetentionDraft } from './concernedPartyDecisionPickerDraft';
import { RequestsEntryModalReadOnlyField } from './RequestsEntryModalReadOnlyField';

type PartyLike = Parameters<typeof formatConcernedPartyLabelWithContext>[0];

export type RequestsEntryModalDetailsSectionProps = {
    isRequestModalViewOnly: boolean;
    reqNote: string;
    setReqNote: (value: string) => void;
    reqIsJudicialDecisionEntry: boolean;
    reqStatus: string;
    reqJudgeMargin: string;
    reqDecisionDate: string;
    reqDetentionByPartyId: Record<string, PartyDetentionDraft>;
    allParties: PartyLike[];
    reqDetentionStartDate: string;
    reqDetentionEndDate: string;
    reqIsOrderEnforcementEntry: boolean;
    reqLegalArticleBasis: string;
    modalLinkedRequest: LawyerRequest | null;
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
    setRequestMarginModalOpen: (open: boolean) => void;
    editingRequestId: string | null | undefined;
    caseId: string;
    addRequestAttachment: (caseId: string, requestId: string, name: string) => void;
    removeRequestAttachment: (caseId: string, requestId: string, attachmentId: string) => void;
};

export function RequestsEntryModalDetailsSection(props: RequestsEntryModalDetailsSectionProps) {
    const {
        isRequestModalViewOnly,
        reqNote,
        setReqNote,
        reqIsJudicialDecisionEntry,
        reqStatus,
        reqJudgeMargin,
        reqDecisionDate,
        reqDetentionByPartyId,
        allParties,
        reqDetentionStartDate,
        reqDetentionEndDate,
        reqIsOrderEnforcementEntry,
        reqLegalArticleBasis,
        modalLinkedRequest,
        isTimelineArchiveReadOnly,
        isDashboardReadOnly,
        setRequestMarginModalOpen,
        editingRequestId,
        caseId,
        addRequestAttachment,
        removeRequestAttachment,
    } = props;

    if (isRequestModalViewOnly) {
        return (
            <>
                <RequestsEntryModalReadOnlyField label="التفاصيل" value={reqNote} />
                <RequestsEntryModalReadOnlyField
                    label={reqIsJudicialDecisionEntry ? 'نوع التسجيل' : 'حالة الطلب'}
                    value={formatLawyerRequestStatusLabel(reqStatus)}
                />
                {isLawyerRequestFinalStatus(reqStatus) && !reqIsJudicialDecisionEntry ? (
                    <RequestsEntryModalReadOnlyField
                        label="قرار / هامش القاضي الختامي"
                        value={reqJudgeMargin}
                    />
                ) : null}
                {isLawyerRequestFinalStatus(reqStatus) && !reqIsJudicialDecisionEntry ? (
                    <RequestsEntryModalReadOnlyField
                        label="تاريخ قرار القاضي"
                        value={reqDecisionDate}
                    />
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
                                <RequestsEntryModalReadOnlyField
                                    label="تاريخ بدء التوقيف"
                                    value={draft.startDate}
                                />
                            ) : null}
                            {draft.endDate.trim() ? (
                                <RequestsEntryModalReadOnlyField
                                    label="تاريخ انتهاء التوقيف"
                                    value={draft.endDate}
                                />
                            ) : null}
                        </div>
                    );
                })}
                {!Object.keys(reqDetentionByPartyId).length && reqDetentionStartDate.trim() ? (
                    <RequestsEntryModalReadOnlyField
                        label="تاريخ بدء التوقيف"
                        value={reqDetentionStartDate}
                    />
                ) : null}
                {!Object.keys(reqDetentionByPartyId).length && reqDetentionEndDate.trim() ? (
                    <RequestsEntryModalReadOnlyField
                        label="تاريخ انتهاء التوقيف"
                        value={reqDetentionEndDate}
                    />
                ) : null}
                {reqIsOrderEnforcementEntry && reqLegalArticleBasis.trim() ? (
                    <RequestsEntryModalReadOnlyField
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
        );
    }

    return (
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
    );
}
