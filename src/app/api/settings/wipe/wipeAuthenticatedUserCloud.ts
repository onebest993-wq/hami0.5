import type { SupabaseClient } from '@supabase/supabase-js';
import { wipeUserStorageObjects } from './wipeUserStorageObjects';

export type DatabaseWipeReceipt = {
    legalRows?: number;
    settingsRows?: number;
    notificationRows?: number;
    forumRows?: number;
    sharingRows?: number;
    calendarRows?: number;
    legacyKvRows?: number;
    sanitizedForumRows?: number;
    totalDeleted?: number;
};

export type CloudWipeBundle = {
    database: DatabaseWipeReceipt;
    storage: { deleted: number; buckets: Record<string, number> };
};

export type WipeAuthenticatedUserCloudResult =
    | { ok: true; bundle: CloudWipeBundle }
    | { ok: false; code: 'WIPE_DATABASE_FAILED' }
    | { ok: false; code: 'WIPE_STORAGE_PARTIAL'; database: DatabaseWipeReceipt };

export async function wipeAuthenticatedUserCloud(
    admin: SupabaseClient,
    userId: string,
): Promise<WipeAuthenticatedUserCloudResult> {
    const { data, error } = await admin.rpc('wipe_user_application_data', {
        p_user_id: userId,
    });
    try {
        await admin.from?.('lawyer_work_checkpoints')?.delete()?.eq('user_id', userId);
    } catch {
        /* الهجرة قد لا تكون على هذه القاعدة بعد */
    }
    if (error) {
        return { ok: false, code: 'WIPE_DATABASE_FAILED' };
    }

    const database =
        data && typeof data === 'object' && !Array.isArray(data)
            ? (data as DatabaseWipeReceipt)
            : {};

    try {
        const storage = await wipeUserStorageObjects(admin, userId);
        return {
            ok: true,
            bundle: { database, storage },
        };
    } catch {
        return { ok: false, code: 'WIPE_STORAGE_PARTIAL', database };
    }
}
