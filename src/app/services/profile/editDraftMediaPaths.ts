import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { getGallery } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';

/** مسارات رُفعت أثناء جلسة التحرير ولم تُثبَّت في الملف المحفوظ */
export function collectEditDraftOrphanMediaPaths(
    draft: EditDraft,
    committed: LawyerProfileData | null | undefined,
): string[] {
    if (!committed) return [];
    const orphans: string[] = [];
    const seen = new Set<string>();

    const push = (path: string | undefined) => {
        const next = path?.trim();
        if (!next || seen.has(next)) return;
        seen.add(next);
        orphans.push(next);
    };

    const committedAvatar = committed.header.profileImagePath?.trim();
    const draftAvatar = draft.header.profileImagePath?.trim();
    if (draftAvatar && draftAvatar !== committedAvatar) {
        push(draftAvatar);
    }

    const committedGallery = new Set(
        getGallery(committed.sections)
            .map((item) => item.storagePath?.trim())
            .filter((path): path is string => Boolean(path)),
    );
    for (const item of draft.gallery) {
        const path = item.storagePath?.trim();
        if (path && !committedGallery.has(path)) {
            push(path);
        }
    }

    return orphans;
}

export function discardEditDraftOrphanMedia(draft: EditDraft | null, committed: LawyerProfileData | null | undefined) {
    if (!draft) return;
    const orphans = collectEditDraftOrphanMediaPaths(draft, committed);
    if (orphans.length === 0) return;
    void import('@/app/services/profileMediaService')
        .then((m) => m.removeProfileMediaPaths(orphans))
        .catch(() => undefined);
}

/** يحذف مساراً مرفوعاً في الجلسة فقط إن لم يكن مثبتاً في الملف المحفوظ */
export function discardUnsavedMediaPath(
    path: string | undefined,
    committedPath: string | undefined | null,
) {
    const next = path?.trim();
    if (!next || next === committedPath?.trim()) return;
    void import('@/app/services/profileMediaService')
        .then((m) => m.removeProfileMediaPaths([next]))
        .catch(() => undefined);
}

export function discardUnsavedMediaPathUnlessCommitted(
    path: string | undefined,
    committedPaths: Iterable<string | undefined | null>,
) {
    const next = path?.trim();
    if (!next) return;
    for (const raw of committedPaths) {
        if (raw?.trim() === next) return;
    }
    void import('@/app/services/profileMediaService')
        .then((m) => m.removeProfileMediaPaths([next]))
        .catch(() => undefined);
}
