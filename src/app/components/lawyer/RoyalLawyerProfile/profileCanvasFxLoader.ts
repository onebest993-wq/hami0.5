import type { ProfileCanvasInteraction } from '@/app/services/profile/profilePageCustomization';
import { isLitePerformanceActiveFromDom } from '@/app/runtime/devicePerformanceTier';

export type ProfileCanvasFxLoadOptions = {
    interaction?: ProfileCanvasInteraction | 'none';
    includeStudio?: boolean;
};

/** هل نُخفّف/نُوقف تحميل FX الثقيلة (lite / reduce-motion / تبويب مخفي) */
export function isProfileCanvasFxSuppressed(): boolean {
    if (typeof window === 'undefined') return false;
    if (isLitePerformanceActiveFromDom()) return true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    const root = document.querySelector('[data-lawyer-profile-root]');
    if (!root) return false;
    if (root.getAttribute('data-profile-reduce-motion') === 'true') return true;
    if (root.getAttribute('data-profile-page-hidden') === 'true') return true;
    return false;
}

const INTERACTION_IMPORTS: Record<
    Exclude<ProfileCanvasInteraction, 'none'>,
    () => Promise<unknown>
> = {
    tapReveal: () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.tapReveal.css'),
    doorOpen: () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.doorOpen.css'),
    mistSwipe: () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.mistSwipe.css'),
    stardust: () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.stardust.css'),
    luminousFold: () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.luminousFold.css'),
};

const loaded = new Set<string>();

async function loadKey(key: string, loader: () => Promise<unknown>): Promise<void> {
    if (loaded.has(key)) return;
    loaded.add(key);
    await loader();
}

/** يحمّل CSS اللوحة على دفعات — core + interaction + studio عند الحاجة */
export async function ensureProfileCanvasFxLoaded(options: ProfileCanvasFxLoadOptions = {}): Promise<void> {
    await loadKey('core', () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.core.css'));
    await loadKey('material', () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasMaterialFx.css'));

    const suppressed = isProfileCanvasFxSuppressed() && !options.includeStudio;
    if (suppressed) return;

    const interaction = options.interaction ?? 'none';
    if (interaction !== 'none') {
        await loadKey(`ix:${interaction}`, INTERACTION_IMPORTS[interaction]);
        if (interaction === 'stardust') {
            await loadKey('ix:petal', () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.petal.css'));
        }
        if (interaction === 'mistSwipe') {
            await loadKey('ix:petal', () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFx.petal.css'));
        }
    }

    if (options.includeStudio) {
        await loadKey('studio', () => import('@/app/components/lawyer/RoyalLawyerProfile/profileCanvasStudioFx.css'));
    }
}

/** واجهة متزامنة للمكالمات الحالية — لا تنتظر اكتمال التحميل */
export function ensureProfileCanvasFxLoadedSync(options: ProfileCanvasFxLoadOptions = {}): void {
    void ensureProfileCanvasFxLoaded(options);
}

/** تسخين core + material — آمن من الهيدر قبل mount الجذر */
export function prefetchProfileCanvasFxCore(): void {
    ensureProfileCanvasFxLoadedSync();
}

/** تسخين استوديو الصفحة — idle بعد فتح التبويب أو hover */
export function prefetchProfileCanvasStudioFx(): void {
    ensureProfileCanvasFxLoadedSync({ includeStudio: true });
}

export function resetProfileCanvasFxLoaderForTests(): void {
    loaded.clear();
}
