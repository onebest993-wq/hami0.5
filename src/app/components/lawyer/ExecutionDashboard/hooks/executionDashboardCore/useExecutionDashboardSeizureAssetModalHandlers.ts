/** Phase C — تركيز inline للحجز + نوافذ التأييد/النشر/المزاد */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { openFollowupSeizureRequestsModal, type OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';
import { requireDecisionsStorageExecutionId } from '../../utils/requireDecisionsStorageExecutionId';
import { SEIZURE_CLOSE_UNIFIED_LOG_EVENT } from '../../utils/seizureInlineFocusUtils';
import { useExecutionDashboardSeizureAssetModalSaveHandlers } from './useExecutionDashboardSeizureAssetModalSaveHandlers';
import type { UseExecutionDashboardSeizureAssetModalHandlersParams } from './useExecutionDashboardSeizureAssetModalHandlers.types';

export type { UseExecutionDashboardSeizureAssetModalHandlersParams };

type FocusSeizureInlineHandler = (decisionId: string, subject?: string) => void;

function dispatchSeizureInlineFocus(eventName: string, detail: Record<string, unknown>): void {
    try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch {
        /* ignore */
    }
}

function buildFocusSeizureInlineHandler(
    eventName: string,
    resolveExecutionId: () => string,
    setShowCoerciveActionForm: Dispatch<SetStateAction<string | null>>,
    setSeizureDetailCompletion: Dispatch<SetStateAction<unknown>>,
    openFollowupModalPersisted: OpenFollowupModalPersistedFn | undefined,
    openSeizureRequestsTabRef: MutableRefObject<(() => void) | null>,
    setShowUnifiedExecutionModal: (show: boolean) => void,
): FocusSeizureInlineHandler {
    return (decisionId: string, subject?: string) => {
        const exId = resolveExecutionId();
        if (!exId || !decisionId) return;
        setShowCoerciveActionForm(null);
        setSeizureDetailCompletion(null);
        dispatchSeizureInlineFocus(SEIZURE_CLOSE_UNIFIED_LOG_EVENT, { executionId: exId });
        openFollowupSeizureRequestsModal(openFollowupModalPersisted, {
            setShowUnifiedExecutionModal,
            openSeizureRequestsTabRef,
        });
        dispatchSeizureInlineFocus(eventName, {
            executionId: exId,
            decisionId,
            subject: subject || '',
        });
    };
}

export function useExecutionDashboardSeizureAssetModalHandlers(
    params: UseExecutionDashboardSeizureAssetModalHandlersParams,
) {
    const {
        decisionsStorageExecutionId,
        executionId,
        executionDataRef,
        openSeizureRequestsTabRef,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkModalEntityKind,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationModalEntityKind,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
    } = params;

    const resolveExecutionId = useCallback(
        () =>
            requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId,
                executionId,
                executionData: executionDataRef.current as Record<string, unknown> | null,
            }),
        [decisionsStorageExecutionId, executionDataRef, executionId],
    );

    const focusInlineDeps = [
        resolveExecutionId,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        openFollowupModalPersisted,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
    ] as const;

    const focusSeizurePropertyInlineCompletion = useCallback(
        buildFocusSeizureInlineHandler(
            'hami-focus-seizure-property-inline',
            resolveExecutionId,
            setShowCoerciveActionForm,
            setSeizureDetailCompletion,
            openFollowupModalPersisted,
            openSeizureRequestsTabRef,
            setShowUnifiedExecutionModal,
        ),
        focusInlineDeps,
    );

    const focusSeizureMovableInlineCompletion = useCallback(
        buildFocusSeizureInlineHandler(
            'hami-focus-seizure-movable-inline',
            resolveExecutionId,
            setShowCoerciveActionForm,
            setSeizureDetailCompletion,
            openFollowupModalPersisted,
            openSeizureRequestsTabRef,
            setShowUnifiedExecutionModal,
        ),
        focusInlineDeps,
    );

    const focusSeizureThirdPartyInlineCompletion = useCallback(
        buildFocusSeizureInlineHandler(
            'hami-focus-seizure-third-party-inline',
            resolveExecutionId,
            setShowCoerciveActionForm,
            setSeizureDetailCompletion,
            openFollowupModalPersisted,
            openSeizureRequestsTabRef,
            setShowUnifiedExecutionModal,
        ),
        focusInlineDeps,
    );

    const focusSeizureNoticeInlineCompletion = useCallback(
        buildFocusSeizureInlineHandler(
            'hami-focus-seizure-notice-inline',
            resolveExecutionId,
            setShowCoerciveActionForm,
            setSeizureDetailCompletion,
            openFollowupModalPersisted,
            openSeizureRequestsTabRef,
            setShowUnifiedExecutionModal,
        ),
        focusInlineDeps,
    );

    const openMovableInlineStep = useCallback(
        (movableId: string, step: 'mark' | 'publication' | 'auction_result') => {
            dispatchSeizureInlineFocus('hami-movable-inline-focus', {
                executionId: resolveExecutionId(),
                movableId,
                step,
            });
        },
        [resolveExecutionId],
    );

    const readSeizedEntityList = useCallback(
        (entityKind: 'property' | 'movable') =>
            entityKind === 'movable'
                ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
                : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]),
        [executionDataRef],
    );

    const openSeizureMarkModal = useCallback(
        (entityKind: 'property' | 'movable', entityId: string) => {
            const id = String(entityId || '').trim();
            if (!id) return;
            if (entityKind === 'movable') {
                openMovableInlineStep(id, 'mark');
                return;
            }
            setSeizureMarkModalEntityKind(entityKind);
            setSeizureMarkModalEntityId(id);
            const hit = (readSeizedEntityList(entityKind) as Array<Record<string, unknown>>).find(
                (x) => String(x.id) === id,
            );
            setSeizureMarkLetterNumberDraft(String(hit?.seizureMarkLetterNumber || '').trim());
            setSeizureMarkDateDraft(String(hit?.seizureMarkDate || '').trim());
            setSeizureMarkEntityDraft(String(hit?.seizureMarkEntity || '').trim());
            setSeizureMarkModalOpen(true);
        },
        [
            openMovableInlineStep,
            readSeizedEntityList,
            setSeizureMarkDateDraft,
            setSeizureMarkEntityDraft,
            setSeizureMarkLetterNumberDraft,
            setSeizureMarkModalEntityId,
            setSeizureMarkModalEntityKind,
            setSeizureMarkModalOpen,
        ],
    );

    const openPublicationModal = useCallback(
        (entityKind: 'property' | 'movable', entityId: string) => {
            const id = String(entityId || '').trim();
            if (!id) return;
            if (entityKind === 'movable') {
                openMovableInlineStep(id, 'publication');
                return;
            }
            setPublicationModalEntityKind(entityKind);
            setPublicationModalEntityId(id);
            const hit = (readSeizedEntityList(entityKind) as Array<Record<string, unknown>>).find(
                (x) => String(x.id) === id,
            );
            setPublicationNewspaperNameDraft(String(hit?.newspaperName || '').trim());
            setPublicationDateYmdDraft(String(hit?.publicationDateYmd || '').trim());
            setPublicationModalOpen(true);
        },
        [
            openMovableInlineStep,
            readSeizedEntityList,
            setPublicationDateYmdDraft,
            setPublicationModalEntityId,
            setPublicationModalEntityKind,
            setPublicationModalOpen,
            setPublicationNewspaperNameDraft,
        ],
    );

    const openAuctionResultModal = useCallback(
        (entityKind: 'property' | 'movable', entityId: string) => {
            const id = String(entityId || '').trim();
            if (!id) return;
            if (entityKind === 'movable') {
                openMovableInlineStep(id, 'auction_result');
                return;
            }
            setSeizedPropertyAuctionResultEntityKind(entityKind);
            setSeizedPropertyAuctionResultPropertyId(id);
            setSeizedPropertyAuctionResultOutcome('initial_award');
            const hit = (readSeizedEntityList(entityKind) as Array<Record<string, unknown>>).find(
                (x) => String(x.id) === id,
            );
            setSeizedPropertyAuctionResultBuyerNameDraft(
                String(hit?.initialAwardBuyerName || '').trim(),
            );
            setSeizedPropertyAuctionResultAmountDraft(
                hit?.initialAwardAmountIqd != null &&
                    Number.isFinite(Number(hit.initialAwardAmountIqd)) &&
                    Number(hit.initialAwardAmountIqd) > 0
                    ? String(hit.initialAwardAmountIqd)
                    : '',
            );
            setSeizedPropertyAuctionDepositAmountDraft(
                hit?.auctionDepositAmountIqd != null &&
                    Number.isFinite(Number(hit.auctionDepositAmountIqd)) &&
                    Number(hit.auctionDepositAmountIqd) > 0
                    ? String(hit.auctionDepositAmountIqd)
                    : '',
            );
            setSeizedPropertyAuctionResultModalOpen(true);
        },
        [
            openMovableInlineStep,
            readSeizedEntityList,
            setSeizedPropertyAuctionDepositAmountDraft,
            setSeizedPropertyAuctionResultAmountDraft,
            setSeizedPropertyAuctionResultBuyerNameDraft,
            setSeizedPropertyAuctionResultEntityKind,
            setSeizedPropertyAuctionResultModalOpen,
            setSeizedPropertyAuctionResultOutcome,
            setSeizedPropertyAuctionResultPropertyId,
        ],
    );

    const saveHandlers = useExecutionDashboardSeizureAssetModalSaveHandlers(params);

    return {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        openSeizureMarkModal,
        openPublicationModal,
        openAuctionResultModal,
        ...saveHandlers,
    };
}
