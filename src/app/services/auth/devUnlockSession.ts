/**
 * دخول صريح «كمطور» — مرحلة التطوير فقط (import.meta.env.DEV).
 * يفتح قيود الواجهة (KYC / شبكة / منتدى) عبر جلسة محلية معتمدة.
 * لا يُعتدّ به في بناء الإنتاج حتى لو بقي مفتاح التخزين.
 */

import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';

export const DEV_UNLOCK_LAWYER_ID = 'hami-dev-unlock-lawyer-1';
export const DEV_UNLOCK_LAWYER_EMAIL = 'dev.unlock@hami.local';
export const DEV_UNLOCK_LAWYER_NAME = 'مطور حامي';

const DEV_UNLOCK_KEY = 'hami:auth:explicit-dev-unlock:v1';
const DEV_UNLOCK_COOKIE = 'hami_explicit_dev_unlock';

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isDevBuild(): boolean {
    return import.meta.env.DEV === true;
}

function readUnlockCookie(): boolean {
    if (typeof document === 'undefined') return false;
    try {
        return document.cookie.split(';').some((part) => part.trim() === `${DEV_UNLOCK_COOKIE}=1`);
    } catch {
        return false;
    }
}

function writeUnlockCookie(on: boolean): void {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = on
            ? `${DEV_UNLOCK_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`
            : `${DEV_UNLOCK_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
        /* ignore */
    }
}

export function isExplicitDevUnlock(): boolean {
    if (!isDevBuild()) return false;
    if (canUseStorage()) {
        try {
            if (window.localStorage.getItem(DEV_UNLOCK_KEY) === '1') return true;
        } catch {
            /* quota / private mode */
        }
    }
    if (readUnlockCookie()) {
        markExplicitDevUnlock();
        return true;
    }
    return false;
}

export function markExplicitDevUnlock(): void {
    if (!isDevBuild()) return;
    if (canUseStorage()) {
        try {
            window.localStorage.setItem(DEV_UNLOCK_KEY, '1');
        } catch {
            /* ignore quota */
        }
    }
    writeUnlockCookie(true);
}

export function clearExplicitDevUnlock(): void {
    if (canUseStorage()) {
        try {
            window.localStorage.removeItem(DEV_UNLOCK_KEY);
        } catch {
            /* ignore */
        }
    }
    writeUnlockCookie(false);
}

/** جلسة محامٍ معتمد محلياً — ليست ضيف guest-lawyer-1 */
export function createDevUnlockLawyerSession(): { user: User; session: Session } {
    const nowIso = new Date().toISOString();
    const user = {
        id: DEV_UNLOCK_LAWYER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: DEV_UNLOCK_LAWYER_EMAIL,
        phone: '+964770000009',
        created_at: nowIso,
        updated_at: nowIso,
        email_confirmed_at: nowIso,
        app_metadata: {
            provider: 'email',
            providers: ['email'],
            systemRole: UserRole.LAWYER,
            role: 'lawyer',
        },
        user_metadata: {
            role: 'lawyer',
            accountType: 'lawyer',
            fullName: DEV_UNLOCK_LAWYER_NAME,
            name: DEV_UNLOCK_LAWYER_NAME,
            displayName: DEV_UNLOCK_LAWYER_NAME,
            systemRole: UserRole.LAWYER,
            verificationStatus: 'active',
            phone: '+964770000009',
            locale: 'ar',
        },
    } as unknown as User;

    const session = {
        access_token: `dev-access-token-${DEV_UNLOCK_LAWYER_ID}`,
        token_type: 'bearer',
        expires_in: 60 * 60 * 24 * 365,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        refresh_token: 'DEV_UNLOCK_REFRESH_TOKEN',
        user,
    } as unknown as Session;

    return { user, session };
}
