import { useCallback, useRef, useState } from 'react';
import { ProfileDB, type LawyerProfileData, type ProfileAction } from '@/app/services/lawyer-cloud';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { withProfileSaveTimeout } from '@/app/services/profile/profileSaveTimeout';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import {
    clampProfileDisplayName,
    sanitizeProfileActions,
} from '@/app/services/profile/profileContactInputSecurity';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { buildSections, getActions, getGallery } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';

type UseProfileEditSessionArgs = {
    userId: string;
    isOwnProfile: boolean;
    profile: LawyerProfileData | null;
    setProfile: (profile: LawyerProfileData) => void;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
};

export function useProfileEditSession({
    userId,
    isOwnProfile,
    profile,
    setProfile,
    profileRef,
}: UseProfileEditSessionArgs) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const enqueueProfileSave = useRef(createProfileSaveQueue()).current;

    const buildEditDraft = useCallback((): EditDraft | null => {
        if (!profile) return null;
        return {
            header: { ...profile.header },
            actions: [...getActions(profile.sections)],
            gallery: [...getGallery(profile.sections)],
        };
    }, [profile]);

    const startEdit = useCallback(() => {
        if (!isOwnProfile) return;
        const base = buildEditDraft();
        if (base) {
            setDraft(base);
            setIsEditing(true);
            return;
        }
        void ProfileDB.getProfile(userId)
            .then((p) => {
                if (!isOwnProfile) return;
                setProfile(p);
                setDraft({
                    header: { ...p.header },
                    actions: [...getActions(p.sections)],
                    gallery: [...getGallery(p.sections)],
                });
                setIsEditing(true);
            })
            .catch(() => {
                SmartToast.error('تعذر تحميل الملف للتعديل');
            });
    }, [buildEditDraft, userId, isOwnProfile, setProfile]);

    const cancelEdit = useCallback(() => {
        setDraft(null);
        setIsEditing(false);
    }, []);

    const saveProfile = useCallback(
        async (customizationOverride?: ProfilePageCustomization) => {
            if (!userId || !draft || !isOwnProfile) return;
            const editDraft = draft;
            setSaving(true);
            try {
                await withProfileSaveTimeout(
                    enqueueProfileSave(async () => {
                        const current = profileRef.current;
                        if (!current) return;
                        const payload: LawyerProfileData = {
                            header: {
                                ...editDraft.header,
                                name: clampProfileDisplayName(editDraft.header.name ?? ''),
                            },
                            sections: buildSections({
                                ...editDraft,
                                actions: sanitizeProfileActions(editDraft.actions),
                            }),
                            customization: normalizeProfilePageCustomization(
                                customizationOverride ?? current.customization,
                            ),
                        };
                        await ProfileDB.saveProfile(userId, payload, userId);
                        setProfile(payload);
                        setProfileWarmCache(userId, payload);
                    }),
                );
                setIsEditing(false);
                setDraft(null);
                SmartToast.success('تم حفظ الملف الشخصي');
            } catch {
                SmartToast.error('فشل حفظ الملف الشخصي');
            } finally {
                setSaving(false);
            }
        },
        [userId, draft, isOwnProfile, enqueueProfileSave, profileRef, setProfile],
    );

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
        [isOwnProfile, buildEditDraft],
    );

    const addContactChannel = useCallback(
        (type: ProfileAction['type']) => {
            const defaultLabels: Record<ProfileAction['type'], string> = {
                whatsapp: 'واتساب',
                call: 'هاتف',
                email: 'بريد',
                website: 'موقع',
                location: 'موقع',
            };
            setDraft((current) => {
                const base = current ?? buildEditDraft();
                if (!base) {
                    SmartToast.error('تعذر إضافة القناة — حمّل الملف أولاً');
                    return current;
                }
                return {
                    ...base,
                    actions: [
                        ...base.actions,
                        {
                            id: `a-${Date.now()}`,
                            type,
                            label: defaultLabels[type],
                            value: '',
                            ...(type === 'location' ? { locationMode: 'manual' as const } : {}),
                        },
                    ],
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
        saving,
        startEdit,
        cancelEdit,
        saveProfile,
        ensureEditDraft,
        stageAvatarInDraft,
        addContactChannel,
        enqueueProfileSave,
    };
}
