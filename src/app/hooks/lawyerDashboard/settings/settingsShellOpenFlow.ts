import { flushSync } from 'react-dom';
import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    applySettingsOpaqueChrome,
    clearSettingsForceVisible,
    paintSettingsInstantChrome,
    removeSettingsInstantBridge,
} from '@/app/runtime/settingsInstantPaint';
import { markSettingsPerfPhase } from '@/app/services/settings/settingsPerfMetrics';
import { persistSettingsSessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

function loadSettingsIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/settingsIntentWarm');
}

export type CommitSettingsShellOpenParams = {
    showSettingsRef: MutableRefObject<boolean>;
    ensureSettingsHostMounted: () => void;
    setShowSettings: (open: boolean) => void;
    onAfterCommit?: () => void;
};

/**
 * فتح الإعدادات — نفس نمط الإشعارات:
 * طلاء DOM فوري ثم commit React في الإطار التالي (بلا flushSync إن وُجد Host).
 */
export function commitSettingsShellOpen({
    showSettingsRef,
    ensureSettingsHostMounted,
    setShowSettings,
    onAfterCommit,
}: CommitSettingsShellOpenParams): void {
    showSettingsRef.current = true;

    void import('@/app/runtime/deferredAppStyles')
        .then((m) => m.ensureDeferredAppStylesLoaded())
        .catch(() => undefined);

    void loadSettingsIntentWarm()
        .then((m) => m.warmSettingsOnOpen())
        .catch(() => undefined);

    const commitOpen = () => {
        ensureSettingsHostMounted();
        setShowSettings(true);
        markSettingsPerfPhase('first-paint');
        onAfterCommit?.();
    };

    /*
     * كشف Host + flushSync في نفس الدورة — بلا rAF ولا طلاء body مبكر
     * (applySettingsOpaqueChrome كان يُظهر شاشة #0B1021 قبل محتوى الإعدادات).
     */
    const revealed = paintSettingsInstantChrome();
    flushSync(commitOpen);
    if (!revealed) {
        paintSettingsInstantChrome();
    } else {
        applySettingsOpaqueChrome();
    }

    persistSettingsSessionOpen(true);
    removeSettingsInstantBridge();

    queueMicrotask(() => {
        if (!showSettingsRef.current) return;
        clearSettingsForceVisible();
        dismissTransientOverlays('settings');
    });
}
