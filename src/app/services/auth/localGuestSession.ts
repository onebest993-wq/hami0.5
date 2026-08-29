/**
 * دخول صريح «بدون تسجيل» — جلسة محلية فقط، بلا تجاوز بيئة الإنتاج.
 * يختلف عن VITE_SHELL_AUTH_OPEN (تجاوز تطوير/E2E).
 *
 * يُحفظ في localStorage + cookie احتياطي حتى لا تُفقد الجلسة عند إعادة فتح WebView.
 */

const LOCAL_GUEST_KEY = 'hami:auth:explicit-local-guest:v1';
const LOCAL_GUEST_COOKIE = 'hami_explicit_local_guest';

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readGuestCookie(): boolean {
    if (typeof document === 'undefined') return false;
    try {
        return document.cookie.split(';').some((part) => part.trim() === `${LOCAL_GUEST_COOKIE}=1`);
    } catch {
        return false;
    }
}

function writeGuestCookie(on: boolean): void {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = on
            ? `${LOCAL_GUEST_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`
            : `${LOCAL_GUEST_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
        /* ignore */
    }
}

export function isExplicitLocalGuest(): boolean {
    if (canUseStorage()) {
        try {
            if (window.localStorage.getItem(LOCAL_GUEST_KEY) === '1') return true;
        } catch {
            /* quota / private mode */
        }
    }
    if (readGuestCookie()) {
        /* أعِد زرع localStorage إن بقيت الكوكي وحدها */
        markExplicitLocalGuest();
        return true;
    }
    return false;
}

export function markExplicitLocalGuest(): void {
    if (canUseStorage()) {
        try {
            window.localStorage.setItem(LOCAL_GUEST_KEY, '1');
        } catch {
            /* ignore quota */
        }
    }
    writeGuestCookie(true);
}

export function clearExplicitLocalGuest(): void {
    if (canUseStorage()) {
        try {
            window.localStorage.removeItem(LOCAL_GUEST_KEY);
        } catch {
            /* ignore */
        }
    }
    writeGuestCookie(false);
}
