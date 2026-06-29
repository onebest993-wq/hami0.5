type ScheduleHubModule = [
    typeof import('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab'),
    typeof import('@/app/components/lawyer/SmartLegalRadar.tsx'),
];

let hubModulePromise: Promise<ScheduleHubModule> | null = null;

export function loadScheduleHubModule(): Promise<ScheduleHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = Promise.all([
            import('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab'),
            import('@/app/components/lawyer/SmartLegalRadar.tsx'),
        ]);
    }
    return hubModulePromise;
}

export function prefetchScheduleHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadScheduleHubModule().catch(() => undefined);
}
