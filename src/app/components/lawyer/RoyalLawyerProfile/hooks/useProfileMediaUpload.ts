import { useCallback, useRef, useState } from 'react';
import { ProfileDB } from '@/app/services/lawyer-cloud';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { getActions, getGallery } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';

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
    draft,
    setDraft,
    setIsEditing,
    stageAvatarInDraft,
}: UseProfileMediaUploadArgs) {
    const [uploading, setUploading] = useState<'avatar' | 'gallery' | null>(null);
    const avatarRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const uploadImage = useCallback(
        async (file: File, target: 'avatar' | 'gallery') => {
            if (!isOwnProfile) return;
            setUploading(target);
            try {
                const res = await uploadProfileMedia(userId, file);
                const url = res.displayUrl;

                if (target === 'gallery') {
                    const base = profile ?? (await ProfileDB.getProfile(userId));
                    if (!profile) setProfile(base);
                    const workingDraft =
                        draft ??
                        ({
                            header: { ...base.header },
                            actions: [...getActions(base.sections)],
                            gallery: [...getGallery(base.sections)],
                        } satisfies EditDraft);
                    if (!draft) {
                        setDraft(workingDraft);
                        setIsEditing(true);
                    }
                    setDraft({ ...workingDraft, gallery: [...workingDraft.gallery, url] });
                } else {
                    stageAvatarInDraft(url, res.storagePath);
                }

                SmartToast.success(
                    res.source === 'cloud' ? 'تم رفع الصورة' : 'تم حفظ الصورة محلياً على هذا الجهاز',
                );
            } catch (err) {
                SmartToast.error(profileMediaErrorMessage(err));
            } finally {
                setUploading(null);
            }
        },
        [userId, draft, profile, isOwnProfile, stageAvatarInDraft, setDraft, setIsEditing, setProfile],
    );

    return { uploading, avatarRef, galleryRef, uploadImage };
}
