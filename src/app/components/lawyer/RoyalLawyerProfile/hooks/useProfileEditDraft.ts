import { useCallback, useRef, useState } from 'react';
import { ProfileDB, type LawyerProfileData, type ProfileAction } from '@/app/services/lawyer-cloud';
import { discardEditDraftOrphanMedia, discardUnsavedMediaPath } from '@/app/services/profile/editDraftMediaPaths';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { buildEditDraftFromProfile } from '@/app/services/profile/buildEditDraftFromProfile';
import { createDefaultProfileContactAction } from '@/app/services/profile/createDefaultProfileContactAction';

type UseProfileEditDraftArgs = {
    userId: string;
    isOwnProfile: boolean;
    profile: LawyerProfileData | null;
    setProfile: (profile: LawyerProfileData) => void;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    /** يُزاد عند start/cancel لإبطال حفظ قديم */
    bumpSaveEpoch: () => void;
};

/** حالة المسودة + بدء/إلغاء/قنوات — بلا منطق حفظ سحابي */
export function useProfileEditDraft({
    userId,
    isOwnProfile,
    profile,
    setProfile,
    profileRef,
    bumpSaveEpoch,
}: UseProfileEditDraftArgs) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const editInFlightRef = useRef(false);
    const editLoadGenRef = useRef(0);
    const draftRef = useRef<EditDraft | null>(null);
    const userIdRef = useRef(userId);
    const isOwnProfileRef = useRef(isOwnProfile);
    draftRef.current = draft;
    userIdRef.current = userId;
    isOwnProfileRef.current = isOwnProfile;

    const buildEditDraft = useCallback((): EditDraft | null => {
        if (!profile) return null;
        return buildEditDraftFromProfile(profile);
    }, [profile]);

    const startEdit = useCallback(() => {
        if (!isOwnProfile) return;
        if (editInFlightRef.current) return;
        bumpSaveEpoch();
        const base = buildEditDraft();
        if (base) {
            setDraft(base);
            setIsEditing(true);
            return;
        }
        editInFlightRef.current = true;
        const requestUserId = userId;
        const loadGen = ++editLoadGenRef.current;
        SmartToast.info('جاري تحميل الملف للتعديل...');
        void ProfileDB.getProfile(requestUserId)
            .then((p) => {
                if (loadGen !== editLoadGenRef.current) return;
                if (requestUserId !== userIdRef.current) return;
                if (!isOwnProfileRef.current) return;
                setProfile(p);
                setDraft(buildEditDraftFromProfile(p));
                setIsEditing(true);
            })
            .catch(() => {
                if (loadGen !== editLoadGenRef.current) return;
                SmartToast.error('تعذر تحميل الملف للتعديل');
            })
            .finally(() => {
                if (loadGen === editLoadGenRef.current) {
                    editInFlightRef.current = false;
                }
            });
    }, [buildEditDraft, bumpSaveEpoch, userId, isOwnProfile, setProfile]);

    const cancelEdit = useCallback(() => {
        editLoadGenRef.current += 1;
        bumpSaveEpoch();
        editInFlightRef.current = false;
        discardEditDraftOrphanMedia(draftRef.current, profileRef.current);
        setDraft(null);
        setIsEditing(false);
    }, [bumpSaveEpoch, profileRef]);

    const ensureEditDraft = useCallback((): EditDraft | null => {
        if (draft) return draft;
        const next = buildEditDraft();
        if (!next) return null;
        setDraft(next);
        setIsEditing(true);
        return next;
    }, [draft, buildEditDraft]);

    const stageAvatarInDraft = useCallback(
        (displayUrl: string, storagePath?: string) => {
            if (!isOwnProfile) return;
            setDraft((current) => {
                const base = current ?? buildEditDraft();
                if (!base) return current;
                const previousPath = base.header.profileImagePath?.trim();
                const committedPath = profileRef.current?.header.profileImagePath?.trim();
                if (previousPath && previousPath !== storagePath?.trim()) {
                    discardUnsavedMediaPath(previousPath, committedPath);
                }
                return {
                    ...base,
                    header: {
                        ...base.header,
                        profileImage: displayUrl,
                        profileImagePath: storagePath,
                    },
                };
            });
            setIsEditing(true);
        },
        [isOwnProfile, buildEditDraft, profileRef],
    );

    const addContactChannel = useCallback(
        (type: ProfileAction['type']) => {
            setDraft((current) => {
                const base = current ?? buildEditDraft();
                if (!base) {
                    SmartToast.error('تعذر إضافة القناة — حمّل الملف أولاً');
                    return current;
                }
                return {
                    ...base,
                    actions: [...base.actions, createDefaultProfileContactAction(type)],
                };
            });
            setIsEditing(true);
        },
        [buildEditDraft],
    );

    return {
        isEditing,
        setIsEditing,
        draft,
        setDraft,
        draftRef,
        userIdRef,
        isOwnProfileRef,
        startEdit,
        cancelEdit,
        ensureEditDraft,
        stageAvatarInDraft,
        addContactChannel,
    };
}
