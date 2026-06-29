let profileTabShellPromise: Promise<unknown> | null = null;

/** shell تبويب الملف — خفيف (~LawyerDashboardProfileTab فقط) */
export function prefetchLawyerDashboardProfileTabShell(): void {
    if (typeof window === 'undefined') return;
    if (!profileTabShellPromise) {
        profileTabShellPromise = import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab').catch(
            (err) => {
                profileTabShellPromise = null;
                throw err;
            },
        );
    }
    void profileTabShellPromise.catch(() => undefined);
}

export function resetLawyerDashboardProfileTabShellForTests(): void {
    profileTabShellPromise = null;
}
