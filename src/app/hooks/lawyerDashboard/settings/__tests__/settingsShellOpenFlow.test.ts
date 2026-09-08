import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    warmOnOpenMock: vi.fn(),
    paintMock: vi.fn(() => false),
    hasHostMock: vi.fn(() => false),
    persistMock: vi.fn(),
    dismissMock: vi.fn(),
    markPerfMock: vi.fn(),
    clearPerfMock: vi.fn(),
    snapOpenMock: vi.fn(() => false),
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
    armSettingsOverlayInteraction: vi.fn(),
    clearSettingsForceVisible: vi.fn(),
    hasSettingsOverlayHost: mocks.hasHostMock,
    paintSettingsInstantChrome: mocks.paintMock,
}));

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: vi.fn(),
}));

vi.mock('@/app/services/settings/settingsShellSnap', () => ({
    snapSettingsShellOpen: mocks.snapOpenMock,
}));

vi.mock('@/app/services/settings/settingsPerfMetrics', () => ({
    markSettingsPerfPhase: mocks.markPerfMock,
    clearSettingsPerfMarks: mocks.clearPerfMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnOpen: mocks.warmOnOpenMock,
}));

describe('settingsShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.paintMock.mockReturnValue(false);
        mocks.hasHostMock.mockReturnValue(false);
    });

    it('commitSettingsShellOpen يطلي ثم يلتزم React بلا flushSync', async () => {
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
        expect(mocks.paintMock).toHaveBeenCalled();
        expect(setShowSettings).toHaveBeenCalledWith(true);
        expect(onAfterCommit).toHaveBeenCalled();

        await Promise.resolve();
        expect(mocks.dismissMock).toHaveBeenCalledWith('settings');
        await vi.waitFor(() => {
            expect(mocks.warmOnOpenMock).toHaveBeenCalled();
        });
    });

    it('مسار دافئ: Host موجود + paint ناجح يلتزم React فوراً', async () => {
        mocks.hasHostMock.mockReturnValue(true);
        mocks.paintMock.mockReturnValue(true);

        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );
        const setShowSettings = vi.fn();

        commitSettingsShellOpen({
            showSettingsRef: { current: false },
            ensureSettingsHostMounted: vi.fn(),
            setShowSettings,
        });

        expect(setShowSettings).toHaveBeenCalledWith(true);
    });

    it('مسار بارد: يركّب Host عبر setState بلا flushSync', async () => {
        mocks.hasHostMock.mockReturnValue(false);
        mocks.paintMock.mockReturnValue(false);

        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );
        const setShowSettings = vi.fn();
        const ensureSettingsHostMounted = vi.fn();

        commitSettingsShellOpen({
            showSettingsRef: { current: false },
            ensureSettingsHostMounted,
            setShowSettings,
        });

        expect(ensureSettingsHostMounted).toHaveBeenCalled();
        expect(setShowSettings).toHaveBeenCalledWith(true);
    });

    it('نية الفتح تبقى حتى لو أعاد التركيب مزامنة المرجع', async () => {
        mocks.hasHostMock.mockReturnValue(false);
        mocks.paintMock.mockReturnValue(false);

        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );
        const showSettingsRef = { current: false };
        const setShowSettings = vi.fn();
        const ensureSettingsHostMounted = vi.fn(() => {
            showSettingsRef.current = false;
        });

        commitSettingsShellOpen({
            showSettingsRef,
            ensureSettingsHostMounted,
            setShowSettings,
        });

        expect(showSettingsRef.current).toBe(true);
        expect(setShowSettings).toHaveBeenCalledWith(true);
    });

    it('clearSettingsPerfMarks تستدعى أول شيء قبل first-paint — ترتيب صحيح', async () => {
        const callOrder: string[] = [];
        mocks.clearPerfMock.mockImplementation(() => callOrder.push('clear'));
        mocks.markPerfMock.mockImplementation((phase: string) => callOrder.push(`mark:${phase}`));
        mocks.paintMock.mockImplementation(() => {
            callOrder.push('paint');
            return false;
        });

        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );

        commitSettingsShellOpen({
            showSettingsRef: { current: false },
            ensureSettingsHostMounted: vi.fn(),
            setShowSettings: vi.fn(),
        });

        expect(callOrder[0]).toBe('clear');
        const firstPaintIdx = callOrder.indexOf('mark:first-paint');
        const clearIdx = callOrder.indexOf('clear');
        expect(clearIdx).toBeGreaterThan(-1);
        expect(firstPaintIdx).toBeGreaterThan(clearIdx);
    });

    it('Reopen سريع يلغي flow السابق — persist القديم لا يُستدعى', async () => {
        const firstRef = { current: false };
        const firstPersistCalls: boolean[] = [];
        mocks.persistMock.mockImplementation((v) => firstPersistCalls.push(v));

        const { commitSettingsShellOpen } = await import(
            '@/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow'
        );

        commitSettingsShellOpen({
            showSettingsRef: firstRef,
            ensureSettingsHostMounted: vi.fn(),
            setShowSettings: vi.fn(),
        });

        firstRef.current = false;

        commitSettingsShellOpen({
            showSettingsRef: { current: false },
            ensureSettingsHostMounted: vi.fn(),
            setShowSettings: vi.fn(),
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(firstRef.current).toBe(false);
        expect(mocks.persistMock).toHaveBeenLastCalledWith(true);
    });
});
