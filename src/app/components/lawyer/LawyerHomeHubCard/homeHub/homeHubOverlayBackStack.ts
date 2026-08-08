import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

export type HomeHubOverlayBackId =
    | 'home-hub-secretary-more'
    | 'home-hub-urgent-more'
    | 'home-hub-alerts-more'
    | 'home-hub-radar-more';

type OverlayBackEntry = {
    id: HomeHubOverlayBackId;
    close: () => void;
};

const stack: OverlayBackEntry[] = [];
let unregisterNativeBack: (() => void) | null = null;
let escapeBound = false;
let dismissBound = false;

function bindEscape(): void {
    if (escapeBound || typeof window === 'undefined') return;
    escapeBound = true;
    window.addEventListener('keydown', onEscapeKey, true);
}

function unbindEscape(): void {
    if (!escapeBound || stack.length > 0 || typeof window === 'undefined') return;
    escapeBound = false;
    window.removeEventListener('keydown', onEscapeKey, true);
}

function ensureDismissListener(): void {
    if (dismissBound || typeof window === 'undefined') return;
    dismissBound = true;
    window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismissAll);
}

function onEscapeKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || stack.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    popHomeHubOverlayBack();
}

function onDismissAll(): void {
    dismissAllHomeHubOverlayBack();
}

function syncNativeBack(): void {
    if (stack.length === 0) {
        unregisterNativeBack?.();
        unregisterNativeBack = null;
        unbindEscape();
        return;
    }
    bindEscape();
    ensureDismissListener();
    if (!unregisterNativeBack) {
        unregisterNativeBack = registerNativeBackHandler(() => popHomeHubOverlayBack());
    }
}

function commitClose(close: () => void): void {
    executeOverlaySnapClose({ commit: close });
}

/** تسجيل طبقة مفتوحة — آخر طبقة = أول رجوع (LIFO) */
export function pushHomeHubOverlayBack(id: HomeHubOverlayBackId, close: () => void): () => void {
    const existing = stack.findIndex((entry) => entry.id === id);
    if (existing >= 0) stack.splice(existing, 1);
    stack.push({ id, close });
    syncNativeBack();
    return () => removeHomeHubOverlayBack(id, false);
}

export function removeHomeHubOverlayBack(id: HomeHubOverlayBackId, invokeClose: boolean): void {
    const index = stack.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    const [entry] = stack.splice(index, 1);
    if (invokeClose && entry) commitClose(entry.close);
    syncNativeBack();
}

/** رجوع واحد — يغلق آخر واجهة hub مفتوحة */
export function popHomeHubOverlayBack(): boolean {
    const top = stack.pop();
    if (!top) {
        syncNativeBack();
        return false;
    }
    commitClose(top.close);
    syncNativeBack();
    return true;
}

/** إغلاق واجهة محددة (سحب/خلفية) — بنفس مسار الرجوع */
export function requestCloseHomeHubOverlay(id: HomeHubOverlayBackId): boolean {
    const index = stack.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    const [entry] = stack.splice(index, 1);
    commitClose(entry!.close);
    syncNativeBack();
    return true;
}

export function dismissAllHomeHubOverlayBack(): void {
    while (stack.length > 0) {
        const top = stack.pop();
        top?.close();
    }
    syncNativeBack();
}

/** للاختبارات */
export function resetHomeHubOverlayBackStackForTests(): void {
    stack.length = 0;
    unregisterNativeBack?.();
    unregisterNativeBack = null;
    if (escapeBound && typeof window !== 'undefined') {
        window.removeEventListener('keydown', onEscapeKey, true);
    }
    escapeBound = false;
    if (dismissBound && typeof window !== 'undefined') {
        window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismissAll);
    }
    dismissBound = false;
}

export function getHomeHubOverlayBackStackDepthForTests(): number {
    return stack.length;
}
