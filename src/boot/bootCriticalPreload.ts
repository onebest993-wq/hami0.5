/**
 * موازاة شبكة فورية من أول بايت — قبل تقييم mountApplication chunk.
 * يُستدعى sync من index.tsx؛ لا await. مدخل المحامي فقط.
 */
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';
import { shouldPreloadLawyerDashboardBoard } from '@/boot/shouldPreloadLawyerBoard';
import { startApplicationBoot } from '@/boot/mountApplication';
import { loadAppRuntimeShellModule } from '@/app/runtime/appRuntimeShellLoader';
import { loadLawyerDashboardGateModule } from '@/app/runtime/lawyerDashboardGateLoader';
import { preloadLawyerDashboardChunk } from '@/app/bootstrap/lawyerDashboardChunk';
import { prefetchLawyerDashboardInner } from '@/app/runtime/lawyerDashboardInnerLoader';

const HEAVY_PRELOAD_MAX_WAIT_MS = 2_500;

let heavyPreloadStarted = false;
let firstTabPreloadStarted = false;

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

export function kickoffFirstTabPreload(): void {
    if (!shouldPreloadLawyerDashboardBoard()) return;
    if (firstTabPreloadStarted) return;
    firstTabPreloadStarted = true;

    prefetchLawyerDashboardInner();
    void import('@/app/runtime/homeTabContentLoader').then((m) => m.prefetchHomeTabContent());
    void import('@/app/runtime/commandHubTilesLoader').then((m) => m.prefetchCommandHubTiles());
    /* البطاقة بعد إطار — لا تزاحم أول بايت لمحتوى المنزل والبلاطات على الهاتف */
    const warmHub = () => {
        void import('@/app/runtime/homeHubCardLoader').then((m) => m.prefetchLawyerHomeHubCardModule());
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(warmHub);
    else warmHub();
}

export function kickoffBootHeavyPreload(): void {
    if (heavyPreloadStarted) return;
    heavyPreloadStarted = true;

    kickoffFirstTabPreload();
    deferExecutionHydrateAfterBoot();
}

function scheduleHeavyPreload(): void {
    if (heavyPreloadStarted) return;
    kickoffBootHeavyPreload();
    requestAnimationFrame(() => {
        kickoffBootHeavyPreload();
    });
}

export function kickoffBootCriticalPreload(): void {
    if (typeof window === 'undefined') return;

    if (shouldPreloadLawyerDashboardBoard()) {
        void preloadLawyerDashboardChunk();
    } else {
        void import('@/app/bootstrap/lawyerAuth/prefetchLawyerAuthLane').then((m) => {
            m.prefetchLawyerAuthLane();
        });
    }

    const critical = Promise.all([
        import('react'),
        import('react-dom/client'),
        import('@/boot/appModule').then((m) => m.loadAppModule()),
        loadAppRuntimeShellModule(),
        loadLawyerDashboardGateModule(),
    ]);

    /* التبويب الأول بعد تحميل النواة — لا يزاحم React/Shell/Gate على الشبكة */
    critical.then(() => {
        kickoffFirstTabPreload();
        scheduleHeavyPreload();
    }, scheduleHeavyPreload);
    window.setTimeout(scheduleHeavyPreload, HEAVY_PRELOAD_MAX_WAIT_MS);

    startApplicationBoot();
}
