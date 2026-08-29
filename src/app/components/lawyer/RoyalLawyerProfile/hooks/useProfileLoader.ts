import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';
import {
    peekProfileWarmCache,
    setProfileWarmCache,
    hydrateProfileWarmCachePeekSync,
} from '@/app/services/profile/profileWarmCache';
import { isProfilePaintReady } from '@/app/services/profile/profileSparseDetect';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    seedFirstPaintProfile,
    normalizeLoadedProfile as normalizeLoadedProfileData,
} from './normalizeLoadedProfile';

export function useProfileLoader(
    profileUserId: string,
    viewerId: string,
    isOwnProfile: boolean,
    userMeta: Record<string, unknown> | undefined,
    displayNameHint?: string,
    screenActive = true,
) {
    const cachePeekOptions = useMemo(
        () => ({ viewerId: isOwnProfile ? profileUserId : viewerId }),
        [isOwnProfile, profileUserId, viewerId],
    );

    const normalizeOpts = useMemo(
        () => ({
            isOwnProfile,
            profileUserId,
            userMeta,
            displayNameHint,
        }),
        [isOwnProfile, profileUserId, userMeta, displayNameHint],
    );

    const normalizeLoadedProfile = useCallback(
        (data: LawyerProfileData): LawyerProfileData =>
            normalizeLoadedProfileData(data, normalizeOpts),
        [normalizeOpts],
    );

    const warmCachedProfile = seedFirstPaintProfile(
        profileUserId,
        userMeta,
        isOwnProfile,
        viewerId,
        cachePeekOptions,
    );
    const [profile, setProfile] = useState<LawyerProfileData | null>(() => warmCachedProfile ?? null);
    /** جاهزية الشل: وجود كاش/ملف — لا نربط loading باسم الهيدر (يُحلّ عبر resolveLawyerDisplayName) */
    const [loading, setLoading] = useState(() => !warmCachedProfile);
    const [loadError, setLoadError] = useState(false);
    const profileRef = useRef<LawyerProfileData | null>(warmCachedProfile ?? null);
    const loadGenerationRef = useRef(0);
    const profileUserIdRef = useRef(profileUserId);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const loadProfile = useCallback(async () => {
        const generation = ++loadGenerationRef.current;
        const cached = profileUserId ? peekProfileWarmCache(profileUserId, cachePeekOptions) : undefined;
        if (cached) {
            setProfile(normalizeLoadedProfile(cached));
            setLoading(false);
            setLoadError(false);
            /* كاش غني فقط: لا نحجب interactive بانتظار الشبكة — إعادة تحقق في idle */
            if (isProfilePaintReady(cached)) {
                await new Promise<void>((resolve) => {
                    const run = () => resolve();
                    if (typeof requestIdleCallback === 'function') {
                        requestIdleCallback(run, { timeout: 1_200 });
                    } else {
                        window.setTimeout(run, 32);
                    }
                });
                if (generation !== loadGenerationRef.current) return;
            }
        } else if (!profileRef.current) {
            setLoading(true);
            setLoadError(false);
        }
        try {
            const data = await fetchLawyerProfile(
                profileUserId,
                isOwnProfile ? profileUserId : viewerId,
            );
            if (generation !== loadGenerationRef.current) return;
            const normalized = normalizeLoadedProfile(data);
            setProfile(normalized);
            setLoadError(false);
            if (profileUserId && isOwnProfile) {
                /* خزّن النسخة المطبّعة للمالك — لا stub الزائر */
                setProfileWarmCache(profileUserId, normalized);
            }
        } catch {
            if (generation !== loadGenerationRef.current) return;
            if (!cached && !profileRef.current) {
                setLoadError(true);
                SmartToast.error('تعذر تحميل الملف الشخصي');
            }
        } finally {
            if (generation === loadGenerationRef.current) setLoading(false);
        }
    }, [profileUserId, normalizeLoadedProfile, cachePeekOptions, isOwnProfile, viewerId]);

    useLayoutEffect(() => {
        if (!profileUserId) return;
        hydrateProfileWarmCachePeekSync(
            profileUserId,
            userMeta,
            isOwnProfile ? profileUserId : viewerId,
        );
        const cached = peekProfileWarmCache(profileUserId, cachePeekOptions);
        if (cached) {
            setProfile(normalizeLoadedProfile(cached));
            setLoading(false);
            setLoadError(false);
        }
    }, [profileUserId, userMeta, isOwnProfile, viewerId, cachePeekOptions, normalizeLoadedProfile]);

    /** عند كشف التبويب: أعد تطبيق الكاش — keepAlive قد رُكّب قبل دفء البيانات */
    useLayoutEffect(() => {
        if (!screenActive || !profileUserId) return;
        hydrateProfileWarmCachePeekSync(
            profileUserId,
            userMeta,
            isOwnProfile ? profileUserId : viewerId,
        );
        const cached = peekProfileWarmCache(profileUserId, cachePeekOptions);
        if (!cached) return;
        setProfile((prev) => {
            if (prev?.header?.name?.trim() && prev.header.profileImage) return prev;
            return normalizeLoadedProfile(cached);
        });
        setLoading(false);
        setLoadError(false);
    }, [
        screenActive,
        profileUserId,
        userMeta,
        isOwnProfile,
        viewerId,
        cachePeekOptions,
        normalizeLoadedProfile,
    ]);

    useEffect(() => {
        const userChanged = profileUserIdRef.current !== profileUserId;
        profileUserIdRef.current = profileUserId;

        if (userChanged) {
            const cached = profileUserId ? peekProfileWarmCache(profileUserId, cachePeekOptions) : undefined;
            const next = cached
                ? normalizeLoadedProfile(cached)
                : seedFirstPaintProfile(
                      profileUserId,
                      userMeta,
                      isOwnProfile,
                      viewerId,
                      cachePeekOptions,
                  ) ?? null;
            profileRef.current = next;
            setProfile(next);
            setLoading(!next);
            setLoadError(false);
        }

        void loadProfile();
    }, [profileUserId, loadProfile, cachePeekOptions, normalizeLoadedProfile, userMeta, isOwnProfile, viewerId]);

    useEffect(() => {
        const onUpdated = (e: Event) => {
            const uid = (e as CustomEvent<{ userId?: string }>).detail?.userId?.trim();
            if (!uid || uid !== profileUserId) return;
            /* كاش دافئ فوري إن وُجد — ثم إعادة تحميل لأن تحديث السحابة قد يكتب الذاكرة فقط */
            const cached = peekProfileWarmCache(profileUserId, cachePeekOptions);
            if (cached) {
                setProfile(normalizeLoadedProfile(cached));
                setLoading(false);
            }
            void loadProfile();
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onUpdated);
    }, [profileUserId, normalizeLoadedProfile, cachePeekOptions, loadProfile]);

    const customization: ProfilePageCustomization = useMemo(
        () => normalizeProfilePageCustomization(profile?.customization),
        [profile],
    );

    return {
        profile,
        setProfile,
        profileRef,
        loading,
        loadError,
        loadProfile,
        reloadProfile: loadProfile,
        customization,
    };
}
