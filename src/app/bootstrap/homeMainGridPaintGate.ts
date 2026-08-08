/** يُطلق بعد أول إطار مُرسم لشبكة الرئيسية — بوابة إزالة #hami-static-boot */
import {
    BOOT_REVEAL_DONE_EVENT,
    getBootRevealMinMs,
    isBootRevealDone,
    markBootRevealDone,
} from '@/app/bootstrap/bootReveal';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';

export const HOME_MAIN_GRID_PAINTED_EVENT = 'hami:home-main-grid-painted';

let homeMainGridPainted = false;

export function isHomeMainGridPainted(): boolean {
    return homeMainGridPainted;
}

export function resetHomeMainGridPaintGateForTests(): void {
    homeMainGridPainted = false;
    if (typeof window !== 'undefined') {
        window.__hamiHomeMainGridPainted__ = false;
    }
}

function readBootSplashElapsedMs(): number {
    if (typeof performance === 'undefined') return 0;
    const mark = performance.getEntriesByName('hami:boot:start', 'mark')[0];
    if (mark && typeof mark.startTime === 'number') {
        return Math.max(0, performance.now() - mark.startTime);
    }
    return 0;
}

function finalizeBootShellRemoval(): void {
    removeStaticBootShell({ instant: true });
    if (!isBootRevealDone()) {
        markBootRevealDone();
        try {
            window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
        } catch {
            /* ignore */
        }
    }
}

function scheduleBootShellRemovalAfterStablePaint(): void {
    const minHoldMs = getBootRevealMinMs();
    const elapsed = readBootSplashElapsedMs();
    const delayMs = Math.max(0, minHoldMs - elapsed);

    const afterPaintFrames = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                finalizeBootShellRemoval();
            });
        });
    };

    if (delayMs > 0) {
        window.setTimeout(afterPaintFrames, delayMs);
    } else {
        afterPaintFrames();
    }
}

/**
 * يُستدعى من HomeTab بعد commit الشبكة — إطاران + حد أدنى للشعار قبل القص.
 */
export function notifyHomeMainGridPainted(): void {
    if (typeof window === 'undefined' || homeMainGridPainted) return;
    homeMainGridPainted = true;
    window.__hamiHomeMainGridPainted__ = true;
    try {
        window.dispatchEvent(new Event(HOME_MAIN_GRID_PAINTED_EVENT));
    } catch {
        /* ignore */
    }
    scheduleBootShellRemovalAfterStablePaint();
}

function gridHasPaintableSize(grid: HTMLElement): boolean {
    const rect = grid.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
}

const MAX_GRID_PAINT_ATTEMPTS = 12;

/**
 * يُجدول الإشعار بعد أول paint فعلي للعقدة — مع إعادة محاولة إذا كان الحجم صفراً مؤقتاً.
 */
export function scheduleHomeMainGridPainted(grid: HTMLElement | null): void {
    if (typeof window === 'undefined' || homeMainGridPainted) return;
    if (!(grid instanceof HTMLElement) || !grid.isConnected) return;

    let attempts = 0;
    const tryNotify = () => {
        if (homeMainGridPainted) return;
        attempts += 1;
        const live = document.querySelector('[data-testid="home-main-grid"]');
        if (!(live instanceof HTMLElement) || !live.isConnected) {
            if (attempts < MAX_GRID_PAINT_ATTEMPTS) {
                requestAnimationFrame(tryNotify);
            }
            return;
        }
        if (gridHasPaintableSize(live) || attempts >= MAX_GRID_PAINT_ATTEMPTS) {
            notifyHomeMainGridPainted();
            return;
        }
        requestAnimationFrame(tryNotify);
    };

    requestAnimationFrame(tryNotify);
}

export function waitForHomeMainGridPainted(timeoutMs = 8_000): Promise<void> {
    if (typeof window === 'undefined' || homeMainGridPainted) return Promise.resolve();

    return new Promise((resolve) => {
        const done = () => {
            window.clearTimeout(timer);
            window.removeEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onPaint);
            resolve();
        };
        const onPaint = () => done();
        window.addEventListener(HOME_MAIN_GRID_PAINTED_EVENT, onPaint, { once: true });
        const timer = window.setTimeout(done, timeoutMs);
    });
}
