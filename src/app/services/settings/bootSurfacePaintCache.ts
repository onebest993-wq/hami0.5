/** لقطة ألوان/خلفية للإقلاع — تُقرأ متزامناً قبل React */
export const BOOT_SURFACE_PAINT_KEY = 'hami_boot_surface_paint_v1';
export const BOOT_SURFACE_PAINT_SESSION_KEY = 'hami_boot_surface_paint_session_v1';

export type BootSurfacePaintV1 = {
    v: 1;
    boardBg: string;
    surfaceBg: string;
    primary: string;
    secondary: string;
    cardBg: string;
    glassBase: string;
    glassOpacity: string;
    glassPanelBg?: string;
    theme: string;
    wallpaper: '0' | '1';
    homeContainerBorder?: '0' | '1';
    colorMode?: 'light' | 'dark';
    shape?: string;
};

export function applyBootSurfacePaint(cache: BootSurfacePaintV1): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--hami-primary', cache.primary);
    root.style.setProperty('--hami-secondary', cache.secondary);
    root.style.setProperty('--hami-surface-bg', cache.surfaceBg);
    root.style.setProperty('--hami-board-surface-bg', cache.boardBg);
    root.style.setProperty('--hami-card-surface-bg', cache.cardBg);
    root.style.setProperty('--hami-glass-base', cache.glassBase);
    root.style.setProperty('--glass-opacity', cache.glassOpacity);
    if (cache.glassPanelBg) {
        root.style.setProperty('--hami-glass-panel-bg', cache.glassPanelBg);
    }
    root.dataset.hamiTheme = cache.theme;
    root.dataset.hamiWallpaper = cache.wallpaper;
    root.dataset.hamiHomeContainerBorder = cache.homeContainerBorder ?? '1';
    root.dataset.hamiColorMode = cache.colorMode === 'light' ? 'light' : 'dark';
    if (cache.shape) {
        root.dataset.hamiShape = cache.shape;
    }

    const paint = cache.boardBg || cache.surfaceBg || '#0a0f1c';
    root.style.backgroundColor = paint;
    document.body.style.backgroundColor = paint;

    /* ألوان صلبة أولاً — الصورة تُحقن تحت الغطاء بعد فك ترميزها، لا بعد الكشف */
    if (cache.wallpaper !== '1') {
        root.style.removeProperty('--hami-wallpaper-image');
    }
}

export function readBootSurfacePaintCache(): BootSurfacePaintV1 | null {
    if (typeof window === 'undefined') return null;
    try {
        if (typeof sessionStorage !== 'undefined') {
            const fromSession = parseBootSurfacePaintRaw(
                sessionStorage.getItem(BOOT_SURFACE_PAINT_SESSION_KEY),
            );
            if (fromSession) return fromSession;
        }
    } catch {
        /* ignore */
    }
    try {
        if (typeof localStorage !== 'undefined') {
            const fromLocal = parseBootSurfacePaintRaw(localStorage.getItem(BOOT_SURFACE_PAINT_KEY));
            if (fromLocal) return fromLocal;
        }
    } catch {
        /* ignore */
    }
    return null;
}

function parseBootSurfacePaintRaw(raw: string | null): BootSurfacePaintV1 | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<BootSurfacePaintV1>;
        if (parsed.v !== 1) return null;
        if (!parsed.boardBg || !parsed.surfaceBg || !parsed.primary) return null;
        return {
            v: 1,
            boardBg: parsed.boardBg,
            surfaceBg: parsed.surfaceBg,
            primary: parsed.primary,
            secondary: parsed.secondary ?? parsed.primary,
            cardBg: parsed.cardBg ?? parsed.surfaceBg,
            glassBase: parsed.glassBase ?? parsed.surfaceBg,
            glassOpacity: parsed.glassOpacity ?? '0.92',
            glassPanelBg: parsed.glassPanelBg,
            theme: parsed.theme ?? 'gold',
            wallpaper: parsed.wallpaper === '1' ? '1' : '0',
            homeContainerBorder: parsed.homeContainerBorder === '0' ? '0' : '1',
            colorMode: parsed.colorMode === 'light' ? 'light' : 'dark',
            shape: typeof parsed.shape === 'string' && parsed.shape ? parsed.shape : undefined,
        };
    } catch {
        return null;
    }
}

export function applyBootSurfacePaintFromStorage(): boolean {
    const cache = readBootSurfacePaintCache();
    if (!cache) return false;
    applyBootSurfacePaint(cache);
    return true;
}

export function persistBootSurfacePaintFromDom(): void {
    if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;
    const root = document.documentElement;
    const boardBg =
        root.style.getPropertyValue('--hami-board-surface-bg').trim() ||
        getComputedStyle(root).getPropertyValue('--hami-board-surface-bg').trim();
    const surfaceBg =
        root.style.getPropertyValue('--hami-surface-bg').trim() ||
        getComputedStyle(root).getPropertyValue('--hami-surface-bg').trim();
    const primary =
        root.style.getPropertyValue('--hami-primary').trim() ||
        getComputedStyle(root).getPropertyValue('--hami-primary').trim();
    if (!boardBg || !surfaceBg || !primary) return;

    const payload: BootSurfacePaintV1 = {
        v: 1,
        boardBg,
        surfaceBg,
        primary,
        secondary:
            root.style.getPropertyValue('--hami-secondary').trim() ||
            getComputedStyle(root).getPropertyValue('--hami-secondary').trim() ||
            primary,
        cardBg:
            root.style.getPropertyValue('--hami-card-surface-bg').trim() ||
            getComputedStyle(root).getPropertyValue('--hami-card-surface-bg').trim() ||
            surfaceBg,
        glassBase:
            root.style.getPropertyValue('--hami-glass-base').trim() ||
            getComputedStyle(root).getPropertyValue('--hami-glass-base').trim() ||
            surfaceBg,
        glassOpacity:
            root.style.getPropertyValue('--glass-opacity').trim() ||
            getComputedStyle(root).getPropertyValue('--glass-opacity').trim() ||
            '0.92',
        glassPanelBg:
            root.style.getPropertyValue('--hami-glass-panel-bg').trim() ||
            getComputedStyle(root).getPropertyValue('--hami-glass-panel-bg').trim() ||
            undefined,
        theme: root.dataset.hamiTheme ?? 'gold',
        wallpaper: root.dataset.hamiWallpaper === '1' ? '1' : '0',
        homeContainerBorder: root.dataset.hamiHomeContainerBorder === '0' ? '0' : '1',
        colorMode: root.dataset.hamiColorMode === 'light' ? 'light' : 'dark',
        shape: root.dataset.hamiShape || undefined,
    };

    try {
        const serialized = JSON.stringify(payload);
        localStorage.setItem(BOOT_SURFACE_PAINT_KEY, serialized);
        try {
            sessionStorage.setItem(BOOT_SURFACE_PAINT_SESSION_KEY, serialized);
        } catch {
            /* session quota */
        }
    } catch {
        /* quota — لا نفشل الإقلاع */
    }
}
