/**
 * يزرع صف توثيق معلّق إن غاب — حتى يظهر الحساب في طابور المقر.
 * لا يكتب فوق طلب قائم (معلّق/معتمد/مرفوض).
 */
import { kvGet, kvReadUserStatusMapByPrefix, kvSet } from '../../security/kvStoreAdmin.ts';
import { getGoTrueAdminApi, getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import {
    buildPendingLawyerVerificationSeed,
    isHqVerificationQueueStatus,
    type PendingLawyerVerificationSeedInput,
} from './hqVerificationQueueRecord.ts';

const KEY_PREFIX = 'lawyer-verification:';

function keyFor(userId: string): string {
    return `${KEY_PREFIX}${userId}`;
}

function hasVerificationRow(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return isHqVerificationQueueStatus((value as { status?: unknown }).status);
}

function isAppMetadataActive(value: unknown): boolean {
    return String(value ?? '').trim().toLowerCase() === 'active';
}

export async function ensurePendingLawyerVerificationKv(
    input: PendingLawyerVerificationSeedInput,
): Promise<boolean> {
    const userId = String(input.userId ?? '').trim();
    if (!userId || !isPostgresUuidSubject(userId)) return false;
    if (isAppMetadataActive(input.appVerificationStatus)) return false;
    try {
        const existing = await kvGet(keyFor(userId));
        if (hasVerificationRow(existing)) return false;
        await kvSet(keyFor(userId), buildPendingLawyerVerificationSeed({ ...input, userId }));
        return true;
    } catch {
        return false;
    }
}

type ProfileGapRow = {
    id?: unknown;
    legal_display_name?: unknown;
    created_at?: unknown;
    is_deleted?: unknown;
};

async function authHints(userId: string): Promise<{ email: string; appActive: boolean }> {
    try {
        const admin = getSupabaseAdminClient();
        if (!admin) return { email: '', appActive: false };
        const { data } = await getGoTrueAdminApi(admin).getUserById(userId);
        const email = String(data?.user?.email ?? '').trim();
        const app = data?.user?.app_metadata;
        const status =
            app && typeof app === 'object'
                ? String((app as { verification_status?: unknown }).verification_status ?? '').trim()
                : '';
        return { email, appActive: status === 'active' };
    } catch {
        return { email: '', appActive: false };
    }
}

/**
 * محامون في profiles بلا صف KV — يُزرعون معلّقين حتى يراهم المقر.
 * لا يُمسّ من له صف، ولا من اعتمده المقر في app_metadata.
 */
export async function seedMissingPendingLawyerVerifications(): Promise<number> {
    const admin = getSupabaseAdminClient();
    if (!admin) return 0;
    let planted = 0;
    try {
        const { map } = await kvReadUserStatusMapByPrefix(KEY_PREFIX);
        const { data, error } = await admin
            .from('profiles')
            .select('id, legal_display_name, created_at, is_deleted')
            .eq('role', 'lawyer');
        if (error || !Array.isArray(data)) return 0;
        for (const raw of data as ProfileGapRow[]) {
            if (raw.is_deleted === true) continue;
            const userId = String(raw.id ?? '').trim();
            if (!userId || map.has(userId)) continue;
            const hints = await authHints(userId);
            if (hints.appActive) continue;
            const wrote = await ensurePendingLawyerVerificationKv({
                userId,
                email: hints.email,
                fullName: String(raw.legal_display_name ?? '').trim(),
                submittedAt: String(raw.created_at ?? '').trim(),
                appVerificationStatus: hints.appActive ? 'active' : undefined,
            });
            if (wrote) planted += 1;
        }
    } catch {
        return planted;
    }
    return planted;
}
