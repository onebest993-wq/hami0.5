import type { ProfileCanvasInteraction } from '@/app/services/profile/profilePageCustomization';
import { isLitePerformanceActiveFromDom } from '@/app/runtime/devicePerformanceTier';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';

type ProfileCanvasFxLoadOptions = {
    interaction?: ProfileCanvasInteraction | 'none';
    includeStudio?: boolean;
    /** يتجاوز suppress/defer — يحمّل CSS التفاعل فوراً */
    forceInteractionCss?: boolean;
};

/** هل نُخفّف/نُوقف تحميل FX الثقيلة (lite / reduce-motion / تبويب مخفي) */
export function isProfileCanvasFxSuppressed(): boolean {
    if (typeof window === 'undefined') return false;
    if (isLitePerformanceActiveFromDom()) return true;
    try {
        if (
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return true;
        }
    } catch {
        /* jsdom بلا matchMedia */
    }
    const root = document.querySelector('[data-lawyer-profile-root]');
    if (!root) return false;
    if (root.getAttribute('data-profile-reduce-motion') === 'true') return true;
    if (root.getAttribute('data-profile-page-hidden') === 'true') return true;
    return false;
}

/** على أندرويد الأصلي: أجّل CSS التفاعل الثقيل حتى يُطلب صراحةً أو يُفتح الاستوديو */
export function shouldDeferProfileCanvasInteractionCss(): boolean {
    return isAndroidNativeShell();
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

    const forceIx = Boolean(options.forceInteractionCss);
    const suppressed = !forceIx && isProfileCanvasFxSuppressed() && !options.includeStudio;
    if (suppressed) return;

    const deferIx =
        !forceIx && !options.includeStudio && shouldDeferProfileCanvasInteractionCss();

    const interaction = options.interaction ?? 'none';
    if (!deferIx && interaction !== 'none') {
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

export function resetProfileCanvasFxLoaderForTests(): void {
    loaded.clear();
}
