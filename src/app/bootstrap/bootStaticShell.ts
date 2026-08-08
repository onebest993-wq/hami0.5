import {
    STATIC_BOOT_SHELL_FADE_MS,
    STATIC_BOOT_SHELL_ID,
} from '@/app/bootstrap/bootStaticShell.constants';

/** إزالة هيكل الإقلاع الثابت (HTML/CSS) بعد جاهزية اللوحة */
export { STATIC_BOOT_SHELL_ID, STATIC_BOOT_SHELL_FADE_MS } from '@/app/bootstrap/bootStaticShell.constants';

function readBootRevealDoneSync(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.__hamiBootRevealDone__ === true) return true;
    try {
        return (
            sessionStorage.getItem('hami_boot_complete') === '1' ||
            sessionStorage.getItem('hami_splash_executed') === '1'
        );
    } catch {
        return false;
    }
}

export function hasStaticBootShell(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById(STATIC_BOOT_SHELL_ID));
}

/**
 * أثناء وجود #hami-static-boot: ممنوع تركيب React overlay مكرر.
 * الطبقة الثابتة = خلفية صلبة فقط حتى كشف اللوحة.
 */
export function shouldHideBootSuspenseFallback(): boolean {
    return hasStaticBootShell();
}

export function shouldMountReactBootOverlay(): boolean {
    if (readBootRevealDoneSync()) return false;
    if (hasStaticBootShell()) return false;
    return true;
}

export type RemoveStaticBootShellOptions = {
    instant?: boolean;
    /** إزالة قسرية — أخطاء الإقلاع أو استئناف أصلي بعد جلسة مكتملة */
    force?: boolean;
};

function isHomeMainGridPaintedForShellRemoval(): boolean {
    if (typeof window === 'undefined') return false;
    return window.__hamiHomeMainGridPainted__ === true;
}

export function removeStaticBootShell(opts?: RemoveStaticBootShellOptions): void {
    if (typeof document === 'undefined') return;
    if (!opts?.force && !isHomeMainGridPaintedForShellRemoval()) {
        return;
    }
    const root = document.documentElement;
    const shell = document.getElementById(STATIC_BOOT_SHELL_ID);
    const surface =
        root.style.getPropertyValue('--hami-board-surface-bg').trim() ||
        root.style.getPropertyValue('--hami-surface-bg').trim() ||
        getComputedStyle(root).getPropertyValue('--hami-board-surface-bg').trim() ||
        getComputedStyle(root).getPropertyValue('--hami-surface-bg').trim() ||
        '#0a0f1c';
    document.body.style.backgroundColor = surface || '#0a0f1c';

    if (!shell) {
        root.classList.remove('hami-boot-static-active');
        return;
    }

    if (shell.classList.contains('hami-boot-cinematic--exiting')) return;

    const instant = opts?.instant === true || readBootRevealDoneSync();

    if (instant) {
        shell.remove();
        root.classList.remove('hami-boot-static-active');
        return;
    }

    shell.classList.add('hami-boot-cinematic--exiting');
    window.setTimeout(() => {
        shell.remove();
        root.classList.remove('hami-boot-static-active');
    }, STATIC_BOOT_SHELL_FADE_MS);
}

/** إزالة قسرية — بعد اكتمال الإقلاع أو قبل overlays تفاعلية (بحث، كيبورد) */
export function purgeStaticBootShellPermanently(): void {
    removeStaticBootShell({ force: true, instant: true });
}

/** أمان عند فتح الكيبورد — لا يُبقي شعار الإقلاع فوق الواجهة */
export function purgeStaticBootShellAfterBoot(): void {
    if (!readBootRevealDoneSync() && !isHomeMainGridPaintedForShellRemoval()) return;
    purgeStaticBootShellPermanently();
}
