import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import {
    snapFieldTasksShellClose,
    snapTasksManagerShellOpen,
    TASKS_MANAGER_INSTANT_CHROME_ID,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { armHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { TASKS_MANAGER_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';

const OVERLAY_SELECTOR = '[data-testid="tasks-manager-overlay"]';

function getOverlayPortalRoot(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 });
}

export function removeTasksManagerInstantChrome(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID)?.remove();
}

function ensureTasksManagerInstantChromeBridge(): void {
    if (document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID)) return;
    const portal = getOverlayPortalRoot();
    if (!portal) return;

    const bridge = document.createElement('div');
    bridge.id = TASKS_MANAGER_INSTANT_CHROME_ID;
    bridge.setAttribute('data-testid', 'tasks-manager-open-chrome');
    bridge.setAttribute('role', 'status');
    bridge.setAttribute('aria-busy', 'true');
    bridge.setAttribute('aria-label', 'أجندة المهام');
    bridge.setAttribute('dir', 'rtl');
    bridge.className =
        'pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0A0F1C] hami-overlay-safe-insets';
    bridge.innerHTML =
        '<div class="relative flex h-full min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#0A0F1C]" style="font-family:Tajawal,Cairo,sans-serif">' +
        '<header class="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0A0F1C] px-4 py-3">' +
        '<div class="min-w-0 text-right">' +
        '<h1 class="truncate text-lg font-semibold text-[#F4F4F5]" style="margin:0">أجندة المهام</h1>' +
        '<p class="mt-0.5 text-[11px] font-medium text-white/40" style="margin:0">الأسبوع الحالي</p>' +
        '</div></header>' +
        '<div class="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-5">' +
        '<div class="h-16 rounded-2xl bg-white/[0.04]"></div>'.repeat(5) +
        '</div></div>';
    portal.appendChild(bridge);
}

/** طلاء فوري في لمسة الأجندة — قبل انتظار chunk TasksManager */
export function paintTasksManagerInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    snapFieldTasksShellClose();
    snapTasksManagerShellOpen();
    armHubLayerEnter(TASKS_MANAGER_HUB_LAYER, () => {
        const overlay = document.querySelector(OVERLAY_SELECTOR);
        if (!(overlay instanceof HTMLElement)) return null;
        if (overlay.getAttribute('aria-hidden') === 'true') return null;
        return overlay;
    });
    if (document.querySelector(OVERLAY_SELECTOR)) {
        removeTasksManagerInstantChrome();
        return true;
    }
    ensureTasksManagerInstantChromeBridge();
    return true;
}
