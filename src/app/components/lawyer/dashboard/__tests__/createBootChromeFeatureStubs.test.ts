import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    coalesceBootChromePendingOp,
    createBootChromeFeatureStubs,
    isBootChromeOpenOp,
    isBootChromePendingOpSatisfied,
    runBootChromePendingOp,
} from '@/app/components/lawyer/dashboard/createBootChromeFeatureStubs';

const snapOpen = vi.fn();
const snapClose = vi.fn();
const paintSettings = vi.fn();
const concealSettings = vi.fn();
const markOpened = vi.hoisted(() => vi.fn());

vi.mock('@/app/hooks/lawyerDashboard/profile/profileOpenSession', () => ({
    markProfileOpenedThisPage: (...args: unknown[]) => markOpened(...args),
    clearProfileOpenedThisPage: vi.fn(),
}));

vi.mock('@/app/services/profile/profileShellSnap', () => ({
    snapProfileShellOpen: (...args: unknown[]) => snapOpen(...args),
    snapProfileShellClose: (...args: unknown[]) => snapClose(...args),
}));

vi.mock('@/app/runtime/settingsInstantPaint', () => ({
    paintSettingsInstantChrome: (...args: unknown[]) => paintSettings(...args),
    concealSettingsWarmShell: (...args: unknown[]) => concealSettings(...args),
}));

describe('boot chrome pending op', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('تسخين الملف لا يُفرَّغ كفتح', () => {
        const openProfileTab = vi.fn();
        const primeProfileTabMount = vi.fn();
        runBootChromePendingOp(
            {
                settings: {
                    showSettings: false,
                    setShowSettings: vi.fn(),
                    closeSettings: vi.fn(),
                    settingsSessionKey: 0,
                    settingsHostMounted: false,
                    primeSettingsShellMount: vi.fn(),
                    resetSettingsShell: vi.fn(),
                    openSettings: vi.fn(),
                },
                profile: {
                    profileOpenEpoch: 0,
                    profileHostMounted: false,
                    primeProfileTabMount,
                    openProfileTab,
                    closeProfileTab: vi.fn(),
                },
            },
            'profile-prime',
        );
        expect(primeProfileTabMount).toHaveBeenCalledTimes(1);
        expect(openProfileTab).not.toHaveBeenCalled();
    });

    it('فتح الملف يبقى إن تبعه تسخين', () => {
        expect(coalesceBootChromePendingOp('profile', 'profile-prime')).toBe('profile');
        expect(coalesceBootChromePendingOp('profile-prime', 'profile')).toBe('profile');
        expect(coalesceBootChromePendingOp(null, 'profile-prime')).toBe('profile-prime');
    });

    it('isBootChromePendingOpSatisfied يميز الفتح عن التسخين', () => {
        const live = {
            settings: {
                showSettings: true,
                setShowSettings: vi.fn(),
                closeSettings: vi.fn(),
                settingsSessionKey: 1,
                settingsHostMounted: true,
                primeSettingsShellMount: vi.fn(),
                resetSettingsShell: vi.fn(),
                openSettings: vi.fn(),
            },
            profile: {
                profileOpenEpoch: 1,
                profileHostMounted: true,
                primeProfileTabMount: vi.fn(),
                openProfileTab: vi.fn(),
                closeProfileTab: vi.fn(),
            },
        };
        expect(isBootChromeOpenOp('settings')).toBe(true);
        expect(isBootChromeOpenOp('settings-prime')).toBe(false);
        expect(isBootChromePendingOpSatisfied(live, 'settings')).toBe(true);
        expect(isBootChromePendingOpSatisfied({ ...live, settings: { ...live.settings, showSettings: false } }, 'settings')).toBe(false);
    });

    it('stub التسخين يطلب profile-prime لا profile', () => {
        const requestArm = vi.fn();
        const stubs = createBootChromeFeatureStubs(requestArm);
        stubs.profile.primeProfileTabMount();
        expect(requestArm).toHaveBeenCalledWith('profile-prime');
        expect(snapOpen).not.toHaveBeenCalled();

        stubs.profile.openProfileTab();
        expect(requestArm).toHaveBeenCalledWith('profile');
        expect(snapOpen).not.toHaveBeenCalled();
        expect(markOpened).toHaveBeenCalledTimes(1);
    });
});
