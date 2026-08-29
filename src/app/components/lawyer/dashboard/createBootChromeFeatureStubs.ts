import { paintSettingsInstantChrome, concealSettingsWarmShell } from '@/app/runtime/settingsInstantPaint';
import { snapProfileShellClose } from '@/app/services/profile/profileShellSnap';
import {
    clearProfileOpenedThisPage,
    markProfileOpenedThisPage,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

const noop = () => undefined;

export type LawyerDashboardSettingsFeature = {
    showSettings: boolean;
    setShowSettings: (next: boolean) => void;
    closeSettings: () => void;
    settingsSessionKey: number;
    settingsHostMounted: boolean;
    primeSettingsShellMount: () => void;
    resetSettingsShell: () => void;
    openSettings: () => void;
};

export type LawyerDashboardProfileFeature = {
    profileOpenEpoch: number;
    profileHostMounted: boolean;
    primeProfileTabMount: () => void;
    openProfileTab: () => void;
    closeProfileTab: () => void;
};

/** تسخين ≠ فتح — hover كان يُفرَّغ كـ openProfileTab فيظهر الملف بلا ضغط */
export type BootChromePendingOp = 'settings' | 'settings-prime' | 'profile' | 'profile-prime';

function isOpenOp(op: BootChromePendingOp | null): boolean {
    return op === 'profile' || op === 'settings';
}

function isPrimeOp(op: BootChromePendingOp | null): boolean {
    return op === 'profile-prime' || op === 'settings-prime';
}

/** الفتح يبقى إن جاء تسخين بعده؛ وإلا آخر نية تفوز */
export function coalesceBootChromePendingOp(
    current: BootChromePendingOp | null,
    next: BootChromePendingOp,
): BootChromePendingOp {
    if (current && isOpenOp(current) && isPrimeOp(next)) return current;
    return next;
}

export function bootChromePendingOpFamily(
    op: BootChromePendingOp,
): 'settings' | 'profile' {
    return op === 'settings' || op === 'settings-prime' ? 'settings' : 'profile';
}

/** stubs خفيفة قبل first-tab — الترس/الملف يُسلَّحان كسولاً دون سحب المقاطع الثقيلة */
export function createBootChromeFeatureStubs(
    requestArm: (op: BootChromePendingOp) => void,
    clearPending?: (op?: BootChromePendingOp) => void,
): {
    settings: LawyerDashboardSettingsFeature;
    profile: LawyerDashboardProfileFeature;
} {
    const settings: LawyerDashboardSettingsFeature = {
        showSettings: false,
        setShowSettings: noop,
        closeSettings: () => {
            concealSettingsWarmShell();
            clearPending?.('settings');
        },
        settingsSessionKey: 0,
        settingsHostMounted: false,
        primeSettingsShellMount: () => requestArm('settings-prime'),
        resetSettingsShell: noop,
        openSettings: () => {
            paintSettingsInstantChrome();
            requestArm('settings');
        },
    };

    const profile: LawyerDashboardProfileFeature = {
        profileOpenEpoch: 0,
        profileHostMounted: false,
        primeProfileTabMount: () => requestArm('profile-prime'),
        openProfileTab: () => {
            markProfileOpenedThisPage();
            requestArm('profile');
        },
        closeProfileTab: () => {
            clearProfileOpenedThisPage();
            snapProfileShellClose();
            clearPending?.('profile');
        },
    };

    return { settings, profile };
}

export function runBootChromePendingOp(
    live: {
        settings: LawyerDashboardSettingsFeature;
        profile: LawyerDashboardProfileFeature;
    },
    op: BootChromePendingOp | null,
): void {
    if (op === 'settings') live.settings.openSettings();
    if (op === 'settings-prime') live.settings.primeSettingsShellMount();
    if (op === 'profile') live.profile.openProfileTab();
    if (op === 'profile-prime') live.profile.primeProfileTabMount();
}

export function isBootChromeOpenOp(op: BootChromePendingOp | null): op is 'settings' | 'profile' {
    return op === 'settings' || op === 'profile';
}

export function isBootChromePendingOpSatisfied(
    live: {
        settings: LawyerDashboardSettingsFeature;
        profile: LawyerDashboardProfileFeature;
    },
    op: BootChromePendingOp | null,
): boolean {
    if (!op) return true;
    if (op === 'settings') return live.settings.showSettings;
    if (op === 'profile') return live.profile.profileHostMounted;
    return false;
}
