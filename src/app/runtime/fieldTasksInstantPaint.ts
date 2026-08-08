/** كشف/إخفاء ستارة الميدان فوراً في الـ DOM — مستقل عن إطار React */

const INSTANT_ROOT_ID = 'hami-field-tasks-instant-root';
const LAYER_SELECTOR = '[data-field-tasks-root]';
/** يمنع إغلاق الستارة بنقرة شبحية بعد pointerdown على الدوك */
export const FIELD_TASKS_CLOSE_SUPPRESS_MS = 120;
/** تأخير تفعيل pointer-events على الخلفية حتى تكتمل إيماءة الفتح */
const FIELD_TASKS_BACKDROP_INTERACT_MS = 80;

/** يبقى مفعّلاً حتى يلحق React بـ open=true — يمنع أي re-render من إعادة الإخفاء */
let forceVisible = false;
let closeSuppressedUntil = 0;
let backdropInteractTimer: ReturnType<typeof setTimeout> | null = null;

export function isFieldTasksForceVisible(): boolean {
    return forceVisible;
}

export function clearFieldTasksForceVisible(): void {
    forceVisible = false;
}

export function isFieldTasksInstantPaintActive(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById(INSTANT_ROOT_ID));
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

function clearBackdropInteractTimer(): void {
    if (!backdropInteractTimer) return;
    clearTimeout(backdropInteractTimer);
    backdropInteractTimer = null;
}

function armBackdropInteract(root: HTMLElement): void {
    clearBackdropInteractTimer();
    root.style.setProperty('pointer-events', 'none');
    backdropInteractTimer = setTimeout(() => {
        backdropInteractTimer = null;
        if (!forceVisible) return;
        root.style.setProperty('pointer-events', 'auto');
    }, FIELD_TASKS_BACKDROP_INTERACT_MS);
}

function snapWarmSheetTransform(root: HTMLElement): void {
    const sheet = root.querySelector('[data-testid="field-tasks-sheet"]');
    if (!(sheet instanceof HTMLElement)) return;
    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0', 'hami-field-tasks-sheet--snap');
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.style.setProperty('opacity', '1');
        root.style.setProperty('visibility', 'visible');
        root.classList.add('hami-field-tasks-layer--visible', 'hami-field-tasks-layer--snap');
        root.setAttribute('data-open', 'true');
        root.removeAttribute('aria-hidden');
        root.removeAttribute('inert');
        armBackdropInteract(root);
        snapWarmSheetTransform(root);
    } else {
        clearBackdropInteractTimer();
        root.style.setProperty('opacity', '0');
        root.style.setProperty('visibility', 'hidden');
        root.style.setProperty('pointer-events', 'none');
        root.classList.remove('hami-field-tasks-layer--visible');
        root.setAttribute('data-open', 'false');
        root.setAttribute('aria-hidden', 'true');
        root.setAttribute('inert', '');
    }
    void root.offsetHeight;
}

/** كشف الستارة الدافئة فوراً (قبل أي setState) */
export function revealFieldTasksWarmSheet(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.querySelector(LAYER_SELECTOR);
    if (!(root instanceof HTMLElement)) return false;

    forceVisible = true;
    suppressFieldTasksClose();
    applyLayerVisible(root, true);
    clearFieldTasksInstantPaint();
    return true;
}

/** إخفاء فوري عند الإغلاق */
export function concealFieldTasksWarmSheet(): void {
    forceVisible = false;
    if (typeof document === 'undefined') return;
    const root = document.querySelector(LAYER_SELECTOR);
    if (root instanceof HTMLElement) applyLayerVisible(root, false);
    clearFieldTasksInstantPaint();
}

/** @deprecated الهيكل الفارغ لم يعد مسار الفتح — يبقى للتوافق البارد النادر */
export function paintFieldTasksInstantSheet(): void {
    if (typeof document === 'undefined') return;
    if (revealFieldTasksWarmSheet()) return;
}

export function clearFieldTasksInstantPaint(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(INSTANT_ROOT_ID)?.remove();
}
