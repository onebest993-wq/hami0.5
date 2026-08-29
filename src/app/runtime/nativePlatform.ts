export type NativePlatformId = 'ios' | 'android' | 'web';

type CapacitorLike = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
};

function readCapacitorGlobal(): CapacitorLike | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { Capacitor?: CapacitorLike }).Capacitor ?? null;
}

function normalizePlatformId(raw: string | undefined | null): NativePlatformId {
    const value = String(raw ?? '').toLowerCase();
    if (value === 'ios') return 'ios';
    if (value === 'android') return 'android';
    return 'web';
}

/**
 * كشف أندرويد Capacitor قبل جاهزية window.Capacitor:
 * androidScheme = https://localhost بلا منفذ + UA Android.
 */
export function detectEarlyAndroidCapacitorShell(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = String(navigator.userAgent || '');
    if (!/Android/i.test(ua)) return false;
    if (/;\s*wv\)/i.test(ua) || /Capacitor/i.test(ua)) return true;
    const loc = window.location;
    const host = String(loc?.hostname || '');
    const proto = String(loc?.protocol || '');
    const port = String(loc?.port || '');
    return proto === 'https:' && (host === 'localhost' || host === '127.0.0.1') && !port;
}

/** يقرأ data-hami-platform من DOM — يُضبط مبكراً من hami-boot.js أو capacitorShellBoot */
export function readNativePlatformFromDom(): NativePlatformId | null {
    if (typeof document === 'undefined') return null;
    const native = document.documentElement.dataset.hamiNative;
    if (native !== '1') return null;
    return normalizePlatformId(document.documentElement.dataset.hamiPlatform);
}

export function isCapacitorNativePlatform(): boolean {
    if (typeof document !== 'undefined') {
        const fromDom = document.documentElement.dataset.hamiNative;
        if (fromDom === '1') return true;
        if (fromDom === '0') return false;
    }

    if (readCapacitorGlobal()?.isNativePlatform?.()) return true;
    return detectEarlyAndroidCapacitorShell();
}

export function getCapacitorPlatformId(): NativePlatformId {
    if (typeof document !== 'undefined' && document.documentElement.dataset.hamiNative === '0') {
        return 'web';
    }

    const fromDom = readNativePlatformFromDom();
    if (fromDom) return fromDom;

    const cap = readCapacitorGlobal();
    if (cap?.isNativePlatform?.()) {
        return normalizePlatformId(cap.getPlatform?.());
    }
    if (detectEarlyAndroidCapacitorShell()) return 'android';
    return 'web';
}

export function isAndroidNativeShell(): boolean {
    return isCapacitorNativePlatform() && getCapacitorPlatformId() === 'android';
}
