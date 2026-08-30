import { dismissNativePrivacyShieldImmediately } from '@/app/runtime/privacyBlurRuntime';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { isBootRevealDone, markBootRevealDone } from '@/app/bootstrap/bootReveal';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';

let wired = false;

/**
 * عند العودة من الخلفية: أزل السواد فوراً قبل أي عمل ثقيل — لا إعادة إقلاع كاملة.
 */
export function applyNativeResumeFastPath(): void {
    if (typeof window === 'undefined' || !isCapacitorNativePlatform()) return;

    dismissNativePrivacyShieldImmediately();

    /* لا إعادة تهيئة ثقيلة — الجلسة الحية تبقى كما هي في الذاكرة */
    if (isBootRevealDone()) {
        try {
            document.documentElement.dataset.hamiBootRevealed = '1';
            document.documentElement.dataset.hamiInitialBoot = '0';
            /* أثر دخول الشبكة المحذوف — يبقى المسح حتى تنتهي جلسات WebView
               التي علّقت السمة قبل الإزالة؛ بلا CSS يقرأها لا ضرر من بقائه. */
            delete document.documentElement.dataset.hamiHomeEntrance;
        } catch {
            /* ignore */
        }
        removeStaticBootShell({ force: true });
        markBootRevealDone();
    }

    try {
        document.documentElement.dataset.hamiAppActive = '1';
    } catch {
        /* ignore */
    }
}

/**
 * تطبيق فوري إن كانت الشاشة ظاهرة عند الإقلاع.
 * العودة من الخلفية يملكها `capacitorAppLifecycle` عبر `appStateChange` فقط —
 * لا مستمع `visibilitychange` هنا حتى لا تُنفَّذ apply مرتين على أندرويد.
 */
export function wireNativeResumeFastPath(): void {
    if (typeof window === 'undefined' || wired || !isCapacitorNativePlatform()) return;
    wired = true;
    if (!document.hidden) applyNativeResumeFastPath();
}

export function resetNativeResumeFastPathForTests(): void {
    wired = false;
}
