import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardDebtorSummonsCoerciveHandlers } from '../useExecutionDashboardDebtorSummonsCoerciveHandlers';

describe('useExecutionDashboardDebtorSummonsCoerciveHandlers', () => {
    const baseParams = () => ({
        executionData: { id: 'exec-1' },
        unifiedSummonsTargetDebtorKey: 'primary_debtor',
        primaryDebtorKeyResolved: 'primary_debtor',
        debtorSummonsMarkerLocal: null,
        summonsPurposeDraft: '',
        forcedSummoningAnalysis: { canForceSummon: false, lockReasonAr: 'مقفل' },
        activeDebtorNameResolved: 'مدين',
        activeFollowupDebtorKey: 'primary_debtor',
        nextTimelineId: () => 'tl-1',
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setTimelineEvents: vi.fn((fn) => (typeof fn === 'function' ? fn([]) : fn)),
        setDebtorSummonsMarkerLocal: vi.fn(),
        setSummonsMarkerPopoverOpen: vi.fn(),
        setForcedAttendanceIssued: vi.fn(),
        setActiveNoticeState: vi.fn(),
        setForcedPathAttendanceSecured: vi.fn(),
        setDebtorForcedToAttend: vi.fn(),
        setInvestigationCourtRequested: vi.fn(),
        setInvestigationPathDebtorPresent: vi.fn(),
        setInvestigationMemoIssued: vi.fn(),
        setArrestWarrantUnlocked: vi.fn(),
        setDebtorEvaded: vi.fn(),
        setDebtorArrested: vi.fn(),
        setEarnerFeeCollectionSm: vi.fn(),
    });

    it('handleForcedAttendance respects forcedSummoningAnalysis lock', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardDebtorSummonsCoerciveHandlers({
                ...baseParams(),
                showToast,
            }),
        );

        act(() => {
            result.current.handleForcedAttendance();
        });

        expect(showToast).toHaveBeenCalledWith('مقفل', 'warning');
    });

    it('handleEarnerSecureForcedAttendance persists flags + timeline', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardDebtorSummonsCoerciveHandlers({
                ...baseParams(),
                persistExecutionMerge,
                showToast,
            }),
        );

        act(() => {
            result.current.handleEarnerSecureForcedAttendance();
        });

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                forcedPathAttendanceSecured: true,
                debtorForcedToAttend: true,
                timelineEvents: expect.any(Array),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم تسجيل تأمين الإحضار', 'success');
    });

    it('clearDebtorSummonsMarker no-ops without marker id', () => {
        const persistExecutionMerge = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardDebtorSummonsCoerciveHandlers({
                ...baseParams(),
                persistExecutionMerge,
            }),
        );

        act(() => {
            result.current.clearDebtorSummonsMarker();
        });

        expect(persistExecutionMerge).not.toHaveBeenCalled();
    });
});
