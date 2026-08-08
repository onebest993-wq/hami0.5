/**
 * موازاة شبكة فورية من أول بايت — قبل تقييم mountApplication chunk.
 * يُستدعى sync من index.tsx؛ لا await.
 *
 * على مرحلتين عمداً: النطاق على شبكة الهاتف مورد نادر، وكل بايت يسبق React
 * يؤخّر أول رسم. المرحلة الحرجة وحدها تنطلق فوراً؛ لوحة المحامي تنتظر وصولها
 * ثم أول إطار. قياس على Slow 4G: إطلاقهما معاً أخّر بدء الإقلاع من 880 مللي
 * إلى 3935.
 */
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';

/** حدّ أقصى لانتظار المسار الحرج — لا نحرم اللوحة من التحميل المسبق لو تعثّرت الشبكة. */
const HEAVY_PRELOAD_MAX_WAIT_MS = 2_500;

let heavyPreloadStarted = false;

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

/**
 * المرحلة الثقيلة: لوحة المحامي وواجهتها الأولى.
 * تُستدعى بعد وصول المسار الحرج — أو بعد المهلة إن تعثّر.
 */
export function kickoffBootHeavyPreload(): void {
    if (heavyPreloadStarted) return;
    heavyPreloadStarted = true;

    void import('@/app/bootstrap/lawyerDashboardChunk').then((m) => m.preloadLawyerDashboardChunk());
    void import('@/app/bootstrap/homeDockBootGate').then((m) => m.preloadHomeDockBootChunk());
    void import('@/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime');
    void import('@/app/components/lawyer/dashboard/LawyerDashboardMainView');
    void import('@/app/components/lawyer/dashboard/LawyerDashboardHomeTab');
    void import('@/app/components/lawyer/LawyerHomeHubCard');
    void import('@/app/runtime/homeHubCardLoader').then((m) => m.prefetchLawyerHomeHubCardModule());

    deferExecutionHydrateAfterBoot();
}

/** بعد أول إطار حتى لا يزاحم الرسم على الخيط الرئيسي؛ المؤقّت يغطي التبويب المخفي حيث لا يعمل rAF. */
function scheduleHeavyPreload(): void {
    if (heavyPreloadStarted) return;
    requestAnimationFrame(kickoffBootHeavyPreload);
    window.setTimeout(kickoffBootHeavyPreload, 300);
}

export function kickoffBootCriticalPreload(): void {
    if (typeof window === 'undefined') return;

    const critical = Promise.all([
        import('react'),
        import('react-dom/client'),
        import('@/boot/appModule').then((m) => m.loadAppModule()),
        import('@/app/AppRuntimeShell'),
    ]);

    critical.then(scheduleHeavyPreload, scheduleHeavyPreload);
    window.setTimeout(scheduleHeavyPreload, HEAVY_PRELOAD_MAX_WAIT_MS);
}
