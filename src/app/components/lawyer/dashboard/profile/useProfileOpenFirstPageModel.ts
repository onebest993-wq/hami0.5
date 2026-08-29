import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileContentProps } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContentProps';
import { DEFAULT_LAWYER_PROFILE } from '@/app/services/cloud/lawyerProfileTypes';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { getActions, getGallery } from '@/app/services/profile/profileSections';
import { seedFirstPaintProfile } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/normalizeLoadedProfile';
import {
    getUserIdentityUiState,
    isSameUserIdentity,
    subscribeUserIdentityUiState,
    type UserIdentityUiState,
} from '@/app/services/profile/userIdentityUiState';
import { peekProfileWarmCache } from '@/app/services/profile/profileWarmCacheCore';
import { subscribeProfileWarmCache } from '@/app/services/profile/profileWarmCacheStore';
import { useAuthUser } from '@/app/context/authHooks';
import {
    queueProfileCoverCustomization,
    queueProfileCoverEdit,
    queueProfileCoverStudio,
} from '@/app/components/lawyer/dashboard/profile/profileCoverIntents';

const noopAsyncFalse = async () => false;
const noopUpload = async () => undefined;
const noop = () => undefined;

function useProfileCoverSeedSync(uid: string): {
    identity: UserIdentityUiState | null;
    cacheGen: number;
} {
    const [identity, setIdentity] = useState<UserIdentityUiState | null>(() =>
        uid ? getUserIdentityUiState(uid) : null,
    );
    const [cacheGen, setCacheGen] = useState(0);

    useEffect(() => {
        setIdentity(uid ? getUserIdentityUiState(uid) : null);
        if (!uid) return;
        return subscribeUserIdentityUiState((next) => {
            if (!next || next.userId !== uid) return;
            setIdentity((prev) => (isSameUserIdentity(prev, next) ? prev : next));
        });
    }, [uid]);

    useEffect(() => {
        if (!uid) return;
        return subscribeProfileWarmCache((userId) => {
            if (userId !== uid) return;
            setCacheGen((n) => n + 1);
        });
    }, [uid]);

    return { identity, cacheGen };
}

/** نموذج صفحة الملف الكاملة من الكاش/الهوية — بلا انتظار شبكة أو Royal */
export function useProfileOpenFirstPageModel(
    userId: string | null,
    onBack: () => void,
): ProfileContentProps {
    const uid = userId?.trim() || '';
    const user = useAuthUser();
    const userMeta = (user?.user_metadata ?? undefined) as Record<string, unknown> | undefined;
    const { identity, cacheGen } = useProfileCoverSeedSync(uid);
    const [coverCustomization, setCoverCustomization] = useState<ProfilePageCustomization | null>(null);
    const avatarRef = useRef<HTMLInputElement | null>(null);
    const galleryRef = useRef<HTMLInputElement | null>(null);
    const setDraft = useRef<Dispatch<SetStateAction<EditDraft | null>>>(noop).current;

    useEffect(() => {
        setCoverCustomization(null);
    }, [uid]);

    const saveCustomization = useCallback(async (next: ProfilePageCustomization) => {
        queueProfileCoverCustomization(next);
        setCoverCustomization(next);
        return true;
    }, []);

    return useMemo(() => {
        const seed = uid
            ? (peekProfileWarmCache(uid, { viewerId: uid }) ??
              seedFirstPaintProfile(uid, userMeta, true, uid, { viewerId: uid }))
            : undefined;
        const header = {
            ...DEFAULT_LAWYER_PROFILE.header,
            ...(seed?.header ?? {}),
            name:
                seed?.header?.name?.trim() ||
                identity?.displayName?.trim() ||
                DEFAULT_LAWYER_PROFILE.header.name,
            profileImage:
                seed?.header?.profileImage?.trim() || identity?.avatarUrl?.trim() || '',
        };
        const sections = seed?.sections ?? DEFAULT_LAWYER_PROFILE.sections;
        const displayName = header.name.trim() || identity?.displayName?.trim() || '';
        const initials =
            identity?.profileInitial?.trim() || displayName.charAt(0) || 'ح';

        const viewerId = String(user?.id ?? '').trim();
        const isOwnCover = Boolean(uid) && (!viewerId || viewerId === uid);

        return {
            saving: false,
            isEditing: false,
            draft: null,
            setDraft,
            uploading: null,
            avatarRef,
            galleryRef,
            header,
            actions: getActions(sections),
            gallery: getGallery(sections),
            initials,
            displayNamePublic: displayName,
            cityPublic: header.city,
            phonePublic: header.phone,
            syndicateIdPublic: header.syndicateId,
            startEdit: isOwnCover ? queueProfileCoverEdit : noop,
            cancelEdit: noop,
            saveProfile: noopAsyncFalse,
            uploadImage: noopUpload,
            addContactChannel: noop,
            readOnly: !isOwnCover,
            customization: coverCustomization ?? normalizeProfilePageCustomization(seed?.customization),
            settingsOpen: false,
            savingSettings: false,
            profileUserId: uid,
            openSettings: isOwnCover ? queueProfileCoverStudio : noop,
            closeSettings: noop,
            saveCustomization,
            committedGalleryPaths: [],
            screenActive: true,
            pageHidden: false,
            isScreenMode: true,
            onBack,
            displayNamePolicy: null,
        };
    }, [uid, onBack, setDraft, userMeta, identity, cacheGen, coverCustomization, saveCustomization, user?.id]);
}
