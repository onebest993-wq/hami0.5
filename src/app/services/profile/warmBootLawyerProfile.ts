/**
 * تسخين ملف المحامي المحلي قبل بذرة Frame-1.
 * المفتاح per-user ومشفّر — `getItemSync` تُرجع null ما دام `decryptedCache` بارداً.
 * سقف المستدعي فشل أمان إن علِق IndexedDB — ليس ميزانية النجاح المعتادة.
 */
import {
    setLawyerProfileBootWarmPending,
    BOOT_PROFILE_WARM_BUDGET_MS,
} from '@/app/services/profile/profileBootWarmPending';

export { BOOT_PROFILE_WARM_BUDGET_MS };

type BootProfileStore = {
    kickoffBootShellSync?: () => void;
    warmKeys: (keys: readonly string[]) => Promise<void>;
};

export async function warmBootLawyerProfile(store: BootProfileStore): Promise<void> {
    store.kickoffBootShellSync?.();
    setLawyerProfileBootWarmPending(true);
    try {
        const { peekBootSessionUserIdSync } = await import('@/boot/peekBootSessionUserId');
        const uid = peekBootSessionUserIdSync()?.trim();
        if (!uid) return;

        const { getLawyerProfileLocalKey } = await import('@/app/services/profile/profileLocalKey');
        await store.warmKeys([getLawyerProfileLocalKey(uid)]);
    } finally {
        setLawyerProfileBootWarmPending(false);
    }
}
