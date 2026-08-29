import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminUser } from '@/app/domain/admin/AdminUser';
import { parseAdminVerificationStatus, resolveHqDirectoryKycStatus } from '@/app/domain/admin/hqUserPresence';
import { mapHeadquartersUser } from './headquartersUserMap.ts';
import { kvGet } from './kvStoreAdmin.ts';
import { selectHeadquartersProfileById, isMissingProfileColumn } from './headquartersProfileSelect.ts';
import { getGoTrueAdminApi } from './supabaseAdminClient.ts';

export {
    listHeadquartersUsers,
    listHeadquartersNotifyRecipientIds,
} from './headquartersDirectoryList.ts';

type AuthIdentity = {
    email: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    appVerificationStatus: ReturnType<typeof parseAdminVerificationStatus>;
};

const EMPTY_AUTH_IDENTITY: AuthIdentity = {
    email: '',
    fullName: '',
    familyName: '',
    phone: '',
    governorate: '',
    lawyerBarRoom: '',
    appVerificationStatus: 'none',
};

function readMetaString(meta: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const raw = String(meta[key] ?? '').trim();
        if (raw) return raw.slice(0, 160);
    }
    return '';
}

function identityFromAuthUser(user: {
    email?: string | null;
    user_metadata?: unknown;
    app_metadata?: unknown;
}): AuthIdentity {
    const email = String(user.email ?? '').trim();
    const meta =
        user.user_metadata && typeof user.user_metadata === 'object'
            ? (user.user_metadata as Record<string, unknown>)
            : {};
    const app =
        user.app_metadata && typeof user.app_metadata === 'object'
            ? (user.app_metadata as Record<string, unknown>)
            : {};
    const given = readMetaString(meta, ['fullName', 'full_name']);
    const familyName = readMetaString(meta, ['familyName', 'family_name']);
    return {
        email,
        fullName: given,
        familyName,
        phone: readMetaString(meta, ['phone']),
        governorate: readMetaString(meta, ['governorate']),
        lawyerBarRoom: readMetaString(meta, ['lawyerBarRoom', 'lawyer_bar_room']),
        appVerificationStatus: parseAdminVerificationStatus(app.verification_status),
    };
}

async function loadAuthIdentity(admin: SupabaseClient, userId: string): Promise<AuthIdentity> {
    try {
        const { data, error } = await getGoTrueAdminApi(admin).getUserById(userId);
        if (error || !data?.user) {
            return { ...EMPTY_AUTH_IDENTITY };
        }
        return identityFromAuthUser(data.user);
    } catch {
        return { ...EMPTY_AUTH_IDENTITY };
    }
}

export async function fetchHeadquartersUser(
    admin: SupabaseClient,
    userId: string,
): Promise<AdminUser | null> {
    try {
        const { data, error } = await selectHeadquartersProfileById(admin, userId);
        if (error || !data) return null;
        const identity = await loadAuthIdentity(admin, userId);
        let kvAvailable = false;
        let kvValue: unknown;
        let kycSubmittedName = '';
        try {
            const raw = await kvGet(`lawyer-verification:${userId}`);
            kvAvailable = true;
            if (raw && typeof raw === 'object') {
                kvValue = (raw as { status?: unknown }).status;
                kycSubmittedName = String((raw as { fullName?: unknown }).fullName ?? '').trim();
            }
        } catch {
            /* نعتمد app_metadata إن تعذّر KV */
        }
        return mapHeadquartersUser(
            data,
            { ...identity, kycSubmittedName },
            resolveHqDirectoryKycStatus(kvValue, kvAvailable, identity.appVerificationStatus),
        );
    } catch {
        return null;
    }
}

export async function readHeadquartersBanFlags(
    admin: SupabaseClient,
    userId: string,
): Promise<{ frozen: boolean } | null> {
    try {
        const first = await admin
            .from('profiles')
            .select('is_banned, is_active, is_deleted, status, freeze_until')
            .eq('id', userId)
            .maybeSingle();
        const result =
            first.error && isMissingProfileColumn(first.error.message ?? '', 'freeze_until')
                ? await admin
                      .from('profiles')
                      .select('is_banned, is_active, is_deleted, status')
                      .eq('id', userId)
                      .maybeSingle()
                : first;
        const { data, error } = result;
        if (error || !data || (data as { is_deleted?: unknown }).is_deleted === true) {
            return null;
        }
        const freezeUntil = (data as { freeze_until?: unknown }).freeze_until;
        if (freezeUntil != null && String(freezeUntil).trim() !== '') {
            const until = Date.parse(String(freezeUntil));
            if (Number.isFinite(until) && until > Date.now()) return { frozen: true };
            if (Number.isFinite(until) && until <= Date.now()) return { frozen: false };
        }
        const status = String((data as { status?: unknown }).status ?? '')
            .trim()
            .toLowerCase();
        const frozen =
            (data as { is_banned?: unknown }).is_banned === true ||
            (data as { is_active?: unknown }).is_active === false ||
            status === 'suspended' ||
            status === 'banned' ||
            status === 'frozen';
        return { frozen };
    } catch {
        return null;
    }
}
