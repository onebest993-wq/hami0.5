import { useEffect } from 'react';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import {
    prefetchExecutionDashboardShell,
    prefetchExecutionModalContainers,
    prefetchExecutionOverlayModals,
} from '../executionDashboardLazyRegistry';
import { prefetchExecutionFollowupDefaultTab } from '../executionFollowupTabPrefetch';
import { prefetchExecutionDashboardPhoneBody } from '../executionDashboardPhoneBodyLazy';

/** تحميل مسبق متدرج بعد فتح الإضبارة — لا يدفع phone body/modals فوراً. */
export function useExecutionDashboardBootPrefetch(): void {
    useEffect(() => {
        if (isLitePerformanceActive()) {
            const cancel = scheduleIdleWork(() => {
                prefetchExecutionDashboardShell();
                prefetchExecutionFollowupDefaultTab();
            }, 8_000);
            return cancel;
        }

        prefetchExecutionDashboardShell();
        prefetchExecutionFollowupDefaultTab();
        const cancelPhoneBody = scheduleIdleWork(() => {
            prefetchExecutionDashboardPhoneBody();
        }, 1_200);
        const cancelModalContainers = scheduleIdleWork(() => {
            prefetchExecutionModalContainers();
        }, 2_400);
        const cancelOverlays = scheduleIdleWork(() => {
            prefetchExecutionOverlayModals();
        }, 4_000);
        return () => {
            cancelPhoneBody();
            cancelModalContainers();
            cancelOverlays();
        };
    }, []);
}
