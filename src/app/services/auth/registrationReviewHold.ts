/**
 * إبقاء رسالة انتظار الاعتماد ظاهرة بعد إنشاء الحساب حتى يختار المحامي الدخول دون انتظار.
 */

const KEY = 'hami:auth:registration-review-hold:v1';
const EVENT = 'hami:auth:registration-review-hold';

export type RegistrationReviewHold = {
    emailConfirmRequired: boolean;
    savedAt: number;
};

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readRegistrationReviewHold(): RegistrationReviewHold | null {
    if (!canUseStorage()) return null;
    try {
        const raw = window.sessionStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as RegistrationReviewHold;
        if (!parsed || typeof parsed !== 'object') return null;
        if (Date.now() - Number(parsed.savedAt || 0) > 6 * 60 * 60_000) {
            window.sessionStorage.removeItem(KEY);
            return null;
        }
        return {
            emailConfirmRequired: Boolean(parsed.emailConfirmRequired),
            savedAt: Number(parsed.savedAt) || Date.now(),
        };
    } catch {
        return null;
    }
}

export function markRegistrationReviewHold(emailConfirmRequired: boolean): void {
    if (!canUseStorage()) return;
    const next: RegistrationReviewHold = {
        emailConfirmRequired: Boolean(emailConfirmRequired),
        savedAt: Date.now(),
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
}

export function clearRegistrationReviewHold(): void {
    if (!canUseStorage()) return;
    window.sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
}

export function subscribeRegistrationReviewHold(onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => onChange();
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
}
