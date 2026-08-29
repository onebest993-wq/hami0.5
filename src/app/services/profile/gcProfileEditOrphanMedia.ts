import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { getGallery } from '@/app/services/profile/profileSections';
import { scheduleRemoveProfileMediaPaths } from '@/app/services/profile/editDraftMediaPaths';

/** GC وسائط بعد حفظ ناجح — أفاتار + معارض لم تعد في الملف */
export function gcProfileEditOrphanMediaAfterSave(
    previousProfile: LawyerProfileData,
    nextProfile: LawyerProfileData,
): void {
    const previousAvatarPath = previousProfile.header.profileImagePath?.trim() || undefined;
    const nextAvatarPath = nextProfile.header.profileImagePath?.trim() || undefined;
    if (previousAvatarPath && previousAvatarPath !== nextAvatarPath) {
        scheduleRemoveProfileMediaPaths([previousAvatarPath]);
    }

    const prevGalleryPaths = new Set(
        getGallery(previousProfile.sections)
            .map((g) => g.storagePath?.trim())
            .filter((p): p is string => Boolean(p)),
    );
    const nextGalleryPaths = new Set(
        getGallery(nextProfile.sections)
            .map((g) => g.storagePath?.trim())
            .filter((p): p is string => Boolean(p)),
    );
    const orphanedGallery = [...prevGalleryPaths].filter((p) => !nextGalleryPaths.has(p));
    if (orphanedGallery.length > 0) {
        scheduleRemoveProfileMediaPaths(orphanedGallery);
    }
}
