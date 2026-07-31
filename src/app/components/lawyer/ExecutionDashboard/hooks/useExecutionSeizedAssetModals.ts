import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { SeizedProperty } from '@/app/types/execution';
import { formatNumberInput, formatStoredAmountForInput } from '@/app/utils/execution/amountInput';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

export function useExecutionSeizedAssetModalState() {
    const [propertySeizureRequestModalOpen, setPropertySeizureRequestModalOpen] = useState(false);
    const [propertySeizureSubjectDraft, setPropertySeizureSubjectDraft] = useState('');
    const [movableSeizureRequestModalOpen, setMovableSeizureRequestModalOpen] = useState(false);
    const [movableSeizureSubjectDraft, setMovableSeizureSubjectDraft] = useState('');

    const [seizedPropertyStepModalOpen, setSeizedPropertyStepModalOpen] = useState(false);
    const [seizedPropertyStepDecisionId, setSeizedPropertyStepDecisionId] = useState<string | null>(null);
    const [seizedPropertyStepPropertyId, setSeizedPropertyStepPropertyId] = useState<string | null>(null);
    const [seizedPropertyStepEntityKind, setSeizedPropertyStepEntityKind] = useState<'property' | 'movable'>(
        'property',
    );
    const [seizedPropertyStepKind, setSeizedPropertyStepKind] = useState<
        'experts' | 'auction' | 'award' | 'reauction_default' | null
    >(null);
    const [seizedPropertyExpertsNamesDraft, setSeizedPropertyExpertsNamesDraft] = useState('');
    const [seizedPropertyExpertReportDateDraft, setSeizedPropertyExpertReportDateDraft] = useState('');
    const [seizedPropertyExpertPriceDraft, setSeizedPropertyExpertPriceDraft] = useState('');
    const [seizedPropertyAuctionDateDraft, setSeizedPropertyAuctionDateDraft] = useState('');
    const [linkSeizureAuctionToAppointments, setLinkSeizureAuctionToAppointments] = useState(true);
    const [seizedPropertyBuyerNameDraft, setSeizedPropertyBuyerNameDraft] = useState('');
    const [seizedPropertyAwardAmountDraft, setSeizedPropertyAwardAmountDraft] = useState('');
    const [seizedPropertyStepNotesDraft, setSeizedPropertyStepNotesDraft] = useState('');

    const [seizedPropertyAuctionResultModalOpen, setSeizedPropertyAuctionResultModalOpen] = useState(false);
    const [seizedPropertyAuctionResultPropertyId, setSeizedPropertyAuctionResultPropertyId] = useState<
        string | null
    >(null);
    const [seizedPropertyAuctionResultEntityKind, setSeizedPropertyAuctionResultEntityKind] = useState<
        'property' | 'movable'
    >('property');
    const [seizedPropertyAuctionResultOutcome, setSeizedPropertyAuctionResultOutcome] = useState<
        'initial_award' | 'no_bidders'
    >('initial_award');
    const [seizedPropertyAuctionResultBuyerNameDraft, setSeizedPropertyAuctionResultBuyerNameDraft] =
        useState('');
    const [seizedPropertyAuctionResultAmountDraft, setSeizedPropertyAuctionResultAmountDraft] =
        useState('');
    const [seizedPropertyAuctionDepositAmountDraft, setSeizedPropertyAuctionDepositAmountDraft] =
        useState('');

    const [seizureMarkModalOpen, setSeizureMarkModalOpen] = useState(false);
    const [seizureMarkModalEntityKind, setSeizureMarkModalEntityKind] = useState<'property' | 'movable'>(
        'property',
    );
    const [seizureMarkModalEntityId, setSeizureMarkModalEntityId] = useState<string | null>(null);
    const [seizureMarkLetterNumberDraft, setSeizureMarkLetterNumberDraft] = useState('');
    const [seizureMarkDateDraft, setSeizureMarkDateDraft] = useState('');
    const [seizureMarkEntityDraft, setSeizureMarkEntityDraft] = useState('');

    const [publicationModalOpen, setPublicationModalOpen] = useState(false);
    const [publicationModalEntityKind, setPublicationModalEntityKind] = useState<'property' | 'movable'>(
        'property',
    );
    const [publicationModalEntityId, setPublicationModalEntityId] = useState<string | null>(null);
    const [publicationNewspaperNameDraft, setPublicationNewspaperNameDraft] = useState('');
    const [publicationDateYmdDraft, setPublicationDateYmdDraft] = useState('');

    const [showRealEstateSeizureModal, setShowRealEstateSeizureModal] = useState(false);
    const [realEstateSeizureModalDecisionId, setRealEstateSeizureModalDecisionId] = useState<string | null>(
        null,
    );

    return {
        propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        setPropertySeizureSubjectDraft,
        movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        setMovableSeizureSubjectDraft,
        seizedPropertyStepModalOpen,
        setSeizedPropertyStepModalOpen,
        seizedPropertyStepDecisionId,
        setSeizedPropertyStepDecisionId,
        seizedPropertyStepPropertyId,
        setSeizedPropertyStepPropertyId,
        seizedPropertyStepEntityKind,
        setSeizedPropertyStepEntityKind,
        seizedPropertyStepKind,
        setSeizedPropertyStepKind,
        seizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        setSeizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        setSeizedPropertyAuctionDateDraft,
        linkSeizureAuctionToAppointments,
        setLinkSeizureAuctionToAppointments,
        seizedPropertyBuyerNameDraft,
        setSeizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        setSeizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        setSeizedPropertyStepNotesDraft,
        seizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultModalOpen,
        seizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizureMarkModalOpen,
        setSeizureMarkModalOpen,
        seizureMarkModalEntityKind,
        setSeizureMarkModalEntityKind,
        seizureMarkModalEntityId,
        setSeizureMarkModalEntityId,
        seizureMarkLetterNumberDraft,
        setSeizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        setSeizureMarkDateDraft,
        seizureMarkEntityDraft,
        setSeizureMarkEntityDraft,
        publicationModalOpen,
        setPublicationModalOpen,
        publicationModalEntityKind,
        setPublicationModalEntityKind,
        publicationModalEntityId,
        setPublicationModalEntityId,
        publicationNewspaperNameDraft,
        setPublicationNewspaperNameDraft,
        publicationDateYmdDraft,
        setPublicationDateYmdDraft,
        showRealEstateSeizureModal,
        setShowRealEstateSeizureModal,
        realEstateSeizureModalDecisionId,
        setRealEstateSeizureModalDecisionId,
    };
}

export type UseExecutionSeizedPropertyStepEventsParams = {
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: React.MutableRefObject<ExecutionFile | null | undefined>;
    focusSeizurePropertyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureMovableInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    setSeizedPropertyStepEntityKind: (v: 'property' | 'movable') => void;
    setSeizedPropertyStepDecisionId: (v: string | null) => void;
    setSeizedPropertyStepPropertyId: (v: string | null) => void;
    setSeizedPropertyStepKind: (
        v: 'experts' | 'auction' | 'award' | 'reauction_default' | null,
    ) => void;
    setSeizedPropertyExpertsNamesDraft: (v: string) => void;
    setSeizedPropertyExpertReportDateDraft: (v: string) => void;
    setSeizedPropertyExpertPriceDraft: (v: string) => void;
    setSeizedPropertyAuctionDateDraft: (v: string) => void;
    setSeizedPropertyBuyerNameDraft: (v: string) => void;
    setSeizedPropertyAwardAmountDraft: (v: string) => void;
    setSeizedPropertyStepNotesDraft: (v: string) => void;
    setSeizedPropertyStepModalOpen: (v: boolean) => void;
};

export function useExecutionSeizedPropertyStepEvents(params: UseExecutionSeizedPropertyStepEventsParams) {
    const {
        executionDataId,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        setSeizedPropertyStepEntityKind,
        setSeizedPropertyStepDecisionId,
        setSeizedPropertyStepPropertyId,
        setSeizedPropertyStepKind,
        setSeizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertPriceDraft,
        setSeizedPropertyAuctionDateDraft,
        setSeizedPropertyBuyerNameDraft,
        setSeizedPropertyAwardAmountDraft,
        setSeizedPropertyStepNotesDraft,
        setSeizedPropertyStepModalOpen,
    } = params;

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subject?: string }>;
            const myId = String(executionDataId ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            if (!decisionId) return;
            focusSeizurePropertyInlineRef.current(decisionId, String(ce.detail?.subject || '').trim());
        };
        window.addEventListener('hami-open-seized-property-init', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-property-init', handler as EventListener);
    }, [executionDataId, executionId, focusSeizurePropertyInlineRef]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subject?: string }>;
            const myId = String(executionDataId ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            if (!decisionId) return;
            focusSeizureMovableInlineRef.current(decisionId, String(ce.detail?.subject || '').trim());
        };
        window.addEventListener('hami-open-seized-movable-init', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-movable-init', handler as EventListener);
    }, [executionDataId, executionId, focusSeizureMovableInlineRef]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                seizedPropertyId?: string;
                step?: 'experts' | 'auction' | 'award' | 'reauction_default';
            }>;
            const myId = String(executionDataId ?? executionId ?? '').trim();
            const storageId = String(decisionsStorageExecutionId ?? '').trim();
            const evId = String(ce.detail?.executionId ?? '').trim();
            const allowedIds = new Set(
                [myId, storageId, String(executionId ?? '').trim()].filter(
                    (x) => x && x !== 'undefined' && x !== 'null',
                ),
            );
            if (!evId || !allowedIds.has(evId)) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const seizedPropertyId = String(ce.detail?.seizedPropertyId || '').trim();
            const step = ce.detail?.step ?? null;
            if (!decisionId || !seizedPropertyId || !step) return;
            setSeizedPropertyStepEntityKind('property');
            setSeizedPropertyStepDecisionId(decisionId);
            setSeizedPropertyStepPropertyId(seizedPropertyId);
            setSeizedPropertyStepKind(step);
            setSeizedPropertyExpertsNamesDraft('');
            setSeizedPropertyExpertReportDateDraft('');
            setSeizedPropertyExpertPriceDraft('');
            setSeizedPropertyAuctionDateDraft('');
            setSeizedPropertyBuyerNameDraft('');
            setSeizedPropertyAwardAmountDraft('');
            setSeizedPropertyStepNotesDraft('');
            const list = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
            const hit = list.find((x) => String(x.id) === seizedPropertyId);
            if (hit) {
                if (step === 'experts') {
                    setSeizedPropertyExpertsNamesDraft(
                        Array.isArray(hit.expertNames) ? hit.expertNames.join('، ') : '',
                    );
                    setSeizedPropertyExpertReportDateDraft(String(hit.expertReportDateYmd || ''));
                    setSeizedPropertyExpertPriceDraft(
                        hit.experts?.estimatedPriceIqd != null
                            ? formatNumberInput(String(hit.experts.estimatedPriceIqd))
                            : hit.estimatedPriceIqd != null
                              ? formatNumberInput(String(hit.estimatedPriceIqd))
                              : (hit as { expertEstimatedAmountIqd?: number }).expertEstimatedAmountIqd != null
                                ? formatNumberInput(
                                      String((hit as { expertEstimatedAmountIqd?: number }).expertEstimatedAmountIqd),
                                  )
                                : '',
                    );
                } else if (step === 'auction') {
                    setSeizedPropertyAuctionDateDraft(String(hit.auction?.auctionDateYmd || ''));
                } else if (step === 'award') {
                    setSeizedPropertyBuyerNameDraft(
                        String(
                            hit.award?.buyerName ||
                                hit.initialAwardBuyerName ||
                                hit.lastBidderOrBuyerName ||
                                '',
                        ),
                    );
                    setSeizedPropertyAwardAmountDraft(
                        hit.award?.awardAmountIqd != null
                            ? String(hit.award.awardAmountIqd)
                            : hit.initialAwardAmountIqd != null
                              ? String(hit.initialAwardAmountIqd)
                              : hit.finalAwardAmountIqd != null
                                ? String(hit.finalAwardAmountIqd)
                                : '',
                    );
                } else if (step === 'reauction_default') {
                    setSeizedPropertyStepNotesDraft(String(hit.reauctionDefault?.notes || ''));
                }
            }
            setSeizedPropertyStepModalOpen(true);
        };
        window.addEventListener('hami-open-seized-property-step', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-property-step', handler as EventListener);
    }, [
        executionDataId,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        setSeizedPropertyStepEntityKind,
        setSeizedPropertyStepDecisionId,
        setSeizedPropertyStepPropertyId,
        setSeizedPropertyStepKind,
        setSeizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertPriceDraft,
        setSeizedPropertyAuctionDateDraft,
        setSeizedPropertyBuyerNameDraft,
        setSeizedPropertyAwardAmountDraft,
        setSeizedPropertyStepNotesDraft,
        setSeizedPropertyStepModalOpen,
    ]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                seizedMovableId?: string;
                step?: 'experts' | 'auction' | 'award' | 'reauction_default';
            }>;
            const myId = String(executionDataId ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const seizedMovableId = String(ce.detail?.seizedMovableId || '').trim();
            const step = ce.detail?.step ?? null;
            if (!seizedMovableId || !step) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-movable-inline-focus', {
                        detail: {
                            executionId: myId,
                            movableId: seizedMovableId,
                            step,
                            decisionId,
                        },
                    }),
                );
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('hami-open-seized-movable-step', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-movable-step', handler as EventListener);
    }, [executionDataId, executionId]);
}

export type UseExecutionGuarantorDetailsModalParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
};

export function useExecutionGuarantorDetailsModal({
    executionData,
    executionId,
}: UseExecutionGuarantorDetailsModalParams) {
    const [showGuarantorDetailsModal, setShowGuarantorDetailsModal] = useState(false);
    const [guarantorDetailsDecisionId, setGuarantorDetailsDecisionId] = useState<string | null>(null);
    const [guarantorNameDraft, setGuarantorNameDraft] = useState('');
    const [guarantorWorkplaceDraft, setGuarantorWorkplaceDraft] = useState('');
    const [guarantorSalaryDraft, setGuarantorSalaryDraft] = useState('');
    const [guarantorDeductionDraft, setGuarantorDeductionDraft] = useState('');
    const [guarantorPanelExpanded, setGuarantorPanelExpanded] = useState(false);
    const guarantorAutoOpenStampRef = useRef(0);

    const openGuarantorDetailsModal = useCallback(
        (decisionId?: string) => {
            const exId = String(executionData?.id ?? executionId ?? '').trim();
            const did = String(decisionId ?? '').trim();
            if (did) {
                setGuarantorDetailsDecisionId(did);
            } else if (exId) {
                const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
                const candidates = rows.filter(
                    (r) =>
                        String(r.requestKind || '') === 'guarantor_request' &&
                        (String((r as { executorOutcome?: string }).executorOutcome || '') === 'approved' ||
                            String((r as { executorOutcome?: string }).executorOutcome || '') ===
                                'alternative') &&
                        !Boolean(String((r as { guarantorDetailsSavedAt?: string }).guarantorDetailsSavedAt || '').trim()),
                );
                if (candidates.length > 0) {
                    const best = candidates.reduce((acc, cur) => {
                        const a = String((acc as { resolvedAt?: string; date?: string }).resolvedAt ?? (acc as { date?: string }).date ?? '');
                        const b = String((cur as { resolvedAt?: string; date?: string }).resolvedAt ?? (cur as { date?: string }).date ?? '');
                        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
                    }, candidates[0]);
                    const bestId = String((best as { id?: string }).id || '').trim();
                    if (bestId) setGuarantorDetailsDecisionId(bestId);
                }
            }
            const gf = executionData?.guarantor_followup;
            setGuarantorNameDraft(String(gf?.guarantor_name ?? '').trim());
            setGuarantorWorkplaceDraft(String(gf?.guarantor_workplace ?? '').trim());
            setGuarantorSalaryDraft(formatStoredAmountForInput(gf?.guarantor_salary_iqd));
            setGuarantorDeductionDraft(formatStoredAmountForInput(gf?.guarantor_deduction_iqd));
            setShowGuarantorDetailsModal(true);
        },
        [executionData?.guarantor_followup, executionData?.id, executionId],
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            const nowMs = Date.now();
            if (nowMs - guarantorAutoOpenStampRef.current > 1200) {
                guarantorAutoOpenStampRef.current = nowMs;
                const did = String(ce.detail?.decisionId || '').trim();
                if (did) setGuarantorDetailsDecisionId(did);
                openGuarantorDetailsModal();
            }
        };
        window.addEventListener('hami-open-guarantor-details', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-guarantor-details', handler as EventListener);
    }, [executionData?.id, executionId, openGuarantorDetailsModal]);

    return {
        showGuarantorDetailsModal,
        setShowGuarantorDetailsModal,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
        guarantorNameDraft,
        setGuarantorNameDraft,
        guarantorWorkplaceDraft,
        setGuarantorWorkplaceDraft,
        guarantorSalaryDraft,
        setGuarantorSalaryDraft,
        guarantorDeductionDraft,
        setGuarantorDeductionDraft,
        guarantorPanelExpanded,
        setGuarantorPanelExpanded,
        openGuarantorDetailsModal,
    };
}
