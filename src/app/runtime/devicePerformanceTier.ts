import type { LitePerformanceMode } from '@/app/services/settings/types';

type NavigatorWithHints = Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: {
        saveData?: boolean;
        effectiveType?: string;
    };
};

/** غلاف أصلي مختوم على html — بلا وحدة قارئ الأصل. */
export function isNativeShellStampedOnDom(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.dataset.hamiNative === '1';
}

/** إشارات الجهاز/الشبكة — بدون UA sniffing (يشمل الهواتف المتوسطة) */
export function isModestDevice(): boolean {
    if (typeof navigator === 'undefined') return false;

    const nav = navigator as NavigatorWithHints;
    const mem = nav.deviceMemory;
    const cores = nav.hardwareConcurrency;

    if (typeof mem === 'number' && mem > 0 && mem <= 4) return true;

    if (typeof cores === 'number' && cores > 0 && cores <= 6) {
        if (typeof mem !== 'number' || mem <= 6) return true;
    }

    if (isMeteredOrSlowNetwork()) return true;

    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
        if (window.innerWidth <= 520 && !isNativeShellStampedOnDom()) return true;
    }

    return false;
}

/** توفير البيانات أو 2G/3G — مستقل عن إعداد الخفيف (قد يكون off) */
export function isMeteredOrSlowNetwork(): boolean {
    if (typeof navigator === 'undefined') return false;
    const conn = (navigator as NavigatorWithHints).connection;
    if (conn?.saveData) return true;
    const effective = String(conn?.effectiveType ?? '');
    return effective === 'slow-2g' || effective === '2g' || effective === '3g';
}

export function normalizeLitePerformanceMode(value: unknown): LitePerformanceMode {
    if (value === 'on' || value === 'off' || value === 'auto') return value;
    return 'auto';
}

export function resolveLitePerformance(mode: LitePerformanceMode | undefined): boolean {
    const normalized = normalizeLitePerformanceMode(mode);
    if (normalized === 'on') return true;
    if (normalized === 'off') return false;
    return isModestDevice();
}

/** يقرأ data-hami-lite إن وُجد (يُضبط مبكراً من hami-boot.js) */
export function isLitePerformanceActiveFromDom(): boolean | null {
    if (typeof document === 'undefined') return null;
    const v = document.documentElement.dataset.hamiLite;
    if (v === '1') return true;
    if (v === '0') return false;
    return null;
}

export function isLitePerformanceActive(mode?: LitePerformanceMode): boolean {
    const fromDom = isLitePerformanceActiveFromDom();
    if (fromDom !== null) return fromDom;
    return resolveLitePerformance(mode);
}

export function applyLitePerformanceDataset(mode: LitePerformanceMode | undefined): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.hamiLite = resolveLitePerformance(mode) ? '1' : '0';
}
