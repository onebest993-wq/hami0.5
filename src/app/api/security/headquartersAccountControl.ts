import type { SupabaseClient } from '@supabase/supabase-js';
import { getGoTrueAdminApi, getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { invalidateCsrfForSubject } from './csrfServerStore.ts';
import { invalidateWifeSessionsForSubject } from './wifeSessionServerStore.ts';
import { revokeTokenSessionsForSubject } from './stolenTokenServer.ts';

export const HQ_FREEZE_DURATION_HOURS = [0, 24, 72, 168] as const;
export type HqFreezeDurationHours = (typeof HQ_FREEZE_DURATION_HOURS)[number];

export function isHqFreezeDurationHours(value: unknown): value is HqFreezeDurationHours {
    return value === 0 || value === 24 || value === 72 || value === 168;
}

export function freezeProfileUpdates(hours: HqFreezeDurationHours): Record<string, unknown> {
    const now = Date.now();
    return {
        is_banned: true,
        is_active: false,
        status: 'suspended',
        freeze_until: hours > 0 ? new Date(now + hours * 3_600_000).toISOString() : null,
        updated_at: new Date(now).toISOString(),
    };
}

export function unfreezeProfileUpdates(): Record<string, unknown> {
    return {
        is_banned: false,
        is_active: true,
        status: 'active',
        freeze_until: null,
        updated_at: new Date().toISOString(),
    };
}

function isMissingProfileColumn(message: string, column: string): boolean {
    const hay = message.toLowerCase();
    return hay.includes(column) && (hay.includes('does not exist') || hay.includes('schema cache'));
}

export function loginLockProfileUpdates(hours: HqFreezeDurationHours): Record<string, unknown> {
    const now = Date.now();
    return {
        login_blocked: hours === 0,
        login_until: hours > 0 ? new Date(now + hours * 3_600_000).toISOString() : null,
        updated_at: new Date(now).toISOString(),
    };
}

export function loginUnlockProfileUpdates(): Record<string, unknown> {
    return {
        login_blocked: false,
        login_until: null,
        updated_at: new Date().toISOString(),
    };
}

export function softDeleteProfileUpdates(): Record<string, unknown> {
    const now = new Date().toISOString();
    return {
        is_deleted: true,
        deleted_at: now,
        login_blocked: true,
        login_until: null,
        is_banned: true,
        is_active: false,
        status: 'suspended',
        freeze_until: null,
        updated_at: now,
    };
}

export function restoreProfileUpdates(): Record<string, unknown> {
    return {
        is_deleted: false,
        deleted_at: null,
        ...loginUnlockProfileUpdates(),
        ...unfreezeProfileUpdates(),
    };
}

export function publicVerifiedBadgeProfileUpdates(shown: boolean): Record<string, unknown> {
    return {
        public_verified_badge: shown === true,
        updated_at: new Date().toISOString(),
    };
}

export function goTrueBanDurationHours(hours: HqFreezeDurationHours): string {
    return hours > 0 ? `${hours}h` : '876000h';
}

export function isHqProfileLoginLocked(row: {
    isDeleted?: boolean;
    loginBlocked?: boolean;
    loginUntil?: string | null;
}): boolean {
    if (row.isDeleted || row.loginBlocked) return true;
    const until = row.loginUntil;
    if (!until) return false;
    const at = Date.parse(until);
    return Number.isFinite(at) && at > Date.now();
}

export async function updateHeadquartersProfile(
    admin: SupabaseClient,
    userId: string,
    updates: Record<string, unknown>,
): Promise<{ error: { message?: string } | null }> {
    let payload = { ...updates };
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await admin.from('profiles').update(payload).eq('id', userId);
        const error = result.error as { message?: string } | null;
        if (!error) return { error: null };
        const next = { ...payload };
        let stripped = false;
        for (const column of [
            'freeze_until',
            'login_until',
            'login_blocked',
            'deleted_at',
            'public_verified_badge',
        ] as const) {
            if (
                Object.prototype.hasOwnProperty.call(next, column) &&
                isMissingProfileColumn(error.message ?? '', column)
            ) {
                delete next[column];
                stripped = true;
            }
        }
        if (!stripped) return { error };
        payload = next;
    }
    return { error: { message: 'Profile update failed' } };
}

export async function applyGoTrueLoginBan(
    targetUserId: string,
    hours: HqFreezeDurationHours,
): Promise<void> {
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    try {
        const api = getGoTrueAdminApi(admin);
        await api.updateUserById(targetUserId, { ban_duration: goTrueBanDurationHours(hours) });
    } catch {
        /* أفضل جهد — قفل الدخول يبقى من profiles */
    }
}

/**
 * يرفع حظر تسجيل الدخول في GoTrue دون إنهاء الجلسات.
 * التجميد يوقف المنتدى/الشبكة عبر `profiles` — لا يُطرد المحامي من أعماله المحلية.
 */
export async function liftGoTrueLoginBan(targetUserId: string): Promise<void> {
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    try {
        const api = getGoTrueAdminApi(admin);
        await api.updateUserById(targetUserId, { ban_duration: 'none' });
    } catch {
        /* أفضل جهد — التجميد يبقى من profiles */
    }
}

/**
 * يُسقط جلسات WIFE/CSRF فوراً ويخرج من GoTrue.
 * لا يضع حظر تسجيل دخول — التجميد يُرفع عبر liftGoTrueLoginBan.
 */
export async function revokeHeadquartersUserAccess(targetUserId: string): Promise<void> {
    await Promise.allSettled([
        invalidateCsrfForSubject(targetUserId),
        invalidateWifeSessionsForSubject(targetUserId),
        revokeTokenSessionsForSubject(targetUserId),
    ]);
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    try {
        const api = getGoTrueAdminApi(admin);
        if (typeof api.signOut === 'function') {
            await api.signOut(targetUserId, 'global');
        }
    } catch {
        /* أفضل جهد — profiles + WIFE يبقيان الحماية الأساسية */
    }
}
