import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { runBypassingLocalOnlyForUrl } from '@/app/services/settings/localOnlyGuard';
import { purgeLocalApplicationData } from '@/app/services/settings/applicationWipe';
import { supabase } from '@/app/lib/supabase-client';
import { bffLogout, isBffAuthEnabled } from '@/app/utils/bffAuthClient';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';

export const ACCOUNT_DELETE_URL = '/api/account/delete';
export const ACCOUNT_DELETE_CONFIRMATION = 'DELETE_LAWYER_ACCOUNT_V1';

type AccountDeleteResponse = {
    ok?: boolean;
    complete?: boolean;
    authDeleted?: boolean;
};

export type DeleteLawyerAccountResult = {
    authDeleted: boolean;
    localCompleted: boolean;
    failedLocalStages: string[];
    userId: string | null;
};

async function deleteCloudAccount(): Promise<AccountDeleteResponse> {
    return runBypassingLocalOnlyForUrl(ACCOUNT_DELETE_URL, async () => {
        const result = await SecureAPIClient.fetchSecure<AccountDeleteResponse>(ACCOUNT_DELETE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confirmation: ACCOUNT_DELETE_CONFIRMATION,
                version: 1,
            }),
        });
        if (!result?.ok || !result.complete || result.authDeleted !== true) {
            throw new Error('account_delete_incomplete');
        }
        return result;
    });
}

async function terminateSession(
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>,
): Promise<void> {
    if (onLogout) {
        await onLogout({ skipLocalPurge: true });
        return;
    }
    if (isBffAuthEnabled()) {
        if (!(await bffLogout())) {
            throw new Error('bff_logout_failed');
        }
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/** حذف الحساب: سحابة + هوية المصادقة أولاً، ثم الجهاز. فشل السحابة يوقف المسح المحلي. */
export async function deleteLawyerAccount(
    resetToDefaults: () => void,
    onLogout?: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>,
): Promise<DeleteLawyerAccountResult> {
    const userId = resolveLiveAuthUserIdForStorage();
    if (!userId) {
        throw new Error('account_delete_unauthenticated');
    }

    await deleteCloudAccount();

    const local = await purgeLocalApplicationData(userId, resetToDefaults);
    let logoutError: unknown;
    try {
        await terminateSession(onLogout);
    } catch (error) {
        logoutError = error;
    }

    if (!local.complete) {
        throw new Error(`local_wipe_incomplete:${local.failedStages.join(',')}`);
    }
    if (logoutError) throw logoutError;

    return {
        authDeleted: true,
        localCompleted: local.complete,
        failedLocalStages: local.failedStages,
        userId,
    };
}
