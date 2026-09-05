/**
 * مرآة هوية الجلسة الحية — مصدر عزل التخزين بلا AuthService الزومبي.
 * يحدّثها AuthProvider؛ القراءة متاحة من utils متزامنة (خارج React).
 *
 * تصفير كروم الملف/المنتدى عند تبديل الحساب مؤجَّل بـ import() حتى لا يسحب
 * SecureStore/التقويم المشفّر كسرة lawyer-boot-peek (هوية + رادار الهاب).
 */
import { readDevMockUser, readPersistedSupabaseAuth } from '@/app/utils/authStorage';

let liveAuthUserId: string | null = null;

type IdentityResetModule = typeof import('@/app/services/auth/resetLawyerSessionUiForIdentityChange');
let identityResetPromise: Promise<IdentityResetModule> | null = null;

function resetLawyerSessionUiAfterIdentityChange(): void {
    if (!identityResetPromise) {
        identityResetPromise = import('@/app/services/auth/resetLawyerSessionUiForIdentityChange');
    }
    void identityResetPromise.then((mod) => {
        mod.resetLawyerSessionUiForIdentityChange();
    });
}

export function setLiveAuthUserId(userId: string | null | undefined): void {
    const id = String(userId ?? '').trim() || null;
    const previous = liveAuthUserId;
    liveAuthUserId = id;
    if (previous !== null && previous !== id) {
        resetLawyerSessionUiAfterIdentityChange();
    }
}

export function getLiveAuthUserId(): string | null {
    return liveAuthUserId;
}

/**
 * معرّف للعزل المحلي: الذاكرة الحية ثم جلسات persisted (Supabase / dev-mock).
 * لا يعتمد على AuthService.getCurrentUser().
 */
export function resolveLiveAuthUserIdForStorage(): string | null {
    const live = getLiveAuthUserId();
    if (live) return live;
    try {
        const persisted = readPersistedSupabaseAuth().user?.id?.trim();
        if (persisted) return persisted;
        const mock = readDevMockUser()?.id?.trim();
        if (mock) return mock;
    } catch {
        /* ignore */
    }
    return null;
}
