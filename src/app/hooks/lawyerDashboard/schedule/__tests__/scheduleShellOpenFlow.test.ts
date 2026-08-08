import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
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
}));

describe('scheduleShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
        expect(armScheduleHost).toHaveBeenCalled();
        expect(setCalendarSearchFocus).toHaveBeenCalledWith({
            date: '2026-06-01',
            eventId: 'ev-1',
        });
        expect(setActiveTab).toHaveBeenCalledWith('schedule');
        expect(mocks.dismissMock).toHaveBeenCalledTimes(1);

        await new Promise<void>((resolve) => queueMicrotask(resolve));
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

        expect(setCalendarSearchFocus).toHaveBeenCalledWith(null);
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
