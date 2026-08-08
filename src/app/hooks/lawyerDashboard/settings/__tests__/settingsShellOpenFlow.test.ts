import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    warmOnOpenMock: vi.fn(),
    paintMock: vi.fn(() => false),
    persistMock: vi.fn(),
    dismissMock: vi.fn(),
    markPerfMock: vi.fn(),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    persistSettingsSessionOpen: mocks.persistMock,
}));

vi.mock('@/app/runtime/settingsInstantPaint', () => ({
    applySettingsOpaqueChrome: vi.fn(),
    clearSettingsForceVisible: vi.fn(),
    paintSettingsInstantChrome: mocks.paintMock,
    removeSettingsInstantBridge: vi.fn(),
}));

vi.mock('@/app/services/settings/settingsPerfMetrics', () => ({
    markSettingsPerfPhase: mocks.markPerfMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnOpen: mocks.warmOnOpenMock,
}));

describe('settingsShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.paintMock.mockReturnValue(false);
    });

    it('commitSettingsShellOpen يفتح ويُسجّل الجلسة', async () => {
        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );
        const showSettingsRef = { current: false };
        const ensureSettingsHostMounted = vi.fn();
        const setShowSettings = vi.fn();
        const onAfterCommit = vi.fn();

        commitSettingsShellOpen({
            showSettingsRef,
            ensureSettingsHostMounted,
            setShowSettings,
            onAfterCommit,
        });

        expect(showSettingsRef.current).toBe(true);
        expect(ensureSettingsHostMounted).toHaveBeenCalled();
        expect(setShowSettings).toHaveBeenCalledWith(true);
        expect(mocks.persistMock).toHaveBeenCalledWith(true);
        expect(onAfterCommit).toHaveBeenCalled();

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.dismissMock).toHaveBeenCalledWith('settings');
        await vi.waitFor(() => {
            expect(mocks.warmOnOpenMock).toHaveBeenCalled();
        });
    });

    it('commitSettingsShellOpen يستخدم flushSync دائماً بلا requestAnimationFrame', async () => {
        mocks.paintMock.mockReturnValue(true);
        const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );
        const setShowSettings = vi.fn();

        commitSettingsShellOpen({
            showSettingsRef: { current: false },
            ensureSettingsHostMounted: vi.fn(),
            setShowSettings,
        });

        expect(rafSpy).not.toHaveBeenCalled();
        expect(setShowSettings).toHaveBeenCalledWith(true);
        rafSpy.mockRestore();
    });
});
