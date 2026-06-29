import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardEvictionResidentialGraceHandlers } from '../useExecutionDashboardEvictionResidentialGraceHandlers';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: { setItemSync: vi.fn() },
}));

vi.mock('@/app/services/calendarDossierSync', () => ({
    syncExecutionTimelineAppointment: vi.fn(),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    readExecutorDecisionsArray: vi.fn(() => []),
    patchExecutorDecisionRow: vi.fn(),
}));

vi.mock('@/app/utils/residentialGraceTimeline', () => ({
    stripResidentialGraceTimelineEvents: vi.fn((events: unknown[]) => events ?? []),
}));

describe('useExecutionDashboardEvictionResidentialGraceHandlers', () => {
    const baseParams = () => ({
        graceModalAllowResave: false,
        residentialGracePeriodSaved: false,
        evictionProcedureLocked: false,
        evictionVacateDeadlineLocal: '',
        evictionVacateDraft: '',
        evictionResidentialGracePeriodStart: null,
        graceModalStartYmd: '2026-06-01',
        graceModalEndYmd: '2026-06-15',
        isResidentialVacateGraceFinished: false,
        residentialVacateDeadlineMaxIso: '2026-09-01',
        timelineEvents: [],
        timelineEventsRef: { current: [] },
        caseTasksPendingRef: { current: [] },
        decisionsStorageExecutionId: 'dossier-1',
        executionId: 'exec-1',
        executionData: { id: 'exec-1' } as any,
        file: null,
        currentFileId: 'file-1',
        evictionGraceDecisionId: null,
        executorApprovalActions: {},
        openBreakInventoryCompletion: vi.fn(),
        openJudicialCustodianCompletion: vi.fn(),
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setGraceModalEndYmd: vi.fn(),
        setGraceModalStartYmd: vi.fn(),
        setGraceModalAllowResave: vi.fn(),
        setShowEvictionResidentialGraceModal: vi.fn(),
        setEvictionGraceDecisionId: vi.fn(),
        setEvictionVacateDeadlineLocal: vi.fn(),
        setEvictionVacateDraft: vi.fn(),
        setEvictionResidentialGracePeriodStart: vi.fn(),
        setEvictionExecutorVacateGrantApproved: vi.fn(),
        setEvictionResidentialGraceManuallyEndedAt: vi.fn(),
        setTimelineEvents: vi.fn(),
        setCaseTasksPending: vi.fn(),
        setShowDecisionsModal: vi.fn(),
        setDecisionsModalBootListTab: vi.fn(),
        setDecisionsModalScrollToDecisionId: vi.fn(),
        setPoliceAssistanceDecisionId: vi.fn(),
        setPoliceAssistanceRequestTitle: vi.fn(),
        setPoliceAssistanceAgencyDraft: vi.fn(),
        setPoliceAssistanceModalOpen: vi.fn(),
        setShowUnifiedExecutionModal: vi.fn(),
        setUnifiedModalTab: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('residentialGraceModalShowPrimarySave is true when period not saved', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardEvictionResidentialGraceHandlers(baseParams()),
        );
        expect(result.current.residentialGraceModalShowPrimarySave).toBe(true);
    });

    it('openEvictionResidentialGraceModal warns when procedure locked', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardEvictionResidentialGraceHandlers({
                ...baseParams(),
                evictionProcedureLocked: true,
                showToast,
            }),
        );

        act(() => {
            result.current.openEvictionResidentialGraceModal();
        });

        expect(showToast).toHaveBeenCalledWith(
            'لا يمكن فتح المهلة — الإضبارة أو الإجراءات مقفلة.',
            'warning',
        );
    });

    it('submitEvictionResidentialGraceFromModal persists grace on valid dates', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setShowEvictionResidentialGraceModal = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardEvictionResidentialGraceHandlers({
                ...baseParams(),
                persistExecutionMerge,
                showToast,
                setShowEvictionResidentialGraceModal,
            }),
        );

        act(() => {
            result.current.submitEvictionResidentialGraceFromModal();
        });

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                eviction_vacate_deadline: '2026-06-15',
                eviction_residential_grace_period_start: '2026-06-01',
            }),
        );
        expect(setShowEvictionResidentialGraceModal).toHaveBeenCalledWith(false);
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('تم تسجيل المهلة'),
            'success',
        );
    });

    it('completeEvictionResidentialGrace warns when locked', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardEvictionResidentialGraceHandlers({
                ...baseParams(),
                evictionProcedureLocked: true,
                showToast,
            }),
        );

        act(() => {
            result.current.completeEvictionResidentialGrace();
        });

        expect(showToast).toHaveBeenCalledWith(
            'لا يمكن إتمام المهلة — الإضبارة أو الإجراءات مقفلة.',
            'warning',
        );
    });
});
