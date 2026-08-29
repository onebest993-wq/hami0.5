import { useCallback, useRef } from 'react';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { useProfileEditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditDraft';
import { useProfileEditSave } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileEditSave';

type UseProfileEditSessionArgs = {
    userId: string;
    isOwnProfile: boolean;
    profile: LawyerProfileData | null;
    setProfile: (profile: LawyerProfileData) => void;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    /** يُستدعى بعد اجتياز التحقق وقبل مغادرة التحرير — لإبطال رفع وسائط قيد التنفيذ */
    onEditPersistStart?: () => void;
};

/** واجهة جلسة التحرير — تركيب مسودة + حفظ بلا منطق مضمّن ثقيل */
export function useProfileEditSession({
    userId,
    isOwnProfile,
    profile,
    setProfile,
    profileRef,
    onEditPersistStart,
}: UseProfileEditSessionArgs) {
    const saveEpochRef = useRef(0);
    const bumpSaveEpoch = useCallback(() => {
        saveEpochRef.current += 1;
    }, []);

    const draftApi = useProfileEditDraft({
        userId,
        isOwnProfile,
        profile,
        setProfile,
        profileRef,
        bumpSaveEpoch,
    });

    const saveApi = useProfileEditSave({
        userId,
        isOwnProfile,
        draft: draftApi.draft,
        draftRef: draftApi.draftRef,
        setDraft: draftApi.setDraft,
        setIsEditing: draftApi.setIsEditing,
        profileRef,
        setProfile,
        userIdRef: draftApi.userIdRef,
        isOwnProfileRef: draftApi.isOwnProfileRef,
        saveEpochRef,
        onEditPersistStart,
    });

    return {
        isEditing: draftApi.isEditing,
        setIsEditing: draftApi.setIsEditing,
        draft: draftApi.draft,
        setDraft: draftApi.setDraft,
        saving: saveApi.saving,
        startEdit: draftApi.startEdit,
        cancelEdit: draftApi.cancelEdit,
        saveProfile: saveApi.saveProfile,
        ensureEditDraft: draftApi.ensureEditDraft,
        stageAvatarInDraft: draftApi.stageAvatarInDraft,
        addContactChannel: draftApi.addContactChannel,
        enqueueProfileSave: saveApi.enqueueProfileSave,
    };
}
