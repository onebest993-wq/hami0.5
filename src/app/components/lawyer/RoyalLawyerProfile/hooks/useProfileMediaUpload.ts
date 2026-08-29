import { useCallback, useRef, useState } from 'react';
import { ProfileDB } from '@/app/services/lawyer-cloud';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { getActions, getGallery } from '@/app/services/profile/profileSections';

type UseProfileMediaUploadArgs = {
    userId: string;
    isOwnProfile: boolean;
    profile: LawyerProfileData | null;
    setProfile: (profile: LawyerProfileData) => void;
    draft: EditDraft | null;
    setDraft: React.Dispatch<React.SetStateAction<EditDraft | null>>;
    setIsEditing: (editing: boolean) => void;
    stageAvatarInDraft: (displayUrl: string, storagePath?: string) => void;
};

export function useProfileMediaUpload({
    userId,
    isOwnProfile,
    profile,
    setProfile,
    draft: _draft,
    setDraft,
    setIsEditing,
    stageAvatarInDraft,
}: UseProfileMediaUploadArgs) {
    const [uploading, setUploading] = useState<'avatar' | 'gallery' | null>(null);
    const avatarRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const uploadGenRef = useRef(0);
    const userIdRef = useRef(userId);
    const isOwnProfileRef = useRef(isOwnProfile);
    userIdRef.current = userId;
    isOwnProfileRef.current = isOwnProfile;

    const invalidateUploads = useCallback(() => {
        uploadGenRef.current += 1;
        setUploading(null);
    }, []);

    const uploadImage = useCallback(
        async (file: File, target: 'avatar' | 'gallery') => {
            if (!isOwnProfile) return;
            const requestUserId = userId;
            const uploadGen = ++uploadGenRef.current;
            setUploading(target);
            try {
                const res = await uploadProfileMedia(requestUserId, file);
                if (
                    uploadGen !== uploadGenRef.current ||
                    requestUserId !== userIdRef.current ||
                    !isOwnProfileRef.current
                ) {
                    if (res.storagePath) {
                        void import('@/app/services/profileMediaService')
                            .then((m) => m.removeProfileMediaPaths([res.storagePath!]))
                            .catch(() => undefined);
                    }
                    return;
                }
                const url = res.displayUrl;

                if (target === 'gallery') {
                    const base = profile ?? (await ProfileDB.getProfile(requestUserId));
                    if (
                        uploadGen !== uploadGenRef.current ||
                        requestUserId !== userIdRef.current ||
                        !isOwnProfileRef.current
                    ) {
                        if (res.storagePath) {
                            void import('@/app/services/profileMediaService')
                                .then((m) => m.removeProfileMediaPaths([res.storagePath!]))
                                .catch(() => undefined);
                        }
                        return;
                    }
                    if (!profile) setProfile(base);
                    setDraft((prev) => {
                        const workingDraft =
                            prev ??
                            ({
                                header: { ...base.header },
                                actions: [...getActions(base.sections)],
                                gallery: [...getGallery(base.sections)],
                            } satisfies EditDraft);
                        return {
                            ...workingDraft,
                            gallery: [
                                ...workingDraft.gallery,
                                {
                                    url,
                                    focusX: 50,
                                    focusY: 50,
                                    zoom: 100,
                                    ...(res.storagePath ? { storagePath: res.storagePath } : null),
                                },
                            ],
                        };
                    });
                    setIsEditing(true);
                } else {
                    stageAvatarInDraft(url, res.storagePath);
                }

                SmartToast.success(
                    res.source === 'cloud' ? 'تم رفع الصورة' : 'تم حفظ الصورة محلياً على هذا الجهاز',
                );
            } catch (err) {
                if (uploadGen === uploadGenRef.current) {
                    SmartToast.error(profileMediaErrorMessage(err));
                }
            } finally {
                if (uploadGen === uploadGenRef.current) {
                    setUploading(null);
                }
            }
        },
        [userId, profile, isOwnProfile, stageAvatarInDraft, setDraft, setIsEditing, setProfile],
    );

    return { uploading, avatarRef, galleryRef, uploadImage, invalidateUploads };
}
