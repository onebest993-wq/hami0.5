/** واجهة كسولة لـ executionDashboardStore — تُبقى الحزمة الثقيلة خارج مسار إقلاع اللوحة */

export async function purgeExecutionDossierScopedState(dossierId: string): Promise<void> {
    const { useExecutionDashboardStore } = await import('@/app/stores/executionDashboardStore');
    useExecutionDashboardStore.getState().purgeDossierScopedState(dossierId);
}

export async function resetExecutionDashboardStore(): Promise<void> {
    const { useExecutionDashboardStore } = await import('@/app/stores/executionDashboardStore');
    useExecutionDashboardStore.getState().resetStore();
}
