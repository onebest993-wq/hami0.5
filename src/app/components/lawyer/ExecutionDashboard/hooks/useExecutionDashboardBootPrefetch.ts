import { useEffect } from 'react';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import {
    prefetchExecutionDashboardShell,
    prefetchExecutionModalContainers,
    prefetchExecutionOverlayModals,
} from '../executionDashboardLazyRegistry';
import { prefetchExecutionFollowupOverlay } from '../executionDashboardOverlayPrefetch';
import { prefetchExecutionDashboardPhoneBody } from '../executionDashboardPhoneBodyLazy';

/** تحميل مسبق متدرج بعد فتح الإضبارة — محضر المتابعة فوري لتقليل انتظار أول فتح. */
export function useExecutionDashboardBootPrefetch(): void {
    useEffect(() => {
        // أولوية قصوى: ShellOverlays + Portal (مضمّن) + تبويب الحجز + الجسور
        prefetchExecutionFollowupOverlay();

        if (isLitePerformanceActive()) {
            return;
        }

        prefetchExecutionDashboardShell();
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
