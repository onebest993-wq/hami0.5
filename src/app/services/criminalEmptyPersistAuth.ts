/**
 * يأذن بكتابة جزائي فارغ مرة واحدة (حذف آخر إضبارة) —
 * يتجاوز wipe-guard دون إضعاف الحماية ضد المسح العرضي.
 */
let authorizedUntilMs = 0;

export function authorizeCriminalEmptyPersist(ttlMs = 8_000): void {
    const ttl = Math.max(500, ttlMs);
    authorizedUntilMs = Date.now() + ttl;
}

export function isCriminalEmptyPersistAuthorized(): boolean {
    return Date.now() <= authorizedUntilMs;
}

export function resetCriminalEmptyPersistAuthForTests(): void {
    authorizedUntilMs = 0;
}
