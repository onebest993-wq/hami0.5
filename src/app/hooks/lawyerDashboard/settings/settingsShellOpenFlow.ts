import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    paintSettingsInstantChrome,
} from '@/app/runtime/settingsInstantPaint';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
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

function schedulePostOpenWork(showSettingsRef: MutableRefObject<boolean>): void {
    const run = () => {
        if (!showSettingsRef.current) return;
        dismissTransientOverlays('settings');
        void loadSettingsIntentWarm()
            .then((m) => m.warmSettingsOnOpen())
            .catch(() => undefined);
    };
    queueMicrotask(run);
}

/**
 * فتح لحظي: جسر/كروم في نفس اللمسة، ثم React دون تجميد الإيماءة
 * حتى لا تُرمى شجرة المركز دفعة واحدة فوق الجسر.
 */
export function commitSettingsShellOpen({
    showSettingsRef,
    ensureSettingsHostMounted,
    setShowSettings,
    onAfterCommit,
}: CommitSettingsShellOpenParams): void {
    showSettingsRef.current = true;
    prefetchSettingsOverlayEntry();
    paintSettingsInstantChrome();
    markSettingsPerfPhase('first-paint');

    ensureSettingsHostMounted();
    showSettingsRef.current = true;
    setShowSettings(true);
    onAfterCommit?.();
    queueMicrotask(() => persistSettingsSessionOpen(true));
    schedulePostOpenWork(showSettingsRef);
}
