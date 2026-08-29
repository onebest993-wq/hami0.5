/**
 * BootLaunchOrchestrator — عقد إقلاع واحد (مسار Capacitor + React).
 *
 * ترتيب ملزم بلا مؤقتات جاهزية UI:
 * 1) seedFrame1Early — peeks محلية (شارات/سكرتير)
 * 2) أول paint للوحة يستهلك اللقطة (لا أصفار وهمية)
 * 3) paint شبكة الرئيسية → إزالة shell → markBootRevealDone → beforeBootShellReveal (خلفية)
 * 4) markBootRevealDone يُبلغ الأصلي عبر HamiBoot.notifyReady
 *
 * خارج العقد: spark hub / منتدى شبكي — لا يحجبان الكشف.
 */
import {
    ensureFrame1HydrateSync,
    type Frame1HydrateSnapshot,
} from '@/app/bootstrap/bootFrame1Hydrate';

type BootLaunchPhase =
    | 'frame1-seed'
    | 'first-paint-model'
    | 'home-grid-painted'
    | 'shell-removed'
    | 'reveal-done';

export const BOOT_LAUNCH_PHASE_ORDER: readonly BootLaunchPhase[] = [
    'frame1-seed',
    'first-paint-model',
    'home-grid-painted',
    'shell-removed',
    'reveal-done',
] as const;

/** بذرة مبكرة من preamble / قبل نموذج أول إطار */
export function seedBootLaunchFrame1(): Frame1HydrateSnapshot {
    return ensureFrame1HydrateSync();
}

/**
 * يُستدعى فوراً قبل إزالة #hami-static-boot — يعيد زرع peeks
 * حتى لا يُكشف بشارات متأخرة عن أول paint.
 */
export function beforeBootShellReveal(): Frame1HydrateSnapshot {
    return ensureFrame1HydrateSync();
}
