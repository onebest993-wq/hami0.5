export type BootNativePlatformId = 'ios' | 'android' | 'web';

type CapacitorLike = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
};

function readCapacitorGlobal(): CapacitorLike | null {
    if (typeof window === 'undefined') return null;
    return (window as Window & { Capacitor?: CapacitorLike }).Capacitor ?? null;
}

function normalizePlatformId(raw: string | undefined | null): BootNativePlatformId {
    const value = String(raw ?? '').toLowerCase();
    if (value === 'ios') return 'ios';
    if (value === 'android') return 'android';
    return 'web';
}

function readNativePlatformFromDom(): BootNativePlatformId | null {
    if (typeof document === 'undefined') return null;
    const native = document.documentElement.dataset.hamiNative;
    if (native !== '1') return null;
    return normalizePlatformId(document.documentElement.dataset.hamiPlatform);
}

export function isBootCapacitorNativePlatform(): boolean {
    if (typeof document !== 'undefined') {
        const fromDom = document.documentElement.dataset.hamiNative;
        if (fromDom === '1') return true;
        if (fromDom === '0') return false;
    }

    return Boolean(readCapacitorGlobal()?.isNativePlatform?.());
}

export function getBootCapacitorPlatformId(): BootNativePlatformId {
    const fromDom = readNativePlatformFromDom();
    if (fromDom) return fromDom;

    const cap = readCapacitorGlobal();
    if (cap?.isNativePlatform?.()) {
        return normalizePlatformId(cap.getPlatform?.());
    }
    return 'web';
}

export function isBootAndroidNativeShell(): boolean {
    return isBootCapacitorNativePlatform() && getBootCapacitorPlatformId() === 'android';
}
