let fullWarmStarted = false;

/** بعد first-tab الصادق فقط — مسار FullBoot الحي. */
export function warmLawyerDashboardFullBootChunks(): void {
    if (typeof window === 'undefined' || fullWarmStarted) return;
    fullWarmStarted = true;
    void import('@/app/components/lawyer/dashboard/LawyerDashboardFullBootPath');
    void import('@/app/components/lawyer/dashboard/LawyerDashboardFullOrchestrationHost');
    void import('@/app/components/lawyer/dashboard/LawyerDashboardMainView');
    void import('@/app/runtime/commandHubTilesLoader').then((m) => m.prefetchCommandHubTiles());
    void import('@/app/runtime/homeTabContentLoader').then((m) => m.prefetchHomeTabContent());
}

export function resetLawyerDashboardFirstTabWarmForTests(): void {
    fullWarmStarted = false;
}
