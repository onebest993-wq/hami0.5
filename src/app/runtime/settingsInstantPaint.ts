/** كشف/إخفاء مركز الإعدادات فوراً في الـ DOM — مستقل عن إطار React */

const HOST_SELECTOR = '[data-testid="hami-settings-overlay-host"]';
const ROOT_SELECTOR = '[data-settings-root]';
const DASHBOARD_SELECTOR = '[data-hami-lawyer-dashboard]';
const BRIDGE_ID = 'hami-settings-instant-bridge';
const CHROME = '#0B1021';
const INTERACT_CLASS = 'hami-settings-overlay-layer--interact';
const CLOSE_GUARD_ATTR = 'data-settings-close-guard';

/**
 * احتياطي قصير لحارس زر X إن لم يأتِ click إيماءة الفتح.
 * التسليح الأساسي فور pointerup+click — لا تأخير اصطناعي معتاد.
 */
export const SETTINGS_INTERACT_ARM_MS = 64;

let forceVisible = false;
/** ساعة كشف الطبقة في الـ DOM — قبل التزام React بـ open=true */
let revealedAtMs: number | null = null;
let prevThemeColor: string | null = null;
let prevDashBg: string | null = null;
let interactArmCleanup: (() => void) | null = null;
/** يمنع إعادة فتح الإعدادات بنقرة إغلاق الشبحية (pointerdown يغلق → click يصيب الترس). */
let reopenSuppressedUntil = 0;
let reopenSuppressCleanup: (() => void) | null = null;
/**
 * حد أقصى لكبح إعادة الفتح — الضغطة المتبقية على الترس تُبتلع ثم تُرفع الكبح؛
 * المهلة احتياط إن لم يصل حدث ترس (كان 280ms فيجمّد التبديل السريع).
 */
export const SETTINGS_REOPEN_SUPPRESS_MS = 90;

const SETTINGS_GEAR_TRIGGER_SELECTOR = '[data-testid="header-settings-trigger"]';
let instantCloseHandler: (() => void) | null = null;

export function isSettingsForceVisible(): boolean {
    return forceVisible;
}

export function clearSettingsForceVisible(): void {
    forceVisible = false;
}

/** لحظة كشف الطبقة (DOM) — لساعة مهلة الإغلاق دون انتظار إطار React */
export function getSettingsShellRevealedAt(): number | null {
    return revealedAtMs;
}

function clearReopenSuppressListeners(): void {
    if (!reopenSuppressCleanup) return;
    reopenSuppressCleanup();
    reopenSuppressCleanup = null;
}

/**
 * كبح إعادة الفتح الشبحي بعد إغلاق حقيقي —
 * يبتلع pointerdown/click المتبقي على ترس الهيدر ثم يرفع الكبح؛ مهلة ≤90ms احتياط.
 */
export function suppressSettingsReopen(ms: number = SETTINGS_REOPEN_SUPPRESS_MS): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = Math.max(0, ms);
    reopenSuppressedUntil = now + duration;
    clearReopenSuppressListeners();

    if (typeof window === 'undefined' || duration <= 0) return;

    const clear = () => {
        reopenSuppressedUntil = 0;
        clearReopenSuppressListeners();
    };

    const swallowGearGhost = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.closest(SETTINGS_GEAR_TRIGGER_SELECTOR)) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        clear();
    };

    window.addEventListener('pointerdown', swallowGearGhost, true);
    window.addEventListener('click', swallowGearGhost, true);
    const fallbackTimer = window.setTimeout(clear, duration);

    reopenSuppressCleanup = () => {
        window.removeEventListener('pointerdown', swallowGearGhost, true);
        window.removeEventListener('click', swallowGearGhost, true);
        window.clearTimeout(fallbackTimer);
    };
}

export function isSettingsReopenSuppressed(): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return now < reopenSuppressedUntil;
}

export function clearSettingsReopenSuppress(): void {
    reopenSuppressedUntil = 0;
    clearReopenSuppressListeners();
}

/** يُسجَّل من useLawyerDashboardSettings — إغلاق فوري من DOM إن لزم */
export function registerSettingsInstantCloseHandler(handler: (() => void) | null): void {
    instantCloseHandler = handler;
}

export function isSettingsCloseGuarded(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(CLOSE_GUARD_ATTR);
}

function setCloseGuard(active: boolean): void {
    if (typeof document === 'undefined') return;
    if (active) document.documentElement.setAttribute(CLOSE_GUARD_ATTR, '1');
    else document.documentElement.removeAttribute(CLOSE_GUARD_ATTR);
}

export function hasSettingsOverlayHost(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector(HOST_SELECTOR));
}

function resolveLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const host = document.querySelector(HOST_SELECTOR);
    if (host instanceof HTMLElement) return host;
    const bridge = document.getElementById(BRIDGE_ID);
    if (bridge instanceof HTMLElement) return bridge;
    const root = document.querySelector(ROOT_SELECTOR);
    return root instanceof HTMLElement ? root : null;
}

function applyDashboardMask(active: boolean): void {
    if (typeof document === 'undefined') return;
    const dash = document.querySelector<HTMLElement>(DASHBOARD_SELECTOR);
    if (!dash) return;
    if (active) {
        if (prevDashBg === null) {
            prevDashBg = dash.style.backgroundColor;
        }
        dash.style.backgroundColor = CHROME;
        return;
    }
    if (prevDashBg !== null) {
        dash.style.backgroundColor = prevDashBg;
        prevDashBg = null;
    }
}

function applyThemeChrome(active: boolean): void {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (active) {
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        if (prevThemeColor === null) {
            prevThemeColor = meta.getAttribute('content');
        }
        meta.setAttribute('content', CHROME);
        document.documentElement.style.backgroundColor = CHROME;
        document.body.style.backgroundColor = CHROME;
        applyDashboardMask(true);
        return;
    }
    if (meta && prevThemeColor != null) {
        meta.setAttribute('content', prevThemeColor);
    }
    prevThemeColor = null;
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    applyDashboardMask(false);
}

/**
 * يخفّي ثيم اللوحة فوراً (html/body/meta/dashboard) — قبل commit React.
 * يُستدعى عند الفتح حتى لو لم يُركَّب Host بعد.
 */
export function applySettingsOpaqueChrome(): void {
    applyThemeChrome(true);
}

function clearInteractArmSchedule(): void {
    if (!interactArmCleanup) return;
    interactArmCleanup();
    interactArmCleanup = null;
}

export function isSettingsOverlayInteractionArmed(root?: HTMLElement | null): boolean {
    if (isSettingsCloseGuarded()) return false;
    const el = root ?? resolveLayer();
    return Boolean(el?.classList.contains(INTERACT_CLASS));
}

/** يسمح بالإغلاق بعد انتهاء إيماءة الفتح */
export function armSettingsOverlayInteraction(root?: HTMLElement | null): void {
    clearInteractArmSchedule();
    setCloseGuard(false);
    const el = root ?? resolveLayer();
    if (!el) return;
    el.classList.add(INTERACT_CLASS);
    el.style.setProperty('pointer-events', 'auto');
}

/** يمنع التفاعل (عند الإخفاء فقط — الطبقة الظاهرة تبقى قابلة للمس) */
export function disarmSettingsOverlayInteraction(root?: HTMLElement | null): void {
    clearInteractArmSchedule();
    setCloseGuard(false);
    const el = root ?? resolveLayer();
    if (!el) return;
    el.classList.remove(INTERACT_CLASS);
    if (!el.classList.contains('hami-settings-overlay-layer--visible')) {
        el.style.setProperty('pointer-events', 'none');
    }
}

/**
 * حارس إغلاق على زر X فقط (CSS) حتى ينتهي click إيماءة فتح الترس —
 * Host/Shell يعيدان الاستدعاء: لا تُعاد الجدولة.
 */
export function scheduleSettingsOverlayInteractionArm(root?: HTMLElement | null): void {
    const el = root ?? resolveLayer();
    if (!el) return;

    if (el.classList.contains(INTERACT_CLASS) && !isSettingsCloseGuarded()) return;
    if (interactArmCleanup) return;

    el.classList.remove(INTERACT_CLASS);
    el.style.setProperty('pointer-events', 'auto');
    setCloseGuard(true);

    if (typeof window === 'undefined') {
        armSettingsOverlayInteraction(el);
        return;
    }

    let settled = false;

    const cleanupListeners = () => {
        if (typeof window === 'undefined') return;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', onPointerEnd, true);
        window.removeEventListener('click', swallowGhostClick, true);
        window.clearTimeout(fallbackTimer);
    };

    const armNow = () => {
        if (settled) return;
        settled = true;
        cleanupListeners();
        interactArmCleanup = null;
        armSettingsOverlayInteraction(el);
    };

    const swallowGhostClick = (event: Event) => {
        const target = event.target;
        if (
            target instanceof Element &&
            target.closest('[data-testid="settings-shell-close"]')
        ) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }
        armNow();
    };

    const onPointerEnd = () => {
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', onPointerEnd, true);
        window.addEventListener('click', swallowGhostClick, true);
    };

    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    const fallbackTimer = window.setTimeout(armNow, SETTINGS_INTERACT_ARM_MS);

    interactArmCleanup = () => {
        settled = true;
        cleanupListeners();
        setCloseGuard(false);
        interactArmCleanup = null;
    };
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.style.setProperty('opacity', '1');
        root.style.setProperty('background-color', CHROME);
        root.classList.add('hami-settings-overlay-layer--visible');
        root.classList.remove(INTERACT_CLASS);
        root.setAttribute('data-open', 'true');
        root.removeAttribute('aria-hidden');
        root.removeAttribute('inert');
        revealedAtMs =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
        applyThemeChrome(true);
    } else {
        clearInteractArmSchedule();
        setCloseGuard(false);
        root.style.setProperty('visibility', 'hidden');
        root.style.setProperty('pointer-events', 'none');
        root.style.setProperty('opacity', '0');
        root.classList.remove('hami-settings-overlay-layer--visible');
        root.classList.remove(INTERACT_CLASS);
        root.setAttribute('data-open', 'false');
        root.setAttribute('aria-hidden', 'true');
        root.setAttribute('inert', '');
        revealedAtMs = null;
        applyThemeChrome(false);
    }
}

/** إزالة جسر طلاء قديم إن وُجد (لم نعد نزرعه) */
export function removeSettingsInstantBridge(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(BRIDGE_ID)?.remove();
}

/**
 * طلاء فوري: يكشف Host الحقيقي فقط — بلا جسر هيكل ملوّن.
 * إن لم يوجد Host يعيد false؛ المستدعي يركّب عبر flushSync ثم يعيد المحاولة.
 */
export function paintSettingsInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    removeSettingsInstantBridge();

    const existingHost = document.querySelector(HOST_SELECTOR);
    if (!(existingHost instanceof HTMLElement)) return false;

    forceVisible = true;
    applyLayerVisible(existingHost, true);
    scheduleSettingsOverlayInteractionArm(existingHost);
    return true;
}

/** كشف طبقة الإعدادات الدافئة فوراً (قبل أي setState ثقيل) */
export function revealSettingsWarmShell(): boolean {
    return paintSettingsInstantChrome();
}

export type ConcealSettingsWarmShellOptions = {
    /**
     * كبح إعادة الفتح بعد إغلاق مستخدم حقيقي فقط.
     * الافتراضي false — وإلا priming (تركيب host مغلق) يبتلع click فتح الترس في نفس الإيماءة.
     */
    suppressReopen?: boolean;
};

/** إخفاء فوري للطبقة الدافئة (بدون كبح فتح افتراضياً) */
export function concealSettingsWarmShell(
    options: ConcealSettingsWarmShellOptions = {},
): void {
    forceVisible = false;
    if (options.suppressReopen) {
        suppressSettingsReopen();
    }
    const root = resolveLayer();
    if (root) applyLayerVisible(root, false);
    else {
        clearInteractArmSchedule();
        setCloseGuard(false);
        revealedAtMs = null;
        applyThemeChrome(false);
    }
    removeSettingsInstantBridge();
}
