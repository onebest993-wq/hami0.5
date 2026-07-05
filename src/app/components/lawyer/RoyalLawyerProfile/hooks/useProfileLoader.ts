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
            //#region debug-point profile-loader-cache-hit
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'profile-edit-persist',
                    runId: 'post-fix',
                    hypothesisId: 'C',
                    location: 'useProfileLoader.ts:loadProfile:cache-hit',
                    msg: '[DEBUG] profile loader used warm cache',
                    data: {
                        profileUserId,
                        viewerId,
                        isOwnProfile,
                        cachedName: cached.header?.name ?? null,
                        cachedImagePath: cached.header?.profileImagePath ?? null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => undefined);
            //#endregion debug-point profile-loader-cache-hit
            setProfile(normalizeLoadedProfile(cached));
            setLoading(false);
        } else {
            setLoading(true);
        }
        try {
            const data = await fetchLawyerProfile(
                profileUserId,
                isOwnProfile ? profileUserId : viewerId,
            );
            if (generation !== loadGenerationRef.current) return;
            const normalized = normalizeLoadedProfile(data);
            //#region debug-point profile-loader-fetch-done
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'profile-edit-persist',
                    runId: 'post-fix',
                    hypothesisId: 'C',
                    location: 'useProfileLoader.ts:loadProfile:fetch-done',
                    msg: '[DEBUG] profile loader fetched profile',
                    data: {
                        profileUserId,
                        isOwnProfile,
                        fetchedName: data.header?.name ?? null,
                        normalizedName: normalized.header?.name ?? null,
                        fetchedImagePath: data.header?.profileImagePath ?? null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => undefined);
            //#endregion debug-point profile-loader-fetch-done
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
                //#region debug-point profile-loader-event
                fetch('http://127.0.0.1:7777/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'profile-edit-persist',
                        runId: 'post-fix',
                        hypothesisId: 'E',
                        location: 'useProfileLoader.ts:onUpdated',
                        msg: '[DEBUG] profile loader received profile update event',
                        data: {
                            profileUserId,
                            cachedName: cached.header?.name ?? null,
                            cachedImagePath: cached.header?.profileImagePath ?? null,
                        },
                        ts: Date.now(),
                    }),
                }).catch(() => undefined);
                //#endregion debug-point profile-loader-event
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
