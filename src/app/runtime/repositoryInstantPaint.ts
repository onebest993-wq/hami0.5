/** كشف/إخفاء المستودع فوراً في الـ DOM — مستقل عن إطار React */

import {
    applyOverlayLayerVisible,
    applyOverlayThemeChrome,
    isOverlayThemeActive,
    type OverlayLayerVisibleClasses,
} from '@/app/runtime/overlayController';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { REPOSITORY_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import {
    buildRepositoryInstantChromeInnerHtml,
    REPOSITORY_INSTANT_CHROME_ID,
    REPOSITORY_INSTANT_CHROME_ROOT_CLASS,
    REPOSITORY_INSTANT_DISMISS_EVENT,
} from '@/app/runtime/repositoryInstantChromeMarkup';

export { REPOSITORY_INSTANT_CHROME_ID, REPOSITORY_INSTANT_DISMISS_EVENT };

const MODAL_SELECTOR = '[data-testid="smart-repository-modal"]';
const REPOSITORY_THEME = {
    htmlAttr: 'data-hami-repository-open',
    themeColor: '#0A0F1C',
} as const;

const REPOSITORY_LAYER_CLASSES: OverlayLayerVisibleClasses = {
    visible: [
        'hami-repository-overlay-layer--visible',
        'hami-repository-overlay-layer--snap',
        'pointer-events-auto',
    ],
    hidden: ['pointer-events-none'],
};

function resolveLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const modal = document.querySelector(MODAL_SELECTOR);
    return modal instanceof HTMLElement ? modal : null;
}

function isLiveRepositoryModal(layer: HTMLElement): boolean {
    if (layer.getAttribute('aria-hidden') === 'true') return false;
    if (layer.hasAttribute('inert')) return false;
    if (layer.classList.contains('hami-repository-overlay-layer--visible')) return true;
    return Boolean(layer.querySelector('[data-testid="repository-unified-feed"]'));
}

function hasLiveRepositorySurface(): boolean {
    const layer = resolveLayer();
    if (layer && isLiveRepositoryModal(layer)) return true;
    const feed = document.querySelector('[data-testid="repository-unified-feed"]');
    if (!(feed instanceof HTMLElement)) return false;
    const host = feed.closest('[data-testid="smart-repository-modal"]');
    if (!(host instanceof HTMLElement)) return true;
    return host.getAttribute('aria-hidden') !== 'true' && !host.hasAttribute('inert');
}

function hideRepositoryOverlayLayer(): void {
    const layer = resolveLayer();
    if (!layer) return;
    applyOverlayLayerVisible(layer, false, REPOSITORY_LAYER_CLASSES);
    blurFocusWithin(layer);
    layer.setAttribute('inert', '');
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    applyOverlayLayerVisible(root, visible, REPOSITORY_LAYER_CLASSES);
    if (visible) {
        root.removeAttribute('inert');
    } else {
        blurFocusWithin(root);
        root.setAttribute('inert', '');
    }
    applyOverlayThemeChrome(REPOSITORY_THEME, visible);
}

function bindRepositoryInstantChromeClose(bridge: HTMLElement): void {
    const closeBtn = bridge.querySelector('[data-testid="repository-instant-close"]');
    if (!(closeBtn instanceof HTMLElement) || closeBtn.dataset.hamiBound === '1') return;
    closeBtn.dataset.hamiBound = '1';
    closeBtn.style.setProperty('pointer-events', 'auto', 'important');
    const dismiss = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        concealRepositoryWarmShell();
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new Event(REPOSITORY_INSTANT_DISMISS_EVENT));
    };
    closeBtn.addEventListener('click', dismiss);
    closeBtn.addEventListener('pointerdown', dismiss);
}

/** يتغلّب على CSS قديم `pointer-events: auto !important` وعلى بوابة z-229 */
function styleRepositoryInstantChromeHitThrough(bridge: HTMLElement): void {
    bridge.style.setProperty('pointer-events', 'none', 'important');
    bridge.style.setProperty('z-index', '219', 'important');
    bridge.style.setProperty('position', 'fixed', 'important');
    bridge.style.setProperty('inset', '0', 'important');
    const closeBtn = bridge.querySelector('[data-testid="repository-instant-close"]');
    if (closeBtn instanceof HTMLElement) {
        closeBtn.style.setProperty('pointer-events', 'auto', 'important');
    }
}

/** كشف حي فوري — بلا data-hami-repository-enter (0.78 لـ ~24 إطاراً) فوق القشرة */
function revealLiveRepositoryLayer(layer: HTMLElement): void {
    clearHubLayerEnter(REPOSITORY_HUB_LAYER);
    applyLayerVisible(layer, true);
}

export function removeRepositoryInstantChrome(): void {
    if (typeof document === 'undefined') return;
    stopInstantChromeHandoff();
    document.getElementById(REPOSITORY_INSTANT_CHROME_ID)?.remove();
}

const INSTANT_CHROME_HANDOFF_MAX_TICKS = 24;

let instantChromeHandoffRaf = 0;
let instantChromeHandoffObserver: MutationObserver | null = null;

function stopInstantChromeHandoff(): void {
    if (instantChromeHandoffRaf) {
        cancelAnimationFrame(instantChromeHandoffRaf);
        instantChromeHandoffRaf = 0;
    }
    if (instantChromeHandoffObserver) {
        instantChromeHandoffObserver.disconnect();
        instantChromeHandoffObserver = null;
    }
}

/** بوابة المنتدى/المهام z-229 — إن بقيت القشرة ابناً لها تغطي المودال الحي (z-220) */
function mountRepositoryInstantChromeOnBody(bridge: HTMLElement): void {
    if (typeof document.body === 'undefined') return;
    if (bridge.parentElement === document.body) return;
    document.body.appendChild(bridge);
}

function tryHandoffInstantChromeToLiveModal(): boolean {
    if (!hasLiveRepositorySurface()) return false;
    const layer = resolveLayer();
    if (layer && isLiveRepositoryModal(layer)) {
        revealLiveRepositoryLayer(layer);
    }
    removeRepositoryInstantChrome();
    return true;
}

/** يسلّم للقشرة الحية فور ظهورها في الشجرة — بلا انتظار إطار يغطي اللمس */
function startInstantChromeHandoff(): void {
    stopInstantChromeHandoff();
    if (tryHandoffInstantChromeToLiveModal()) return;
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
        instantChromeHandoffObserver = new MutationObserver(() => {
            tryHandoffInstantChromeToLiveModal();
        });
        instantChromeHandoffObserver.observe(document.body, { childList: true, subtree: true });
    }
    let ticks = 0;
    const step = () => {
        instantChromeHandoffRaf = 0;
        if (!document.getElementById(REPOSITORY_INSTANT_CHROME_ID)) {
            stopInstantChromeHandoff();
            return;
        }
        if (tryHandoffInstantChromeToLiveModal()) return;
        if (++ticks >= INSTANT_CHROME_HANDOFF_MAX_TICKS) return;
        instantChromeHandoffRaf = requestAnimationFrame(step);
    };
    instantChromeHandoffRaf = requestAnimationFrame(step);
}

function ensureRepositoryInstantChrome(): void {
    if (typeof document === 'undefined') return;
    void ensureDeferredFeatureStylesLoaded();
    const existing = document.getElementById(REPOSITORY_INSTANT_CHROME_ID);
    if (existing instanceof HTMLElement) {
        existing.className = REPOSITORY_INSTANT_CHROME_ROOT_CLASS;
        mountRepositoryInstantChromeOnBody(existing);
        styleRepositoryInstantChromeHitThrough(existing);
        bindRepositoryInstantChromeClose(existing);
        if (tryHandoffInstantChromeToLiveModal()) return;
        startInstantChromeHandoff();
        return;
    }
    if (typeof document.body === 'undefined') return;

    const bridge = document.createElement('div');
    bridge.id = REPOSITORY_INSTANT_CHROME_ID;
    bridge.setAttribute('data-testid', 'repository-instant-paint-cover');
    bridge.setAttribute('dir', 'rtl');
    bridge.setAttribute('data-hami-overlay-safe', '1');
    bridge.setAttribute('role', 'status');
    bridge.setAttribute('aria-busy', 'true');
    bridge.setAttribute('aria-label', 'المستودع');
    bridge.className = REPOSITORY_INSTANT_CHROME_ROOT_CLASS;
    bridge.innerHTML = buildRepositoryInstantChromeInnerHtml();
    styleRepositoryInstantChromeHitThrough(bridge);
    bindRepositoryInstantChromeClose(bridge);
    mountRepositoryInstantChromeOnBody(bridge);
    if (tryHandoffInstantChromeToLiveModal()) return;
    startInstantChromeHandoff();
}

/** ستارة html فقط — بلا قشرة تغطي الـ Host إن كان سيُركَّب في نفس النقرة */
export function applyRepositoryOpenTheme(): void {
    applyOverlayThemeChrome(REPOSITORY_THEME, true);
}

/** يخفّي ثيم اللوحة فوراً — مع قشرة ظاهرة إن لم يوجد Host */
export function applyRepositoryOpaqueChrome(): void {
    applyRepositoryOpenTheme();
    if (hasLiveRepositorySurface()) {
        const layer = resolveLayer();
        if (layer && isLiveRepositoryModal(layer)) revealLiveRepositoryLayer(layer);
        removeRepositoryInstantChrome();
        return;
    }
    ensureRepositoryInstantChrome();
}

/** يكشف Host الظاهر؛ الطبقة المخفية (keepAlive) لا تُكشف هنا — القشرة تغطي الفراغ */
export function paintRepositoryInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    if (hasLiveRepositorySurface()) {
        const layer = resolveLayer();
        if (layer && isLiveRepositoryModal(layer)) revealLiveRepositoryLayer(layer);
        removeRepositoryInstantChrome();
        return true;
    }
    applyRepositoryOpaqueChrome();
    return false;
}

/** إخفاء فوري للطبقة الدافئة والقشرة */
export function concealRepositoryWarmShell(): void {
    if (typeof document === 'undefined') return;
    clearHubLayerEnter(REPOSITORY_HUB_LAYER);
    hideRepositoryOverlayLayer();
    removeRepositoryInstantChrome();
    applyOverlayThemeChrome(REPOSITORY_THEME, false);
    try {
        void import('@/app/services/repository/tearDownRepoFloatingState').then(({ tearDownRepoFloatingState }) => {
            tearDownRepoFloatingState({ targetSurface: 'repository-hub', reason: 'tearDown' });
        });
    } catch {
        /* never throw during chrome snap */
    }
}

/** يخفي طبقة keep-alive دون نزع ستارة html/القشرة أثناء فتح جارٍ */
export function hideRepositoryKeepAliveLayer(): void {
    hideRepositoryOverlayLayer();
}

export function isRepositoryShellPaintedOpen(): boolean {
    return isOverlayThemeActive(REPOSITORY_THEME);
}
