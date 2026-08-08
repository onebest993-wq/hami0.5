/**
 * موازاة شبكة فورية من أول بايت — قبل تقييم mountApplication chunk.
 * يُستدعى sync من index.tsx؛ لا await.
 */
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';

function deferExecutionHydrateAfterBoot(): void {
    void import('@/app/bootstrap/bootReveal').then((boot) => {
        boot.onBootContentReady(() => {
            void import('@/app/utils/executionFilesBootstrap');
            void import('@/app/runtime/executionFilesEagerHydrate').then((m) => {
                m.startExecutionFilesEagerHydrate(peekBootSessionUserIdSync());
            });
        });
    });
}

export function kickoffBootCriticalPreload(): void {
    if (typeof window === 'undefined') return;

    void import('react');
    void import('react-dom/client');
    void import('@/boot/appModule').then((m) => m.loadAppModule());
    void import('@/app/AppRuntimeShell');
    void import('@/app/bootstrap/lawyerDashboardChunk').then((m) => m.preloadLawyerDashboardChunk());
    void import('@/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime');
    void import('@/app/components/lawyer/dashboard/LawyerDashboardMainView');
    void import('@/app/components/lawyer/dashboard/LawyerDashboardHomeTab');
    void import('@/app/components/lawyer/LawyerHomeHubCard');
    void import('@/app/runtime/homeHubCardLoader').then((m) => m.prefetchLawyerHomeHubCardModule());

    deferExecutionHydrateAfterBoot();
}
