import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ProfileDB, type LawyerProfileData, type ProfileAction } from '@/app/services/lawyer-cloud';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { createProfileSaveQueue } from '@/app/services/profile/profileSaveQueue';
import { setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import {
    clampProfileDisplayName,
    clampProfileContactLabel,
    clampProfileContactValue,
    sanitizeProfileActionsForPersist,
    sanitizeProfileHeaderPhone,
    ProfileContactValidationError,
} from '@/app/services/profile/profileContactInputSecurity';
import { discardEditDraftOrphanMedia, discardUnsavedMediaPath } from '@/app/services/profile/editDraftMediaPaths';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { buildSections, getActions, getGallery } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';

type UseProfileEditSessionArgs = {
    userId: string;
    isOwnProfile: boolean;
    profile: LawyerProfileData | null;
    setProfile: (profile: LawyerProfileData) => void;
    profileRef: React.MutableRefObject<LawyerProfileData | null>;
    /** يُستدعى بعد اجتياز التحقق وقبل مغادرة التحرير — لإبطال رفع وسائط قيد التنفيذ */
    onEditPersistStart?: () => void;
};

export function useProfileEditSession({
    userId,
    isOwnProfile,
    profile,
    setProfile,
    profileRef,
    onEditPersistStart,
}: UseProfileEditSessionArgs) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const editInFlightRef = useRef(false);
    const editLoadGenRef = useRef(0);
    const saveEpochRef = useRef(0);
    /** منفصل عن saveEpoch — لا يُبطَل بـ startEdit/cancelEdit حتى لا يعلق زر الحفظ */
    const savingAttemptRef = useRef(0);
    const draftRef = useRef<EditDraft | null>(null);
    const userIdRef = useRef(userId);
    const isOwnProfileRef = useRef(isOwnProfile);
    draftRef.current = draft;
    userIdRef.current = userId;
    isOwnProfileRef.current = isOwnProfile;
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
        /* إبطال استرجاع مسودة من حفظ فاشل سابق إن بدأت جلسة أحدث */
        saveEpochRef.current += 1;
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
                setDraft({
                    header: { ...p.header },
                    actions: [...getActions(p.sections)],
                    gallery: [...getGallery(p.sections)],
                });
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
    }, [buildEditDraft, userId, isOwnProfile, setProfile]);

    const cancelEdit = useCallback(() => {
        editLoadGenRef.current += 1;
        saveEpochRef.current += 1;
        editInFlightRef.current = false;
        discardEditDraftOrphanMedia(draftRef.current, profileRef.current);
        setDraft(null);
        setIsEditing(false);
    }, [profileRef]);

    const saveProfile = useCallback(
        async (customizationOverride?: ProfilePageCustomization): Promise<boolean> => {
            if (!userId || !draft || !isOwnProfile) return false;
            const editDraft = draft;
            const current = profileRef.current;
            if (!current) return false;
            const previousProfile: LawyerProfileData = {
                ...current,
                header: { ...current.header },
                sections: current.sections.map((section) => ({ ...section })),
                customization: current.customization,
            };
            const previousAvatarPath = current.header.profileImagePath?.trim() || undefined;
            let persistActions;
            try {
                persistActions = sanitizeProfileActionsForPersist(editDraft.actions);
            } catch (error) {
                const message =
                    error instanceof ProfileContactValidationError
                        ? error.message
                        : 'بيانات التواصل غير صالحة';
                SmartToast.error(message);
                return false;
            }
            const name = clampProfileDisplayName(editDraft.header.name ?? '');
            if (!name) {
                SmartToast.error('الاسم مطلوب قبل الحفظ');
                return false;
            }
            const actionIds = new Set(persistActions.map((a) => a.id));
            const header = {
                ...editDraft.header,
                name,
                title: clampProfileContactLabel(editDraft.header.title ?? ''),
                phone: sanitizeProfileHeaderPhone(editDraft.header.phone),
                city: clampProfileContactLabel(editDraft.header.city ?? ''),
                syndicateId: clampProfileContactValue(editDraft.header.syndicateId ?? ''),
            };
            const sections = buildSections({
                ...editDraft,
                actions: persistActions,
            });
            const baseCustomization = normalizeProfilePageCustomization(
                customizationOverride ?? current.customization,
            );
            const customization = {
                ...baseCustomization,
                privacy: {
                    ...baseCustomization.privacy,
                    hiddenContactIds: baseCustomization.privacy.hiddenContactIds.filter((id) =>
                        actionIds.has(id),
                    ),
                },
            };
            const optimistic: LawyerProfileData = { header, sections, customization };
            const saveEpoch = ++saveEpochRef.current;
            const savingAttempt = ++savingAttemptRef.current;
            /* أبطل رفعاً معلّقاً قبل مسح المسودة — وإلا يُعيد فتح التحرير بصورة يتيمة */
            onEditPersistStart?.();
            setSaving(true);
            try {
                /* خروج فوري من التحرير — الحفظ السحابي لا يحجب الواجهة */
                setProfile(optimistic);
                setProfileWarmCache(userId, optimistic);
                flushSync(() => {
                    setIsEditing(false);
                    setDraft(null);
                });
                const saveResult = await enqueueProfileSave(async () => {
                        /* دمج تخصيص أحدث من الاستوديو إن حُفظ بالتوازي */
                        const latest = profileRef.current;
                        const latestCustomization = normalizeProfilePageCustomization(
                            customizationOverride ?? latest?.customization ?? customization,
                        );
                        const toSave: LawyerProfileData = {
                            header,
                            sections,
                            customization: {
                                ...latestCustomization,
                                privacy: {
                                    ...latestCustomization.privacy,
                                    hiddenContactIds: latestCustomization.privacy.hiddenContactIds.filter(
                                        (id) => actionIds.has(id),
                                    ),
                                },
                            },
                        };
                        const result = await ProfileDB.saveProfile(userId, toSave, userId);
                        const cloudSynced = result?.cloudSynced !== false;
                        /*
                         * GC بعد كتابة ناجحة دائماً — لا تربطه بـ userIdRef
                         * (تبديل الملف أثناء الحفظ كان يترك وسائط يتيمة).
                         */
                        if (cloudSynced) {
                            const nextAvatarPath = toSave.header.profileImagePath?.trim() || undefined;
                            if (previousAvatarPath && previousAvatarPath !== nextAvatarPath) {
                                void import('@/app/services/profileMediaService')
                                    .then((m) => m.removeProfileMediaPaths([previousAvatarPath]))
                                    .catch(() => undefined);
                            }
                            const prevGalleryPaths = new Set(
                                getGallery(previousProfile.sections)
                                    .map((g) => g.storagePath?.trim())
                                    .filter((p): p is string => Boolean(p)),
                            );
                            const nextGalleryPaths = new Set(
                                getGallery(toSave.sections)
                                    .map((g) => g.storagePath?.trim())
                                    .filter((p): p is string => Boolean(p)),
                            );
                            const orphanedGallery = [...prevGalleryPaths].filter(
                                (p) => !nextGalleryPaths.has(p),
                            );
                            if (orphanedGallery.length > 0) {
                                void import('@/app/services/profileMediaService')
                                    .then((m) => m.removeProfileMediaPaths(orphanedGallery))
                                    .catch(() => undefined);
                            }
                        }
                        /* لا تكتب الواجهة إن بدأت جلسة أحدث أو تغيّر الملف */
                        if (
                            saveEpoch === saveEpochRef.current &&
                            userId === userIdRef.current &&
                            isOwnProfileRef.current
                        ) {
                            setProfile(toSave);
                            setProfileWarmCache(userId, toSave);
                        }
                        return { toSave, cloudSynced };
                    });
                /* الحفظ نجح في التخزين — حتى لو بُطلت جلسة الواجهة بعد التبديل */
                if (saveEpoch !== saveEpochRef.current || userId !== userIdRef.current) {
                    return true;
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }),
                    );
                }
                if (!saveResult.cloudSynced) {
                    const { isKvProxyNetworkEnabled } = await import('@/app/services/kvProxyConfig');
                    if (isKvProxyNetworkEnabled()) {
                        SmartToast.warning('حُفظ على الجهاز — تعذر المزامنة السحابية. أعد المحاولة لاحقاً');
                    } else {
                        SmartToast.success('تم حفظ الملف الشخصي');
                    }
                } else {
                    SmartToast.success('تم حفظ الملف الشخصي');
                }
                return true;
            } catch (error) {
                const timedOut =
                    error instanceof Error && error.message === 'profile-save-timeout';
                /*
                 * المهلة لا تلغي الحفظ الجاري (محلي أولاً ثم سحابة).
                 * التراجع هنا كان يُظهر ملفاً قديماً بينما التخزين يكتب النسخة الجديدة.
                 */
                if (timedOut) {
                    if (saveEpoch === saveEpochRef.current) {
                        SmartToast.warning(
                            'الحفظ يستغرق وقتاً أطول من المتوقع — قد يكون اكتمل على الجهاز',
                        );
                    }
                    return true;
                }
                /* لا تُبطل جلسة تحرير أحدث بدأت بعد هذا الحفظ */
                if (saveEpoch === saveEpochRef.current) {
                    setProfile(previousProfile);
                    setProfileWarmCache(userId, previousProfile);
                    flushSync(() => {
                        setDraft(editDraft);
                        setIsEditing(true);
                    });
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }),
                        );
                    }
                }
                SmartToast.error('فشل حفظ الملف الشخصي');
                return false;
            } finally {
                if (savingAttempt === savingAttemptRef.current) {
                    setSaving(false);
                }
            }
        },
        [userId, draft, isOwnProfile, enqueueProfileSave, profileRef, setProfile, onEditPersistStart],
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
            const defaultLabels: Record<ProfileAction['type'], string> = {
                whatsapp: 'واتساب',
                call: 'هاتف',
                email: 'بريد',
                website: 'موقع ويب',
                location: 'الموقع',
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
