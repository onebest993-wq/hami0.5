import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

type ProfileCloudModule = typeof import('@/app/services/cloud/lawyerProfileCloud');

let profileCloudModulePromise: Promise<ProfileCloudModule> | null = null;

function loadProfileCloudModule(): Promise<ProfileCloudModule> {
    if (!profileCloudModulePromise) {
        profileCloudModulePromise = import('@/app/services/cloud/lawyerProfileCloud');
    }
    return profileCloudModulePromise;
}

/** جلب الملف المهني — dynamic import لعدم ربط chunk الواجهة بـ lawyer-cloud monolith. */
export async function fetchLawyerProfile(
    userId: string,
    viewerIdOverride?: string | null,
): Promise<LawyerProfileData> {
    const mod = await loadProfileCloudModule();
    return mod.ProfileDB.getProfile(userId, viewerIdOverride);
}

/** للاختبارات — إعادة تعيين cache الوحدة. */
export function resetProfileCloudLoaderForTests(): void {
    profileCloudModulePromise = null;
}
