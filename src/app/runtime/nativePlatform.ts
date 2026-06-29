export type NativePlatformId = 'ios' | 'android' | 'web';

type CapacitorLike = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
};

function readCapacitorGlobal(): CapacitorLike | null {
    if (typeof window === 'undefined') return null;
    const cap = (window as Window & { Capacitor?: CapacitorLike }).Capacitor;
    return cap ?? null;
}

function normalizePlatformId(raw: string | undefined | null): NativePlatformId {
    const value = String(raw ?? '').toLowerCase();
    if (value === 'ios') return 'ios';
    if (value === 'android') return 'android';
    return 'web';
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

    const cap = readCapacitorGlobal();
    return Boolean(cap?.isNativePlatform?.());
}

export function getCapacitorPlatformId(): NativePlatformId {
    const fromDom = readNativePlatformFromDom();
    if (fromDom) return fromDom;

    const cap = readCapacitorGlobal();
    if (cap?.isNativePlatform?.()) {
        return normalizePlatformId(cap.getPlatform?.());
    }
    return 'web';
}

export function isIosNativeShell(): boolean {
    return isCapacitorNativePlatform() && getCapacitorPlatformId() === 'ios';
}

export function isAndroidNativeShell(): boolean {
    return isCapacitorNativePlatform() && getCapacitorPlatformId() === 'android';
}
