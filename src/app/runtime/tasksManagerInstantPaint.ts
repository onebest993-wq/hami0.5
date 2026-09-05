import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import {
    snapFieldTasksShellClose,
    snapTasksManagerShellOpen,
    TASKS_MANAGER_INSTANT_CHROME_ID,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { armHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { TASKS_MANAGER_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import {
    buildTasksManagerInstantChromeBonesHtml,
    buildTasksManagerInstantChromeInnerHtml,
    buildTasksManagerInstantChromePeekHtml,
    listTasksManagerInstantPeekTitles,
    TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS,
} from '@/app/runtime/tasksManagerInstantChromeMarkup';
import {
    FIELD_TASKS_CURTAIN_PEEK_READY_EVENT,
    publishFieldTasksCurtainPeekFromDiskSync,
    scheduleFieldTasksCurtainPeekFromSecureStore,
} from '@/app/utils/quantumTasksCurtainPeek';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';

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
    bridge.setAttribute('data-hami-overlay-safe', '1');
    bridge.className = TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS;
    bridge.innerHTML = buildTasksManagerInstantChromeInnerHtml();
    portal.appendChild(bridge);
    fillTasksManagerInstantChromePeek(bridge);
    bindTasksManagerInstantChromePeekRefresh(bridge);
}

function fillTasksManagerInstantChromePeek(bridge: HTMLElement): void {
    const body = bridge.querySelector('[data-tasks-manager-instant-body]');
    if (!(body instanceof HTMLElement)) return;
    const titles = listTasksManagerInstantPeekTitles(getQuantumPendingSnapshot());
    const peekHtml = buildTasksManagerInstantChromePeekHtml(titles);
    if (peekHtml) {
        body.innerHTML = peekHtml;
        bridge.removeAttribute('aria-busy');
        return;
    }
    if (body.childElementCount === 0) {
        body.innerHTML = buildTasksManagerInstantChromeBonesHtml();
    }
    bridge.setAttribute('aria-busy', 'true');
}

function bindTasksManagerInstantChromePeekRefresh(bridge: HTMLElement): void {
    if (bridge.dataset.hamiPeekBound === '1') return;
    bridge.dataset.hamiPeekBound = '1';
    const onReady = () => {
        if (!document.contains(bridge)) {
            window.removeEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
            return;
        }
        fillTasksManagerInstantChromePeek(bridge);
    };
    window.addEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
}

function findWarmTasksManagerOverlay(): HTMLElement | null {
    const overlay = document.querySelector(OVERLAY_SELECTOR);
    if (!(overlay instanceof HTMLElement)) return null;
    /** قشرة تبقى إن كان الـ overlay هيكلاً فارغاً ينتظر مقطع TasksManager */
    if (!overlay.querySelector('[data-testid="tasks-manager"]')) return null;
    return overlay;
}

function revealTasksManagerWarmOverlay(overlay: HTMLElement): void {
    overlay.style.setProperty('opacity', '1');
    overlay.style.setProperty('visibility', 'visible');
    /**
     * لا تُكتب pointer-events:none هنا — armHubLayerEnter يعيد الاستدعاء بعد commit React
     * فيسلب النقر من الأجندة المفتوحة. React يملك النقر عبر data-open.
     */
    overlay.setAttribute('data-open', 'true');
}

/** طلاء فوري في لمسة الأجندة — قبل انتظار chunk TasksManager */
export function paintTasksManagerInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    if (getQuantumPendingSnapshot().length === 0) {
        publishFieldTasksCurtainPeekFromDiskSync();
        scheduleFieldTasksCurtainPeekFromSecureStore();
    }
    snapFieldTasksShellClose();
    snapTasksManagerShellOpen();
    armHubLayerEnter(TASKS_MANAGER_HUB_LAYER, () => {
        const overlay = findWarmTasksManagerOverlay();
        if (!overlay) return null;
        revealTasksManagerWarmOverlay(overlay);
        return overlay;
    });
    const overlay = findWarmTasksManagerOverlay();
    if (overlay) {
        revealTasksManagerWarmOverlay(overlay);
        removeTasksManagerInstantChrome();
        return true;
    }
    ensureTasksManagerInstantChromeBridge();
    return true;
}
