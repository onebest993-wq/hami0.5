/**
 * مرآة هوية الجلسة الحية — مصدر عزل التخزين بلا AuthService الزومبي.
 * يحدّثها AuthProvider؛ القراءة متاحة من utils متزامنة (خارج React).
 */
import { resetLawyerSessionUiForIdentityChange } from '@/app/services/auth/resetLawyerSessionUiForIdentityChange';
import { readDevMockUser, readPersistedSupabaseAuth } from '@/app/utils/authStorage';

let liveAuthUserId: string | null = null;

export function setLiveAuthUserId(userId: string | null | undefined): void {
    const id = String(userId ?? '').trim() || null;
    const previous = liveAuthUserId;
    liveAuthUserId = id;
    if (previous !== null && previous !== id) {
        resetLawyerSessionUiForIdentityChange();
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
