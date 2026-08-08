import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    persistMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    warmDiskMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    revealMock: vi.fn(() => false),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    persistFieldTasksSessionOpen: mocks.persistMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm', () => ({
    warmFieldTasksOnOpen: mocks.warmOnOpenMock,
    warmFieldTasksManagerOnOpen: mocks.warmOnOpenMock,
}));

vi.mock('@/app/services/fieldTasks/fieldTasksPerfMetrics', () => ({
    clearFieldTasksPerfMarks: mocks.clearPerfMock,
    markFieldTasksPerfPhase: mocks.markPerfMock,
}));

vi.mock('@/app/utils/quantumTasksStorage', () => ({
    warmQuantumTasksDiskRead: mocks.warmDiskMock,
}));

describe('fieldTasksShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('commitFieldTasksSheetOpen يفتح الستارة ويُسجّل الجلسة', async () => {
        const { commitFieldTasksSheetOpen } = await import(
            '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow'
        );
        const setFieldTasksSheetOpen = vi.fn();
        const setActiveTab = vi.fn();

        commitFieldTasksSheetOpen({
            sheetOpenRef: { current: true },
            instantPaint: { revealFieldTasksWarmSheet: mocks.revealMock } as never,
            setFieldTasksHostMounted: vi.fn(),
            setTasksManagerFocusTaskId: vi.fn(),
            setShowTasksManager: vi.fn(),
            setFieldTasksSheetOpen,
            setActiveTab,
        });

        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(mocks.revealMock).toHaveBeenCalled();
        expect(mocks.warmDiskMock).toHaveBeenCalled();
        expect(mocks.warmOnOpenMock).toHaveBeenCalled();
        expect(setFieldTasksSheetOpen).toHaveBeenCalledWith(true);
        expect(mocks.persistMock).toHaveBeenCalledWith(true, 'sheet');

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.dismissMock).toHaveBeenCalledWith('field-tasks');
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('commitFieldTasksSheetOpen يُلتزم فوراً حتى مع كشف دافئ (بلا تأخير RAF)', async () => {
        mocks.revealMock.mockReturnValueOnce(true);
        const { commitFieldTasksSheetOpen } = await import(
            '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow'
        );
        const setFieldTasksSheetOpen = vi.fn();

        commitFieldTasksSheetOpen({
            sheetOpenRef: { current: true },
            instantPaint: { revealFieldTasksWarmSheet: mocks.revealMock } as never,
            setFieldTasksHostMounted: vi.fn(),
            setTasksManagerFocusTaskId: vi.fn(),
            setShowTasksManager: vi.fn(),
            setFieldTasksSheetOpen,
            setActiveTab: vi.fn(),
        });

        expect(setFieldTasksSheetOpen).toHaveBeenCalledWith(true);
        expect(mocks.revealMock).toHaveBeenCalledTimes(1);
    });

    it('commitTasksManagerOpen يُفعّل المدير عبر flushSync', async () => {
        const { commitTasksManagerOpen } = await import(
            '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow'
        );
        const armFieldTasksManagerHost = vi.fn();
        const revealTasksManager = vi.fn();
        const afterOpen = vi.fn();

        commitTasksManagerOpen({
            focusTaskId: 'task-1',
            armFieldTasksManagerHost,
            revealTasksManager,
            afterOpen,
        });

        expect(armFieldTasksManagerHost).toHaveBeenCalled();
        expect(revealTasksManager).toHaveBeenCalledWith('task-1');
        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.warmOnOpenMock).toHaveBeenCalled();

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.dismissMock).toHaveBeenCalledWith('tasks-manager');
        expect(afterOpen).toHaveBeenCalled();
    });
});
