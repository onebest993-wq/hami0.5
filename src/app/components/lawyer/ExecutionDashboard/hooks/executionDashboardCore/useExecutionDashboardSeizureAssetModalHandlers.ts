// @ts-nocheck
/** Phase C — تركيز inline للحجز + نوافذ التأييد/النشر/المزاد */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type {
    ExecutionFile,
    SeizedMovable,
    SeizedProperty,
    TimelineEvent,
} from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import { saveSeizedPropertyAuctionSessionResult as runSaveSeizedPropertyAuctionSessionResult } from './executionDashboardAuctionSessionResult';
import {
    savePublicationDetails as runSavePublicationDetails,
    saveSeizedPropertyStepDetails as runSaveSeizedPropertyStepDetails,
    saveSeizureMarkConfirmation as runSaveSeizureMarkConfirmation,
} from './executionDashboardSeizedPropertyModals';
import { openFollowupSeizureRequestsModal, type OpenFollowupModalPersistedFn } from '../../utils/followupModalOpen';
import { requireDecisionsStorageExecutionId } from '../../utils/requireDecisionsStorageExecutionId';
import { SEIZURE_CLOSE_UNIFIED_LOG_EVENT } from '../../utils/seizureInlineFocusUtils';

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

export type UseExecutionDashboardSeizureAssetModalHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    openSeizureRequestsTabRef: MutableRefObject<(() => void) | null>;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    showToast: (message: string, type?: string) => void;
    linkSeizureAuctionToAppointments: boolean;
    pushSeizureAuctionCalendarAppointment: (input: Record<string, unknown>) => void;
    seizureMatrixLedgerParamsRef: MutableRefObject<UnifiedLedgerTotalParams | null>;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
    setShowCoerciveActionForm: Dispatch<SetStateAction<string | null>>;
    setSeizureDetailCompletion: Dispatch<SetStateAction<unknown>>;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    openFollowupModalPersisted?: OpenFollowupModalPersistedFn;
    seizureMarkModalEntityId: string | null;
    seizureMarkModalEntityKind: 'property' | 'movable';
    seizureMarkLetterNumberDraft: string;
    seizureMarkDateDraft: string;
    seizureMarkEntityDraft: string;
    setSeizureMarkModalOpen: (open: boolean) => void;
    setSeizureMarkModalEntityId: (id: string | null) => void;
    setSeizureMarkModalEntityKind: Dispatch<SetStateAction<'property' | 'movable'>>;
    setSeizureMarkLetterNumberDraft: Dispatch<SetStateAction<string>>;
    setSeizureMarkDateDraft: Dispatch<SetStateAction<string>>;
    setSeizureMarkEntityDraft: Dispatch<SetStateAction<string>>;
    publicationModalEntityId: string | null;
    publicationModalEntityKind: 'property' | 'movable';
    publicationNewspaperNameDraft: string;
    publicationDateYmdDraft: string;
    setPublicationModalOpen: (open: boolean) => void;
    setPublicationModalEntityId: (id: string | null) => void;
    setPublicationModalEntityKind: Dispatch<SetStateAction<'property' | 'movable'>>;
    setPublicationNewspaperNameDraft: Dispatch<SetStateAction<string>>;
    setPublicationDateYmdDraft: Dispatch<SetStateAction<string>>;
    seizedPropertyAuctionResultPropertyId: string | null;
    seizedPropertyAuctionResultEntityKind: 'property' | 'movable';
    seizedPropertyAuctionResultOutcome: string;
    seizedPropertyAuctionResultBuyerNameDraft: string;
    seizedPropertyAuctionResultAmountDraft: string;
    seizedPropertyAuctionDepositAmountDraft: string;
    setSeizedPropertyAuctionResultModalOpen: (open: boolean) => void;
    setSeizedPropertyAuctionResultPropertyId: (id: string | null) => void;
    setSeizedPropertyAuctionResultEntityKind: Dispatch<SetStateAction<'property' | 'movable'>>;
    setSeizedPropertyAuctionResultOutcome: Dispatch<SetStateAction<string>>;
    setSeizedPropertyAuctionResultBuyerNameDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyAuctionResultAmountDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyAuctionDepositAmountDraft: Dispatch<SetStateAction<string>>;
    seizedPropertyStepDecisionId: string | null;
    seizedPropertyStepEntityKind: 'property' | 'movable';
    seizedPropertyStepPropertyId: string | null;
    seizedPropertyStepKind: string;
    seizedPropertyExpertsNamesDraft: string;
    seizedPropertyExpertReportDateDraft: string;
    seizedPropertyExpertPriceDraft: string;
    seizedPropertyAuctionDateDraft: string;
    seizedPropertyBuyerNameDraft: string;
    seizedPropertyAwardAmountDraft: string;
    seizedPropertyStepNotesDraft: string;
    setSeizedPropertyStepModalOpen: (open: boolean) => void;
    setSeizedPropertyStepDecisionId: (id: string | null) => void;
    setSeizedPropertyStepPropertyId: (id: string | null) => void;
    setSeizedPropertyStepEntityKind: Dispatch<SetStateAction<'property' | 'movable'>>;
    setSeizedPropertyStepKind: Dispatch<SetStateAction<string>>;
    setSeizedPropertyExpertsNamesDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyExpertReportDateDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyExpertPriceDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyAuctionDateDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyBuyerNameDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyAwardAmountDraft: Dispatch<SetStateAction<string>>;
    setSeizedPropertyStepNotesDraft: Dispatch<SetStateAction<string>>;
};

export function useExecutionDashboardSeizureAssetModalHandlers(
    params: UseExecutionDashboardSeizureAssetModalHandlersParams,
) {
    const {
        decisionsStorageExecutionId,
        executionId,
        executionDataRef,
        openSeizureRequestsTabRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
        seizureMatrixLedgerParamsRef,
        setUnifiedLedgerRevision,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        openFollowupModalPersisted,
        setShowUnifiedExecutionModal,
        seizureMarkModalEntityId,
        seizureMarkModalEntityKind,
        seizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkModalEntityKind,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        publicationModalEntityId,
        publicationModalEntityKind,
        publicationNewspaperNameDraft,
        publicationDateYmdDraft,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationModalEntityKind,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        seizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizedPropertyStepDecisionId,
        seizedPropertyStepEntityKind,
        seizedPropertyStepPropertyId,
        seizedPropertyStepKind,
        seizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        seizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        setSeizedPropertyStepModalOpen,
        setSeizedPropertyStepDecisionId,
        setSeizedPropertyStepPropertyId,
        setSeizedPropertyStepEntityKind,
        setSeizedPropertyStepKind,
        setSeizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertPriceDraft,
        setSeizedPropertyAuctionDateDraft,
        setSeizedPropertyBuyerNameDraft,
        setSeizedPropertyAwardAmountDraft,
        setSeizedPropertyStepNotesDraft,
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

    const saveSeizureMarkConfirmation = useCallback(() => {
        runSaveSeizureMarkConfirmation({
            seizureMarkModalEntityId,
            seizureMarkModalEntityKind,
            seizureMarkLetterNumberDraft,
            seizureMarkDateDraft,
            seizureMarkEntityDraft,
            executionDataRef,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            setSeizureMarkModalOpen,
            setSeizureMarkModalEntityId,
            setSeizureMarkLetterNumberDraft,
            setSeizureMarkDateDraft,
            setSeizureMarkEntityDraft,
            showToast,
        });
    }, [
        executionDataRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        seizureMarkLetterNumberDraft,
        seizureMarkModalEntityId,
        seizureMarkModalEntityKind,
        showToast,
        setSeizureMarkModalEntityId,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkModalOpen,
    ]);

    const savePublicationDetails = useCallback(() => {
        runSavePublicationDetails({
            publicationModalEntityId,
            publicationModalEntityKind,
            publicationNewspaperNameDraft,
            publicationDateYmdDraft,
            executionDataRef,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            setPublicationModalOpen,
            setPublicationModalEntityId,
            setPublicationNewspaperNameDraft,
            setPublicationDateYmdDraft,
            showToast,
        });
    }, [
        executionDataRef,
        nextTimelineId,
        persistExecutionMerge,
        publicationDateYmdDraft,
        publicationModalEntityId,
        publicationModalEntityKind,
        publicationNewspaperNameDraft,
        pushTimelineEvent,
        showToast,
        setPublicationDateYmdDraft,
        setPublicationModalEntityId,
        setPublicationModalOpen,
        setPublicationNewspaperNameDraft,
    ]);

    const saveSeizedPropertyStepDetails = useCallback(() => {
        runSaveSeizedPropertyStepDetails({
            decisionsStorageExecutionId,
            seizedPropertyStepDecisionId,
            seizedPropertyStepEntityKind,
            seizedPropertyStepPropertyId,
            seizedPropertyStepKind,
            seizedPropertyExpertsNamesDraft,
            seizedPropertyExpertReportDateDraft,
            seizedPropertyExpertPriceDraft,
            seizedPropertyAuctionDateDraft,
            seizedPropertyBuyerNameDraft,
            seizedPropertyAwardAmountDraft,
            seizedPropertyStepNotesDraft,
            linkSeizureAuctionToAppointments,
            executionDataRef,
            seizureMatrixLedgerParamsRef,
            setUnifiedLedgerRevision,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            pushSeizureAuctionCalendarAppointment,
            setSeizedPropertyStepModalOpen,
            setSeizedPropertyStepDecisionId,
            setSeizedPropertyStepPropertyId,
            setSeizedPropertyStepEntityKind,
            setSeizedPropertyStepKind,
            setSeizedPropertyExpertsNamesDraft,
            setSeizedPropertyExpertReportDateDraft,
            setSeizedPropertyExpertPriceDraft,
            setSeizedPropertyAuctionDateDraft,
            setSeizedPropertyBuyerNameDraft,
            setSeizedPropertyAwardAmountDraft,
            setSeizedPropertyStepNotesDraft,
            showToast,
        });
    }, [
        decisionsStorageExecutionId,
        executionDataRef,
        linkSeizureAuctionToAppointments,
        nextTimelineId,
        persistExecutionMerge,
        pushSeizureAuctionCalendarAppointment,
        pushTimelineEvent,
        seizureMatrixLedgerParamsRef,
        seizedPropertyAuctionDateDraft,
        seizedPropertyAwardAmountDraft,
        seizedPropertyBuyerNameDraft,
        seizedPropertyExpertPriceDraft,
        seizedPropertyExpertReportDateDraft,
        seizedPropertyExpertsNamesDraft,
        seizedPropertyStepDecisionId,
        seizedPropertyStepEntityKind,
        seizedPropertyStepKind,
        seizedPropertyStepNotesDraft,
        seizedPropertyStepPropertyId,
        setUnifiedLedgerRevision,
        showToast,
        setSeizedPropertyAuctionDateDraft,
        setSeizedPropertyAwardAmountDraft,
        setSeizedPropertyBuyerNameDraft,
        setSeizedPropertyExpertPriceDraft,
        setSeizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertsNamesDraft,
        setSeizedPropertyStepDecisionId,
        setSeizedPropertyStepEntityKind,
        setSeizedPropertyStepKind,
        setSeizedPropertyStepModalOpen,
        setSeizedPropertyStepNotesDraft,
        setSeizedPropertyStepPropertyId,
    ]);

    const saveSeizedPropertyAuctionSessionResult = useCallback(() => {
        runSaveSeizedPropertyAuctionSessionResult({
            seizedPropertyAuctionResultPropertyId,
            seizedPropertyAuctionResultEntityKind,
            seizedPropertyAuctionResultOutcome,
            seizedPropertyAuctionResultBuyerNameDraft,
            seizedPropertyAuctionResultAmountDraft,
            seizedPropertyAuctionDepositAmountDraft,
            executionDataRef,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            setSeizedPropertyAuctionResultModalOpen,
            setSeizedPropertyAuctionResultPropertyId,
            setSeizedPropertyAuctionResultEntityKind,
            setSeizedPropertyAuctionResultOutcome,
            setSeizedPropertyAuctionResultBuyerNameDraft,
            setSeizedPropertyAuctionResultAmountDraft,
            setSeizedPropertyAuctionDepositAmountDraft,
            showToast,
        });
    }, [
        executionDataRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        seizedPropertyAuctionDepositAmountDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultPropertyId,
        showToast,
        setSeizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultPropertyId,
    ]);

    return {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        openSeizureMarkModal,
        openPublicationModal,
        openAuctionResultModal,
        saveSeizureMarkConfirmation,
        savePublicationDetails,
        saveSeizedPropertyStepDetails,
        saveSeizedPropertyAuctionSessionResult,
    };
}
