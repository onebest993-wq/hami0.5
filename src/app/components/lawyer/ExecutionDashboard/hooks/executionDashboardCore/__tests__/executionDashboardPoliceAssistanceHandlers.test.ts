import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardPoliceAssistanceHandlers } from '../useExecutionDashboardPoliceAssistanceHandlers';

describe('useExecutionDashboardPoliceAssistanceHandlers', () => {
    const baseParams = () => ({
        evictionProcedureLocked: false,
        decisionsStorageExecutionId: 'dossier-1',
        executionData: { id: 'exec-1' } as any,
        executionId: 'exec-1',
        executorApprovalActions: { getFieldVisitDeadlineIso: () => null },
        timelineEventsRef: { current: [] },
        caseTasksPendingRef: {
            current: [{ id: 'eviction-police-assistance-dec-1', title: 't', body: 'b' }],
        },
        policeAssistanceDecisionId: 'dec-1',
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setCaseTasksPending: vi.fn(),
        setTimelineEvents: vi.fn(),
        setPoliceAssistanceDecisionId: vi.fn(),
        setPoliceAssistanceRequestTitle: vi.fn(),
        setPoliceAssistanceAgencyDraft: vi.fn(),
        setPoliceAssistanceModalOpen: vi.fn(),
        executionDataRef: {
            current: {
                eviction_police_assistance: {
                    decisionId: 'dec-1',
                    agencyName: 'شرطة بغداد',
                },
            },
        },
        setShowDecisionsModal: vi.fn(),
        setShowUnifiedExecutionModal: vi.fn(),
        setUnifiedModalTab: vi.fn(),
        setFollowupExpandProcedureKey: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('completePoliceAssistance warns when procedure locked', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPoliceAssistanceHandlers({
                ...baseParams(),
                evictionProcedureLocked: true,
                showToast,
            }),
        );

        act(() => {
            result.current.completePoliceAssistance();
        });

        expect(showToast).toHaveBeenCalledWith(
            'لا يمكن إتمام الطلب — الإضبارة أو الإجراءات مقفلة.',
            'warning',
        );
    });

    it('completePoliceAssistance persists completion and clears task', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setCaseTasksPending = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardPoliceAssistanceHandlers({
                ...baseParams(),
                persistExecutionMerge,
                showToast,
                setCaseTasksPending,
            }),
        );

        act(() => {
            result.current.completePoliceAssistance();
        });

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                eviction_police_assistance: expect.objectContaining({
                    decisionId: 'dec-1',
                    completedAt: '2026-06-27T12:00:00.000Z',
                }),
                caseTasksPending: [],
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم إتمام طلب القوة الجبرية', 'success');
    });

    it('openPoliceAssistanceFromBadge opens modal from execution state', () => {
        const setPoliceAssistanceModalOpen = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPoliceAssistanceHandlers({
                ...baseParams(),
                setPoliceAssistanceModalOpen,
            }),
        );

        act(() => {
            result.current.openPoliceAssistanceFromBadge();
        });

        expect(setPoliceAssistanceModalOpen).toHaveBeenCalledWith(true);
    });
});
