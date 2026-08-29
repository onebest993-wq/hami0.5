/**
 * إعلان طلاء شبكة المنزل — ورقة بلا اعتماد على boot-runtime / homeBootChrome.
 * HomeMainGrid يستورد من هنا فقط؛ إزالة الغطاء ملك boot عبر المستمع في homeMainGridPaintGate.
 *
 * العقد: الغطاء يبقى حتى بلاطات حية + بطاقة مركز حية مستقرة + اسم الهوية.
 * طبقة FirstPaint لا تُكشف. لا انتظار لصورة الأفاتار.
 * على Android الأصلي ننتظر inset شريط الحالة إن أمكن حتى لا يهبط المحتوى بعد الكشف.
 *
 * ممنوع استيراد homeBootChrome من هنا: الورقة داخل boot-paint-leaves؛ الكروم
 * يسحب HomeTab → هذه الورقة → TDZ (Cannot access before initialization).
 */
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';
import {
    hasIncompleteHomeWidgetSlots,
    hasLiveCommandTiles,
    isHubChromePaintWorthy,
    isLiveHubPaintWorthy,
} from '@/app/bootstrap/bootWorthySurface';

export { HOME_MAIN_GRID_PAINTED_EVENT, isHubChromePaintWorthy, isLiveHubPaintWorthy };

let readIdentityChromeReady: () => boolean = () => false;

/** يربطه homeBootChromeState بعد اكتمال هذه الورقة — اتجاه واحد: حالة → ورقة */
export function bindHomeIdentityChromeReady(read: () => boolean): void {
    readIdentityChromeReady = read;
}

/**
 * أول إطار يراه المستخدم: بلاطات حية + بطاقة مركز حية مستقرة + اسم الهوية.
 * هيكل FirstPaint لا يُكشف. الحرف الذهبي يكفي بلا انتظار img.
 */
export function isHomeGridRevealReady(grid: HTMLElement): boolean {
    if (grid.closest('[data-hami-home-first-paint-layer]')) return false;
    if (!readIdentityChromeReady()) return false;
    if (!isLiveHubPaintWorthy(grid)) return false;
    if (!hasLiveCommandTiles(grid)) return false;
    if (grid.querySelector('[data-testid^="home-widget-slot-skeleton-"]')) return false;
    if (hasIncompleteHomeWidgetSlots(grid)) return false;

    const profile = grid.querySelector('[data-testid="home-dock-forum-profile"]');
    if (profile instanceof HTMLElement && profile.getAttribute('data-identity-settled') !== '1') {
        return false;
    }

    return true;
}

let homeMainGridPainted = false;

export function isHomeMainGridPainted(): boolean {
    return homeMainGridPainted;
}

export function resetHomeMainGridPaintAnnounceForTests(): void {
    homeMainGridPainted = false;
    if (typeof window !== 'undefined') {
        window.__hamiHomeMainGridPainted__ = false;
    }
}

function gridHasPaintableSize(grid: HTMLElement): boolean {
    const rect = grid.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
}

function isAndroidNativeShell(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    return root.getAttribute('data-hami-native') === '1' && root.getAttribute('data-hami-platform') === 'android';
}

export function readSafeAreaInsetTopPx(): number {
    if (typeof document === 'undefined') return 0;
    const probe = document.createElement('div');
    probe.setAttribute('data-hami-safe-area-probe', '1');
    probe.style.cssText =
        'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';
    document.documentElement.appendChild(probe);
    const raw = getComputedStyle(probe).paddingTop;
    probe.remove();
    const px = Number.parseFloat(raw);
    return Number.isFinite(px) ? px : 0;
}

function publishAndroidStatusPadFromInsets(): void {
    if (!isAndroidNativeShell()) return;
    const inset = readSafeAreaInsetTopPx();
    if (inset <= 0) return;
    document.documentElement.style.setProperty('--hami-android-status-pad', `${Math.ceil(inset)}px`);
}

function publishHeaderOffsetFromDom(): void {
    if (typeof document === 'undefined') return;
    const header = document.querySelector('.hami-lawyer-header');
    if (!(header instanceof HTMLElement)) return;
    const height = header.offsetHeight;
    if (height <= 0) return;
    document.documentElement.style.setProperty('--hami-lawyer-header-offset', `${Math.ceil(height)}px`);
}

function isHeaderOffsetReady(): boolean {
    if (typeof document === 'undefined') return true;
    const header = document.querySelector('.hami-lawyer-header');
    if (!(header instanceof HTMLElement)) return true;
    return header.offsetHeight > 0;
}

function androidInsetsSettled(): boolean {
    if (!isAndroidNativeShell()) return true;
    return readSafeAreaInsetTopPx() > 0;
}

/** سقف فشل إن علقت الوحدات — ليس مسار السعادة؛ السعادة = شبكة حية جاهزة */
const MAX_GRID_PAINT_ATTEMPTS = 240;

/**
 * بعد استنفاد القياس: نفس عقد الكشف الذهبي — لا شبكة أضعف من isHomeGridRevealReady.
 */
export function canUncoverLiveHubAfterPaintBudget(grid: HTMLElement): boolean {
    if (!grid.isConnected || !gridHasPaintableSize(grid)) return false;
    return isHomeGridRevealReady(grid);
}

/**
 * يقيس الشبكة حتى تصبح الواجهة النهائية جاهزة.
 * سقف المحاولات لا يكشف سطحاً أضعف؛ بعد السقف تُكمل بوابة الـ50ms على الشبكة الحية.
 */
export function scheduleHomeMainGridPainted(grid: HTMLElement | null): void {
    if (typeof window === 'undefined' || homeMainGridPainted) return;
    if (!(grid instanceof HTMLElement)) return;

    let attempts = 0;
    let lastHubHeight = -1;
    let hubHeightStableFrames = 0;
    const tryNotify = () => {
        if (homeMainGridPainted) return;
        attempts += 1;
        if (!grid.isConnected) {
            if (attempts < MAX_GRID_PAINT_ATTEMPTS) {
                requestAnimationFrame(tryNotify);
            }
            return;
        }
        const revealReady =
            gridHasPaintableSize(grid) &&
            isHomeGridRevealReady(grid) &&
            androidInsetsSettled() &&
            isHeaderOffsetReady();
        if (revealReady) {
            const hub =
                grid.querySelector('[data-testid="home-hub-card"]') ??
                grid.querySelector('[data-testid="home-hub-card-skeleton"]');
            const hubHeight = hub instanceof HTMLElement ? hub.getBoundingClientRect().height : -1;
            if (hubHeight > 0 && Math.abs(hubHeight - lastHubHeight) < 0.5) {
                hubHeightStableFrames += 1;
            } else {
                lastHubHeight = hubHeight;
                hubHeightStableFrames = 0;
            }
            if (hubHeightStableFrames >= 1) {
                publishAndroidStatusPadFromInsets();
                publishHeaderOffsetFromDom();
                announceHomeMainGridPainted();
                return;
            }
        } else {
            lastHubHeight = -1;
            hubHeightStableFrames = 0;
        }
        if (attempts < MAX_GRID_PAINT_ATTEMPTS) {
            requestAnimationFrame(tryNotify);
            return;
        }
        if (canUncoverLiveHubAfterPaintBudget(grid)) {
            publishAndroidStatusPadFromInsets();
            publishHeaderOffsetFromDom();
            announceHomeMainGridPainted();
        }
    };

    requestAnimationFrame(tryNotify);
}

/** إعلان متزامن — للاختبارات أو مسار جاهز مسبقاً */
export function announceHomeMainGridPainted(): void {
    if (typeof window === 'undefined' || homeMainGridPainted) return;
    homeMainGridPainted = true;
    window.__hamiHomeMainGridPainted__ = true;
    try {
        window.dispatchEvent(new Event(HOME_MAIN_GRID_PAINTED_EVENT));
    } catch {
        /* ignore */
    }
}
