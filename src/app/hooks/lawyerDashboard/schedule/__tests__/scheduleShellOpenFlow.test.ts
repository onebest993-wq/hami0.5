import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    loadHostMock: vi.fn(() => Promise.resolve({})),
    isSnappedOpen: vi.fn(() => false),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
    reconcileBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/services/calendar/calendarPerfMetrics', () => ({
    clearCalendarPerfMarks: mocks.clearPerfMock,
    markCalendarPerfPhase: mocks.markPerfMock,
}));

vi.mock('@/app/services/schedule/scheduleShellSnap', () => ({
    snapScheduleShellOpen: vi.fn(() => false),
    snapScheduleShellClose: vi.fn(),
    scheduleShellReactSync: (fn: () => void) => fn(),
    isScheduleShellSnappedOpen: mocks.isSnappedOpen,
}));

vi.mock('@/app/runtime/scheduleHubLoader', () => ({
    prefetchScheduleTabHostModule: vi.fn(),
    loadScheduleTabHostModule: mocks.loadHostMock,
}));

describe('scheduleShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.isSnappedOpen.mockReturnValue(false);
    });

    it('commitScheduleTabOpen يفتح التبويب مع تركيز اختياري', async () => {
        const { commitScheduleTabOpen } = await import(
            '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow'
        );
        const armScheduleHost = vi.fn();
        const setCalendarSearchFocus = vi.fn();
        const setActiveTab = vi.fn();

        commitScheduleTabOpen({
            opts: { date: '2026-06-01', eventId: 'ev-1' },
            armScheduleHost,
            setCalendarSearchFocus,
            setActiveTab,
        });

        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        await vi.waitFor(() => {
            expect(armScheduleHost).toHaveBeenCalled();
            expect(setCalendarSearchFocus).toHaveBeenCalledWith({
                date: '2026-06-01',
                eventId: 'ev-1',
            });
            expect(setActiveTab).toHaveBeenCalledWith('schedule');
            expect(mocks.dismissMock).toHaveBeenCalledTimes(1);
        });
    });

    it('commitScheduleTabOpen يمسح التركيز بلا opts', async () => {
        const { commitScheduleTabOpen } = await import(
            '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow'
        );
        const setCalendarSearchFocus = vi.fn();

        commitScheduleTabOpen({
            armScheduleHost: vi.fn(),
            setCalendarSearchFocus,
            setActiveTab: vi.fn(),
        });

        await vi.waitFor(() => {
            expect(setCalendarSearchFocus).toHaveBeenCalledWith(null);
        });
        await vi.waitFor(() => {
            expect(mocks.loadHostMock).toHaveBeenCalled();
        });
    });

    it('يفتح فوراً دون انتظار مقطع Host', async () => {
        mocks.loadHostMock.mockImplementation(() => new Promise(() => {}));
        const { commitScheduleTabOpen } = await import(
            '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow'
        );
        const armScheduleHost = vi.fn();
        const setActiveTab = vi.fn();

        commitScheduleTabOpen({
            armScheduleHost,
            setCalendarSearchFocus: vi.fn(),
            setActiveTab,
        });

        expect(armScheduleHost).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('schedule');
    });

    it('لا يمسح marks الفتح إذا كان التقويم مفتوحاً أصلاً', async () => {
        mocks.isSnappedOpen.mockReturnValue(true);
        const { commitScheduleTabOpen } = await import(
            '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow'
        );
        const armScheduleHost = vi.fn();
        const setCalendarSearchFocus = vi.fn();
        const setActiveTab = vi.fn();

        commitScheduleTabOpen({
            opts: { date: '2026-06-01', eventId: 'ev-1' },
            armScheduleHost,
            setCalendarSearchFocus,
            setActiveTab,
        });

        expect(mocks.clearPerfMock).not.toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(mocks.markPerfMock).toHaveBeenCalledWith('interactive');
        expect(armScheduleHost).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('schedule');
        expect(setCalendarSearchFocus).toHaveBeenCalledWith({
            date: '2026-06-01',
            eventId: 'ev-1',
        });
        await vi.waitFor(() => {
            expect(mocks.loadHostMock).toHaveBeenCalled();
        });
    });

    it('commitScheduleTabClose يعيد الرئيسية فوراً مع snap DOM', async () => {
        const { commitScheduleTabClose } = await import(
            '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow'
        );
        const { snapScheduleShellClose } = await import('@/app/services/schedule/scheduleShellSnap');
        const setCalendarSearchFocus = vi.fn();
        const setActiveTab = vi.fn();

        commitScheduleTabClose({ setCalendarSearchFocus, setActiveTab });

        expect(snapScheduleShellClose).toHaveBeenCalled();
        expect(setCalendarSearchFocus).toHaveBeenCalledWith(null);
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });
});
