/**
 * تسخين أسطح اللوحة بعد interactive — خفيف فوراً، ثقيل عند الخمول.
 * يمنع منافسة شبكة/CPU مع كشف الإقلاع وأول تفاعل.
 */
import { prefetchArchivePortalShell } from '@/app/runtime/archivePortalBoot';

export type DashboardSurfaceWarmHandle = {
    cancel: () => void;
};

/**
 * 1) فهرس التنفيذ فوراً (بيانات — بلا deep chunks)
 * 2) تسخين أسطح مخفّف عند idle / مهلة قصيرة
 */
export function scheduleDashboardSurfaceWarmAfterInteractive(
    shellUid: string | null | undefined,
): DashboardSurfaceWarmHandle {
    if (typeof window === 'undefined') {
        return { cancel: () => undefined };
    }

    prefetchArchivePortalShell();

    void import('@/app/runtime/executionFilesEagerHydrate')
        .then((m) => m.startExecutionFilesEagerHydrate(shellUid ?? null))
        .catch(() => undefined);

    let idleId: number | null = null;
    let timeoutId: number | null = null;
    let cancelled = false;

    const runSurfaceWarm = () => {
        if (cancelled) return;
        void import('@/app/runtime/executionWorkspaceWarm')
            .then((m) =>
                m.warmExecutionWorkspace({
                    includeSecondary: false,
                    userId: shellUid ?? null,
                }),
            )
            .catch(() => undefined);
        void import('@/app/runtime/lawsuitWorkspaceWarm')
            .then((m) => m.warmLawsuitWorkspace({ includeSecondary: false }))
            .catch(() => undefined);
        void import('@/app/runtime/hubArchiveLoader')
            .then((m) => m.loadExecutionArchiveHubModule())
            .catch(() => undefined);
        void import('@/app/components/lawyer/dashboard/LawsuitsWorkspaceHost').catch(() => undefined);
    };

    if (typeof requestIdleCallback !== 'undefined') {
        idleId = requestIdleCallback(runSurfaceWarm, { timeout: 4_000 });
    } else {
        timeoutId = window.setTimeout(runSurfaceWarm, 1_200);
    }

    return {
        cancel: () => {
            cancelled = true;
            if (idleId != null && typeof cancelIdleCallback !== 'undefined') {
                cancelIdleCallback(idleId);
            }
            if (timeoutId != null) {
                window.clearTimeout(timeoutId);
            }
        },
    };
}
