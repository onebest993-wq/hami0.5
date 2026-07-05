import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ProfileDB, type LawyerProfileData, type ProfileAction } from '@/app/services/lawyer-cloud';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { withProfileSaveTimeout } from '@/app/services/profile/profileSaveTimeout';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
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
    const editInFlightRef = useRef(false);
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
        if (editInFlightRef.current) return;
        const base = buildEditDraft();
        if (base) {
            //#region debug-point profile-edit-start-base
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'profile-edit-persist',
                    runId: 'post-fix',
                    hypothesisId: 'A',
                    location: 'useProfileEditSession.ts:startEdit:base',
                    msg: '[DEBUG] startEdit used existing profile draft',
                    data: {
                        userId,
                        name: base.header.name ?? null,
                        actionsCount: base.actions.length,
                        imagePath: base.header.profileImagePath ?? null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => undefined);
            //#endregion debug-point profile-edit-start-base
            setDraft(base);
            setIsEditing(true);
            return;
        }
        editInFlightRef.current = true;
        SmartToast.info('جاري تحميل الملف للتعديل...');
        void ProfileDB.getProfile(userId)
            .then((p) => {
                if (!isOwnProfile) return;
                //#region debug-point profile-edit-start-async
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'profile-edit-persist',
                        runId: 'post-fix',
                        hypothesisId: 'A',
                        location: 'useProfileEditSession.ts:startEdit:loaded',
                        msg: '[DEBUG] startEdit loaded profile for editing',
                        data: {
                            userId,
                            name: p.header?.name ?? null,
                            imagePath: p.header?.profileImagePath ?? null,
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => undefined);
                //#endregion debug-point profile-edit-start-async
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
            })
            .finally(() => {
                editInFlightRef.current = false;
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
            //#region debug-point profile-edit-save-start
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'profile-edit-persist',
                    runId: 'post-fix',
                    hypothesisId: 'B',
                    location: 'useProfileEditSession.ts:saveProfile:start',
                    msg: '[DEBUG] saveProfile prepared payload',
                    data: {
                        userId,
                        draftName: editDraft.header.name ?? null,
                        payloadName: payload.header.name ?? null,
                        actionsCount: editDraft.actions.length,
                        payloadSectionsCount: payload.sections.length,
                        imagePath: payload.header.profileImagePath ?? null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => undefined);
            //#endregion debug-point profile-edit-save-start
            setSaving(true);
            try {
                await withProfileSaveTimeout(
                    enqueueProfileSave(async () => {
                        await ProfileDB.saveProfile(userId, payload, userId);
                    }),
                    12_000,
                );
                setProfile(payload);
                setProfileWarmCache(userId, payload);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }),
                    );
                }
                //#region debug-point profile-edit-save-success
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'profile-edit-persist',
                        runId: 'post-fix',
                        hypothesisId: 'A',
                        location: 'useProfileEditSession.ts:saveProfile:success',
                        msg: '[DEBUG] saveProfile completed successfully',
                        data: {
                            userId,
                            payloadName: payload.header.name ?? null,
                            imagePath: payload.header.profileImagePath ?? null,
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => undefined);
                //#endregion debug-point profile-edit-save-success
                flushSync(() => {
                    setIsEditing(false);
                    setDraft(null);
                });
                SmartToast.success('تم حفظ الملف الشخصي');
            } catch (error) {
                //#region debug-point profile-edit-save-failed
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'profile-edit-persist',
                        runId: 'post-fix',
                        hypothesisId: 'A',
                        location: 'useProfileEditSession.ts:saveProfile:failed',
                        msg: '[DEBUG] saveProfile failed',
                        data: {
                            userId,
                            errorMessage: error instanceof Error ? error.message : null,
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => undefined);
                //#endregion debug-point profile-edit-save-failed
                SmartToast.error('فشل حفظ الملف الشخصي');
                throw error;
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
            //#region debug-point profile-edit-add-channel
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'profile-edit-persist',
                    runId: 'post-fix',
                    hypothesisId: 'B',
                    location: 'useProfileEditSession.ts:addContactChannel',
                    msg: '[DEBUG] addContactChannel invoked',
                    data: {
                        userId,
                        type,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => undefined);
            //#endregion debug-point profile-edit-add-channel
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
