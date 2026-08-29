const PENDING_EMAIL_KEY = 'hami:auth:email-confirm-pending';

function canUseSessionStorage(): boolean {
    return typeof sessionStorage !== 'undefined';
}

export function markEmailConfirmationPending(email: string): void {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || !canUseSessionStorage()) return;
    try {
        sessionStorage.setItem(PENDING_EMAIL_KEY, trimmed);
    } catch {
        /* ignore */
    }
}

export function clearEmailConfirmationPending(): void {
    if (!canUseSessionStorage()) return;
    try {
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
    } catch {
        /* ignore */
    }
}

export function readEmailConfirmationPending(): string | null {
    if (!canUseSessionStorage()) return null;
    try {
        const value = sessionStorage.getItem(PENDING_EMAIL_KEY)?.trim().toLowerCase() ?? '';
        return value.includes('@') ? value : null;
    } catch {
        return null;
    }
}

export function isEmailConfirmationErrorMessage(message: string | null | undefined): boolean {
    const raw = String(message ?? '');
    return /email not confirmed/i.test(raw) || /أكّد بريدك|تأكيد البريد/u.test(raw);
}
