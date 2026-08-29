/**
 * بديل بناء المقر فقط — بلا استيراد LawyerDashboardInner.
 */
export function getLawyerDashboardInnerSync(): null {
    return null;
}

export function prefetchLawyerDashboardInner(): void {
    /* HQ product excludes the lawyer board */
}

export function loadLawyerDashboardInner(): Promise<never> {
    return Promise.reject(new Error('lawyer dashboard inner is excluded from the headquarters product'));
}
