import { useEffect, useRef, useState } from 'react';
import { primeProfileAvatarDecode } from '@/app/services/profile/primeProfileAvatarDecode';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { resolveFirstPaintLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { hydrateProfileWarmCachePeekSync } from '@/app/services/profile/profileWarmCache';
import { getProfileWarmCacheRaw } from '@/app/services/profile/profileWarmCacheStore';
import {
    shouldApplyProfileHeaderUpdate,
    resolveProfileHeaderInitial,
    resolveHeaderDisplayNameAfterLoad,
} from '@/app/services/profile/profileHeaderLogic';
import { shouldAwaitCloudProfileSettle } from '@/app/services/profile/profileSparseDetect';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';
import { isLawyerProfileBootWarmPending } from '@/app/services/profile/profileBootWarmPending';
import { isLawyerProfileLocalUnread } from '@/app/services/profile/lawyerProfileLocalRead';
import { mergeUserIdentityUiState } from '@/app/services/profile/userIdentityUiState';
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
    if (shouldAwaitCloudProfileSettle(profile) && prev) return prev;
    return '';
}

function readInitialHeader(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
): LawyerProfileHeaderState {
    if (!userId) {
        return { displayName: 'المحامي', title: DEFAULT_TITLE, avatarUrl: '' };
    }
    hydrateProfileWarmCachePeekSync(userId, userMetadata, userId);
    const cached = getProfileWarmCacheRaw(userId);
    return {
        displayName: resolveFirstPaintLawyerDisplayName(cached?.header?.name, userId, userMetadata),
        title: cached?.header?.title?.trim() || DEFAULT_TITLE,
        avatarUrl: sanitizeAvatarOrEmpty(cached?.header?.profileImage),
    };
}

function publishAtomicIdentity(userId: string, header: LawyerProfileHeaderState): void {
    const pending = isLawyerProfileBootWarmPending() || isLawyerProfileLocalUnread(userId);
    mergeUserIdentityUiState({
        userId,
        displayName: header.displayName,
        avatarUrl: header.avatarUrl,
        profileInitial: resolveProfileHeaderInitial(header.displayName || 'م'),
        isLoaded: !pending,
    });
}

export function useLawyerProfileHeader(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
): LawyerProfileHeaderState {
    const [header, setHeader] = useState(() => readInitialHeader(userId, userMetadata));
    const userMetaRef = useRef(userMetadata);
    userMetaRef.current = userMetadata;

    useEffect(() => {
        primeProfileAvatarDecode(header.avatarUrl);
    }, [header.avatarUrl]);

    useEffect(() => {
        if (!userId) return;

        const apply = (p: LawyerProfileData) => {
            setHeader((prev) => {
                const resolved = resolveFirstPaintLawyerDisplayName(
                    p.header.name,
                    userId,
                    userMetaRef.current,
                );
                const warmName = getProfileWarmCacheRaw(userId)?.header?.name ?? '';
                const next: LawyerProfileHeaderState = {
                    displayName: resolveHeaderDisplayNameAfterLoad(
                        prev.displayName,
                        resolved,
                        warmName,
                    ),
                    title: p.header.title?.trim() || DEFAULT_TITLE,
                    avatarUrl: pickAvatarUrl(p, prev.avatarUrl),
                };
                publishAtomicIdentity(userId, next);
                return next;
            });
        };

        const cached = getProfileWarmCacheRaw(userId);
        if (cached) apply(cached);
        else publishAtomicIdentity(userId, readInitialHeader(userId, userMetaRef.current));

        const refresh = () => {
            void fetchLawyerProfile(userId, userId).then(apply).catch(() => undefined);
        };
        refresh();

        const onProfileUpdated = (ev: Event) => {
            const detail = (ev as CustomEvent<{ userId?: string }>).detail;
            if (!shouldApplyProfileHeaderUpdate(detail?.userId, userId)) return;
            const warm = getProfileWarmCacheRaw(userId);
            if (warm) apply(warm);
            refresh();
        };
        window.addEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
        return () => window.removeEventListener(LAWYER_PROFILE_UPDATED, onProfileUpdated);
    }, [userId]);

    return header;
}
