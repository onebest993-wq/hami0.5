/** علامة جلسة: المفاتيح مشفّرة على القرص ومفتاح الفكّ غير متاح. */
export const LAWSUIT_DECRYPT_BLOCKED_KEY = 'hami_lawsuit_decrypt_blocked';

export function isLawsuitDecryptBlocked(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    try {
        return sessionStorage.getItem(LAWSUIT_DECRYPT_BLOCKED_KEY) === '1';
    } catch {
        return false;
    }
}

export function setLawsuitDecryptBlocked(blocked: boolean): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        if (blocked) {
            sessionStorage.setItem(LAWSUIT_DECRYPT_BLOCKED_KEY, '1');
            return;
        }
        sessionStorage.removeItem(LAWSUIT_DECRYPT_BLOCKED_KEY);
    } catch {
        /* private mode / quota */
    }
}
