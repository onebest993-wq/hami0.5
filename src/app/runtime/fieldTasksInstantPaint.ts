/** كشف/إخفاء ستارة الميدان فوراً في الـ DOM — مستقل عن إطار React */

import {
    FIELD_TASKS_INSTANT_CHROME_ID,
    snapFieldTasksShellClose,
    snapFieldTasksShellOpen,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import {
    buildFieldTasksInstantChromeCardsHtml,
    buildFieldTasksInstantChromeEmptyHtml,
    buildFieldTasksInstantChromeInnerHtml,
    FIELD_TASKS_INSTANT_DISMISS_EVENT,
    FIELD_TASKS_INSTANT_LAYER_CLASS,
    type FieldTasksInstantChromeCard,
} from '@/app/runtime/fieldTasksInstantChromeMarkup';
import {
    requestFieldTasksInstantComplete,
    requestFieldTasksInstantManage,
} from '@/app/runtime/fieldTasksInstantActions';
import {
    getPendingFieldTasksCountSnapshot,
    getQuantumPendingSnapshot,
} from '@/app/utils/quantumTasksMetrics';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import {
    FIELD_TASKS_CURTAIN_PEEK_READY_EVENT,
    publishFieldTasksCurtainPeekFromDiskSync,
    scheduleFieldTasksCurtainPeekFromSecureStore,
} from '@/app/utils/quantumTasksCurtainPeek';
import { prefetchFieldTasksCurtainCardSurfaces } from '@/app/runtime/fieldTasksHubLoader';

export { FIELD_TASKS_INSTANT_DISMISS_EVENT };

const LAYER_SELECTOR = '[data-field-tasks-root]';
/** يمنع إغلاق الستارة بنقرة شبحية بعد pointerup على الدوك (click يصل للخلفية فقط) */
export const FIELD_TASKS_CLOSE_SUPPRESS_MS = 120;

/** يبقى مفعّلاً حتى يلحق React بـ open=true — يمنع أي re-render من إعادة الإخفاء */
let forceVisible = false;
let closeSuppressedUntil = 0;

export function isFieldTasksForceVisible(): boolean {
    return forceVisible;
}

export function clearFieldTasksForceVisible(): void {
    forceVisible = false;
}

export function suppressFieldTasksClose(ms: number = FIELD_TASKS_CLOSE_SUPPRESS_MS): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    closeSuppressedUntil = now + Math.max(0, ms);
}

export function isFieldTasksCloseSuppressed(): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return now < closeSuppressedUntil;
}

export function clearFieldTasksCloseSuppress(): void {
    closeSuppressedUntil = 0;
}

function snapWarmSheetTransform(root: HTMLElement): void {
    const sheet = root.querySelector('[data-testid="field-tasks-sheet"]');
    if (!(sheet instanceof HTMLElement)) return;
    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0');
}

function lockLayerHits(root: HTMLElement): void {
    root.style.setProperty('pointer-events', 'none');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
    root.setAttribute('data-interactive', 'false');
}

/** React لا يزيل `inert` إذا كُتب من الطلاء الفوري — يجب فكّه صراحةً عند الجاهزية */
export function unlockFieldTasksLayerHits(root: HTMLElement): void {
    root.style.setProperty('pointer-events', 'auto');
    root.removeAttribute('inert');
    root.removeAttribute('aria-hidden');
    root.setAttribute('data-interactive', 'true');
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.style.setProperty('opacity', '1');
        root.style.setProperty('visibility', 'visible');
        root.classList.add('hami-field-tasks-layer--visible', 'hami-field-tasks-layer--snap');
        root.setAttribute('data-open', 'true');
        /** لا auto هنا — أبناء الخلفية يسرقون الدوك إن فُعّل النقر قبل React `open` */
        if (root.getAttribute('data-interactive') === 'true') {
            unlockFieldTasksLayerHits(root);
        } else {
            lockLayerHits(root);
        }
        snapWarmSheetTransform(root);
    } else {
        root.style.setProperty('opacity', '0');
        root.style.setProperty('visibility', 'hidden');
        root.classList.remove('hami-field-tasks-layer--visible');
        root.setAttribute('data-open', 'false');
        lockLayerHits(root);
    }
    void root.offsetHeight;
}

export function removeFieldTasksInstantChrome(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID)?.remove();
}

function bindFieldTasksInstantChromeDismiss(bridge: HTMLElement): void {
    const dismissNow = () => {
        concealFieldTasksWarmSheet();
        snapFieldTasksShellClose();
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new Event(FIELD_TASKS_INSTANT_DISMISS_EVENT));
    };

    const dismissBackdrop = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isFieldTasksCloseSuppressed()) return;
        dismissNow();
    };

    const dismissClose = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        dismissNow();
    };

    const closeBtn = bridge.querySelector('[data-testid="field-tasks-instant-close"]');
    if (closeBtn instanceof HTMLElement && closeBtn.dataset.hamiBound !== '1') {
        closeBtn.dataset.hamiBound = '1';
        closeBtn.addEventListener('click', dismissClose);
    }

    const backdrop = bridge.querySelector('[data-field-tasks-instant-backdrop]');
    if (backdrop instanceof HTMLElement && backdrop.dataset.hamiBound !== '1') {
        backdrop.dataset.hamiBound = '1';
        backdrop.addEventListener('click', dismissBackdrop);
        backdrop.addEventListener('pointerup', dismissBackdrop);
    }

    if (bridge.dataset.hamiActionsBound === '1') return;
    bridge.dataset.hamiActionsBound = '1';
    bridge.addEventListener(
        'pointerdown',
        (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.closest('[data-field-tasks-instant-manage]')) return;
            void import('@/app/runtime/fieldTasksHubLoader')
                .then((m) => m.loadTasksManagerModule())
                .catch(() => undefined);
        },
        { passive: true },
    );
    bridge.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const complete = target.closest('[data-field-tasks-instant-complete]');
        if (complete instanceof HTMLElement) {
            event.preventDefault();
            event.stopPropagation();
            const id = complete.getAttribute('data-field-tasks-instant-complete');
            if (id) requestFieldTasksInstantComplete(id);
            return;
        }
        const manage = target.closest('[data-field-tasks-instant-manage]');
        if (manage instanceof HTMLElement) {
            event.preventDefault();
            event.stopPropagation();
            requestFieldTasksInstantManage();
        }
    });
}

function peekFieldTasksInstantChromeCards(): FieldTasksInstantChromeCard[] {
    return listFieldDaySheetTasks(getQuantumPendingSnapshot(), new Date()).map((task) => ({
        id: task.id,
        title: task.title,
        location: task.location,
        isFatalDeadline: task.isFatalDeadline,
    }));
}

function fillFieldTasksInstantChromePeek(bridge: HTMLElement): void {
    const scroller = bridge.querySelector('[data-field-tasks-instant-scroller]');
    if (!(scroller instanceof HTMLElement)) return;

    const cards = peekFieldTasksInstantChromeCards();
    if (cards.length === 0) {
        if (getPendingFieldTasksCountSnapshot() > 0) return;
        scroller.innerHTML = buildFieldTasksInstantChromeEmptyHtml();
        const sheet = bridge.querySelector('[data-field-tasks-instant-sheet]');
        if (sheet instanceof HTMLElement) {
            sheet.removeAttribute('aria-busy');
        }
        return;
    }

    scroller.innerHTML = buildFieldTasksInstantChromeCardsHtml(cards);
    const sheet = bridge.querySelector('[data-field-tasks-instant-sheet]');
    if (sheet instanceof HTMLElement) {
        sheet.removeAttribute('aria-busy');
    }
    const countEl = bridge.querySelector('[data-field-tasks-instant-count]');
    if (countEl instanceof HTMLElement) {
        countEl.hidden = false;
        countEl.textContent = `${cards.length} مهمة`;
    }
}

function ensureFieldTasksInstantChromeBridge(): void {
    if (document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID)) return;

    const bridge = document.createElement('div');
    bridge.id = FIELD_TASKS_INSTANT_CHROME_ID;
    bridge.className = FIELD_TASKS_INSTANT_LAYER_CLASS;
    bridge.setAttribute('data-testid', 'field-tasks-open-chrome');
    bridge.setAttribute('dir', 'rtl');
    bridge.style.setProperty('opacity', '1');
    bridge.style.setProperty('visibility', 'visible');
    bridge.style.setProperty('pointer-events', 'auto');
    bridge.innerHTML = buildFieldTasksInstantChromeInnerHtml();
    document.body.appendChild(bridge);
    bindFieldTasksInstantChromeDismiss(bridge);
    bindFieldTasksInstantChromePeekRefresh(bridge);
    fillFieldTasksInstantChromePeek(bridge);
}

function bindFieldTasksInstantChromePeekRefresh(bridge: HTMLElement): void {
    if (bridge.dataset.hamiPeekBound === '1') return;
    bridge.dataset.hamiPeekBound = '1';
    const onReady = () => {
        if (!document.contains(bridge)) {
            window.removeEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
            return;
        }
        fillFieldTasksInstantChromePeek(bridge);
    };
    window.addEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
}

/** طلاء فوري في لمسة الميدان — قبل انتظار chunk الستارة أو تسليح الجزيرة */
export function paintFieldTasksInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    publishFieldTasksCurtainPeekFromDiskSync();
    scheduleFieldTasksCurtainPeekFromSecureStore();
    queueMicrotask(() => prefetchFieldTasksCurtainCardSurfaces());
    suppressFieldTasksClose();
    snapFieldTasksShellOpen();
    const root = document.querySelector(LAYER_SELECTOR);
    if (root instanceof HTMLElement) {
        forceVisible = true;
        applyLayerVisible(root, true);
        removeFieldTasksInstantChrome();
        return true;
    }
    ensureFieldTasksInstantChromeBridge();
    return true;
}

/** كشف الستارة الدافئة فوراً (قبل أي setState) */
export function revealFieldTasksWarmSheet(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.querySelector(LAYER_SELECTOR);
    if (!(root instanceof HTMLElement)) return false;

    forceVisible = true;
    suppressFieldTasksClose();
    applyLayerVisible(root, true);
    removeFieldTasksInstantChrome();
    return true;
}

/** إخفاء فوري عند الإغلاق */
export function concealFieldTasksWarmSheet(): void {
    forceVisible = false;
    removeFieldTasksInstantChrome();
    if (typeof document === 'undefined') return;
    const root = document.querySelector(LAYER_SELECTOR);
    if (root instanceof HTMLElement) applyLayerVisible(root, false);
}
