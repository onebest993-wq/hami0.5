import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardSeizureAssetModalHandlers } from '../useExecutionDashboardSeizureAssetModalHandlers';
import { SEIZURE_CLOSE_UNIFIED_LOG_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';

describe('useExecutionDashboardSeizureAssetModalHandlers', () => {
    const baseParams = () => ({
        decisionsStorageExecutionId: 'dossier-1',
        executionId: 'exec-1',
        executionDataRef: { current: { id: 'exec-1', seizedProperties: [] } },
        openSeizureRequestsTabRef: { current: vi.fn() },
        nextTimelineId: () => 'tl-1',
        persistExecutionMerge: vi.fn(),
        pushTimelineEvent: vi.fn(),
        showToast: vi.fn(),
        linkSeizureAuctionToAppointments: false,
        pushSeizureAuctionCalendarAppointment: vi.fn(),
        seizureMatrixLedgerParamsRef: { current: null },
        setUnifiedLedgerRevision: vi.fn(),
        setShowCoerciveActionForm: vi.fn(),
        setSeizureDetailCompletion: vi.fn(),
        setShowUnifiedExecutionModal: vi.fn(),
        seizureMarkModalEntityId: null,
        seizureMarkModalEntityKind: 'property' as const,
        seizureMarkLetterNumberDraft: '',
        seizureMarkDateDraft: '',
        seizureMarkEntityDraft: '',
        setSeizureMarkModalOpen: vi.fn(),
        setSeizureMarkModalEntityId: vi.fn(),
        setSeizureMarkModalEntityKind: vi.fn(),
        setSeizureMarkLetterNumberDraft: vi.fn(),
        setSeizureMarkDateDraft: vi.fn(),
        setSeizureMarkEntityDraft: vi.fn(),
        publicationModalEntityId: null,
        publicationModalEntityKind: 'property' as const,
        publicationNewspaperNameDraft: '',
        publicationDateYmdDraft: '',
        setPublicationModalOpen: vi.fn(),
        setPublicationModalEntityId: vi.fn(),
        setPublicationModalEntityKind: vi.fn(),
        setPublicationNewspaperNameDraft: vi.fn(),
        setPublicationDateYmdDraft: vi.fn(),
        seizedPropertyAuctionResultPropertyId: null,
        seizedPropertyAuctionResultEntityKind: 'property' as const,
        seizedPropertyAuctionResultOutcome: 'initial_award',
        seizedPropertyAuctionResultBuyerNameDraft: '',
        seizedPropertyAuctionResultAmountDraft: '',
        seizedPropertyAuctionDepositAmountDraft: '',
        setSeizedPropertyAuctionResultModalOpen: vi.fn(),
        setSeizedPropertyAuctionResultPropertyId: vi.fn(),
        setSeizedPropertyAuctionResultEntityKind: vi.fn(),
        setSeizedPropertyAuctionResultOutcome: vi.fn(),
        setSeizedPropertyAuctionResultBuyerNameDraft: vi.fn(),
        setSeizedPropertyAuctionResultAmountDraft: vi.fn(),
        setSeizedPropertyAuctionDepositAmountDraft: vi.fn(),
        seizedPropertyStepDecisionId: null,
        seizedPropertyStepEntityKind: 'property' as const,
        seizedPropertyStepPropertyId: null,
        seizedPropertyStepKind: '',
        seizedPropertyExpertsNamesDraft: '',
        seizedPropertyExpertReportDateDraft: '',
        seizedPropertyExpertPriceDraft: '',
        seizedPropertyAuctionDateDraft: '',
        seizedPropertyBuyerNameDraft: '',
        seizedPropertyAwardAmountDraft: '',
        seizedPropertyStepNotesDraft: '',
        setSeizedPropertyStepModalOpen: vi.fn(),
        setSeizedPropertyStepDecisionId: vi.fn(),
        setSeizedPropertyStepPropertyId: vi.fn(),
        setSeizedPropertyStepEntityKind: vi.fn(),
        setSeizedPropertyStepKind: vi.fn(),
        setSeizedPropertyExpertsNamesDraft: vi.fn(),
        setSeizedPropertyExpertReportDateDraft: vi.fn(),
        setSeizedPropertyExpertPriceDraft: vi.fn(),
        setSeizedPropertyAuctionDateDraft: vi.fn(),
        setSeizedPropertyBuyerNameDraft: vi.fn(),
        setSeizedPropertyAwardAmountDraft: vi.fn(),
        setSeizedPropertyStepNotesDraft: vi.fn(),
    });

    it('focusSeizurePropertyInlineCompletion opens unified modal and tab', () => {
        const setShowUnifiedExecutionModal = vi.fn();
        const openTab = vi.fn();
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() =>
            useExecutionDashboardSeizureAssetModalHandlers({
                ...baseParams(),
                setShowUnifiedExecutionModal,
                openSeizureRequestsTabRef: { current: openTab },
            }),
        );

        act(() => {
            result.current.focusSeizurePropertyInlineCompletion('dec-1', 'عقار');
        });

        expect(setShowUnifiedExecutionModal).toHaveBeenCalledWith(true);
        expect(openTab).toHaveBeenCalled();
        expect(
            dispatchSpy.mock.calls.some(
                (call) =>
                    call[0] instanceof CustomEvent &&
                    (call[0] as CustomEvent).type === SEIZURE_CLOSE_UNIFIED_LOG_EVENT,
            ),
        ).toBe(true);
        dispatchSpy.mockRestore();
    });

    it('openSeizureMarkModal for movable dispatches inline focus event', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { result } = renderHook(() =>
            useExecutionDashboardSeizureAssetModalHandlers(baseParams()),
        );

        act(() => {
            result.current.openSeizureMarkModal('movable', 'mov-1');
        });

        expect(dispatchSpy).toHaveBeenCalled();
        dispatchSpy.mockRestore();
    });
});
