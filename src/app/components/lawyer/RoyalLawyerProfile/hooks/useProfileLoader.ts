import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';
import { peekProfileWarmCache, setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RoyalLawyerProfileProps } from '@/app/components/lawyer/RoyalLawyerProfile/types';

export function useProfileLoader(
    profileUserId: string,
    viewerId: string,
    isOwnProfile: boolean,
    userMeta: Record<string, unknown> | undefined,
    displayNameHint?: string,
) {
    const cachePeekOptions = useMemo(
        () => ({ viewerId: isOwnProfile ? profileUserId : viewerId }),
        [isOwnProfile, profileUserId, viewerId],
    );

    const warmCachedProfile = profileUserId
        ? peekProfileWarmCache(profileUserId, cachePeekOptions)
        : undefined;
    const [profile, setProfile] = useState<LawyerProfileData | null>(() => warmCachedProfile ?? null);
    const [loading, setLoading] = useState(() => !warmCachedProfile);
    const profileRef = useRef<LawyerProfileData | null>(null);
    const loadGenerationRef = useRef(0);
    const profileUserIdRef = useRef(profileUserId);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const applyViewerScope = useCallback(
        (data: LawyerProfileData): LawyerProfileData => {
            return isOwnProfile ? data : redactProfileForVisitorView(data);
        },
        [isOwnProfile],
    );

    const normalizeLoadedProfile = useCallback(
        (data: LawyerProfileData): LawyerProfileData => {
            const next = applyViewerScope({ ...data, header: { ...data.header } });
            if (isOwnProfile) {
                if (!next.header.name?.trim() || next.header.name.trim() === 'محامٍ تجريبي') {
                    next.header.name = resolveLawyerDisplayName(
                        next.header.name,
                        profileUserId,
                        userMeta ?? {},
                    );
                }
            } else if (displayNameHint?.trim() && !next.header.name?.trim()) {
                next.header.name = displayNameHint.trim();
            }
            return next;
        },
        [applyViewerScope, isOwnProfile, profileUserId, userMeta, displayNameHint],
    );

    const loadProfile = useCallback(async () => {
        const generation = ++loadGenerationRef.current;
        const cached = profileUserId ? peekProfileWarmCache(profileUserId, cachePeekOptions) : undefined;
        if (cached) {
            setProfile(normalizeLoadedProfile(cached));
            setLoading(false);
        } else {
            setLoading(true);
        }
        try {
            const data = await fetchLawyerProfile(profileUserId);
            if (generation !== loadGenerationRef.current) return;
            const normalized = normalizeLoadedProfile(data);
            setProfile(normalized);
            if (profileUserId && isOwnProfile) {
                setProfileWarmCache(profileUserId, data);
            }
        } catch {
            if (generation !== loadGenerationRef.current) return;
            if (!cached) SmartToast.error('تعذر تحميل الملف الشخصي');
        } finally {
            if (generation === loadGenerationRef.current) setLoading(false);
        }
    }, [profileUserId, normalizeLoadedProfile, cachePeekOptions, isOwnProfile]);

    useEffect(() => {
        const userChanged = profileUserIdRef.current !== profileUserId;
        profileUserIdRef.current = profileUserId;

        if (userChanged) {
            const cached = profileUserId ? peekProfileWarmCache(profileUserId, cachePeekOptions) : undefined;
            setProfile(cached ? normalizeLoadedProfile(cached) : null);
            setLoading(!cached);
        }

        void loadProfile();
    }, [profileUserId, loadProfile, cachePeekOptions, normalizeLoadedProfile]);

    useEffect(() => {
        const onUpdated = (e: Event) => {
            const uid = (e as CustomEvent<{ userId?: string }>).detail?.userId?.trim();
            if (!uid || uid !== profileUserId) return;
            const cached = peekProfileWarmCache(profileUserId, cachePeekOptions);
            if (cached) {
                setProfile(normalizeLoadedProfile(cached));
                setLoading(false);
            }
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onUpdated);
    }, [profileUserId, normalizeLoadedProfile, cachePeekOptions]);

    const customization: ProfilePageCustomization = useMemo(
        () => normalizeProfilePageCustomization(profile?.customization),
        [profile],
    );

    return {
        profile,
        setProfile,
        profileRef,
        loading,
        loadProfile,
        customization,
    };
}
