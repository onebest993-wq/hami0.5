/**
 * Public surface — المواعيد / الرادار القانوني.
 */
export {
    loadScheduleHubModule,
    prefetchScheduleHubModule,
    getCachedLawyerDashboardScheduleTab,
    getCachedSmartLegalRadar,
    isScheduleShellModuleResolved,
} from '@/app/runtime/scheduleHubLoader';
export type {
    LawyerDashboardScheduleTabComponent,
    SmartLegalRadarComponent,
} from '@/app/runtime/scheduleHubLoader';
