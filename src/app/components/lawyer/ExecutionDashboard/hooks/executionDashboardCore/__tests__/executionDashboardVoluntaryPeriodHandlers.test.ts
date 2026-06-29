import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardVoluntaryPeriodHandlers } from '../useExecutionDashboardVoluntaryPeriodHandlers';

describe('useExecutionDashboardVoluntaryPeriodHandlers', () => {
    const extraVoluntaryParams = () => ({
        voluntaryAttendanceCount: 0,
        summoningRound: 1,
        setDebtorSummonsMarkerLocal: vi.fn(),
        setDebtorAttendedVoluntarily: vi.fn(),
        setActiveNoticeState: vi.fn(),
        setVoluntaryAttendanceCount: vi.fn(),
        setSummoningRound: vi.fn(),
        setDebtorNotificationDate: vi.fn(),
    });

    beforeEach(() => {
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-06-27T12:00:00.000Z');
    });

    it('handleDeclareEvictionVoluntaryPeriodEnd persists eviction flag when grace expired', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setTimelineEvents = vi.fn((fn) => {
            if (typeof fn === 'function') fn([]);
        });
        let seq = 0;
        const nextTimelineId = () => `tl-${++seq}`;

        const { result } = renderHook(() =>
            useExecutionDashboardVoluntaryPeriodHandlers({
                isEvictionExecutionModule: true,
                evictionGraceAnchorDate: '2026-06-01',
                executionData: { id: 'e1' } as any,
                voluntaryEndOptimistic: false,
                unifiedSummonsTargetDebtorKey: 'd1',
                primaryDebtorKeyResolved: 'd1',
                activeDebtorNoticeScope: {},
                debtorNotificationDate: null,
                noticeVoluntaryPeriodEndOptimistic: false,
                manualGraceCalendarExtra: false,
                nextTimelineId,
                persistExecutionMerge,
                showToast,
                setVoluntaryEndOptimistic: vi.fn(),
                setNoticeVoluntaryPeriodEndOptimistic: vi.fn(),
                setTimelineEvents,
                ...extraVoluntaryParams(),
            }),
        );

        act(() => {
            result.current.handleDeclareEvictionVoluntaryPeriodEnd();
        });

        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('تم تسجيل انتهاء المهلة', 'success');
    });

    it('handleDeclareNoticeVoluntaryPeriodEnd warns when anchor missing', () => {
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardVoluntaryPeriodHandlers({
                isEvictionExecutionModule: false,
                evictionGraceAnchorDate: null,
                executionData: null,
                voluntaryEndOptimistic: false,
                unifiedSummonsTargetDebtorKey: 'd1',
                primaryDebtorKeyResolved: 'd1',
                activeDebtorNoticeScope: {},
                debtorNotificationDate: null,
                noticeVoluntaryPeriodEndOptimistic: false,
                manualGraceCalendarExtra: false,
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge: vi.fn(),
                showToast,
                setVoluntaryEndOptimistic: vi.fn(),
                setNoticeVoluntaryPeriodEndOptimistic: vi.fn(),
                setTimelineEvents: vi.fn(),
                ...extraVoluntaryParams(),
            }),
        );

        act(() => {
            result.current.handleDeclareNoticeVoluntaryPeriodEnd();
        });

        expect(showToast).toHaveBeenCalledWith(
            'لا يوجد تاريخ مذكرة إخبار مُسجَّل لاحتساب المدة',
            'warning',
        );
    });
});
