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

/** تحميل مسبق لـ chunks الإضبارة — مؤجَّل على الأجهزة الخفيفة */
export function useExecutionDashboardBootPrefetch(): void {
    useEffect(() => {
        if (isLitePerformanceActive()) {
            const cancel = scheduleIdleWork(() => {
                prefetchExecutionDashboardShell();
            }, 8_000);
            return cancel;
        }

        prefetchExecutionDashboardPhoneBody();
        prefetchExecutionDashboardShell();
        prefetchExecutionFollowupDefaultTab();
        prefetchExecutionModalContainers();

        const cancel = scheduleIdleWork(() => {
            prefetchExecutionOverlayModals();
        }, 2_500);
        return cancel;
    }, []);
}
