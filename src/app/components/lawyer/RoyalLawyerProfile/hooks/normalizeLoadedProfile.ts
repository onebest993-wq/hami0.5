import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';
import {
    peekProfileWarmCache,
    hydrateProfileWarmCachePeekSync,
} from '@/app/services/profile/profileWarmCache';
import { DEFAULT_LAWYER_PROFILE } from '@/app/services/cloud/lawyerProfileTypes';
import { getUserIdentityUiState } from '@/app/services/profile/userIdentityUiState';

type NormalizeLoadedProfileOptions = {
    isOwnProfile: boolean;
    profileUserId: string;
    userMeta?: Record<string, unknown>;
    displayNameHint?: string;
};

type ProfileWarmPeekOptions = {
    viewerId?: string;
};

function applyViewerScope(
    data: LawyerProfileData,
    isOwnProfile: boolean,
): LawyerProfileData {
    return isOwnProfile ? data : redactProfileForVisitorView(data);
}

/** Pure normalization of a loaded/cached profile for the current viewer scope. */
export function normalizeLoadedProfile(
    data: LawyerProfileData,
    options: NormalizeLoadedProfileOptions,
): LawyerProfileData {
    const { isOwnProfile, profileUserId, userMeta, displayNameHint } = options;
    const next = applyViewerScope({ ...data, header: { ...data.header } }, isOwnProfile);
    if (isOwnProfile) {
        if (!next.header.name?.trim() || next.header.name.trim() === 'محامٍ تجريبي') {
            next.header.name = resolveLawyerDisplayName(
                next.header.name,
                profileUserId,
                userMeta ?? {},
            );
        }
    } else if (displayNameHint?.trim()) {
        next.header.name = displayNameHint.trim();
    }
    return next;
}

/** Sync warm-cache hydrate + peek for initial / layout paint (raw peek, no normalize). */
export function initWarmCachedProfilePeek(
    profileUserId: string,
    userMeta: Record<string, unknown> | undefined,
    isOwnProfile: boolean,
    viewerId: string,
    cachePeekOptions: ProfileWarmPeekOptions,
): LawyerProfileData | undefined {
    if (!profileUserId) return undefined;
    hydrateProfileWarmCachePeekSync(
        profileUserId,
        userMeta,
        isOwnProfile ? profileUserId : viewerId,
    );
    return peekProfileWarmCache(profileUserId, cachePeekOptions);
}

/**
 * طلاء أول إطار: كاش دافئ، وإلا هوية البلاطة للمالك بلا كتابة فوق ملف محلي لم يُفك بعد.
 */
export function seedFirstPaintProfile(
    profileUserId: string,
    userMeta: Record<string, unknown> | undefined,
    isOwnProfile: boolean,
    viewerId: string,
    cachePeekOptions: ProfileWarmPeekOptions,
): LawyerProfileData | undefined {
    const cached = initWarmCachedProfilePeek(
        profileUserId,
        userMeta,
        isOwnProfile,
        viewerId,
        cachePeekOptions,
    );
    if (cached) return cached;
    if (!isOwnProfile || !profileUserId) return undefined;
    const identity = getUserIdentityUiState(profileUserId);
    const name = identity?.displayName?.trim();
    const profileImage = identity?.avatarUrl?.trim() || '';
    if (!name && !profileImage) return undefined;
    return {
        ...DEFAULT_LAWYER_PROFILE,
        header: {
            ...DEFAULT_LAWYER_PROFILE.header,
            name: name || DEFAULT_LAWYER_PROFILE.header.name,
            profileImage,
        },
        sections: DEFAULT_LAWYER_PROFILE.sections.map((section) => ({ ...section })),
    };
}
