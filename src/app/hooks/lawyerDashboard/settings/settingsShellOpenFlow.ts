import type { MutableRefObject } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    paintSettingsInstantChrome,
} from '@/app/runtime/settingsInstantPaint';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import { markSettingsPerfPhase, clearSettingsPerfMarks } from '@/app/services/settings/settingsPerfMetrics';
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

let openFlowCounter = 0;
const openFlowActiveRef = { current: 0 };

function prefetchOpenSettingsTabs(): void {
    const flowAtCall = openFlowActiveRef.current;
    void import('@/app/components/lawyer/HamiSettings/settingsSectionLoad')
        .then((m) => {
            if (openFlowActiveRef.current !== flowAtCall) return;
            m.prefetchSettingsOpenTabChunks();
        })
        .catch(() => undefined);
}

function schedulePostOpenWork(showSettingsRef: MutableRefObject<boolean>): void {
    const flowAtCall = openFlowActiveRef.current;
    const run = () => {
        if (openFlowActiveRef.current !== flowAtCall) return;
        if (!showSettingsRef.current) return;
        dismissTransientOverlays('settings');
        void loadSettingsIntentWarm()
            .then((m) => {
                if (openFlowActiveRef.current !== flowAtCall) return;
                if (!showSettingsRef.current) return;
                m.warmSettingsOnOpen();
            })
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
    clearSettingsPerfMarks();
    openFlowCounter += 1;
    const thisFlowId = openFlowCounter;
    openFlowActiveRef.current = thisFlowId;

    showSettingsRef.current = true;
    prefetchSettingsOverlayEntry();
    paintSettingsInstantChrome();
    prefetchOpenSettingsTabs();
    markSettingsPerfPhase('first-paint');

    ensureSettingsHostMounted();
    showSettingsRef.current = true;
    setShowSettings(true);
    onAfterCommit?.();
    queueMicrotask(() => {
        if (openFlowActiveRef.current !== thisFlowId) return;
        persistSettingsSessionOpen(true);
    });
    schedulePostOpenWork(showSettingsRef);
}
