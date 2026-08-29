/**
 * مصدر حقيقة واحد لهوية الواجهة على المنزل — ذرّي غير قابل للتجزئة.
 * الاسم والصورة والحرف يُنشران معاً؛ ممنوع تحديث الاسم بلا صورة أو العكس.
 */
import { sanitizeProfileMediaUrl, sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';
import { preferRicherLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';

export type UserIdentityUiState = {
    userId: string;
    displayName: string;
    avatarUrl: string;
    profileInitial: string;
    /** true = جاهز للرسم الكامل (تحت الغطاء أو بعده) */
    isLoaded: boolean;
};

type Listener = (state: UserIdentityUiState | null) => void;

let freeze: UserIdentityUiState | null = null;
const listeners = new Set<Listener>();

function safeAvatarUrl(raw: string | undefined): string {
    return sanitizeProfileMediaUrl(raw) ?? '';
}

function normalizeIdentity(next: UserIdentityUiState): UserIdentityUiState {
    const avatarUrl = safeAvatarUrl(next.avatarUrl);
    const displayName = sanitizeProfilePlainText(next.displayName, 80);
    const profileInitial = sanitizeProfilePlainText(next.profileInitial, 4) || 'م';
    if (
        avatarUrl === next.avatarUrl &&
        displayName === next.displayName &&
        profileInitial === next.profileInitial
    ) {
        return next;
    }
    return { ...next, avatarUrl, displayName, profileInitial };
}

export function isSameUserIdentity(
    a: UserIdentityUiState | null | undefined,
    b: UserIdentityUiState | null | undefined,
): boolean {
    if (!a || !b) return a === b;
    return (
        a.userId === b.userId &&
        a.displayName === b.displayName &&
        a.avatarUrl === b.avatarUrl &&
        a.profileInitial === b.profileInitial &&
        a.isLoaded === b.isLoaded
    );
}

export function getUserIdentityUiState(userId?: string | null): UserIdentityUiState | null {
    const uid = userId?.trim();
    if (!freeze) return null;
    if (uid && freeze.userId !== uid) return null;
    return freeze;
}

export function publishUserIdentityUiState(next: UserIdentityUiState): void {
    const normalized = normalizeIdentity(next);
    const prev = freeze;
    if (isSameUserIdentity(prev, normalized)) {
        return;
    }
    freeze = normalized;
    listeners.forEach((fn) => {
        try {
            fn(normalized);
        } catch {
            /* ignore */
        }
    });
}

/** دمج أغنى — لا يُرجع للأسوأ ولا يفرّغ حقلاً كان ممتلئاً إلا عند isLoaded صريح ببيانات كاملة */
export function mergeUserIdentityUiState(
    next: Omit<UserIdentityUiState, 'isLoaded'> & { isLoaded?: boolean },
): UserIdentityUiState {
    const prev = freeze?.userId === next.userId ? freeze : null;
    const incomingName = sanitizeProfilePlainText(next.displayName, 80).trim();
    const displayName = preferRicherLawyerDisplayName(prev?.displayName ?? '', incomingName);
    const avatarUrl =
        safeAvatarUrl(next.avatarUrl) ||
        safeAvatarUrl(prev?.avatarUrl) ||
        '';
    const profileInitial =
        sanitizeProfilePlainText(next.profileInitial, 4).trim() ||
        prev?.profileInitial ||
        'م';
    const isLoaded =
        next.isLoaded === true || (Boolean(prev?.isLoaded) && next.isLoaded !== false);
    const merged: UserIdentityUiState = {
        userId: next.userId,
        displayName,
        avatarUrl,
        profileInitial,
        isLoaded,
    };
    publishUserIdentityUiState(merged);
    return merged;
}

export function subscribeUserIdentityUiState(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** يصفّر التجميد عند تبديل الحساب — المستمعون يبقون */
export function resetUserIdentityUiState(): void {
    freeze = null;
    listeners.forEach((fn) => {
        try {
            fn(null);
        } catch {
            /* ignore */
        }
    });
}

export function resetUserIdentityUiStateForTests(): void {
    resetUserIdentityUiState();
    listeners.clear();
}
