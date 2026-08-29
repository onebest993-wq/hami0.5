/**
 * معيار سطح يستحق رفع الشعار — ورقة بلا إقلاع/كروم.
 * المسار الذهبي (هوية + كروم) يبقى في isHomeGridRevealReady.
 */

export function hasAuthGateSurface(root: ParentNode = document): boolean {
    return Boolean(
        root.querySelector('[data-hami-auth-gate]') ||
            root.querySelector('[data-testid="lawyer-sign-in-gate"]'),
    );
}

/** بلاطات مركز الأوامر الحية — ليست هياكل FirstPaint */
export function hasLiveCommandTiles(root: ParentNode): boolean {
    return Boolean(
        root.querySelector('[data-testid^="hub-archive-"]') ||
            root.querySelector('[data-testid^="home-dock-dock"]'),
    );
}

/** شبكة المنزل الحية — ليست طبقة FirstPaint تحت الغطاء */
export function findLiveHomeMainGrid(root: ParentNode = document): HTMLElement | null {
    const grids = root.querySelectorAll('[data-testid="home-main-grid"]');
    for (const grid of grids) {
        if (!(grid instanceof HTMLElement)) continue;
        if (grid.closest('[data-hami-home-first-paint-layer]')) continue;
        return grid;
    }
    return null;
}

function homeMainGridRoot(root: ParentNode): Element | null {
    if (root instanceof Element && root.getAttribute('data-testid') === 'home-main-grid') {
        return root;
    }
    return root.querySelector?.('[data-testid="home-main-grid"]') ?? null;
}

/**
 * فتحة في الشبكة بلا محتوى — بطاقة واحدة عائمة ثم الباقي دفعة.
 * الشبكات الاختبارية بلا فتحات تُتجاهل.
 */
export function hasIncompleteHomeWidgetSlots(root: ParentNode): boolean {
    const grid = homeMainGridRoot(root);
    if (!grid) return false;
    const slots = grid.querySelectorAll(':scope > [data-hami-widget-slot]');
    if (slots.length === 0) return false;
    for (const slot of slots) {
        if (!(slot instanceof HTMLElement)) continue;
        if (slot.querySelector('[data-testid^="home-widget-slot-skeleton-"]')) return true;
        if (!slot.firstElementChild) return true;
    }
    return false;
}

export function isInsideHomeFirstPaintLayer(root: ParentNode): boolean {
    if (root instanceof Element) {
        return Boolean(root.closest('[data-hami-home-first-paint-layer]'));
    }
    return Boolean(root.querySelector?.('[data-hami-home-first-paint-layer]'));
}

/**
 * كروم المركز مكتمل البكسل: بطاقة حية فارغة/محتوى، أو هيكل بنفس الرسالة والأرضية.
 * لا ينتظر مقطع JS الثقيل ولا صورة الأفاتار.
 */
export function isHubChromePaintWorthy(root: ParentNode): boolean {
    const live = root.querySelector('[data-testid="home-hub-card"]');
    if (live instanceof HTMLElement) {
        if (root.querySelector('[data-testid="home-hub-alerts-loading"]')) return false;
        const state = live.getAttribute('data-hub-state');
        const hasItems = live.getAttribute('data-hub-has-items') === '1';
        if (hasItems && state === 'content') return true;
        if (root.querySelector('[data-testid="home-hub-fully-empty"]')) return true;
        return false;
    }
    const skeleton = root.querySelector('[data-testid="home-hub-card-skeleton"]');
    if (!(skeleton instanceof HTMLElement)) return false;
    return Boolean(
        root.querySelector('[data-testid="home-hub-skeleton-empty-copy"]') ||
            root.querySelector('[data-testid="home-hub-fully-empty"]'),
    );
}

/** بطاقة حية مستقرة فقط — بلا هيكل. للمسارات التي تشترط الاكتمال الحي. */
export function isLiveHubPaintWorthy(root: ParentNode): boolean {
    if (root.querySelector('[data-testid="home-hub-card-skeleton"]')) return false;
    const live = root.querySelector('[data-testid="home-hub-card"]');
    if (!(live instanceof HTMLElement)) return false;
    if (live.getAttribute('data-hub-boot-settling') === '1') return false;
    if (live.getAttribute('aria-busy') === 'true') return false;
    if (live.getAttribute('data-hub-state') === 'loading') return false;
    const state = live.getAttribute('data-hub-state');
    const hasItems = live.getAttribute('data-hub-has-items') === '1';
    if (hasItems && state === 'content') return true;
    if (state === 'empty' && root.querySelector('[data-testid="home-hub-fully-empty"]')) return true;
    return false;
}

/**
 * سطح يستحق رفع الغطاء: بلاطات حية مكتملة + بطاقة مركز حية مستقرة + اسم الهوية.
 * هيكل FirstPaint/الهيكل العظمي لا يُكشف — ذلك يسبب قفزة الحاويات ورعشة الألوان.
 */
export function isWorthyBootSurface(root: ParentNode = document): boolean {
    if (hasAuthGateSurface(root)) return true;
    if (isInsideHomeFirstPaintLayer(root)) return false;
    if (root.querySelector('[data-testid^="home-widget-slot-skeleton-"]')) return false;
    if (hasIncompleteHomeWidgetSlots(root)) return false;
    if (!hasLiveCommandTiles(root)) return false;
    if (!isLiveHubPaintWorthy(root)) return false;
    const profile = root.querySelector('[data-testid="home-dock-forum-profile"]');
    if (profile instanceof HTMLElement && profile.getAttribute('data-identity-settled') !== '1') {
        return false;
    }
    return true;
}
