export function loadLawyerHomeTabModule() {
    return import('@/app/components/lawyer/dashboard/LawyerDashboardHomeTab');
}

export function prefetchLawyerHomeTabModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawyerHomeTabModule().catch(() => undefined);
}
