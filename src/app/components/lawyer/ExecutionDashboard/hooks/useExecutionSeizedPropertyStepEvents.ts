import { useEffect, type MutableRefObject } from 'react';
import type { ExecutionFile, SeizedProperty } from '@/app/types/execution';
import { formatNumberInput } from '@/app/utils/execution/amountInput';

export type UseExecutionSeizedPropertyStepEventsParams = {
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    focusSeizurePropertyInlineRef: MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureMovableInlineRef: MutableRefObject<(decisionId: string, subject?: string) => void>;
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
