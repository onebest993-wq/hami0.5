import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthUser } from '@/app/context/AuthContext';
import {
    ProfileDB,
    type LawyerProfileData,
} from '@/app/services/lawyer-cloud';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { uploadProfileMedia, profileMediaErrorMessage } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import {
    buildSections,
    getActions,
    getBio,
    getGallery,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileSections';

export function useRoyalLawyerProfile() {
    const user = useAuthUser();
    const userId = resolveCalendarUserId(user?.id ?? null);
    const email = user?.email || '';
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaName =
        typeof meta.full_name === 'string'
            ? meta.full_name
            : typeof meta.fullName === 'string'
              ? meta.fullName
              : '';

    const [profile, setProfile] = useState<LawyerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<EditDraft | null>(null);
    const [uploading, setUploading] = useState<'avatar' | 'cover' | 'gallery' | null>(null);

    const avatarRef = useRef<HTMLInputElement>(null);
    const coverRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const data = await ProfileDB.getProfile(userId);
            if (!data.header.name?.trim()) {
                data.header.name = metaName || data.header.name;
            }
            setProfile(data);
        } catch {
            SmartToast.error('تعذر تحميل الملف الشخصي');
        } finally {
            setLoading(false);
        }
    }, [userId, metaName]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const header = isEditing && draft ? draft.header : profile?.header;
    const actions = isEditing
        ? (draft?.actions ?? [])
        : profile
          ? getActions(profile.sections)
          : [];
    const gallery = isEditing ? (draft?.gallery ?? []) : profile ? getGallery(profile.sections) : [];

    const displayName = header?.name?.trim() || 'محامٍ';
    const initials = displayName.charAt(0) || 'ح';
    const displayNamePublic = displayName;
    const titlePublic = header?.title;
    const emailPublic = email;
    const cityPublic = header?.city;
    const phonePublic = header?.phone;
    const syndicateIdPublic = header?.syndicateId;

    const buildEditDraft = useCallback((): EditDraft | null => {
        if (!profile) return null;
        return {
            header: { ...profile.header },
            bio: getBio(profile.sections),
            actions: [...getActions(profile.sections)],
            gallery: [...getGallery(profile.sections)],
        };
    }, [profile]);

    const startEdit = useCallback(() => {
        const base = buildEditDraft();
        if (base) {
            setDraft(base);
            setIsEditing(true);
            return;
        }
        void ProfileDB.getProfile(userId).then((p) => {
            setProfile(p);
            setDraft({
                header: { ...p.header },
                bio: getBio(p.sections),
                actions: [...getActions(p.sections)],
                gallery: [...getGallery(p.sections)],
            });
            setIsEditing(true);
        });
    }, [buildEditDraft, userId]);

    const cancelEdit = useCallback(() => {
        setDraft(null);
        setIsEditing(false);
    }, []);

    const saveProfile = useCallback(async () => {
        if (!userId || !draft) return;
        setSaving(true);
        try {
            const payload: LawyerProfileData = {
                header: draft.header,
                sections: buildSections(draft),
            };
            await ProfileDB.saveProfile(userId, payload);
            setProfile(payload);
            setIsEditing(false);
            setDraft(null);
            SmartToast.success('تم حفظ الملف الشخصي');
        } catch {
            SmartToast.error('فشل حفظ الملف الشخصي');
        } finally {
            setSaving(false);
        }
    }, [userId, draft]);

    const ensureEditDraft = useCallback((): EditDraft | null => {
        if (draft) return draft;
        const next = buildEditDraft();
        if (!next) return null;
        setDraft(next);
        setIsEditing(true);
        return next;
    }, [draft, buildEditDraft]);

    const applyHeaderImage = useCallback(
        (target: 'avatar' | 'cover', displayUrl: string, storagePath?: string) => {
            void (async () => {
                const base = profile ?? (await ProfileDB.getProfile(userId));
                const imageKey = target === 'avatar' ? 'profileImage' : 'coverImage';
                const pathKey = target === 'avatar' ? 'profileImagePath' : 'coverImagePath';
                const nextHeader = {
                    ...base.header,
                    [imageKey]: displayUrl,
                    [pathKey]: storagePath,
                };
                const next = { ...base, header: nextHeader };
                setProfile(next);
                if (draft) {
                    setDraft({ ...draft, header: nextHeader });
                }
                await ProfileDB.saveProfile(userId, next);
            })();
        },
        [profile, draft, userId],
    );

    const uploadImage = useCallback(
        async (file: File, target: 'avatar' | 'cover' | 'gallery') => {
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
                            bio: getBio(base.sections),
                            actions: [...getActions(base.sections)],
                            gallery: [...getGallery(base.sections)],
                        } satisfies EditDraft);
                    if (!draft) {
                        setDraft(workingDraft);
                        setIsEditing(true);
                    }
                    setDraft({ ...workingDraft, gallery: [...workingDraft.gallery, url] });
                } else {
                    applyHeaderImage(target, url, res.storagePath);
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
        [userId, draft, profile, applyHeaderImage],
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
                        },
                    ],
                };
            });
            setIsEditing(true);
        },
        [buildEditDraft],
    );

    const shareProfile = useCallback(async () => {
        const lines = [
            displayName,
            header?.title || '',
            email,
            header?.phone ? `هاتف: ${header.phone}` : '',
            header?.city ? `المدينة: ${header.city}` : '',
        ].filter(Boolean);
        const text = lines.join('\n');
        try {
            if (navigator.share) {
                await navigator.share({ title: displayName, text });
            } else {
                await navigator.clipboard.writeText(text);
                SmartToast.success('تم نسخ بطاقة التعريف');
            }
        } catch {
            SmartToast.info('لم يتم المشاركة');
        }
    }, [displayName, header, email]);

    return {
        loading,
        saving,
        isEditing,
        draft,
        setDraft,
        uploading,
        avatarRef,
        coverRef,
        galleryRef,
        header,
        actions,
        gallery,
        initials,
        displayNamePublic,
        titlePublic,
        emailPublic,
        cityPublic,
        phonePublic,
        syndicateIdPublic,
        startEdit,
        cancelEdit,
        saveProfile,
        ensureEditDraft,
        uploadImage,
        addContactChannel,
        shareProfile,
    };
}
