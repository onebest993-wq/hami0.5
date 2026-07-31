import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { peekProfileWarmCache } from '@/app/services/profile/profileWarmCacheCore';
import { shouldApplyProfileHeaderUpdate } from '@/app/services/profile/profileHeaderLogic';
import { shouldAwaitCloudProfileSettle } from '@/app/services/profile/profileSparseDetect';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

export type LawyerProfileHeaderState = {
    displayName: string;
    title: string;
    avatarUrl: string;
};

const DEFAULT_TITLE = 'المحامي والمستشار القانوني';

function sanitizeAvatarOrEmpty(raw: string | undefined): string {
    return sanitizeProfileMediaUrl(raw) ?? '';
}

function pickAvatarUrl(profile: LawyerProfileData, prev: string): string {
    const next = sanitizeAvatarOrEmpty(profile.header?.profileImage);
    if (next) return next;
    // stub شحيح أثناء السباق — لا تمسح صورة ظاهرة
    if (shouldAwaitCloudProfileSettle(profile) && prev) return prev;
    return '';
}

function applyProfileHeader(
    p: LawyerProfileData,
    userId: string,
    userMetadata: Record<string, unknown> | undefined,
    setDisplayName: (v: string) => void,
    setTitle: (v: string) => void,
    setAvatarUrl: Dispatch<SetStateAction<string>>,
) {
    setDisplayName(resolveLawyerDisplayName(p.header.name, userId, userMetadata));
    setTitle(p.header.title?.trim() || DEFAULT_TITLE);
    setAvatarUrl((prev) => pickAvatarUrl(p, prev));
}

export function useLawyerProfileHeader(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
): LawyerProfileHeaderState {
    const [displayName, setDisplayName] = useState(() =>
        userId ? resolveLawyerDisplayName(undefined, userId, userMetadata) : 'المحامي',
    );
    const [title, setTitle] = useState(DEFAULT_TITLE);
    const [avatarUrl, setAvatarUrl] = useState(() => {
        if (!userId) return '';
        return sanitizeAvatarOrEmpty(peekProfileWarmCache(userId)?.header?.profileImage);
    });
    const userMetaRef = useRef(userMetadata);
    userMetaRef.current = userMetadata;

    useEffect(() => {
        if (!userId) return;

        const apply = (p: LawyerProfileData) => {
            applyProfileHeader(
                p,
                userId,
                userMetaRef.current,
                setDisplayName,
                setTitle,
                setAvatarUrl,
            );
        };

        const cached = peekProfileWarmCache(userId);
        if (cached) apply(cached);

        const refresh = () => {
            void fetchLawyerProfile(userId, userId).then(apply).catch(() => undefined);
        };
        refresh();

        const onProfileUpdated = (ev: Event) => {
            const detail = (ev as CustomEvent<{ userId?: string }>).detail;
            if (!shouldApplyProfileHeaderUpdate(detail?.userId, userId)) return;
            const warm = peekProfileWarmCache(userId);
            if (warm) apply(warm);
            refresh();
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
    }, [userId]);

    return { displayName, title, avatarUrl };
}
