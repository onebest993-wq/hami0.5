/** حالة تسخين البحث العام — منفصلة لتجنّب دورة import مع globalSearchLoad */

let warmSeq = 0;
let lastWarmKey: string | null = null;

export function resetGlobalSearchWarmState(): void {
    warmSeq += 1;
    lastWarmKey = null;
}

export function bumpGlobalSearchWarmSeq(): number {
    return ++warmSeq;
}

export function getGlobalSearchWarmSeq(): number {
    return warmSeq;
}

export function getGlobalSearchLastWarmKey(): string | null {
    return lastWarmKey;
}

export function setGlobalSearchLastWarmKey(key: string | null): void {
    lastWarmKey = key;
}
